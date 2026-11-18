//! Independent protocol examples, invalid expansions and allocation-driven transport checks.

use super::encoding::{Column, Record, decode};
use super::messagepack::Value;
use std::collections::BTreeMap;

fn obj<'a>(entries: impl IntoIterator<Item = (&'a str, Value<'a>)>) -> Value<'a> {
    Value::Map(BTreeMap::from_iter(entries))
}
fn byte_array(kind: i64) -> Value<'static> {
    obj([
        ("kind", Value::Str("ByteArray")),
        ("type", Value::Int(kind)),
    ])
}
fn encoded<'a>(raw: &'a [u8], encodings: Vec<Value<'a>>) -> Record<'a> {
    BTreeMap::from([
        ("data", Value::Bin(raw)),
        ("encoding", Value::Array(encodings)),
    ])
}
fn transform(
    kind: &'static str,
    fields: impl IntoIterator<Item = (&'static str, Value<'static>)>,
) -> Value<'static> {
    let mut result = BTreeMap::from_iter(fields);
    result.insert("kind", Value::Str(kind));
    Value::Map(result)
}

#[test]
fn little_endian_byte_arrays_cover_all_eight_numeric_types() {
    for (kind, raw, expected) in [
        (1, vec![0xff, 0x7f], vec![-1, 127]),
        (2, vec![0xff, 0xff, 0x00, 0x01], vec![-1, 256]),
        (3, vec![0xff, 0xff, 0xff, 0xff, 0, 0, 1, 0], vec![-1, 65536]),
        (4, vec![0, 255], vec![0, 255]),
        (5, vec![0xff, 0xff, 0, 1], vec![65535, 256]),
        (
            6,
            vec![0xff, 0xff, 0xff, 0xff, 0, 0, 1, 0],
            vec![4294967295, 65536],
        ),
    ] {
        assert_eq!(
            decode(&encoded(&raw, vec![byte_array(kind)])).unwrap(),
            Column::Int(expected)
        );
    }
    assert_eq!(
        decode(&encoded(
            &[0, 0, 128, 63, 0, 0, 0, 192],
            vec![byte_array(32)]
        ))
        .unwrap(),
        Column::Float(vec![1., -2.])
    );
    assert_eq!(
        decode(&encoded(
            &[0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 0, 192],
            vec![byte_array(33)]
        ))
        .unwrap(),
        Column::Float(vec![1., -2.])
    );
}

#[test]
fn inverse_pipeline_combines_run_length_and_delta_in_declared_order() {
    let delta = transform(
        "Delta",
        [("origin", Value::Int(10)), ("srcType", Value::Int(3))],
    );
    let rle = transform(
        "RunLength",
        [("srcSize", Value::Int(6)), ("srcType", Value::Int(3))],
    );
    assert_eq!(
        decode(&encoded(&[1, 4, 2, 2], vec![delta, rle, byte_array(1)])).unwrap(),
        Column::Int(vec![11, 12, 13, 14, 16, 18])
    );
    // CIFTools reconstructs each delta into the declared typed destination.
    let delta = transform(
        "Delta",
        [("origin", Value::Int(127)), ("srcType", Value::Int(1))],
    );
    assert_eq!(
        decode(&encoded(&[1, 1], vec![delta, byte_array(1)])).unwrap(),
        Column::Int(vec![-128, -127])
    );
}

#[test]
fn signed_unsigned_and_two_byte_integer_packing_preserve_extremes() {
    for (width, unsigned, raw_type, raw, expected) in [
        (1, false, 1, vec![127, 1, 128, 255, 0], vec![128, -129, 0]),
        (1, true, 4, vec![255, 255, 2, 3], vec![512, 3]),
        (
            2,
            false,
            2,
            vec![255, 127, 1, 0, 0, 128, 255, 255],
            vec![32768, -32769],
        ),
        (2, true, 5, vec![255, 255, 1, 0], vec![65536]),
    ] {
        let pack = transform(
            "IntegerPacking",
            [
                ("byteCount", Value::Int(width)),
                ("isUnsigned", Value::Bool(unsigned)),
                ("srcSize", Value::Int(expected.len() as i64)),
            ],
        );
        assert_eq!(
            decode(&encoded(&raw, vec![pack, byte_array(raw_type)])).unwrap(),
            Column::Int(expected)
        );
    }
}

