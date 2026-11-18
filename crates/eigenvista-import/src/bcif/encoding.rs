//! Checked inverse transforms for the BinaryCIF column encoding pipeline.

use super::messagepack::Value;
use std::collections::BTreeMap;

pub(super) type Record<'a> = BTreeMap<&'a str, Value<'a>>;
pub(super) fn object<'a>(value: &'a Value<'a>) -> Result<&'a Record<'a>, String> {
    match value {
        Value::Map(value) => Ok(value),
        _ => Err("BinaryCIF expected an object".into()),
    }
}
pub(super) fn field<'a>(record: &'a Record<'a>, key: &str) -> Result<&'a Value<'a>, String> {
    record
        .get(key)
        .ok_or_else(|| format!("BinaryCIF is missing {key}"))
}
pub(super) fn text<'a>(value: &'a Value<'a>) -> Result<&'a str, String> {
    match value {
        Value::Str(value) => Ok(value),
        _ => Err("BinaryCIF expected text".into()),
    }
}
pub(super) fn array<'a>(value: &'a Value<'a>) -> Result<&'a [Value<'a>], String> {
    match value {
        Value::Array(value) => Ok(value),
        _ => Err("BinaryCIF expected an array".into()),
    }
}
pub(super) fn bytes<'a>(value: &'a Value<'a>) -> Result<&'a [u8], String> {
    match value {
        Value::Bin(value) => Ok(value),
        _ => Err("BinaryCIF expected binary column bytes".into()),
    }
}
pub(super) fn integer(value: &Value<'_>) -> Result<i64, String> {
    match value {
        Value::Int(value) => Ok(*value),
        Value::Uint(value) => {
            i64::try_from(*value).map_err(|_| "BinaryCIF integer exceeds i64".into())
        }
        _ => Err("BinaryCIF expected an integer".into()),
    }
}
pub(super) fn count(value: &Value<'_>) -> Result<usize, String> {
    usize::try_from(integer(value)?).map_err(|_| "BinaryCIF count is negative or too large".into())
}
fn number(value: &Value<'_>) -> Result<f64, String> {
    let number = match value {
        Value::Float(v) => *v,
        _ => integer(value)? as f64,
    };
    if !number.is_finite() {
        return Err("BinaryCIF parameter must be finite".into());
    }
    Ok(number)
}

#[derive(Debug, PartialEq)]
pub(super) enum Column<'a> {
    Raw(&'a [u8]),
    Int(Vec<i64>),
    Float(Vec<f64>),
    Text(Vec<&'a str>),
}
impl Column<'_> {
    pub fn len(&self) -> usize {
        match self {
            Self::Raw(v) => v.len(),
            Self::Int(v) => v.len(),
            Self::Float(v) => v.len(),
            Self::Text(v) => v.len(),
        }
    }
    pub fn ints(self) -> Result<Vec<i64>, String> {
        match self {
            Self::Int(v) => Ok(v),
            _ => Err("BinaryCIF transform requires an integer array".into()),
        }
    }
}

/// A declared integer destination has typed-array wrapping semantics in CIFTools.
fn typed_integer(value: i64, kind: i64) -> Result<i64, String> {
    Ok(match kind {
        1 => i64::from(value as i8),
        2 => i64::from(value as i16),
        3 => i64::from(value as i32),
        4 => i64::from(value as u8),
        5 => i64::from(value as u16),
        6 => i64::from(value as u32),
        _ => return Err("BinaryCIF invalid integer srcType".into()),
    })
}
fn typed_float(value: f64, kind: i64) -> Result<f64, String> {
    match kind {
        32 => Ok(f64::from(value as f32)),
        33 => Ok(value),
        _ => Err("BinaryCIF invalid floating srcType".into()),
    }
}

