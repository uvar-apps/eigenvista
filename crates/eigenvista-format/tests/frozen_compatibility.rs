use eigenvista_core::{Document, compute};
use eigenvista_format::{decode, encode};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::{Cursor, Read, Write},
    path::PathBuf,
};
use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions};

type ArchiveEntries = BTreeMap<String, Vec<u8>>;
type ArchiveMutation = fn(&mut Value, &mut ArchiveEntries);

fn directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/native")
}

fn corpus() -> Vec<Value> {
    let index: Value =
        serde_json::from_slice(&fs::read(directory().join("manifest.json")).unwrap()).unwrap();
    assert_eq!(index["version"], 1);
    let records = index["fixtures"].as_array().unwrap().clone();
    let ids: BTreeSet<_> = records
        .iter()
        .map(|record| record["id"].as_str().unwrap())
        .collect();
    assert_eq!(ids.len(), records.len(), "Duplicate fixture ID");
    assert_eq!(
        ids,
        BTreeSet::from([
            "legacy-h2-0.3.2",
            "structure-0.5.12",
            "water-rhf-0.5.12",
            "hydroxyl-uhf-0.5.12",
        ]),
        "Required historical/structure/RHF/UHF corpus must not silently shrink"
    );
    records
}

fn bytes(record: &Value, key: &str) -> Vec<u8> {
    fs::read(directory().join(record[key].as_str().unwrap())).unwrap()
}

fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn entries(bytes: &[u8]) -> ArchiveEntries {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).unwrap();
    let mut result = BTreeMap::new();
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).unwrap();
        let name = entry.name().to_owned();
        let mut data = vec![];
        entry.read_to_end(&mut data).unwrap();
        assert!(
            result.insert(name, data).is_none(),
            "Duplicate frozen ZIP entry"
        );
    }
    result
}

/// Compare the typed model after its documented atom-row/column normalization,
/// including f64 zero signs. PartialEq alone cannot distinguish -0 and +0.
fn assert_value_bits(actual: &Value, expected: &Value, path: &str) {
    match (actual, expected) {
        (Value::Number(actual), Value::Number(expected)) => {
            assert_eq!(actual.is_f64(), expected.is_f64(), "numeric kind at {path}");
            if actual.is_f64() {
                assert_eq!(
                    actual.as_f64().unwrap().to_bits(),
                    expected.as_f64().unwrap().to_bits(),
                    "f64 bits at {path}"
                );
            } else {
                assert_eq!(actual, expected, "integer at {path}");
            }
        }
        (Value::Array(actual), Value::Array(expected)) => {
            assert_eq!(actual.len(), expected.len(), "array length at {path}");
            for (index, (actual, expected)) in actual.iter().zip(expected).enumerate() {
                assert_value_bits(actual, expected, &format!("{path}/{index}"));
            }
        }
        (Value::Object(actual), Value::Object(expected)) => {
            assert_eq!(
                actual.keys().collect::<Vec<_>>(),
                expected.keys().collect::<Vec<_>>(),
                "keys at {path}"
            );
            for (key, expected) in expected {
                assert_value_bits(&actual[key], expected, &format!("{path}/{key}"));
            }
        }
        _ => assert_eq!(actual, expected, "value at {path}"),
    }
}

fn assert_document_bits(actual: &Document, expected: &Document) {
    assert_value_bits(
        &serde_json::to_value(actual).unwrap(),
        &serde_json::to_value(expected).unwrap(),
        "document",
    );
}

fn fixture(id: &str) -> Value {
    corpus()
        .into_iter()
        .find(|record| record["id"] == id)
        .unwrap()
}

