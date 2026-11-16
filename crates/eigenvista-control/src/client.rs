use crate::{
    Connection, MAX_FRAME_BYTES, RpcError,
    broker::{read_frame, write_frame},
};
use serde_json::{Value, json};
use std::{
    net::{SocketAddr, TcpStream},
    thread,
    time::{Duration, Instant},
};

pub fn call(
    connection: &Connection,
    method: &str,
    params: Value,
    timeout: Duration,
) -> Result<Value, RpcError> {
    if timeout.is_zero() {
        return Err(RpcError::new(
            -32004,
            "timeout",
            "Control request deadline reached",
        ));
    }
    let deadline = Instant::now() + timeout;
    let address: SocketAddr = connection.address.parse().map_err(RpcError::io)?;
    if !address.ip().is_loopback() {
        return Err(RpcError::new(
            -32007,
            "scope_denied",
            "Only a loopback control address is allowed",
        ));
    }
    if !params.is_object() {
        return Err(RpcError::new(
            -32602,
            "invalid_params",
            "Params must be a JSON object",
        ));
    }
    let id = crate::random_hex(16)?;
    let mut bytes = serde_json::to_vec(
        &json!({"jsonrpc":"2.0","id":id,"method":method,"params":params,"auth":connection.token}),
    )
    .map_err(RpcError::io)?;
    if bytes.len() >= MAX_FRAME_BYTES {
        return Err(RpcError::new(
            -32005,
            "limit_exceeded",
            "Request exceeds the control frame limit",
        ));
    }
    bytes.push(b'\n');
    let mut socket = TcpStream::connect_timeout(&address, timeout.min(Duration::from_secs(5)))
        .map_err(|_| {
            RpcError::new(
                -32006,
                "connection_failed",
                "Could not connect to the running EigenVista instance",
            )
        })?;
    socket
        .set_read_timeout(Some(timeout))
        .map_err(RpcError::io)?;
    socket
        .set_write_timeout(Some(Duration::from_secs(10)))
        .map_err(RpcError::io)?;
    write_frame(
        &mut socket,
        &bytes,
        deadline
            .saturating_duration_since(Instant::now())
            .min(Duration::from_secs(10)),
    )
    .map_err(|_| RpcError::new(-32006, "connection_failed", "Control request write failed"))?;
    let response: Value = serde_json::from_slice(&read_frame(
        &mut socket,
        deadline.saturating_duration_since(Instant::now()),
    )?)
    .map_err(|_| RpcError::new(-32603, "invalid_response", "Invalid JSON-RPC response"))?;
    if response.get("jsonrpc") != Some(&json!("2.0"))
        || (response.get("id") != Some(&json!(id))
            && !(response.get("error").is_some() && response.get("id") == Some(&Value::Null)))
    {
        return Err(RpcError::new(
            -32603,
            "invalid_response",
            "Response correlation mismatch",
        ));
    }
    if let Some(error) = response.get("error") {
        return Err(serde_json::from_value(error.clone())
            .map_err(|_| RpcError::new(-32603, "invalid_response", "Invalid structured error"))?);
    }
    response
        .get("result")
        .cloned()
        .ok_or_else(|| RpcError::new(-32603, "invalid_response", "Missing result"))
}

pub fn wait_for_job(
    connection: &Connection,
    receipt: Value,
    wait: Duration,
) -> Result<Value, RpcError> {
    if wait.is_zero() {
        return Ok(receipt);
    }
    let Some(job_id) = receipt.get("jobId").and_then(Value::as_str) else {
        return Ok(receipt);
    };
    let deadline = Instant::now() + wait;
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(RpcError::new(
                -32004,
                "timeout",
                format!("Wait deadline reached; job {job_id} was not automatically cancelled"),
            ));
        }
        let job = call(
            connection,
            "job.get",
            json!({"jobId":job_id}),
            remaining.min(Duration::from_secs(62)),
        )?;
        match job.get("status").and_then(Value::as_str) {
            Some("completed" | "succeeded") => return Ok(job),
            Some("failed") => {
                return Err(job
                    .get("error")
                    .cloned()
                    .and_then(|value| serde_json::from_value(value).ok())
                    .unwrap_or_else(|| {
                        RpcError::new(-32011, "job_failed", "Application job failed")
                    }));
            }
            Some("cancelled") => {
                return Err(RpcError::new(
                    -32012,
                    "cancelled",
                    format!("Job {job_id} was cancelled"),
                ));
            }
            Some("accepted" | "running") => {}
            _ => {
                return Err(RpcError::new(
                    -32603,
                    "invalid_response",
                    "Unexpected application job status",
                ));
            }
        }
        thread::sleep(
            deadline
                .saturating_duration_since(Instant::now())
                .min(Duration::from_millis(100)),
        );
    }
}
