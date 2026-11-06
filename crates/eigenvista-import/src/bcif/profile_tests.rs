//! Full-container protocol checks with an independent, test-only wire encoder.

use super::encoding::{Budget, Column, Record, decode};
use super::messagepack::Value;
use eigenvista_core::Document;
use std::collections::BTreeMap;
use std::io::Write;

const ZERO: [u8; 8] = [0; 8];

fn object<'a>(fields: impl IntoIterator<Item = (&'a str, Value<'a>)>) -> Value<'a> {
    Value::Map(BTreeMap::from_iter(fields))
}

/// Deliberately use fixed-width MessagePack headers, independently of the reader.
fn wire(value: &Value<'_>) -> Vec<u8> {
    fn write(value: &Value<'_>, output: &mut Vec<u8>) {
        fn length(output: &mut Vec<u8>, marker: u8, count: usize) {
            output.push(marker);
            output.extend_from_slice(&u32::try_from(count).unwrap().to_be_bytes());
        }
        match value {
            Value::Nil => output.push(0xc0),
            Value::Bool(value) => output.push(if *value { 0xc3 } else { 0xc2 }),
            Value::Int(value) => {
                output.push(0xd3);
                output.extend_from_slice(&value.to_be_bytes());
            }
            Value::Uint(value) => {
                output.push(0xcf);
                output.extend_from_slice(&value.to_be_bytes());
            }
            Value::Float(value) => {
                output.push(0xcb);
                output.extend_from_slice(&value.to_be_bytes());
            }
            Value::Str(value) => {
                length(output, 0xdb, value.len());
                output.extend_from_slice(value.as_bytes());
            }
            Value::Bin(value) => {
                length(output, 0xc6, value.len());
                output.extend_from_slice(value);
            }
            Value::Array(values) => {
                length(output, 0xdd, values.len());
                for value in values {
                    write(value, output);
                }
            }
            Value::Map(values) => {
                length(output, 0xdf, values.len());
                for (key, value) in values {
                    write(&Value::Str(key), output);
                    write(value, output);
                }
            }
        }
    }
    let mut output = Vec::new();
    write(value, &mut output);
    output
}

fn byte_array(kind: u64) -> Value<'static> {
    object([
        ("kind", Value::Str("ByteArray")),
        ("type", Value::Uint(kind)),
    ])
}

fn encoded<'a>(bytes: &'a [u8], chain: Vec<Value<'a>>) -> Value<'a> {
    object([
        ("data", Value::Bin(bytes)),
        ("encoding", Value::Array(chain)),
    ])
}

fn numeric_column<'a>(name: &'a str) -> Value<'a> {
    object([
        ("name", Value::Str(name)),
        ("data", encoded(&ZERO, vec![byte_array(33)])),
    ])
}

fn string_column<'a>(name: &'a str, value: &'a str, offsets: &'a [u8]) -> Value<'a> {
    object([
        ("name", Value::Str(name)),
        (
            "data",
            encoded(
                &[0],
                vec![object([
                    ("kind", Value::Str("StringArray")),
                    ("stringData", Value::Str(value)),
                    ("dataEncoding", Value::Array(vec![byte_array(4)])),
                    ("offsetEncoding", Value::Array(vec![byte_array(3)])),
                    ("offsets", Value::Bin(offsets)),
                ])],
            ),
        ),
    ])
}

fn offsets(value: &str) -> Vec<u8> {
    [0, i32::try_from(value.encode_utf16().count()).unwrap()]
        .into_iter()
        .flat_map(i32::to_le_bytes)
        .collect()
}

fn atom_columns() -> Vec<Value<'static>> {
    vec![
        string_column("type_symbol", "C", &[0, 0, 0, 0, 1, 0, 0, 0]),
        numeric_column("Cartn_x"),
        numeric_column("Cartn_y"),
        numeric_column("Cartn_z"),
    ]
}

fn category<'a>(name: &'a str, rows: Value<'a>, columns: Vec<Value<'a>>) -> Value<'a> {
    object([
        ("name", Value::Str(name)),
        ("rowCount", rows),
        ("columns", Value::Array(columns)),
    ])
}

fn block<'a>(header: &'a str, categories: Vec<Value<'a>>) -> Value<'a> {
    object([
        ("header", Value::Str(header)),
        ("categories", Value::Array(categories)),
    ])
}