#[test]
fn immutable_inputs_and_exact_uncompressed_layout_have_pinned_provenance() {
    for record in corpus() {
        let archive_bytes = bytes(&record, "archive");
        // This identifies the immutable input, not future encoder compression bytes.
        assert_eq!(
            archive_bytes.len() as u64,
            record["archive_bytes"].as_u64().unwrap()
        );
        assert_eq!(
            digest(&archive_bytes),
            record["archive_sha256"].as_str().unwrap()
        );
        let document_bytes = bytes(&record, "document");
        assert_eq!(
            digest(&document_bytes),
            record["document_sha256"].as_str().unwrap()
        );
        let manifest_bytes = bytes(&record, "manifest");
        assert_eq!(
            digest(&manifest_bytes),
            record["manifest_sha256"].as_str().unwrap()
        );
        let manifest: Value = serde_json::from_slice(&manifest_bytes).unwrap();
        assert_eq!(manifest["format"], record["format"]);
        assert_eq!(manifest["required_features"], record["required_features"]);
        assert_eq!(manifest["version"], json!([0, 1]));
        assert_eq!(manifest["coordinate_unit"], "bohr");
        let arrays = manifest["arrays"].as_object().unwrap();
        assert_eq!(arrays.len() as u64, record["array_count"].as_u64().unwrap());
        let mut logical = entries(&archive_bytes);
        assert_eq!(logical.remove("manifest.json").unwrap(), manifest_bytes);
        for array in arrays.values() {
            let data = logical.remove(array["entry"].as_str().unwrap()).unwrap();
            assert_eq!(data.len() as u64, array["bytes"].as_u64().unwrap());
            assert_eq!(digest(&data), array["sha256"].as_str().unwrap());
            let width = match array["dtype"].as_str().unwrap() {
                "f64" => 8,
                "u32" => 4,
                dtype => panic!("Unexpected frozen dtype {dtype}"),
            };
            let elements: u64 = array["shape"]
                .as_array()
                .unwrap()
                .iter()
                .map(|n| n.as_u64().unwrap())
                .product();
            assert_eq!(data.len() as u64, elements * width);
        }
        assert!(logical.is_empty(), "Unreferenced frozen entry");
        let producer = &record["producer"];
        assert_eq!(
            digest(&fs::read(directory().join(producer["generator"].as_str().unwrap())).unwrap()),
            producer["generator_sha256"].as_str().unwrap()
        );
        if let Some(source) = record["source_document"].as_str() {
            assert_eq!(
                digest(&fs::read(directory().join(source)).unwrap()),
                record["source_document_sha256"].as_str().unwrap()
            );
        }
    }
    let legacy = fixture("legacy-h2-0.3.2");
    assert_eq!(
        legacy["producer"]["revision"],
        "24d270e4589642f741ab438d6850f56a768cb66c"
    );
    assert_eq!(
        legacy["archive_sha256"],
        "d82999469208e83662b8aec951e68a8307823f00556cfbc513a0760abafdfee7"
    );
    let manifest: Value = serde_json::from_slice(&bytes(&legacy, "manifest")).unwrap();
    assert!(
        manifest["document"]["atoms"].is_array(),
        "Authentic old atom rows must not be replaced by today's columns"
    );
}

#[test]
fn authentic_legacy_and_current_inputs_keep_model_bits_sources_and_native_resave() {
    for record in corpus() {
        let expected: Document = serde_json::from_slice(&bytes(&record, "document")).unwrap();
        let loaded = decode(&bytes(&record, "archive")).unwrap();
        assert_document_bits(&loaded, &expected);
        let counts = &record["counts"];
        for (key, actual) in [
            ("atoms", loaded.atoms.len()),
            ("bonds", loaded.bonds.len()),
            ("basis", loaded.basis.len()),
            ("orbitals", loaded.orbitals.len()),
            ("densities", loaded.densities.len()),
            ("grids", loaded.grids.len()),
            ("surfaces", loaded.surfaces.len()),
        ] {
            assert_eq!(
                actual as u64,
                counts[key].as_u64().unwrap(),
                "{} {key}",
                record["id"]
            );
        }
        for surface in &loaded.surfaces {
            assert_eq!(
                surface.source_hash.as_ref().unwrap(),
                &compute::source_hash(&loaded, surface.field.as_ref().unwrap()).unwrap()
            );
            assert!(surface.isovalue.is_some());
        }
        let resaved = encode(&loaded).unwrap();
        assert_document_bits(&decode(&resaved).unwrap(), &expected);
        let manifest: Value = serde_json::from_slice(&entries(&resaved)["manifest.json"]).unwrap();
        assert_eq!(manifest["format"], "eigenvista");
        assert_eq!(
            manifest["required_features"],
            json!(["eigenvista-preview-polynomial-v1"])
        );
    }
}

#[test]
fn current_writer_matches_frozen_manifest_and_every_numeric_entry_byte() {
    for record in corpus()
        .into_iter()
        .filter(|record| record["format"] == "eigenvista")
    {
        let expected: Document = serde_json::from_slice(&bytes(&record, "document")).unwrap();
        let frozen = entries(&bytes(&record, "archive"));
        let encoded = entries(&encode(&expected).unwrap());
        // ZIP headers/compression are intentionally excluded from the comparison.
        assert_eq!(
            encoded, frozen,
            "Logical writer layout drift for {}",
            record["id"]
        );
    }
}

