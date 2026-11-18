//! Borrowing MessagePack reader with input-backed sizes and iterative ownership.
//!
//! Container frames and their cleanup storage grow fallibly with the actual
//! input. Parsing and destruction never recurse through nested containers.

use std::collections::BTreeMap;
use std::ops::Deref;

/// The BinaryCIF container borrows strings and byte payloads from its input.
#[derive(Debug, PartialEq)]
pub(super) enum Value<'a> {
    Nil,
    Bool(bool),
    Int(i64),
    Uint(u64),
    Float(f64),
    Str(&'a str),
    Bin(&'a [u8]),
    Array(Vec<Value<'a>>),
    Map(BTreeMap<&'a str, Value<'a>>),
}

/// Retains the traversal storage needed to destroy its tree without recursion
/// or an allocation during cleanup, including after a later decoding error.
pub(super) struct Parsed<'a> {
    value: Option<Value<'a>>,
    cleanup: Vec<Value<'a>>,
}
impl<'a> Deref for Parsed<'a> {
    type Target = Value<'a>;
    fn deref(&self) -> &Self::Target {
        self.value.as_ref().expect("parsed value")
    }
}
impl std::fmt::Debug for Parsed<'_> {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("Parsed MessagePack value")
    }
}
impl PartialEq<Value<'_>> for Parsed<'_> {
    fn eq(&self, other: &Value<'_>) -> bool {
        self.deref() == other
    }
}
impl Drop for Parsed<'_> {
    fn drop(&mut self) {
        if let Some(value) = self.value.take() {
            dispose(value, &mut self.cleanup);
        }
    }
}

/// Dismantle one child at a time, retaining only its unfinished ancestors.
/// `cleanup` was reserved when those ancestors were observed by the parser.
fn dispose<'a>(mut value: Value<'a>, cleanup: &mut Vec<Value<'a>>) {
    loop {
        match value {
            Value::Array(mut values) => {
                if let Some(child) = values.pop() {
                    if !values.is_empty() {
                        cleanup.push(Value::Array(values));
                    }
                    value = child;
                    continue;
                }
            }
            Value::Map(mut values) => {
                if let Some((_, child)) = values.pop_last() {
                    if !values.is_empty() {
                        cleanup.push(Value::Map(values));
                    }
                    value = child;
                    continue;
                }
            }
            _ => {}
        }
        let Some(next) = cleanup.pop() else {
            break;
        };
        value = next;
    }
}

struct Frame<'a> {
    value: Value<'a>,
    remaining: usize,
    key: Option<&'a str>,
}

struct Parser<'a> {
    reader: Reader<'a>,
    frames: Vec<Frame<'a>>,
    pending: Option<Value<'a>>,
    cleanup: Vec<Value<'a>>,
}
impl Drop for Parser<'_> {
    fn drop(&mut self) {
        if let Some(value) = self.pending.take() {
            dispose(value, &mut self.cleanup);
        }
        while let Some(frame) = self.frames.pop() {
            dispose(frame.value, &mut self.cleanup);
        }
    }
}
impl<'a> Parser<'a> {
    fn open(&mut self, length: usize, map: bool) -> Result<(), String> {
        let remaining = length
            .checked_mul(if map { 2 } else { 1 })
            .ok_or("BinaryCIF MessagePack container length overflows")?;
        if remaining > self.reader.bytes.len() - self.reader.offset {
            return Err("BinaryCIF MessagePack container is truncated".into());
        }
        let value = if map {
            Value::Map(BTreeMap::new())
        } else {
            Value::Array(eigenvista_core::allocation::buffer(
                length,
                "BinaryCIF MessagePack array",
            )?)
        };
        if remaining == 0 {
            self.pending = Some(value);
            return Ok(());
        }
        self.frames
            .try_reserve(1)
            .map_err(|error| format!("Cannot allocate MessagePack container frames: {error}"))?;
        let depth = self
            .frames
            .len()
            .checked_add(1)
            .ok_or("MessagePack traversal depth overflow")?;
        if self.cleanup.capacity() < depth {
            self.cleanup.try_reserve(depth).map_err(|error| {
                format!("Cannot allocate MessagePack cleanup traversal: {error}")
            })?;
        }
        self.frames.push(Frame {
            value,
            remaining,
            key: None,
        });
        Ok(())
    }