fn byte_array<'a>(input: Column<'a>, encoding: &Record<'_>) -> Result<Column<'a>, String> {
    let Column::Raw(raw) = input else {
        return Err("BinaryCIF ByteArray must decode raw bytes".into());
    };
    let kind = integer(field(encoding, "type")?)?;
    let width = match kind {
        1 | 4 => 1,
        2 | 5 => 2,
        3 | 6 | 32 => 4,
        33 => 8,
        _ => return Err("BinaryCIF unsupported ByteArray type".into()),
    };
    if raw.len() % width != 0 {
        return Err("BinaryCIF misaligned numeric bytes".into());
    }
    let len = raw.len() / width;
    if kind >= 32 {
        let mut values = eigenvista_core::allocation::buffer(len, "BinaryCIF decoded column")?;
        for chunk in raw.chunks_exact(width) {
            let value = if kind == 32 {
                f64::from(f32::from_le_bytes(
                    chunk.try_into().map_err(|_| "BinaryCIF float width")?,
                ))
            } else {
                f64::from_le_bytes(chunk.try_into().map_err(|_| "BinaryCIF float width")?)
            };
            values.push(value);
        }
        return Ok(Column::Float(values));
    }
    let mut values = eigenvista_core::allocation::buffer(len, "BinaryCIF decoded column")?;
    for chunk in raw.chunks_exact(width) {
        let value = match kind {
            1 => i64::from(chunk[0] as i8),
            4 => i64::from(chunk[0]),
            2 => i64::from(i16::from_le_bytes(
                chunk.try_into().map_err(|_| "BinaryCIF integer width")?,
            )),
            5 => i64::from(u16::from_le_bytes(
                chunk.try_into().map_err(|_| "BinaryCIF integer width")?,
            )),
            3 => i64::from(i32::from_le_bytes(
                chunk.try_into().map_err(|_| "BinaryCIF integer width")?,
            )),
            6 => i64::from(u32::from_le_bytes(
                chunk.try_into().map_err(|_| "BinaryCIF integer width")?,
            )),
            _ => unreachable!(),
        };
        values.push(value);
    }
    Ok(Column::Int(values))
}

fn integer_transform<'a>(
    input: Column<'a>,
    encoding: &Record<'_>,
    kind: &str,
) -> Result<Column<'a>, String> {
    let values = input.ints()?;
    if kind == "Delta" {
        let mut values = values;
        let mut previous = integer(field(encoding, "origin")?)?;
        let src = integer(field(encoding, "srcType")?)?;
        typed_integer(0, src)?;
        for value in &mut values {
            previous = typed_integer(
                previous
                    .checked_add(*value)
                    .ok_or("BinaryCIF delta overflow")?,
                src,
            )?;
            *value = previous;
        }
        return Ok(Column::Int(values));
    }
    let size = count(field(encoding, "srcSize")?)?;
    // Validate declared expansion against the supplied compressed values before reserving.
    if kind == "RunLength" {
        if values.len() % 2 != 0 {
            return Err("BinaryCIF odd run-length array".into());
        }
        let expanded = values
            .as_chunks::<2>()
            .0
            .iter()
            .try_fold(0usize, |total, pair| {
                let count =
                    usize::try_from(pair[1]).map_err(|_| "BinaryCIF negative repeat count")?;
                total
                    .checked_add(count)
                    .ok_or("BinaryCIF run-length count overflow")
            })?;
        if expanded != size {
            return Err("BinaryCIF decoded srcSize mismatch".into());
        }
    } else if size > values.len() {
        return Err("BinaryCIF packed srcSize exceeds its encoded value count".into());
    }
    let mut output = eigenvista_core::allocation::buffer(size, "BinaryCIF decoded column")?;
    if kind == "RunLength" {
        if values.len() % 2 != 0 {
            return Err("BinaryCIF odd run-length array".into());
        }
        let src = integer(field(encoding, "srcType")?)?;
        typed_integer(0, src)?;
        for pair in values.as_chunks::<2>().0 {
            let repeats =
                usize::try_from(pair[1]).map_err(|_| "BinaryCIF negative repeat count")?;
            let end = output
                .len()
                .checked_add(repeats)
                .filter(|end| *end <= size)
                .ok_or("BinaryCIF run-length exceeds srcSize")?;
            output.resize(end, typed_integer(pair[0], src)?);
        }
    } else {
        let width = integer(field(encoding, "byteCount")?)?;
        let unsigned = match field(encoding, "isUnsigned")? {
            Value::Bool(v) => *v,
            _ => return Err("BinaryCIF isUnsigned must be boolean".into()),
        };
        let (lower, upper) = match (width, unsigned) {
            (1, false) => (-128, 127),
            (2, false) => (-32768, 32767),
            (1, true) => (0, 255),
            (2, true) => (0, 65535),
            _ => return Err("BinaryCIF packing byteCount must be one or two".into()),
        };
        let mut sum = 0i64;
        let mut continuing = false;
        for value in values {
            if value < lower || value > upper {
                return Err("BinaryCIF packed value outside its byte width".into());
            }
            sum = sum
                .checked_add(value)
                .ok_or("BinaryCIF integer packing overflow")?;
            continuing = value == upper || (!unsigned && value == lower);
            if continuing {
                continue;
            }
            if output.len() == size {
                return Err("BinaryCIF packing exceeds srcSize".into());
            }
            // Unsigned describes the packed words; the decoded destination is
            // signed Int32. Uint32 columns use ByteArray directly.
            if i32::try_from(sum).is_err() {
                return Err("BinaryCIF packed integer exceeds 32 bits".into());
            }
            output.push(sum);
            sum = 0;
        }
        if continuing {
            return Err("BinaryCIF unterminated integer packing".into());
        }
    }
    if output.len() != size {
        return Err("BinaryCIF decoded srcSize mismatch".into());
    }
    Ok(Column::Int(output))
}

