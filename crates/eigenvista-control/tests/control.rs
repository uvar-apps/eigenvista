#![cfg(unix)]
use base64::Engine;
use eigenvista_control::{
    Broker, Connection, MAX_FILE_BYTES, MAX_FRAME_BYTES, MAX_PNG_DATA_URL_BYTES, RpcError,
    ScopedFiles, call,
};
use serde_json::{Value, json};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    net::TcpStream,
    os::unix::fs::{FileTypeExt, MetadataExt, PermissionsExt, symlink},
    path::{Path, PathBuf},
    sync::{Arc, Barrier, mpsc},
    thread,
    time::Duration,
};

struct Scratch(PathBuf);
impl Scratch {
    fn new(label: &str) -> Self {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tmp");
        fs::create_dir_all(&root).unwrap();
        let mut random = [0u8; 8];
        getrandom::fill(&mut random).unwrap();
        let path = root.join(format!(
            "control-{label}-{}-{:016x}",
            std::process::id(),
            u64::from_le_bytes(random)
        ));
        fs::create_dir(&path).unwrap();
        Self(path.canonicalize().unwrap())
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn kind(error: &RpcError) -> &str {
    error.data.as_ref().unwrap()["kind"].as_str().unwrap()
}
fn native() -> Vec<u8> {
    eigenvista_format::encode(&eigenvista_core::fixtures::hydrogen_pair()).unwrap()
}
fn scope(dir: &Scratch) -> ScopedFiles {
    ScopedFiles::new(std::slice::from_ref(&dir.0)).unwrap()
}
fn raw(connection: &Connection, bytes: &[u8]) -> Value {
    let mut stream = TcpStream::connect(&connection.address).unwrap();
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .unwrap();
    let _ = stream.write_all(bytes);
    let mut response = String::new();
    BufReader::new(stream).read_line(&mut response).unwrap();
    serde_json::from_str(&response).unwrap()
}

#[test]
fn actual_socket_auth_readiness_correlation_and_private_descriptor() {
    let dir = Scratch::new("broker");
    let file = dir.0.join("connection.json");
    let (tx, rx) = mpsc::channel();
    let broker = Broker::start(&file, move |request| {
        tx.send(request)
            .map_err(|_| RpcError::new(-32006, "io_error", "test receiver closed"))
    })
    .unwrap();
    let connection = Connection::load(&file).unwrap();
    assert_eq!(
        fs::metadata(&file).unwrap().permissions().mode() & 0o777,
        0o600
    );
    assert_eq!(connection.token.len(), 64);
    assert_eq!(connection.instance_id.len(), 32);
    assert_eq!(
        kind(&call(&connection, "app.state", json!({}), Duration::from_secs(5)).unwrap_err()),
        "not_ready"
    );
    broker.ready();
    let mut bad = connection.clone();
    bad.token = "0".repeat(64);
    assert_eq!(
        kind(&call(&bad, "app.state", json!({}), Duration::from_secs(5)).unwrap_err()),
        "unauthorized"
    );
    assert!(rx.try_recv().is_err());
    let clients: Vec<_> = (0..2)
        .map(|marker| {
            let c = connection.clone();
            thread::spawn(move || {
                call(
                    &c,
                    "app.state",
                    json!({"marker":marker}),
                    Duration::from_secs(5),
                )
                .unwrap()
            })
        })
        .collect();
    let a = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    let b = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    assert_ne!(a.request_id, b.request_id);
    for request in [b, a] {
        broker
            .respond(
                request.request_id,
                json!({"result":{"marker":request.params["marker"]}}),
            )
            .unwrap();
    }
    for (marker, client) in clients.into_iter().enumerate() {
        assert_eq!(client.join().unwrap(), json!({"marker":marker}));
    }
    drop(broker);
    assert!(!file.exists());
}

#[test]
fn real_wire_rejects_batches_notifications_bad_json_and_oversized_frames() {
    let dir = Scratch::new("wire");
    let file = dir.0.join("connection.json");
    let broker = Broker::start(&file, |_| {
        panic!("Invalid requests must never reach the app")
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&file).unwrap();
    assert_eq!(raw(&connection, b"{\n")["error"]["code"], -32700);
    assert_eq!(raw(&connection, b"[]\n")["error"]["code"], -32600);
    let notification = serde_json::to_string(
        &json!({"jsonrpc":"2.0","method":"document.open","params":{},"auth":connection.token}),
    )
    .unwrap()
        + "\n";
    assert_eq!(
        raw(&connection, notification.as_bytes())["error"]["code"],
        -32600
    );
    let mut huge = vec![b' '; MAX_FRAME_BYTES + 1];
    huge.push(b'\n');
    assert_eq!(
        raw(&connection, &huge)["error"]["data"]["kind"],
        "limit_exceeded"
    );
    let public = dir.0.join("public.json");
    fs::copy(&file, &public).unwrap();
    fs::set_permissions(&public, fs::Permissions::from_mode(0o644)).unwrap();
    assert_eq!(
        kind(&Connection::load(&public).err().unwrap()),
        "scope_denied"
    );
    let alias = dir.0.join("alias.json");
    symlink(&file, &alias).unwrap();
    assert!(Connection::load(&alias).is_err());
    assert!(Broker::start(&file, |_| Ok(())).is_err());
    assert_eq!(
        Connection::load(&file).unwrap().instance_id,
        connection.instance_id
    );
}

#[test]
fn oversized_app_result_is_a_prompt_bounded_error() {
    let dir = Scratch::new("result");
    let file = dir.0.join("connection.json");
    let (tx, rx) = mpsc::channel();
    let broker = Broker::start(&file, move |r| {
        tx.send(r).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&file).unwrap();
    let client =
        thread::spawn(move || call(&connection, "app.state", json!({}), Duration::from_secs(5)));
    let request = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    broker
        .respond(
            request.request_id,
            json!({"result":"x".repeat(MAX_FRAME_BYTES)}),
        )
        .unwrap();
    assert_eq!(kind(&client.join().unwrap().unwrap_err()), "limit_exceeded");
}

#[test]
fn scoped_files_reject_escapes_aliases_and_import_source_replacement() {
    let dir = Scratch::new("scope");
    let outside = Scratch::new("outside");
    let files = scope(&dir);
    let original = outside.0.join("secret.xyz");
    fs::write(&original, b"not in grant").unwrap();
    assert_eq!(kind(&files.read(&original).unwrap_err()), "scope_denied");
    let link = dir.0.join("escape.xyz");
    symlink(&original, &link).unwrap();
    assert!(files.read(&link).is_err());
    let folder = dir.0.join("folder");
    symlink(&outside.0, &folder).unwrap();
    assert!(files.read(&folder.join("secret.xyz")).is_err());
    assert!(
        files
            .save_document(&folder.join("leak.eigenvista"), &native(), &[], false)
            .is_err()
    );
    assert!(!outside.0.join("leak.eigenvista").exists());
    let source = dir.0.join("source.eigenvista");
    let bytes = native();
    fs::write(&source, &bytes).unwrap();
    assert_eq!(files.read(&source).unwrap(), bytes);
    assert_eq!(
        kind(
            &files
                .save_document(&source, &bytes, &[], false)
                .unwrap_err()
        ),
        "source_protected"
    );
    let hard = dir.0.join("alias.eigenvista");
    fs::hard_link(&source, &hard).unwrap();
    assert_eq!(
        kind(&files.save_document(&hard, &bytes, &[], false).unwrap_err()),
        "source_protected"
    );
    fs::remove_file(&source).unwrap();
    assert_eq!(
        kind(
            &files
                .save_document(&source, &bytes, &[], false)
                .unwrap_err()
        ),
        "source_protected"
    );
    let huge = dir.0.join("huge.xyz");
    fs::File::create(&huge)
        .unwrap()
        .set_len(MAX_FILE_BYTES as u64 + 1)
        .unwrap();
    assert_eq!(kind(&files.read(&huge).unwrap_err()), "limit_exceeded");
}

#[test]
fn bounded_palette_sources_keep_scope_size_and_source_protection() {
    let dir = Scratch::new("palette-limit");
    let outside = Scratch::new("palette-outside");
    let files = scope(&dir);
    let palette = dir.0.join("palette.json");
    let bytes = br##"{"format":"eigenvista-atom-colors","version":1,"colors":[{"z":8,"color":"#ffaaaa"}]}"##;
    fs::write(&palette, bytes).unwrap();
    assert_eq!(files.read_with_limit(&palette, bytes.len()).unwrap(), bytes);
    assert_eq!(
        kind(
            &files
                .read_with_limit(&palette, bytes.len() - 1)
                .unwrap_err()
        ),
        "limit_exceeded"
    );
    assert_eq!(
        kind(&files.read_with_limit(&palette, 0).unwrap_err()),
        "invalid_params"
    );
    assert_eq!(
        kind(
            &files
                .read_with_limit(&palette, MAX_FILE_BYTES + 1)
                .unwrap_err()
        ),
        "invalid_params"
    );
    let escaped = outside.0.join("palette.json");
    fs::write(&escaped, bytes).unwrap();
    assert_eq!(
        kind(&files.read_with_limit(&escaped, bytes.len()).unwrap_err()),
        "scope_denied"
    );
    let alias = dir.0.join("palette-alias.eigenvista");
    fs::hard_link(&palette, &alias).unwrap();
    assert_eq!(
        kind(
            &files
                .save_document(&alias, &native(), &[], false)
                .unwrap_err()
        ),
        "source_protected"
    );
}

#[test]
fn native_writes_validate_before_publication_and_racing_writes_never_clobber() {
    let dir = Scratch::new("saves");
    let files = Arc::new(scope(&dir));
    let target = dir.0.join("result.eigenvista");
    assert!(
        files
            .save_document(&target, b"garbage", &[], false)
            .is_err()
    );
    assert!(!target.exists());
    assert!(
        files
            .save_document(&dir.0.join("source.molden"), &native(), &[], false)
            .is_err()
    );
    let barrier = Arc::new(Barrier::new(4));
    let workers: Vec<_> = (0..4)
        .map(|_| {
            let files = files.clone();
            let barrier = barrier.clone();
            let target = target.clone();
            thread::spawn(move || {
                barrier.wait();
                files.save_document(&target, &native(), &[], false)
            })
        })
        .collect();
    let outcomes: Vec<_> = workers.into_iter().map(|w| w.join().unwrap()).collect();
    assert_eq!(outcomes.iter().filter(|x| x.is_ok()).count(), 1);
    let before = fs::read(&target).unwrap();
    eigenvista_format::decode(&before).unwrap();
    assert!(files.save_document(&target, &native(), &[], true).is_err());
    assert_eq!(fs::read(&target).unwrap(), before);
    assert_eq!(
        fs::metadata(&target).unwrap().permissions().mode() & 0o777,
        0o600
    );
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 1);
    let source = dir.0.join("hint.eigenvista");
    assert_eq!(
        kind(
            &files
                .save_document(
                    &source,
                    &native(),
                    &[source.to_string_lossy().into_owned()],
                    false
                )
                .unwrap_err()
        ),
        "source_protected"
    );
}

#[test]
fn png_exports_are_bounded_validated_and_no_clobber() {
    let dir = Scratch::new("png");
    let files = scope(&dir);
    let icon = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src-tauri/icons/icon.png");
    let bytes = fs::read(icon).unwrap();
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    );
    let destination = dir.0.join("render.png");
    files.write_image(&destination, &url, false).unwrap();
    assert_eq!(fs::read(&destination).unwrap(), bytes);
    assert!(files.write_image(&destination, &url, false).is_err());
    assert!(
        files
            .write_image(&dir.0.join("bad.png"), "data:image/png;base64,YmFk", false)
            .is_err()
    );
    assert!(
        files
            .write_image(&dir.0.join("bad.txt"), &url, false)
            .is_err()
    );
    assert!(
        files
            .write_image(
                &dir.0.join("large.png"),
                &"x".repeat(MAX_PNG_DATA_URL_BYTES + 1),
                false
            )
            .is_err()
    );
    let mut corrupt = bytes;
    corrupt[30] ^= 1;
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(corrupt)
    );
    assert!(
        files
            .write_image(&dir.0.join("checksum.png"), &url, false)
            .is_err()
    );
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 1);
}

