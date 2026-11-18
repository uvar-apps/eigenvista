use crate::{
    Connection, RpcError,
    broker::{read_frame, read_idle_frame, write_frame, write_idle_frame},
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
    call_inner(connection, method, params, Some(timeout))
}

/// Wait for actual completion or disconnect; only transport inactivity is timed.
pub fn call_until_complete(
    connection: &Connection,
    method: &str,
    params: Value,
) -> Result<Value, RpcError> {
    call_inner(connection, method, params, None)
}

fn call_inner(
    connection: &Connection,
    method: &str,
    params: Value,
    timeout: Option<Duration>,
) -> Result<Value, RpcError> {
    if timeout.is_some_and(|value| value.is_zero()) {
        return Err(RpcError::new(
            -32004,
            "timeout",
            "Control request deadline reached",
        ));
    }
    let deadline = timeout
        .map(|value| {
            Instant::now().checked_add(value).ok_or_else(|| {
                RpcError::new(
                    -32602,
                    "invalid_params",
                    "Caller deadline is not representable",
                )
            })
        })
        .transpose()?;
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
    let bytes = crate::buffer::frame(
        &json!({"jsonrpc":"2.0","id":id,"method":method,"params":params,"auth":connection.token}),
    )?;
    let mut socket = TcpStream::connect_timeout(
        &address,
        timeout.map_or(Duration::from_secs(5), |value| {
            value.min(Duration::from_secs(5))
        }),
    )
    .map_err(|_| {
        RpcError::new(
            -32006,
            "connection_failed",
            "Could not connect to the running EigenVista instance",
        )
    })?;
    let bytes = if let Some(deadline) = deadline {
        write_frame(
            &mut socket,
            &bytes,
            deadline.saturating_duration_since(Instant::now()),
        )?;
        read_frame(
            &mut socket,
            deadline.saturating_duration_since(Instant::now()),
        )?
    } else {
        write_idle_frame(&mut socket, &bytes)?;
        read_idle_frame(&mut socket, true)?
    };
    let mut response: Value = serde_json::from_slice(&bytes)
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
    let response = response.as_object_mut().ok_or_else(|| {
        RpcError::new(
            -32603,
            "invalid_response",
            "Expected JSON-RPC response object",
        )
    })?;
    if let Some(error) = response.remove("error") {
        return Err(serde_json::from_value(error)
            .map_err(|_| RpcError::new(-32603, "invalid_response", "Invalid structured error"))?);
    }
    response
        .remove("result")
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
    let deadline = Instant::now().checked_add(wait).ok_or_else(|| {
        RpcError::new(
            -32602,
            "invalid_params",
            "Wait duration cannot be represented by this platform",
        )
    })?;
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(RpcError::new(
                -32004,
                "timeout",
                format!("Wait deadline reached; job {job_id} was not automatically cancelled"),
            ));
        }
        let job = call(connection, "job.get", json!({"jobId":job_id}), remaining)?;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unrepresentable_job_wait_reports_validation_without_connecting() {
        let connection = Connection {
            version: 1,
            transport: "tcp-ndjson-jsonrpc2".into(),
            address: "127.0.0.1:0".into(),
            token: "0".repeat(64),
            instance_id: "0".repeat(32),
        };
        let error =
            wait_for_job(&connection, json!({"jobId":"unstarted"}), Duration::MAX).unwrap_err();
        assert_eq!(error.data.unwrap()["kind"], "invalid_params");
        assert!(error.message.contains("represented"));
    }
}
