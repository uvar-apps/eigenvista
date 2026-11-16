use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
        mpsc,
    },
    thread,
    time::{Duration, Instant},
};

pub const MAX_FRAME_BYTES: usize = 4 * 1024 * 1024;
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
const SOCKET_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_CLIENTS: usize = 4;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct RpcError {
    pub code: i64,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

impl RpcError {
    pub fn new(code: i64, kind: &str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            data: Some(json!({"kind":kind})),
        }
    }
    pub(crate) fn io(error: impl std::fmt::Display) -> Self {
        Self::new(-32006, "io_error", error.to_string())
    }
}
impl std::fmt::Display for RpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.message.fmt(f)
    }
}
impl std::error::Error for RpcError {}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Connection {
    pub version: u32,
    pub transport: String,
    pub address: String,
    pub token: String,
    pub instance_id: String,
}

impl Connection {
    pub fn load(path: &Path) -> Result<Self, RpcError> {
        let metadata = fs::symlink_metadata(path).map_err(RpcError::io)?;
        if !metadata.is_file() || metadata.len() > 16384 {
            return Err(RpcError::new(
                -32007,
                "scope_denied",
                "Connection must be a small regular private file",
            ));
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::{MetadataExt, OpenOptionsExt, PermissionsExt};
            if metadata.permissions().mode() & 0o077 != 0
                || metadata.uid() != unsafe { libc::geteuid() }
            {
                return Err(RpcError::new(
                    -32007,
                    "scope_denied",
                    "Connection file must belong to the current user and have mode 0600",
                ));
            }
            let mut file = OpenOptions::new()
                .read(true)
                .custom_flags(libc::O_NOFOLLOW)
                .open(path)
                .map_err(RpcError::io)?;
            let opened = file.metadata().map_err(RpcError::io)?;
            if opened.ino() != metadata.ino() || opened.dev() != metadata.dev() {
                return Err(RpcError::new(
                    -32007,
                    "scope_denied",
                    "Connection file changed while opening",
                ));
            }
            let mut bytes = Vec::new();
            std::io::Read::by_ref(&mut file)
                .take(16385)
                .read_to_end(&mut bytes)
                .map_err(RpcError::io)?;
            if bytes.len() > 16384 {
                return Err(RpcError::new(
                    -32005,
                    "limit_exceeded",
                    "Connection file exceeds its limit",
                ));
            }
            let connection: Self = serde_json::from_slice(&bytes).map_err(|_| {
                RpcError::new(-32600, "invalid_request", "Invalid connection descriptor")
            })?;
            connection.validate()?;
            Ok(connection)
        }
        #[cfg(not(unix))]
        {
            Err(RpcError::new(
                -32010,
                "unsupported",
                "Private local control descriptors are currently qualified on Unix only",
            ))
        }
    }
    fn validate(&self) -> Result<(), RpcError> {
        let address: SocketAddr = self
            .address
            .parse()
            .map_err(|_| RpcError::new(-32600, "invalid_request", "Invalid control address"))?;
        if self.version != 1
            || self.transport != "tcp-ndjson-jsonrpc2"
            || !address.ip().is_loopback()
            || self.token.len() != 64
            || !self.token.bytes().all(|b| b.is_ascii_hexdigit())
            || self.instance_id.len() != 32
            || !self.instance_id.bytes().all(|b| b.is_ascii_hexdigit())
        {
            return Err(RpcError::new(
                -32600,
                "invalid_request",
                "Unsupported or invalid local connection descriptor",
            ));
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ControlRequest {
    pub request_id: u64,
    pub method: String,
    pub params: Value,
}

type Dispatch = dyn Fn(ControlRequest) -> Result<(), RpcError> + Send + Sync;
struct State {
    ready: AtomicBool,
    stopping: AtomicBool,
    next: AtomicU64,
    clients: AtomicUsize,
    pending: Mutex<HashMap<u64, mpsc::SyncSender<Value>>>,
    dispatch: Arc<Dispatch>,
}
pub struct Broker {
    state: Arc<State>,
    connection: Connection,
    descriptor: PathBuf,
    listener: Option<thread::JoinHandle<()>>,
}

impl Broker {
    pub fn start(
        path: &Path,
        dispatch: impl Fn(ControlRequest) -> Result<(), RpcError> + Send + Sync + 'static,
    ) -> Result<Self, RpcError> {
        #[cfg(not(unix))]
        return Err(RpcError::new(
            -32010,
            "unsupported",
            "Private local control is currently qualified on Unix only",
        ));
        #[cfg(unix)]
        {
            let socket =
                TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).map_err(RpcError::io)?;
            socket.set_nonblocking(true).map_err(RpcError::io)?;
            let connection = Connection {
                version: 1,
                transport: "tcp-ndjson-jsonrpc2".into(),
                address: socket.local_addr().map_err(RpcError::io)?.to_string(),
                token: crate::random_hex(32)?,
                instance_id: crate::random_hex(16)?,
            };
            write_descriptor(path, &connection)?;
            let state = Arc::new(State {
                ready: AtomicBool::new(false),
                stopping: AtomicBool::new(false),
                next: AtomicU64::new(1),
                clients: AtomicUsize::new(0),
                pending: Mutex::new(HashMap::new()),
                dispatch: Arc::new(dispatch),
            });
            let task = state.clone();
            let secret = connection.token.clone();
            let listener = thread::spawn(move || {
                while !task.stopping.load(Ordering::Acquire) {
                    match socket.accept() {
                        Ok((stream, _)) => {
                            if task.clients.fetch_add(1, Ordering::AcqRel) >= MAX_CLIENTS {
                                task.clients.fetch_sub(1, Ordering::AcqRel);
                                drop(stream);
                                continue;
                            }
                            let task = task.clone();
                            let secret = secret.clone();
                            thread::spawn(move || {
                                serve(stream, &secret, &task);
                                task.clients.fetch_sub(1, Ordering::AcqRel);
                            });
                        }
                        Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                            thread::sleep(Duration::from_millis(10))
                        }
                        Err(_) => break,
                    }
                }
            });
            Ok(Self {
                state,
                connection,
                descriptor: path.to_owned(),
                listener: Some(listener),
            })
        }
    }
    pub fn instance_id(&self) -> &str {
        &self.connection.instance_id
    }
    pub fn ready(&self) {
        self.state.ready.store(true, Ordering::Release);
    }
    pub fn respond(&self, request_id: u64, response: Value) -> Result<(), RpcError> {
        if response
            .as_object()
            .is_none_or(|o| o.len() != 1 || (!o.contains_key("result") && !o.contains_key("error")))
        {
            return Err(RpcError::new(
                -32602,
                "invalid_params",
                "Response must contain exactly result or error",
            ));
        }
        if let Some(error) = response.get("error") {
            serde_json::from_value::<RpcError>(error.clone())
                .map_err(|_| RpcError::new(-32602, "invalid_params", "Invalid structured error"))?;
        }
        let bytes = serde_json::to_vec(&response).map_err(RpcError::io)?;
        let response = if bytes.len() > MAX_FRAME_BYTES - 1024 {
            json!({"error":RpcError::new(-32005,"limit_exceeded","Control result exceeds wire limit")})
        } else {
            response
        };
        if let Some(sender) = self
            .state
            .pending
            .lock()
            .map_err(|_| RpcError::new(-32006, "io_error", "Broker state unavailable"))?
            .remove(&request_id)
        {
            let _ = sender.send(response);
        }
        Ok(())
    }
}
impl Drop for Broker {
    fn drop(&mut self) {
        self.state.stopping.store(true, Ordering::Release);
        if let Ok(mut pending) = self.state.pending.lock() {
            pending.clear();
        }
        if let Some(handle) = self.listener.take() {
            let _ = handle.join();
        }
        if let Ok(connection) = Connection::load(&self.descriptor)
            && connection.instance_id == self.connection.instance_id
            && connection.token == self.connection.token
        {
            let _ = fs::remove_file(&self.descriptor);
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    jsonrpc: String,
    id: Value,
    method: String,
    #[serde(default = "empty_params")]
    params: Value,
    auth: String,
}
fn empty_params() -> Value {
    json!({})
}
pub(crate) fn read_frame(stream: &mut TcpStream, timeout: Duration) -> Result<Vec<u8>, RpcError> {
    let deadline = Instant::now() + timeout;
    let mut bytes = Vec::new();
    let mut buffer = [0u8; 8192];
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(RpcError::new(
                -32004,
                "timeout",
                "Control frame deadline reached",
            ));
        }
        stream
            .set_read_timeout(Some(remaining))
            .map_err(RpcError::io)?;
        let capacity = buffer.len().min(MAX_FRAME_BYTES + 1 - bytes.len());
        let count = stream.read(&mut buffer[..capacity]).map_err(|_| {
            RpcError::new(-32004, "timeout", "Control frame read failed or timed out")
        })?;
        if count == 0 {
            return Err(RpcError::new(
                -32600,
                "invalid_request",
                "Incomplete control frame",
            ));
        }
        if let Some(end) = buffer[..count].iter().position(|b| *b == b'\n') {
            bytes.extend_from_slice(&buffer[..=end]);
            if bytes.len() <= MAX_FRAME_BYTES {
                return Ok(bytes);
            }
        } else {
            bytes.extend_from_slice(&buffer[..count]);
        }
        if bytes.len() >= MAX_FRAME_BYTES {
            return Err(RpcError::new(
                -32005,
                "limit_exceeded",
                "Control frame exceeds its byte limit",
            ));
        }
    }
}
pub(crate) fn write_frame(
    stream: &mut TcpStream,
    mut bytes: &[u8],
    timeout: Duration,
) -> Result<(), RpcError> {
    let deadline = Instant::now() + timeout;
    while !bytes.is_empty() {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(RpcError::new(
                -32004,
                "timeout",
                "Control frame write deadline reached",
            ));
        }
        stream
            .set_write_timeout(Some(remaining))
            .map_err(RpcError::io)?;
        let written = stream.write(bytes).map_err(|_| {
            RpcError::new(-32004, "timeout", "Control frame write failed or timed out")
        })?;
        if written == 0 {
            return Err(RpcError::new(
                -32006,
                "connection_failed",
                "Control peer disconnected",
            ));
        }
        bytes = &bytes[written..];
    }
    Ok(())
}
fn serve(mut stream: TcpStream, token: &str, state: &Arc<State>) {
    let _ = stream.set_read_timeout(Some(SOCKET_TIMEOUT));
    let _ = stream.set_write_timeout(Some(SOCKET_TIMEOUT));
    let mut id = Value::Null;
    let result = (|| -> Result<Value, RpcError> {
        let bytes = read_frame(&mut stream, SOCKET_TIMEOUT)?;
        let request: Request = serde_json::from_slice(&bytes).map_err(|error| {
            if error.is_syntax() || error.is_eof() {
                RpcError::new(-32700, "parse_error", "Invalid JSON")
            } else {
                RpcError::new(
                    -32600,
                    "invalid_request",
                    "Expected one authenticated JSON-RPC request",
                )
            }
        })?;
        let auth_matches = request.auth.len() == token.len()
            && request
                .auth
                .bytes()
                .zip(token.bytes())
                .fold(0u8, |a, (b, c)| a | (b ^ c))
                == 0;
        if !auth_matches {
            return Err(RpcError::new(
                -32001,
                "unauthorized",
                "Control authentication failed",
            ));
        }
        if request.jsonrpc != "2.0"
            || !(request.id.is_string() || request.id.is_u64() || request.id.is_i64())
            || request.id.as_str().is_some_and(|s| s.len() > 128)
            || request.method.is_empty()
            || request.method.len() > 128
            || !request.params.is_object()
        {
            return Err(RpcError::new(
                -32600,
                "invalid_request",
                "Expected JSON-RPC2 id, method and object params; batches/notifications are unsupported",
            ));
        }
        id = request.id;
        if !state.ready.load(Ordering::Acquire) {
            return Err(RpcError::new(
                -32003,
                "not_ready",
                "The application controller is not ready",
            ));
        }
        let request_id = state.next.fetch_add(1, Ordering::AcqRel);
        if request_id > 9_007_199_254_740_991 {
            return Err(RpcError::new(
                -32005,
                "limit_exceeded",
                "Control request identifiers exhausted",
            ));
        }
        let (sender, receiver) = mpsc::sync_channel(1);
        state
            .pending
            .lock()
            .map_err(|_| RpcError::io("Broker state unavailable"))?
            .insert(request_id, sender);
        if let Err(error) = (state.dispatch)(ControlRequest {
            request_id,
            method: request.method,
            params: request.params,
        }) {
            if let Ok(mut pending) = state.pending.lock() {
                pending.remove(&request_id);
            }
            return Err(error);
        }
        let response = receiver.recv_timeout(REQUEST_TIMEOUT).map_err(|_| {
            RpcError::new(
                -32004,
                "timeout",
                "Application request timed out or controller disconnected",
            )
        });
        if let Ok(mut pending) = state.pending.lock() {
            pending.remove(&request_id);
        }
        response
    })();
    let response = match result {
        Ok(payload) => {
            let mut result = json!({"jsonrpc":"2.0","id":id});
            result
                .as_object_mut()
                .unwrap()
                .extend(payload.as_object().unwrap().clone());
            result
        }
        Err(error) => json!({"jsonrpc":"2.0","id":id,"error":error}),
    };
    if let Ok(mut bytes) = serde_json::to_vec(&response)
        && bytes.len() <= MAX_FRAME_BYTES
    {
        bytes.push(b'\n');
        let _ = write_frame(&mut stream, &bytes, SOCKET_TIMEOUT);
    }
}

