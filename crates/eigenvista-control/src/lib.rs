//! Opt-in local application control. The broker never interprets scientific commands.
mod broker;
mod buffer;
mod client;
mod files;

pub use broker::{Broker, Connection, ControlRequest, RpcError};
pub use client::{call, call_until_complete, wait_for_job};
pub use files::{FileReceipt, ScopedFiles};

pub(crate) fn random_hex(bytes: usize) -> Result<String, RpcError> {
    let mut random = vec![0; bytes];
    getrandom::fill(&mut random)
        .map_err(|_| RpcError::new(-32006, "io_error", "System randomness unavailable"))?;
    Ok(random.iter().map(|byte| format!("{byte:02x}")).collect())
}