#[test]
fn cli_uses_the_actual_socket_and_never_prints_the_auth_secret() {
    let dir = Scratch::new("cli");
    let descriptor = dir.0.join("connection.json");
    let (tx, rx) = mpsc::channel();
    let broker = Broker::start(&descriptor, move |r| {
        tx.send(r).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&descriptor).unwrap();
    let runner = thread::spawn(move || {
        std::process::Command::new(env!("CARGO_BIN_EXE_eigenvista-ctl"))
            .args([
                "--connection",
                descriptor.to_str().unwrap(),
                "app.state",
                "--params",
                "{\"tag\":42}",
            ])
            .output()
            .unwrap()
    });
    let request = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    assert_eq!(request.params, json!({"tag":42}));
    broker
        .respond(request.request_id, json!({"result":{"revision":4}}))
        .unwrap();
    let result = runner.join().unwrap();
    assert!(result.status.success());
    assert_eq!(
        serde_json::from_slice::<Value>(&result.stdout).unwrap(),
        json!({"revision":4})
    );
    assert!(!String::from_utf8_lossy(&result.stdout).contains(&connection.token));
    assert!(result.stderr.is_empty());
    assert_eq!(
        fs::metadata(dir.0.join("connection.json")).unwrap().uid(),
        unsafe { libc::geteuid() }
    );
}

#[test]
fn cli_wait_polls_real_job_receipts_and_reads_bounded_params_file() {
    let dir = Scratch::new("wait");
    let descriptor = dir.0.join("connection.json");
    let params = dir.0.join("params.json");
    fs::write(&params, b"{\"fieldIds\":[\"molden-mo-1\"]}").unwrap();
    let (tx, rx) = mpsc::channel();
    let broker = Broker::start(&descriptor, move |request| {
        tx.send(request).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let runner = thread::spawn(move || {
        std::process::Command::new(env!("CARGO_BIN_EXE_eigenvista-ctl"))
            .args([
                "--connection",
                descriptor.to_str().unwrap(),
                "surfaces.generate",
                "--params-file",
                params.to_str().unwrap(),
                "--wait",
                "3",
            ])
            .output()
            .unwrap()
    });
    for phase in 0..3 {
        let request = rx.recv_timeout(Duration::from_secs(5)).unwrap();
        let response = if phase == 0 {
            assert_eq!(request.method, "surfaces.generate");
            assert_eq!(request.params, json!({"fieldIds":["molden-mo-1"]}));
            json!({"jobId":"j1","status":"accepted"})
        } else {
            assert_eq!(request.method, "job.get");
            assert_eq!(request.params, json!({"jobId":"j1"}));
            if phase == 1 {
                json!({"jobId":"j1","status":"running"})
            } else {
                json!({"jobId":"j1","status":"completed","result":{"triangles":120}})
            }
        };
        broker
            .respond(request.request_id, json!({"result":response}))
            .unwrap();
    }
    let output = runner.join().unwrap();
    assert!(output.status.success());
    let result: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["status"], "completed");
    assert_eq!(result["result"]["triangles"], 120);
}

#[test]
fn fifo_sources_and_existing_destinations_fail_without_waiting_for_a_peer() {
    use std::{ffi::CString, os::unix::ffi::OsStrExt};
    let dir = Scratch::new("fifo");
    let files = scope(&dir);
    let source = dir.0.join("source.xyz");
    let native_target = dir.0.join("result.eigenvista");
    let image_target = dir.0.join("render.png");
    for path in [&source, &native_target, &image_target] {
        let name = CString::new(path.as_os_str().as_bytes()).unwrap();
        // SAFETY: name is a live NUL-terminated path in this test's owned directory.
        assert_eq!(unsafe { libc::mkfifo(name.as_ptr(), 0o600) }, 0);
    }
    let icon = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src-tauri/icons/icon.png");
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(fs::read(icon).unwrap())
    );
    let (sender, receiver) = mpsc::channel();
    let worker = thread::spawn(move || {
        let read = files.read(&source).unwrap_err();
        let save = files
            .save_document(&native_target, &native(), &[], false)
            .unwrap_err();
        let image = files.write_image(&image_target, &url, false).unwrap_err();
        sender
            .send([
                kind(&read).to_owned(),
                kind(&save).to_owned(),
                kind(&image).to_owned(),
            ])
            .unwrap();
    });
    assert_eq!(
        receiver
            .recv_timeout(Duration::from_secs(2))
            .expect("FIFO operations must not block"),
        ["scope_denied", "scope_denied", "scope_denied"]
    );
    worker.join().unwrap();
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 3);
    for entry in fs::read_dir(&dir.0).unwrap() {
        assert!(entry.unwrap().file_type().unwrap().is_fifo());
    }
}