#[cfg(unix)]
fn write_descriptor(path: &Path, connection: &Connection) -> Result<(), RpcError> {
    use std::os::unix::fs::OpenOptionsExt;
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .ok_or_else(|| {
            RpcError::new(
                -32602,
                "invalid_params",
                "Use an explicit connection-file directory",
            )
        })?;
    let temporary = parent.join(format!(".eigenvista-control-{}", crate::random_hex(16)?));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(&temporary)
        .map_err(RpcError::io)?;
    let result = (|| {
        serde_json::to_writer(&mut file, connection).map_err(RpcError::io)?;
        file.write_all(b"\n").map_err(RpcError::io)?;
        file.sync_all().map_err(RpcError::io)?;
        drop(file);
        fs::hard_link(&temporary, path).map_err(|_| {
            RpcError::new(
                -32009,
                "destination_exists",
                "Could not publish private descriptor; choose a new connection file",
            )
        })?;
        Ok(())
    })();
    let _ = fs::remove_file(temporary);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn a_trickling_peer_cannot_extend_the_absolute_frame_deadline() {
        let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).unwrap();
        let address = listener.local_addr().unwrap();
        let reader = thread::spawn(move || {
            let (mut socket, _) = listener.accept().unwrap();
            let start = Instant::now();
            let result = read_frame(&mut socket, Duration::from_millis(200));
            (result.unwrap_err(), start.elapsed())
        });
        let mut sender = TcpStream::connect(address).unwrap();
        let writer = thread::spawn(move || {
            for _ in 0..16 {
                if sender.write_all(b" ").is_err() {
                    break;
                }
                thread::sleep(Duration::from_millis(50));
            }
        });
        let (error, elapsed) = reader.join().unwrap();
        assert_eq!(error.data.unwrap()["kind"], "timeout");
        assert!(
            elapsed < Duration::from_millis(650),
            "slow bytes must not reset the deadline"
        );
        writer.join().unwrap();
    }
}