#[test]
fn fixed_point_and_interval_quantization_respect_float_source_width() {
    let fixed = transform(
        "FixedPoint",
        [("factor", Value::Int(100)), ("srcType", Value::Int(33))],
    );
    assert_eq!(
        decode(&encoded(
            &[123, 0, 0, 0, 22, 255, 255, 255],
            vec![fixed, byte_array(3)]
        ))
        .unwrap(),
        Column::Float(vec![1.23, -2.34])
    );
    let fixed = transform(
        "FixedPoint",
        [("factor", Value::Int(10)), ("srcType", Value::Int(32))],
    );
    assert_eq!(
        decode(&encoded(&[12], vec![fixed, byte_array(1)])).unwrap(),
        Column::Float(vec![f64::from(1.2f32)])
    );
    let interval = transform(
        "IntervalQuantization",
        [
            ("min", Value::Float(1.)),
            ("max", Value::Float(2.)),
            ("numSteps", Value::Int(3)),
            ("srcType", Value::Int(33)),
        ],
    );
    assert_eq!(
        decode(&encoded(&[0, 1, 2], vec![interval, byte_array(1)])).unwrap(),
        Column::Float(vec![1., 1.5, 2.])
    );
}

#[test]
fn string_dictionaries_support_utf16_and_codepoint_offsets_without_character_tables() {
    for offsets in [[0i32, 1, 3, 4], [0, 1, 2, 3]] {
        let raw_offsets: Vec<_> = offsets.into_iter().flat_map(i32::to_le_bytes).collect();
        let strings = obj([
            ("kind", Value::Str("StringArray")),
            ("stringData", Value::Str("é𝔸x")),
            ("dataEncoding", Value::Array(vec![byte_array(1)])),
            ("offsetEncoding", Value::Array(vec![byte_array(3)])),
            ("offsets", Value::Bin(&raw_offsets)),
        ]);
        assert_eq!(
            decode(&encoded(&[2, 1, 0, 255], vec![strings])).unwrap(),
            Column::Text(vec!["x", "𝔸", "é", ""])
        );
    }
}

#[test]
fn malformed_transforms_and_excessive_expansions_fail_before_allocation() {
    let malformed = [
        encoded(&[0], vec![]),
        encoded(&[0], vec![obj([("kind", Value::Str("FutureEncoding"))])]),
        encoded(&[0], vec![byte_array(2)]),
        encoded(&[0], vec![byte_array(99)]),
        encoded(
            &[1, 255],
            vec![
                transform(
                    "RunLength",
                    [("srcSize", Value::Int(3)), ("srcType", Value::Int(3))],
                ),
                byte_array(1),
            ],
        ),
        encoded(
            &[1, 2],
            vec![
                transform(
                    "RunLength",
                    [("srcSize", Value::Int(1)), ("srcType", Value::Int(3))],
                ),
                byte_array(1),
            ],
        ),
        encoded(
            &[1, 1],
            vec![
                transform(
                    "RunLength",
                    [
                        ("srcSize", Value::Int(i64::MAX)),
                        ("srcType", Value::Int(3)),
                    ],
                ),
                byte_array(1),
            ],
        ),
        encoded(
            &[127],
            vec![
                transform(
                    "IntegerPacking",
                    [
                        ("byteCount", Value::Int(1)),
                        ("isUnsigned", Value::Bool(false)),
                        ("srcSize", Value::Int(1)),
                    ],
                ),
                byte_array(1),
            ],
        ),
        encoded(
            &[1],
            vec![
                transform(
                    "FixedPoint",
                    [("factor", Value::Int(0)), ("srcType", Value::Int(33))],
                ),
                byte_array(1),
            ],
        ),
        encoded(
            &[3],
            vec![
                transform(
                    "IntervalQuantization",
                    [
                        ("min", Value::Int(0)),
                        ("max", Value::Int(1)),
                        ("numSteps", Value::Int(3)),
                        ("srcType", Value::Int(33)),
                    ],
                ),
                byte_array(1),
            ],
        ),
    ];
    for (index, value) in malformed.into_iter().enumerate() {
        assert!(decode(&value).is_err(), "case {index} must be rejected");
    }
    assert!(eigenvista_core::allocation::buffer::<i64>(usize::MAX, "decoded column").is_err());
}