fn file<'a>(version: &'a str, blocks: Vec<Value<'a>>) -> Value<'a> {
    object([
        ("version", Value::Str(version)),
        ("encoder", Value::Str("independent protocol test encoder")),
        ("dataBlocks", Value::Array(blocks)),
    ])
}

fn document<'a>(columns: Vec<Value<'a>>) -> Value<'a> {
    file(
        "0.3.0",
        vec![block(
            "TINY",
            vec![category("_atom_site", Value::Uint(1), columns)],
        )],
    )
}

fn load(value: Value<'_>) -> Result<Document, String> {
    super::parse(&wire(&value), "protocol.bcif")
}

fn reject(value: Value<'_>) {
    let result = std::panic::catch_unwind(|| load(value));
    assert!(
        matches!(result, Ok(Err(_))),
        "expected a reportable input error"
    );
}

#[test]
fn one_atom_category_is_imported_through_a_forced_loop() {
    let doc = load(document(atom_columns())).unwrap();
    assert_eq!(doc.atoms.len(), 1);
    assert_eq!(doc.atoms[0].element, 6);
    assert_eq!(doc.atoms[0].position, [0.; 3]);
    assert!(doc.bonds.is_empty());
}

#[test]
fn presence_masks_have_exact_row_lengths_and_only_three_states() {
    for (mask, valid) in [
        (&[0][..], true),
        (&[3][..], false),
        (&[][..], false),
        (&[0, 0][..], false),
    ] {
        let mut columns = atom_columns();
        let Value::Map(column) = &mut columns[1] else {
            unreachable!()
        };
        column.insert("mask", encoded(mask, vec![byte_array(4)]));
        let result = load(document(columns));
        assert_eq!(result.is_ok(), valid, "mask {mask:?}");
    }
}

#[test]
fn declared_row_counts_are_checked_before_column_expansion() {
    for rows in [
        Value::Int(-1),
        Value::Uint(u64::MAX),
        Value::Uint(250_001),
        Value::Uint(2),
        Value::Uint(0),
        Value::Bool(true),
    ] {
        reject(file(
            "0.3.0",
            vec![block(
                "TINY",
                vec![category("_atom_site", rows, atom_columns())],
            )],
        ))
    }
}

#[test]
fn version_header_and_data_block_profile_are_explicit() {
    for version in ["0.4.0", "0.3.x", "0.3.123456", "0.3.", ""] {
        reject(file(
            version,
            vec![block(
                "TINY",
                vec![category("_atom_site", Value::Uint(1), atom_columns())],
            )],
        ));
    }
    let long_header = "a".repeat(257);
    for header in [
        "",
        "bad block",
        "bad\n_struct_conn.id",
        long_header.as_str(),
    ] {
        reject(file(
            "0.3.0",
            vec![block(
                header,
                vec![category("_atom_site", Value::Uint(1), atom_columns())],
            )],
        ));
    }
    let maximum_header = "a".repeat(256);
    assert!(
        load(file(
            "0.3.12345",
            vec![block(
                &maximum_header,
                vec![category("_atom_site", Value::Uint(1), atom_columns())]
            )]
        ))
        .is_ok()
    );
    reject(file("0.3.0", vec![]));
    reject(file(
        "0.3.0",
        vec![
            block(
                "ONE",
                vec![category("_atom_site", Value::Uint(1), atom_columns())],
            ),
            block("TWO", vec![]),
        ],
    ));
}

#[test]
fn category_column_names_duplicates_and_column_ceiling_are_checked() {
    reject(file(
        "0.3.0",
        vec![block(
            "TINY",
            vec![
                category("_atom_site", Value::Uint(1), atom_columns()),
                category("_ATOM_SITE", Value::Uint(1), atom_columns()),
            ],
        )],
    ));
    for name in ["_atom_site\nloop_", "_atom.site", "_"] {
        reject(file(
            "0.3.0",
            vec![block(
                "TINY",
                vec![category(name, Value::Uint(1), atom_columns())],
            )],
        ));
    }
    let mut duplicate = atom_columns();
    duplicate.push(string_column("TYPE_SYMBOL", "C", &[0, 0, 0, 0, 1, 0, 0, 0]));
    reject(document(duplicate));
    for name in ["bad.name", "bad\nname", ""] {
        let mut columns = atom_columns();
        columns.push(numeric_column(name));
        reject(document(columns));
    }
    let names: Vec<_> = (0..253).map(|index| format!("extra_{index}")).collect();
    for (extra, valid) in [(252, true), (253, false)] {
        let mut columns = atom_columns();
        columns.extend(names[..extra].iter().map(|name| numeric_column(name)));
        assert_eq!(
            load(document(columns)).is_ok(),
            valid,
            "{} columns",
            4 + extra
        );
    }
}