fn float_transform<'a>(
    input: Column<'a>,
    encoding: &Record<'_>,
    kind: &str,
) -> Result<Column<'a>, String> {
    let input = input.ints()?;
    let src = integer(field(encoding, "srcType")?)?;
    typed_float(0., src)?;
    let mut output = eigenvista_core::allocation::buffer(input.len(), "BinaryCIF decoded column")?;
    if kind == "FixedPoint" {
        let factor = number(field(encoding, "factor")?)?;
        if factor == 0. {
            return Err("BinaryCIF fixed-point factor is zero".into());
        }
        for value in input {
            output.push(typed_float(value as f64 / factor, src)?);
        }
    } else {
        let min = number(field(encoding, "min")?)?;
        let max = number(field(encoding, "max")?)?;
        let steps = integer(field(encoding, "numSteps")?)?;
        if max < min || steps < 2 {
            return Err("BinaryCIF invalid quantization interval".into());
        }
        let delta = (max - min) / (steps - 1) as f64;
        for value in input {
            if value < 0 || value >= steps {
                return Err("BinaryCIF quantized index outside interval".into());
            }
            output.push(typed_float(min + value as f64 * delta, src)?);
        }
    }
    Ok(Column::Float(output))
}

/// Apply inverse transforms using an allocation-backed continuation stack. Nested
/// string dictionaries share the same engine and never recurse on the Rust stack.
pub(super) fn decode<'a>(encoded: &'a Record<'a>) -> Result<Column<'a>, String> {
    let encodings = array(field(encoded, "encoding")?)?;
    let raw = bytes(field(encoded, "data")?)?;
    let mut tasks = Vec::new();
    schedule_chain(&mut tasks, encodings)?;
    let mut current = Some(Column::Raw(raw));
    while let Some(task) = tasks.pop() {
        match task {
            DecodeTask::Apply { encodings, index } => {
                let encoding = object(&encodings[index])?;
                let kind = text(field(encoding, "kind")?)?;
                if index > 0 {
                    eigenvista_core::allocation::push(
                        &mut tasks,
                        DecodeTask::Apply {
                            encodings,
                            index: index - 1,
                        },
                        "BinaryCIF decoding tasks",
                    )?;
                }
                let input = current.take().ok_or("BinaryCIF missing transform input")?;
                if kind == "StringArray" {
                    let Column::Raw(raw) = input else {
                        return Err("BinaryCIF StringArray requires raw bytes".into());
                    };
                    eigenvista_core::allocation::push(
                        &mut tasks,
                        DecodeTask::Indices { encoding },
                        "BinaryCIF decoding tasks",
                    )?;
                    schedule_chain(&mut tasks, array(field(encoding, "dataEncoding")?)?)?;
                    current = Some(Column::Raw(raw));
                } else {
                    current = Some(match kind {
                        "ByteArray" => byte_array(input, encoding)?,
                        "Delta" | "RunLength" | "IntegerPacking" => {
                            integer_transform(input, encoding, kind)?
                        }
                        "FixedPoint" | "IntervalQuantization" => {
                            float_transform(input, encoding, kind)?
                        }
                        _ => return Err(format!("BinaryCIF unsupported encoding {kind}")),
                    });
                }
            }
            DecodeTask::Indices { encoding } => {
                let indices = current
                    .take()
                    .ok_or("BinaryCIF missing dictionary indices")?
                    .ints()?;
                eigenvista_core::allocation::push(
                    &mut tasks,
                    DecodeTask::Offsets { encoding, indices },
                    "BinaryCIF decoding tasks",
                )?;
                schedule_chain(&mut tasks, array(field(encoding, "offsetEncoding")?)?)?;
                current = Some(Column::Raw(bytes(field(encoding, "offsets")?)?));
            }
            DecodeTask::Offsets { encoding, indices } => {
                let offsets = current
                    .take()
                    .ok_or("BinaryCIF missing dictionary offsets")?
                    .ints()?;
                current = Some(string_values(indices, offsets, encoding)?);
            }
        }
    }
    let result = current.ok_or("BinaryCIF encoding did not decode its bytes")?;
    if matches!(result, Column::Raw(_)) {
        return Err("BinaryCIF encoding did not decode its bytes".into());
    }
    Ok(result)
}