    fn finish_pending(&mut self) -> Result<bool, String> {
        let Some(frame) = self.frames.last_mut() else {
            return Ok(true);
        };
        match &mut frame.value {
            Value::Array(values) => values.push(self.pending.take().expect("pending child")),
            Value::Map(values) => {
                if let Some(key) = frame.key.take() {
                    values.insert(key, self.pending.take().expect("pending map value"));
                } else {
                    let Some(Value::Str(key)) = self.pending.as_ref() else {
                        return Err("BinaryCIF MessagePack maps require string keys".into());
                    };
                    if values.contains_key(key) {
                        return Err("BinaryCIF MessagePack map has duplicate keys".into());
                    }
                    frame.key = Some(*key);
                    self.pending = None;
                }
            }
            _ => unreachable!("container frame"),
        }
        frame.remaining -= 1;
        if frame.remaining == 0 {
            self.pending = Some(self.frames.pop().expect("completed container").value);
        }
        Ok(false)
    }

    fn parse(mut self) -> Result<Parsed<'a>, String> {
        loop {
            if self.pending.is_some() {
                if self.finish_pending()? {
                    if self.reader.offset != self.reader.bytes.len() {
                        return Err("BinaryCIF MessagePack has trailing bytes".into());
                    }
                    return Ok(Parsed {
                        value: self.pending.take(),
                        cleanup: std::mem::take(&mut self.cleanup),
                    });
                }
                continue;
            }
            match self.reader.token()? {
                Token::Scalar(value) => self.pending = Some(value),
                Token::Array(length) => self.open(length, false)?,
                Token::Map(length) => self.open(length, true)?,
            }
        }
    }
}

/// Parse exactly one container, preserving the full unsigned range.
pub(super) fn parse(bytes: &[u8]) -> Result<Parsed<'_>, String> {
    Parser {
        reader: Reader { bytes, offset: 0 },
        frames: Vec::new(),
        pending: None,
        cleanup: Vec::new(),
    }
    .parse()
}

