use crate::RpcError;
use serde::Serialize;
use std::io::{self, Read, Write};

#[derive(Default)]
struct Buffer(Vec<u8>);
impl Write for Buffer {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0
            .try_reserve(bytes.len())
            .map_err(|e| io::Error::other(format!("Cannot allocate control byte buffer: {e}")))?;
        self.0.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

pub(crate) fn read(mut source: impl Read) -> Result<Vec<u8>, RpcError> {
    let mut output = Buffer::default();
    let mut chunk = [0; 8192];
    loop {
        let count = source.read(&mut chunk).map_err(RpcError::io)?;
        if count == 0 {
            return Ok(output.0);
        }
        output.write_all(&chunk[..count]).map_err(RpcError::io)?;
    }
}

pub(crate) fn frame(value: &impl Serialize) -> Result<Vec<u8>, RpcError> {
    let mut output = Buffer::default();
    serde_json::to_writer(&mut output, value).map_err(RpcError::io)?;
    output.write_all(b"\n").map_err(RpcError::io)?;
    Ok(output.0)
}