enum DecodeTask<'a> {
    Apply {
        encodings: &'a [Value<'a>],
        index: usize,
    },
    Indices {
        encoding: &'a Record<'a>,
    },
    Offsets {
        encoding: &'a Record<'a>,
        indices: Vec<i64>,
    },
}

fn schedule_chain<'a>(
    tasks: &mut Vec<DecodeTask<'a>>,
    encodings: &'a [Value<'a>],
) -> Result<(), String> {
    let index = encodings
        .len()
        .checked_sub(1)
        .ok_or("BinaryCIF encoding chain is empty")?;
    eigenvista_core::allocation::push(
        tasks,
        DecodeTask::Apply { encodings, index },
        "BinaryCIF decoding tasks",
    )
}

fn string_values<'a>(
    indices: Vec<i64>,
    offsets: Vec<i64>,
    encoding: &'a Record<'a>,
) -> Result<Column<'a>, String> {
    let data = text(field(encoding, "stringData")?)?;
    if offsets.first() != Some(&0) {
        return Err("BinaryCIF dictionary offsets must start at zero".into());
    }
    let last = *offsets
        .last()
        .ok_or("BinaryCIF missing dictionary offsets")?;
    let utf16 = data.encode_utf16().count();
    let codepoints = data.chars().count();
    let use_codepoints = last
        == i64::try_from(codepoints).map_err(|_| "BinaryCIF dictionary too large")?
        && codepoints != utf16;
    let total = if use_codepoints { codepoints } else { utf16 };
    if usize::try_from(last).ok() != Some(total) {
        return Err("BinaryCIF dictionary offsets do not cover its string data".into());
    }
    let mut boundaries =
        eigenvista_core::allocation::buffer(offsets.len(), "BinaryCIF decoded column")?;
    let mut chars = data.char_indices();
    let mut units = 0;
    let mut byte = 0;
    for offset in offsets {
        let target = usize::try_from(offset).map_err(|_| "BinaryCIF negative string offset")?;
        if target < units {
            return Err("BinaryCIF descending or split-surrogate string offsets".into());
        }
        while units < target {
            let (start, ch) = chars
                .next()
                .ok_or("BinaryCIF string offset is out of bounds")?;
            units += if use_codepoints { 1 } else { ch.len_utf16() };
            byte = start + ch.len_utf8();
        }
        if units != target {
            return Err("BinaryCIF string offset splits a surrogate pair".into());
        }
        boundaries.push(byte);
    }
    let mut output =
        eigenvista_core::allocation::buffer(indices.len(), "BinaryCIF decoded column")?;
    for index in indices {
        if index < -1 {
            return Err("BinaryCIF negative dictionary index is not the -1 sentinel".into());
        }
        if index == -1 {
            output.push("");
            continue;
        }
        let index = usize::try_from(index).map_err(|_| "BinaryCIF string index too large")?;
        let next = index
            .checked_add(1)
            .ok_or("BinaryCIF string index overflow")?;
        let start = *boundaries
            .get(index)
            .ok_or("BinaryCIF dictionary index is absent")?;
        let end = *boundaries
            .get(next)
            .ok_or("BinaryCIF dictionary index is absent")?;
        output.push(
            data.get(start..end)
                .ok_or("BinaryCIF invalid dictionary boundary")?,
        );
    }
    Ok(Column::Text(output))
}