fn with_details<'a>(value: &'a str, value_offsets: &'a [u8]) -> Value<'a> {
    file(
        "0.3.0",
        vec![block(
            "TINY",
            vec![
                category("_atom_site", Value::Uint(1), atom_columns()),
                category(
                    "_struct_conn",
                    Value::Uint(1),
                    vec![
                        string_column("id", "x", &[0, 0, 0, 0, 1, 0, 0, 0]),
                        string_column("conn_type_id", "covale", &[0, 0, 0, 0, 6, 0, 0, 0]),
                        string_column("details", value, value_offsets),
                    ],
                ),
            ],
        )],
    )
}

#[test]
fn quoted_control_like_values_and_multiline_details_remain_literal() {
    for value in [
        "loop_",
        "_struct_conn.id",
        "data_fake _atom_site.type_symbol O",
        "value ' and \" both",
        "first\nsecond ' \"",
    ] {
        let value_offsets = offsets(value);
        let doc = load(with_details(value, &value_offsets)).unwrap();
        assert_eq!(doc.atoms.len(), 1);
        assert_eq!(doc.atoms[0].element, 6);
        let records: Vec<serde_json::Value> = doc
            .provenance
            .iter()
            .filter_map(|line| line.strip_prefix("mmCIF struct_conn: "))
            .map(|json| serde_json::from_str(json).unwrap())
            .collect();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0]["source"]["details"], value);
    }
}

#[test]
fn unsupported_text_delimiters_and_multiline_atom_tokens_fail_safely() {
    for value in ["first\n;closing ' \"", "first\rsecond"] {
        let value_offsets = offsets(value);
        reject(with_details(value, &value_offsets));
    }
    let value = "requires ' and \" multiline quoting";
    let value_offsets = offsets(value);
    let mut columns = atom_columns();
    columns.push(string_column("label_atom_id", value, &value_offsets));
    reject(document(columns));
}

fn gzip(bytes: &[u8]) -> Vec<u8> {
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
    encoder.write_all(bytes).unwrap();
    encoder.finish().unwrap()
}

#[test]
fn gzip_members_form_one_checked_payload_and_never_hide_trailing_bytes() {
    let payload = wire(&document(atom_columns()));
    let middle = payload.len() / 2;
    let mut members = gzip(&payload[..middle]);
    members.extend(gzip(&payload[middle..]));
    assert_eq!(
        super::parse(&members, "two-members.bcif.gz")
            .unwrap()
            .atoms
            .len(),
        1
    );
    let mut duplicate = gzip(&payload);
    duplicate.extend(gzip(&payload));
    assert!(super::parse(&duplicate, "duplicate.bcif.gz").is_err());
    for suffix in [&b"garbage"[..], &[0][..], &[0x1f, 0x8b][..]] {
        let mut bad = gzip(&payload);
        bad.extend_from_slice(suffix);
        assert!(super::parse(&bad, "trailing.bcif.gz").is_err());
    }
}

#[test]
fn unsigned_packing_words_still_reconstruct_only_signed_int32_values() {
    for (last, valid) in [(32767u16, true), (32768u16, false)] {
        let mut raw: Vec<_> = std::iter::repeat_n(u16::MAX, 32768)
            .flat_map(u16::to_le_bytes)
            .collect();
        raw.extend_from_slice(&last.to_le_bytes());
        let Value::Map(value) = encoded(
            &raw,
            vec![
                object([
                    ("kind", Value::Str("IntegerPacking")),
                    ("byteCount", Value::Uint(2)),
                    ("isUnsigned", Value::Bool(true)),
                    ("srcSize", Value::Uint(1)),
                ]),
                byte_array(5),
            ],
        ) else {
            unreachable!()
        };
        let value: Record<'_> = value;
        let result = decode(&value, &mut Budget::new());
        if valid {
            assert_eq!(result.unwrap(), Column::Int(vec![i64::from(i32::MAX)]));
        } else {
            assert!(result.unwrap_err().contains("32 bits"));
        }
    }
}
