use eigenvista_core::Result;
use std::io::{self, Write};

#[derive(Default)]
struct JsonBuffer(Vec<u8>);

impl Write for JsonBuffer {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0.try_reserve(bytes.len()).map_err(|error| {
            io::Error::other(format!("Cannot allocate JSON bridge buffer: {error}"))
        })?;
        self.0.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

pub(super) fn to_string(value: &impl serde::Serialize) -> Result<String> {
    let mut output = JsonBuffer::default();
    serde_json::to_writer(&mut output, value).map_err(|error| error.to_string())?;
    String::from_utf8(output.0).map_err(|error| error.to_string())
}
