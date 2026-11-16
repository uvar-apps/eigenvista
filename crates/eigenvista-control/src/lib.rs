//! Opt-in local application control. The broker never interprets scientific commands.
mod broker;
mod client;
mod files;

pub use broker::{Broker, Connection, ControlRequest, MAX_FRAME_BYTES, REQUEST_TIMEOUT, RpcError};
pub use client::{call, wait_for_job};
pub use files::{FileReceipt, MAX_FILE_BYTES, MAX_PNG_DATA_URL_BYTES, ScopedFiles};

pub(crate) fn random_hex(bytes: usize) -> Result<String, RpcError> {
    let mut random = vec![0; bytes];
    getrandom::fill(&mut random)
        .map_err(|_| RpcError::new(-32006, "io_error", "System randomness unavailable"))?;
    Ok(random.iter().map(|byte| format!("{byte:02x}")).collect())
}
