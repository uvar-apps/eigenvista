//! Fallible growth for byte streams produced by ZIP/JSON or read from an entry.
use std::io::{self, Cursor, Read, Seek, SeekFrom, Write};

#[derive(Default)]
pub(super) struct Buffer(Cursor<Vec<u8>>);

impl Buffer {
    pub fn into_inner(self) -> Vec<u8> {
        self.0.into_inner()
    }
}

impl Write for Buffer {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        let position = usize::try_from(self.0.position())
            .map_err(|_| io::Error::other("Native byte position exceeds address space"))?;
        let end = position
            .checked_add(bytes.len())
            .ok_or_else(|| io::Error::other("Native byte length overflow"))?;
        let vec = self.0.get_mut();
        if end > vec.len() {
            vec.try_reserve(end - vec.len()).map_err(|e| {
                io::Error::other(format!("Cannot allocate native byte buffer: {e}"))
            })?;
        }
        self.0.write(bytes)
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

impl Seek for Buffer {
    fn seek(&mut self, position: SeekFrom) -> io::Result<u64> {
        self.0.seek(position)
    }
}

pub(super) fn read(mut source: impl Read) -> Result<Vec<u8>, String> {
    let mut buffer = Buffer::default();
    let mut chunk = [0; 8192];
    loop {
        let count = source.read(&mut chunk).map_err(|e| e.to_string())?;
        if count == 0 {
            return Ok(buffer.into_inner());
        }
        buffer
            .write_all(&chunk[..count])
            .map_err(|e| e.to_string())?;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn impossible_output_capacity_returns_an_error_without_panicking() {
        let mut buffer = Buffer::default();
        buffer.seek(SeekFrom::Start(isize::MAX as u64)).unwrap();
        assert!(
            buffer
                .write_all(&[1])
                .unwrap_err()
                .to_string()
                .contains("allocate")
        );
        assert!(buffer.into_inner().is_empty());
    }

    #[test]
    fn byte_stream_above_the_former_document_ceiling_is_read_in_full() {
        let length = 128 * 1024 * 1024 + 1;
        let bytes = read(io::repeat(7).take(length as u64)).unwrap();
        assert_eq!(bytes.len(), length);
        assert_eq!(bytes[0], 7);
        assert_eq!(bytes[length - 1], 7);
    }
}