enum Token<'a> {
    Scalar(Value<'a>),
    Array(usize),
    Map(usize),
}
struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}
impl<'a> Reader<'a> {
    fn take(&mut self, length: usize) -> Result<&'a [u8], String> {
        let end = self
            .offset
            .checked_add(length)
            .ok_or("BinaryCIF MessagePack byte length overflows")?;
        let value = self
            .bytes
            .get(self.offset..end)
            .ok_or("BinaryCIF MessagePack is truncated")?;
        self.offset = end;
        Ok(value)
    }
    fn fixed<const N: usize>(&mut self) -> Result<[u8; N], String> {
        let mut bytes = [0; N];
        bytes.copy_from_slice(self.take(N)?);
        Ok(bytes)
    }
    fn length(&mut self, width: usize) -> Result<usize, String> {
        let value = self
            .take(width)?
            .iter()
            .fold(0u64, |value, &byte| (value << 8) | u64::from(byte));
        usize::try_from(value).map_err(|_| "BinaryCIF MessagePack length overflows".into())
    }
    fn text(&mut self, length: usize) -> Result<Token<'a>, String> {
        std::str::from_utf8(self.take(length)?)
            .map(|value| Token::Scalar(Value::Str(value)))
            .map_err(|_| "BinaryCIF MessagePack contains invalid UTF-8".into())
    }
    fn token(&mut self) -> Result<Token<'a>, String> {
        Ok(match self.take(1)?[0] {
            0x00..=0x7f => Token::Scalar(Value::Uint(u64::from(self.bytes[self.offset - 1]))),
            marker @ 0x80..=0x8f => Token::Map(usize::from(marker & 0x0f)),
            marker @ 0x90..=0x9f => Token::Array(usize::from(marker & 0x0f)),
            marker @ 0xa0..=0xbf => self.text(usize::from(marker & 0x1f))?,
            0xc0 => Token::Scalar(Value::Nil),
            0xc2 => Token::Scalar(Value::Bool(false)),
            0xc3 => Token::Scalar(Value::Bool(true)),
            0xc4 => {
                let n = self.length(1)?;
                Token::Scalar(Value::Bin(self.take(n)?))
            }
            0xc5 => {
                let n = self.length(2)?;
                Token::Scalar(Value::Bin(self.take(n)?))
            }
            0xc6 => {
                let n = self.length(4)?;
                Token::Scalar(Value::Bin(self.take(n)?))
            }
            0xca => Token::Scalar(Value::Float(f64::from(f32::from_be_bytes(self.fixed()?)))),
            0xcb => Token::Scalar(Value::Float(f64::from_be_bytes(self.fixed()?))),
            0xcc => Token::Scalar(Value::Uint(u64::from(u8::from_be_bytes(self.fixed()?)))),
            0xcd => Token::Scalar(Value::Uint(u64::from(u16::from_be_bytes(self.fixed()?)))),
            0xce => Token::Scalar(Value::Uint(u64::from(u32::from_be_bytes(self.fixed()?)))),
            0xcf => Token::Scalar(Value::Uint(u64::from_be_bytes(self.fixed()?))),
            0xd0 => Token::Scalar(Value::Int(i64::from(i8::from_be_bytes(self.fixed()?)))),
            0xd1 => Token::Scalar(Value::Int(i64::from(i16::from_be_bytes(self.fixed()?)))),
            0xd2 => Token::Scalar(Value::Int(i64::from(i32::from_be_bytes(self.fixed()?)))),
            0xd3 => Token::Scalar(Value::Int(i64::from_be_bytes(self.fixed()?))),
            0xd9 => {
                let n = self.length(1)?;
                self.text(n)?
            }
            0xda => {
                let n = self.length(2)?;
                self.text(n)?
            }
            0xdb => {
                let n = self.length(4)?;
                self.text(n)?
            }
            0xdc => Token::Array(self.length(2)?),
            0xdd => Token::Array(self.length(4)?),
            0xde => Token::Map(self.length(2)?),
            0xdf => Token::Map(self.length(4)?),
            marker @ 0xe0..=0xff => {
                Token::Scalar(Value::Int(i64::from(i8::from_be_bytes([marker]))))
            }
            _ => return Err("Unsupported BinaryCIF MessagePack marker or extension type".into()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_numeric_widths_preserve_signedness_and_bits() {
        let cases: &[(&[u8], Value<'_>)] = &[
            (&[0x7f], Value::Uint(127)),
            (&[0xff], Value::Int(-1)),
            (&[0xcc, 0xff], Value::Uint(255)),
            (&[0xcd, 0xff, 0xff], Value::Uint(65535)),
            (
                &[0xce, 0xff, 0xff, 0xff, 0xff],
                Value::Uint(u64::from(u32::MAX)),
            ),
            (
                &[0xcf, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff],
                Value::Uint(u64::MAX),
            ),
            (&[0xd0, 0x80], Value::Int(i64::from(i8::MIN))),
            (&[0xd1, 0x80, 0x00], Value::Int(i64::from(i16::MIN))),
            (
                &[0xd2, 0x80, 0x00, 0x00, 0x00],
                Value::Int(i64::from(i32::MIN)),
            ),
            (
                &[0xd3, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                Value::Int(i64::MIN),
            ),
            (&[0xca, 0x3f, 0xc0, 0x00, 0x00], Value::Float(1.5)),
            (
                &[0xcb, 0x3f, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
                Value::Float(1.5),
            ),
            (&[0xc0], Value::Nil),
            (&[0xc2], Value::Bool(false)),
            (&[0xc3], Value::Bool(true)),
        ];
        for (bytes, expected) in cases {
            assert_eq!(&parse(bytes).unwrap(), expected, "{bytes:?}");
        }
    }

    #[test]
    fn containers_and_payloads_borrow_the_original_input() {
        let bytes = [
            0x82, 0xa1, b'a', 0x92, 0xc0, 0xc3, 0xa1, b'b', 0xc4, 2, 7, 9,
        ];
        let parsed = parse(&bytes).unwrap();
        let Value::Map(map) = &*parsed else {
            panic!("map")
        };
        assert_eq!(map["a"], Value::Array(vec![Value::Nil, Value::Bool(true)]));
        let Value::Bin(payload) = map["b"] else {
            panic!("binary")
        };
        assert_eq!(payload.as_ptr(), bytes[10..].as_ptr());
        assert_eq!(map.keys().next().unwrap().as_ptr(), bytes[2..].as_ptr());
        for bytes in [vec![0x90], vec![0xdc, 0, 0], vec![0xdd, 0, 0, 0, 0]] {
            assert_eq!(parse(&bytes).unwrap(), Value::Array(vec![]));
        }
        for bytes in [vec![0x80], vec![0xde, 0, 0], vec![0xdf, 0, 0, 0, 0]] {
            assert_eq!(parse(&bytes).unwrap(), Value::Map(BTreeMap::new()));
        }
    }

    #[test]
    fn string_and_binary_lengths_and_utf8_are_checked() {
        for prefix in [
            vec![0xa2],
            vec![0xd9, 2],
            vec![0xda, 0, 2],
            vec![0xdb, 0, 0, 0, 2],
        ] {
            let mut bytes = prefix;
            bytes.extend_from_slice("é".as_bytes());
            assert_eq!(parse(&bytes).unwrap(), Value::Str("é"));
        }
        for prefix in [vec![0xc4, 2], vec![0xc5, 0, 2], vec![0xc6, 0, 0, 0, 2]] {
            let mut bytes = prefix;
            bytes.extend_from_slice(&[0xff, 0xfe]);
            assert_eq!(parse(&bytes).unwrap(), Value::Bin(&[0xff, 0xfe]));
        }
        assert!(parse(&[0xa1, 0xff]).unwrap_err().contains("UTF-8"));
    }

    #[test]
    fn malformed_truncated_and_ambiguous_containers_fail_without_panicking() {
        for bytes in [
            &[][..],
            &[0xd3, 0],
            &[0xcb, 0],
            &[0xa2, b'a'],
            &[0xc4, 3, 1],
            &[0x92, 0xc0],
            &[0x81, 0xa1, b'a'],
            &[0x81, 0, 0xc0],
            &[0x82, 0xa1, b'a', 0, 0xa1, b'a', 1],
            &[0xc0, 0xc0],
            &[0xc1],
            &[0xc7, 0, 0],
            &[0xd4, 0, 0],
            &[0xdb, 0xff, 0xff, 0xff, 0xff],
            &[0xc6, 0xff, 0xff, 0xff, 0xff],
            &[0xdd, 0xff, 0xff, 0xff, 0xff],
            &[0xdf, 0xff, 0xff, 0xff, 0xff],
        ] {
            let outcome = std::panic::catch_unwind(|| parse(bytes));
            assert!(matches!(outcome, Ok(Err(_))), "{bytes:?}");
        }
    }

    #[test]
    fn deep_values_and_error_cleanup_use_allocated_traversal_without_recursion() {
        let depth = 10_000;
        let mut nested = vec![0x91; depth];
        nested.push(0xc0);
        let parsed = parse(&nested).unwrap();
        let mut current = &*parsed;
        for _ in 0..depth {
            let Value::Array(children) = current else {
                panic!("array level")
            };
            current = &children[0];
        }
        assert_eq!(*current, Value::Nil);
        drop(parsed);

        // Each ancestor retains a sibling during cleanup. The existing stack
        // must cover the depth without reserving room for every tree node.
        let mut branched = Vec::new();
        for _ in 0..depth {
            branched.extend_from_slice(&[0x92, 0xc0]);
        }
        branched.push(0xc0);
        let mut parsed = parse(&branched).unwrap();
        let capacity = parsed.cleanup.capacity();
        let value = parsed.value.take().unwrap();
        dispose(value, &mut parsed.cleanup);
        assert!(parsed.cleanup.is_empty());
        assert_eq!(parsed.cleanup.capacity(), capacity);

        let mut invalid = vec![0x92];
        invalid.extend_from_slice(&nested);
        invalid.push(0xc1);
        assert!(parse(&invalid).unwrap_err().contains("Unsupported"));

        let mut truncated = vec![0x91; depth];
        truncated.push(0xa1);
        assert!(parse(&truncated).unwrap_err().contains("truncated"));

        let mut invalid_key = vec![0x81];
        invalid_key.extend_from_slice(&nested);
        invalid_key.push(0xc0);
        assert!(parse(&invalid_key).unwrap_err().contains("string keys"));

        let mut duplicate = vec![0x82, 0xa1, b'a'];
        duplicate.extend_from_slice(&nested);
        duplicate.extend_from_slice(&[0xa1, b'a', 0xc0]);
        assert!(parse(&duplicate).unwrap_err().contains("duplicate keys"));

        assert!(
            parse(&[0xdd, 0xff, 0xff, 0xff, 0xff])
                .unwrap_err()
                .contains("truncated")
        );
        let mut wide = vec![0x92, 0xdd, 0x00, 0x07, 0xa1, 0x20];
        wide.extend(std::iter::repeat_n(0xc0, 500_000));
        wide.extend_from_slice(&[0xdd, 0x00, 0x07, 0xa1, 0x20]);
        wide.extend(std::iter::repeat_n(0xc0, 500_000));
        let parsed = parse(&wide).unwrap();
        let Value::Array(children) = &*parsed else {
            panic!("wide arrays")
        };
        assert_eq!(children.len(), 2);
        assert!(
            children
                .iter()
                .all(|child| matches!(child, Value::Array(values) if values.len() == 500_000))
        );
    }
}
