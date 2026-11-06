//! Borrowing MessagePack reader with bounds enforced before container allocation.
//!
//! BinaryCIF needs the scalar, array and string-keyed map subset of MessagePack.
//! Extension objects are rejected; every nested value and key consumes one node.

use std::collections::BTreeMap;

const MAX_NODES: usize = 1_000_000;
const MAX_DEPTH: usize = 64;

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

/// Parse exactly one bounded container, preserving the full unsigned range.
pub(super) fn parse(bytes: &[u8]) -> Result<Value<'_>, String> {
    let mut reader = Reader {
        bytes,
        offset: 0,
        nodes: 0,
    };
    let value = reader.value(0)?;
    if reader.offset != bytes.len() {
        return Err("BinaryCIF MessagePack has trailing bytes".into());
    }
    Ok(value)
}

struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
    nodes: usize,
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

    fn text(&mut self, length: usize) -> Result<Value<'a>, String> {
        std::str::from_utf8(self.take(length)?)
            .map(Value::Str)
            .map_err(|_| "BinaryCIF MessagePack contains invalid UTF-8".into())
    }

    /// Each container child occupies at least one byte and one remaining node.
    fn container_size(
        &self,
        length: usize,
        values_per_entry: usize,
        depth: usize,
    ) -> Result<(), String> {
        if depth >= MAX_DEPTH {
            return Err("BinaryCIF MessagePack exceeds the 64-level nesting budget".into());
        }
        let values = length
            .checked_mul(values_per_entry)
            .ok_or("BinaryCIF MessagePack container length overflows")?;
        if values > MAX_NODES - self.nodes {
            return Err("BinaryCIF MessagePack exceeds the 1000000-node budget".into());
        }
        if values > self.bytes.len() - self.offset {
            return Err("BinaryCIF MessagePack container is truncated".into());
        }
        Ok(())
    }

    fn array(&mut self, length: usize, depth: usize) -> Result<Value<'a>, String> {
        self.container_size(length, 1, depth)?;
        let mut values = Vec::new();
        values
            .try_reserve_exact(length)
            .map_err(|_| "Cannot allocate the bounded BinaryCIF MessagePack array")?;
        for _ in 0..length {
            values.push(self.value(depth + 1)?);
        }
        Ok(Value::Array(values))
    }

    fn map(&mut self, length: usize, depth: usize) -> Result<Value<'a>, String> {
        self.container_size(length, 2, depth)?;
        let mut values = BTreeMap::new();
        for _ in 0..length {
            let Value::Str(key) = self.value(depth + 1)? else {
                return Err("BinaryCIF MessagePack maps require string keys".into());
            };
            if values.contains_key(key) {
                return Err("BinaryCIF MessagePack map has duplicate keys".into());
            }
            values.insert(key, self.value(depth + 1)?);
        }
        Ok(Value::Map(values))
    }

    fn value(&mut self, depth: usize) -> Result<Value<'a>, String> {
        if depth > MAX_DEPTH {
            return Err("BinaryCIF MessagePack exceeds the 64-level nesting budget".into());
        }
        if self.nodes == MAX_NODES {
            return Err("BinaryCIF MessagePack exceeds the 1000000-node budget".into());
        }
        self.nodes += 1;
        let [marker] = self.fixed::<1>()?;
        Ok(match marker {
            0x00..=0x7f => Value::Uint(u64::from(marker)),
            0x80..=0x8f => self.map(usize::from(marker & 0x0f), depth)?,
            0x90..=0x9f => self.array(usize::from(marker & 0x0f), depth)?,
            0xa0..=0xbf => self.text(usize::from(marker & 0x1f))?,
            0xc0 => Value::Nil,
            0xc2 => Value::Bool(false),
            0xc3 => Value::Bool(true),
            0xc4..=0xc6 => {
                let length = self.length(1 << (marker - 0xc4))?;
                Value::Bin(self.take(length)?)
            }
            0xca => Value::Float(f64::from(f32::from_be_bytes(self.fixed()?))),
            0xcb => Value::Float(f64::from_be_bytes(self.fixed()?)),
            0xcc => Value::Uint(u64::from(u8::from_be_bytes(self.fixed()?))),
            0xcd => Value::Uint(u64::from(u16::from_be_bytes(self.fixed()?))),
            0xce => Value::Uint(u64::from(u32::from_be_bytes(self.fixed()?))),
            0xcf => Value::Uint(u64::from_be_bytes(self.fixed()?)),
            0xd0 => Value::Int(i64::from(i8::from_be_bytes(self.fixed()?))),
            0xd1 => Value::Int(i64::from(i16::from_be_bytes(self.fixed()?))),
            0xd2 => Value::Int(i64::from(i32::from_be_bytes(self.fixed()?))),
            0xd3 => Value::Int(i64::from_be_bytes(self.fixed()?)),
            0xd9..=0xdb => {
                let length = self.length(1 << (marker - 0xd9))?;
                self.text(length)?
            }
            0xdc | 0xdd => {
                let length = self.length(2 << (marker - 0xdc))?;
                self.array(length, depth)?
            }
            0xde | 0xdf => {
                let length = self.length(2 << (marker - 0xde))?;
                self.map(length, depth)?
            }
            0xe0..=0xff => Value::Int(i64::from(i8::from_be_bytes([marker]))),
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
        let Value::Map(map) = parse(&bytes).unwrap() else {
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
    fn nesting_and_aggregate_nodes_are_bounded_before_reservation() {
        let mut nesting = vec![0x91; MAX_DEPTH];
        nesting.push(0xc0);
        assert!(parse(&nesting).is_ok());
        nesting.insert(0, 0x91);
        assert!(parse(&nesting).unwrap_err().contains("nesting"));
        let mut empty_nested = vec![0x91; MAX_DEPTH];
        empty_nested.push(0x90);
        assert!(parse(&empty_nested).unwrap_err().contains("nesting"));

        // The root itself consumes a node, so this declared million-element
        // array must be rejected before even considering a reserve or payload.
        assert!(
            parse(&[0xdd, 0x00, 0x0f, 0x42, 0x40])
                .unwrap_err()
                .contains("node")
        );
        let mut bytes = vec![0x92, 0xdd, 0x00, 0x07, 0xa1, 0x20];
        bytes.extend(std::iter::repeat_n(0xc0, 500_000));
        bytes.extend_from_slice(&[0xdd, 0x00, 0x07, 0xa1, 0x20]);
        bytes.extend(std::iter::repeat_n(0xc0, 500_000));
        assert!(parse(&bytes).unwrap_err().contains("node"));
    }
}