#[test]
fn invalid_dictionary_offsets_indices_and_pipeline_nesting_are_rejected() {
    for offsets in [[0i32, 2, 1, 3], [0, 1, 5, 6], [-1, 0, 2, 3], [0, 1, 2, 3]] {
        let raw_offsets: Vec<_> = offsets.into_iter().flat_map(i32::to_le_bytes).collect();
        let strings = obj([
            ("kind", Value::Str("StringArray")),
            ("stringData", Value::Str("é𝔸")),
            ("dataEncoding", Value::Array(vec![byte_array(1)])),
            ("offsetEncoding", Value::Array(vec![byte_array(3)])),
            ("offsets", Value::Bin(&raw_offsets)),
        ]);
        assert!(decode(&encoded(&[0], vec![strings])).is_err());
    }
    for indices in [[8u8], [254u8]] {
        let strings = obj([
            ("kind", Value::Str("StringArray")),
            ("stringData", Value::Str("C")),
            ("dataEncoding", Value::Array(vec![byte_array(1)])),
            ("offsetEncoding", Value::Array(vec![byte_array(1)])),
            ("offsets", Value::Bin(&[0, 1])),
        ]);
        assert!(decode(&encoded(&indices, vec![strings])).is_err());
    }
    let chain = (0..17).map(|_| byte_array(1)).collect();
    assert!(decode(&encoded(&[0], chain)).is_err());
}

#[test]
fn large_gzip_expansion_still_validates_the_actual_messagepack_payload() {
    use std::io::Write;
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
    let chunk = [0u8; 64 * 1024];
    for _ in 0..1025 {
        encoder.write_all(&chunk).unwrap();
    }
    let compressed = encoder.finish().unwrap();
    assert!(compressed.len() < 1024 * 1024);
    assert!(
        super::parse(&compressed, "large-malformed.bcif.gz")
            .unwrap_err()
            .contains("trailing bytes")
    );
}

#[test]
fn decoded_column_above_the_former_value_ceiling_preserves_every_repeat() {
    let size = 16 * 1024 * 1024 + 1;
    let raw: Vec<_> = [7i32, size as i32]
        .into_iter()
        .flat_map(i32::to_le_bytes)
        .collect();
    let data = encoded(
        &raw,
        vec![
            transform(
                "RunLength",
                [
                    ("srcSize", Value::Int(size as i64)),
                    ("srcType", Value::Int(3)),
                ],
            ),
            byte_array(3),
        ],
    );
    let Column::Int(values) = decode(&data).unwrap() else {
        panic!("integer column")
    };
    assert_eq!(values.len(), size);
    assert!(values.iter().all(|value| *value == 7));
}

#[test]
fn long_valid_transform_chains_have_no_application_length_limit() {
    let mut chain = (0..20_000)
        .map(|_| {
            transform(
                "Delta",
                [("origin", Value::Int(0)), ("srcType", Value::Int(3))],
            )
        })
        .collect::<Vec<_>>();
    chain.push(byte_array(1));
    assert_eq!(decode(&encoded(&[7], chain)).unwrap(), Column::Int(vec![7]));
}

#[test]
fn long_valid_transform_chains_have_no_application_count_ceiling() {
    let mut transforms: Vec<_> = (0..20_000)
        .map(|_| {
            transform(
                "Delta",
                [("origin", Value::Int(0)), ("srcType", Value::Int(3))],
            )
        })
        .collect();
    transforms.push(byte_array(1));
    assert_eq!(
        decode(&encoded(&[7], transforms)).unwrap(),
        Column::Int(vec![7])
    );
}