#[test]
fn integral_float_signed_zero_empty_and_nonuniform_column_cases_remain_explicit() {
    let structure = fixture("structure-0.5.12");
    let doc = decode(&bytes(&structure, "archive")).unwrap();
    for actual in [
        doc.atoms[0].position[0],
        doc.grids[0].origin[0],
        doc.grids[0].axes[0][2],
        doc.grids[0].values[0],
    ] {
        assert_eq!(actual.to_bits(), (-0.0_f64).to_bits());
    }
    let manifest: Value = serde_json::from_slice(&bytes(&structure, "manifest")).unwrap();
    let d = &manifest["document"];
    for field in ["basis", "orbitals", "densities", "surfaces", "bonds"] {
        assert_eq!(
            d[field],
            json!([]),
            "Empty {field} must not turn into a guessed numeric blob"
        );
    }
    for reference in [
        &d["atoms"]["positions"],
        &d["grids"][0]["values"],
        &d["grids"][0]["axes"],
    ] {
        let array = &manifest["arrays"][reference["$array"].as_str().unwrap()];
        assert_eq!(
            array["dtype"], "f64",
            "Integral-valued float model fields stay float"
        );
    }
    assert_eq!(
        manifest["arrays"][d["atoms"]["elements"]["$array"].as_str().unwrap()]["dtype"],
        "u32"
    );

    let water = fixture("water-rhf-0.5.12");
    let doc = decode(&bytes(&water, "archive")).unwrap();
    let lengths: BTreeSet<_> = doc
        .basis
        .iter()
        .map(|basis| basis.exponents.len())
        .collect();
    assert_eq!(lengths, BTreeSet::from([1, 3, 8]));
    let manifest: Value = serde_json::from_slice(&bytes(&water, "manifest")).unwrap();
    assert!(
        manifest["document"]["basis"][0]["center"]
            .get("$index")
            .is_some()
    );
    assert!(
        manifest["document"]["basis"][0]["exponents"]
            .get("$index")
            .is_none()
    );
}

#[test]
fn frozen_rhf_uhf_scientific_fields_match_the_independent_source_documents() {
    for record in corpus()
        .into_iter()
        .filter(|record| record.get("source_document").is_some())
    {
        let source: Value = serde_json::from_slice(
            &fs::read(directory().join(record["source_document"].as_str().unwrap())).unwrap(),
        )
        .unwrap();
        let original: Document = serde_json::from_value(source["document"].clone()).unwrap();
        let loaded = decode(&bytes(&record, "archive")).unwrap();
        for (actual, expected) in [
            (
                serde_json::to_value(&loaded.atoms).unwrap(),
                serde_json::to_value(&original.atoms).unwrap(),
            ),
            (
                serde_json::to_value(&loaded.basis).unwrap(),
                serde_json::to_value(&original.basis).unwrap(),
            ),
            (
                serde_json::to_value(&loaded.orbitals).unwrap(),
                serde_json::to_value(&original.orbitals).unwrap(),
            ),
            (
                serde_json::to_value(&loaded.densities).unwrap(),
                serde_json::to_value(&original.densities).unwrap(),
            ),
            (
                serde_json::to_value(&loaded.grids).unwrap(),
                serde_json::to_value(&original.grids).unwrap(),
            ),
        ] {
            assert_value_bits(&actual, &expected, "independent scientific input");
        }
        assert!(
            loaded
                .surfaces
                .iter()
                .any(|surface| surface.isovalue.unwrap() < 0.)
        );
        assert!(
            loaded
                .surfaces
                .iter()
                .any(|surface| surface.isovalue.unwrap() > 0.)
        );
    }
}

fn mutate_archive(input: &[u8], mutation: impl FnOnce(&mut Value, &mut ArchiveEntries)) -> Vec<u8> {
    let mut logical = entries(input);
    let mut manifest: Value =
        serde_json::from_slice(&logical.remove("manifest.json").unwrap()).unwrap();
    mutation(&mut manifest, &mut logical);
    let mut output = ZipWriter::new(Cursor::new(vec![]));
    output
        .start_file("manifest.json", SimpleFileOptions::default())
        .unwrap();
    output
        .write_all(&serde_json::to_vec(&manifest).unwrap())
        .unwrap();
    for (name, data) in logical {
        output
            .start_file(name, SimpleFileOptions::default())
            .unwrap();
        output.write_all(&data).unwrap();
    }
    output.finish().unwrap().into_inner()
}

#[test]
fn frozen_positive_inputs_still_reject_corrupt_descriptors_and_scientific_associations() {
    let water = bytes(&fixture("water-rhf-0.5.12"), "archive");
    decode(&water).unwrap();
    let mutations: &[ArchiveMutation] = &[
        |manifest, _| {
            manifest["arrays"]
                .as_object_mut()
                .unwrap()
                .values_mut()
                .next()
                .unwrap()["dtype"] = "f32".into()
        },
        |manifest, _| {
            manifest["arrays"]
                .as_object_mut()
                .unwrap()
                .values_mut()
                .next()
                .unwrap()["shape"][0] = 999_999.into()
        },
        |_, logical| logical.values_mut().next().unwrap()[0] ^= 1,
        |manifest, _| manifest["document"]["surfaces"][0]["source_hash"] = "0".repeat(64).into(),
        |manifest, logical| {
            let id = manifest["document"]["surfaces"][0]["indices"]["$array"]
                .as_str()
                .unwrap()
                .to_owned();
            let entry = manifest["arrays"][&id]["entry"]
                .as_str()
                .unwrap()
                .to_owned();
            let data = logical.get_mut(&entry).unwrap();
            data[..4].copy_from_slice(&u32::MAX.to_le_bytes());
            manifest["arrays"][id]["sha256"] = digest(data).into();
        },
    ];
    for (index, mutation) in mutations.iter().enumerate() {
        assert!(
            decode(&mutate_archive(&water, *mutation)).is_err(),
            "Corruption {index} accepted"
        );
    }
}
