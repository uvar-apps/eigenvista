mod support;

use eigenvista_core::{
    ComponentKind, Document, SecondaryStructure, StructureChain, StructureMetadata,
    StructureResidue, compute,
    field_analysis::{self, AnalysisDefinition, AnalysisRequest, FieldAnalysisState},
    fixtures,
    inspection::{
        AnnotationLabel, Annotations, MeasurementDefinition, MeasurementKind, NamedSelection,
        NeighborhoodRequest,
    },
    molecular_surface::{self, MolecularSurfaceKind, MolecularSurfaceRequest, RadiiSet},
};
use eigenvista_format::{decode, encode, validate_document};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::io::{Cursor, Read, Write};
use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions};

const BASE: &str = "eigenvista-preview-polynomial-v1";
const BIO: &str = "eigenvista-biological-structure-v1";
const ANNOTATIONS: &str = "eigenvista-annotations-v1";
const MOLECULAR: &str = "eigenvista-molecular-surfaces-v1";
const ANALYSIS: &str = "eigenvista-field-analysis-v1";

fn entries(bytes: &[u8]) -> BTreeMap<String, Vec<u8>> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).unwrap();
    (0..archive.len())
        .map(|index| {
            let mut file = archive.by_index(index).unwrap();
            let mut content = vec![];
            file.read_to_end(&mut content).unwrap();
            (file.name().to_owned(), content)
        })
        .collect()
}

fn mutate(
    bytes: &[u8],
    change: impl FnOnce(&mut Value, &mut BTreeMap<String, Vec<u8>>),
) -> Vec<u8> {
    let mut files = entries(bytes);
    let mut manifest: Value = serde_json::from_slice(&files["manifest.json"]).unwrap();
    change(&mut manifest, &mut files);
    files.insert(
        "manifest.json".into(),
        serde_json::to_vec(&manifest).unwrap(),
    );
    let mut archive = ZipWriter::new(Cursor::new(vec![]));
    for (name, data) in files {
        archive
            .start_file(name, SimpleFileOptions::default())
            .unwrap();
        archive.write_all(&data).unwrap();
    }
    archive.finish().unwrap().into_inner()
}

/// Mutate a typed u32 payload while updating its transport checksum, so failure
/// must come from semantic validation rather than a stale array digest.
fn replace_u32(
    manifest: &mut Value,
    files: &mut BTreeMap<String, Vec<u8>>,
    reference: &Value,
    offset: usize,
    replacement: u32,
) {
    let id = reference["$array"].as_str().unwrap();
    assert_eq!(manifest["arrays"][id]["dtype"], "u32");
    let name = manifest["arrays"][id]["entry"].as_str().unwrap();
    let bytes = files.get_mut(name).unwrap();
    bytes[offset * 4..offset * 4 + 4].copy_from_slice(&replacement.to_le_bytes());
    manifest["arrays"][id]["sha256"] = format!("{:x}", Sha256::digest(bytes)).into();
}

fn metadata() -> StructureMetadata {
    StructureMetadata {
        chains: vec![StructureChain {
            label_id: Some("A".into()),
            author_id: Some("X".into()),
            entity_id: Some("1".into()),
        }],
        residues: vec![StructureResidue {
            chain: 0,
            name: "H2".into(),
            label_seq_id: None,
            author_seq_id: Some("9".into()),
            insertion_code: Some("A".into()),
            segment: 0,
            kind: ComponentKind::Ligand,
            secondary: SecondaryStructure::Unknown,
        }],
        atom_names: vec!["H1".into(), "H2".into()],
        atom_residues: vec![0, 0],
        secondary_source: "none".into(),
    }
}

fn annotated() -> Annotations {
    Annotations {
        selections: vec![NamedSelection {
            id: "selected-atoms".into(),
            label: "Both source atoms".into(),
            atoms: vec![0, 1],
            neighborhood: Some(NeighborhoodRequest {
                seeds: vec![1],
                radius_angstrom: 1.,
                whole_residues: false,
            }),
        }],
        measurements: vec![MeasurementDefinition {
            id: "distance-monitor".into(),
            label: "Ordered source distance".into(),
            kind: MeasurementKind::Distance,
            atoms: vec![1, 0],
            visible: true,
            color: "#456789".into(),
            always_visible: false,
        }],
        labels: vec![AnnotationLabel {
            id: "source-label".into(),
            text: "Selected hydrogen".into(),
            atom: Some(1),
            residue: None,
            visible: true,
            color: "#ff99bb".into(),
            always_visible: true,
        }],
    }
}

fn analysis(doc: &Document) -> FieldAnalysisState {
    let definitions = [
        AnalysisDefinition::Probe {
            point: [0.; 3],
            atom: None,
        },
        AnalysisDefinition::Plane {
            origin: [-1., -1., 0.],
            u: [2., 0., 0.],
            v: [0., 2., 0.],
            dims: [3, 4],
            atoms: None,
        },
        AnalysisDefinition::Profile {
            start: doc.atoms[0].position,
            end: doc.atoms[1].position,
            count: 5,
            atoms: Some([0, 1]),
        },
    ];
    let descriptor = field_analysis::describe_field(doc, "antibonding").unwrap();
    let items = definitions
        .into_iter()
        .enumerate()
        .map(|(index, definition)| {
            field_analysis::sample(
                doc,
                &AnalysisRequest {
                    id: format!("analysis-{index}"),
                    label: format!("Quantitative example {index}"),
                    field: "antibonding".into(),
                    definition,
                    descriptor: Some(descriptor.clone()),
                },
            )
            .unwrap()
        })
        .collect();
    FieldAnalysisState {
        show_field_key: true,
        descriptors: vec![descriptor],
        items,
    }
}

fn full_document() -> Document {
    let mut doc = fixtures::hydrogen_pair();
    let hash = compute::source_hash(&doc, "antibonding").unwrap();
    let grid = compute::sample(&doc, "antibonding", 12).unwrap();
    doc.surfaces
        .push(compute::mesh(&grid, 0.08, "antibonding", &hash, "#aa77bb", 0.7).unwrap());
    let shape = molecular_surface::create(
        &doc,
        &MolecularSurfaceRequest {
            id: "selected-ses".into(),
            label: "Selected hydrogen SES".into(),
            kind: MolecularSurfaceKind::Ses,
            atom_indices: vec![1],
            radii_set: RadiiSet::Bondi,
            radii_overrides: vec![],
            probe_radius: 1.4,
            spacing: 0.5,
            color: "#88aabb".into(),
            opacity: 0.7,
        },
        |_, _, _| Ok(()),
    )
    .unwrap();
    let fields = analysis(&doc);
    doc.structure = Some(metadata());
    doc.annotations = Some(annotated());
    doc.molecular_surfaces = Some(vec![shape]);
    doc.field_analysis = Some(fields);
    doc.validate().unwrap();
    doc
}

#[test]
fn every_new_capability_combination_roundtrips_with_optional_biological_identity() {
    let full = full_document();
    let expected_hash = compute::source_hash(&full, "antibonding").unwrap();
    for mask in 0..16 {
        let mut doc = full.clone();
        let mut features = vec![BASE];
        if mask & 1 == 0 {
            doc.structure = None;
        } else {
            features.push(BIO);
        }
        if mask & 2 == 0 {
            doc.annotations = None;
        } else {
            features.push(ANNOTATIONS);
        }
        if mask & 4 == 0 {
            doc.molecular_surfaces = None;
        } else {
            features.push(MOLECULAR);
        }
        if mask & 8 == 0 {
            doc.field_analysis = None;
        } else {
            features.push(ANALYSIS);
        }
        validate_document(&doc).unwrap();
        let bytes = encode(&doc).unwrap();
        assert_eq!(
            support::manifest(&bytes)["required_features"],
            json!(features),
            "mask {mask}"
        );
        let restored = decode(&bytes).unwrap();
        assert_eq!(restored, doc, "mask {mask}");
        assert_eq!(
            compute::source_hash(&restored, "antibonding").unwrap(),
            expected_hash
        );
        assert_eq!(restored.surfaces, full.surfaces);
    }
}

#[test]
fn absent_inspection_payloads_preserve_frozen_entry_bytes_and_legacy_meshes() {
    let frozen = include_bytes!("../../../fixtures/native/water-rhf-0.5.12.eigenvista");
    let doc = decode(frozen).unwrap();
    assert!(
        doc.annotations.is_none()
            && doc.field_analysis.is_none()
            && doc.molecular_surfaces.is_none()
    );
    assert_eq!(entries(frozen), entries(&encode(&doc).unwrap()));
    let manifest = support::manifest(frozen);
    for key in ["annotations", "molecular_surfaces", "field_analysis"] {
        assert!(manifest["document"].get(key).is_none());
    }
}

#[test]
fn typed_native_arrays_hold_selections_meshes_and_f64_analysis_caches() {
    let doc = full_document();
    let bytes = encode(&doc).unwrap();
    let manifest = support::manifest(&bytes);
    let document = &manifest["document"];
    let paths = [
        (&document["annotations"]["selections"][0]["atoms"], "u32"),
        (
            &document["annotations"]["selections"][0]["neighborhood"]["seeds"],
            "u32",
        ),
        (&document["molecular_surfaces"][0]["atom_indices"], "u32"),
        (&document["molecular_surfaces"][0]["radii_angstrom"], "f64"),
        (&document["molecular_surfaces"][0]["positions"], "f64"),
        (&document["molecular_surfaces"][0]["normals"], "f64"),
        (&document["molecular_surfaces"][0]["indices"], "u32"),
        (&document["molecular_surfaces"][0]["vertex_atoms"], "u32"),
        (&document["field_analysis"]["items"][1]["values"], "f64"),
        (&document["field_analysis"]["items"][1]["valid"], "u32"),
    ];
    for (reference, dtype) in paths {
        let id = reference["$array"]
            .as_str()
            .expect("bulk payload must be a typed-array reference, not numeric JSON");
        assert_eq!(reference.as_object().unwrap().len(), 1);
        assert_eq!(manifest["arrays"][id]["dtype"], dtype);
    }
    let restored = decode(&bytes).unwrap();
    assert_eq!(restored.annotations, doc.annotations);
    assert_eq!(restored.field_analysis, doc.field_analysis);
    assert_eq!(restored.molecular_surfaces, doc.molecular_surfaces);
    let original_shape = &doc.molecular_surfaces.as_ref().unwrap()[0];
    let restored_shape = &restored.molecular_surfaces.as_ref().unwrap()[0];
    for (before, after) in [
        (&original_shape.positions, &restored_shape.positions),
        (&original_shape.normals, &restored_shape.normals),
        (
            &original_shape.radii_angstrom,
            &restored_shape.radii_angstrom,
        ),
    ] {
        assert!(
            before
                .iter()
                .zip(after)
                .all(|(a, b)| a.to_bits() == b.to_bits())
        );
    }
    for (before, after) in doc
        .field_analysis
        .as_ref()
        .unwrap()
        .items
        .iter()
        .zip(&restored.field_analysis.as_ref().unwrap().items)
    {
        assert!(
            before
                .values
                .iter()
                .zip(&after.values)
                .all(|(a, b)| a.to_bits() == b.to_bits())
        );
    }
    // Cached geometry and raw f64 samples survive directly; decoding is not an
    // engine invocation or an implicit sample regeneration with a future build.
    assert_eq!(restored.field_analysis.unwrap().items[0].values, [0.]);
}

#[test]
fn capability_flags_reject_unknown_duplicate_unordered_and_payload_mismatches() {
    let full = encode(&full_document()).unwrap();
    let features = [BASE, BIO, ANNOTATIONS, MOLECULAR, ANALYSIS];
    for index in 0..features.len() {
        let mut missing = features.to_vec();
        missing.remove(index);
        assert!(decode(&support::with_profile(&full, "eigenvista", &missing)).is_err());
    }
    let mut duplicate = features.to_vec();
    duplicate.push(ANNOTATIONS);
    assert!(decode(&support::with_profile(&full, "eigenvista", &duplicate)).is_err());
    let mut unknown = features.to_vec();
    unknown.push("unrecognized-inspection-v1");
    assert!(decode(&support::with_profile(&full, "eigenvista", &unknown)).is_err());
    let mut unordered = features.to_vec();
    unordered.swap(2, 3);
    assert!(decode(&support::with_profile(&full, "eigenvista", &unordered)).is_err());
    for key in ["annotations", "molecular_surfaces", "field_analysis"] {
        for null in [true, false] {
            let corrupt = mutate(&full, |manifest, _| {
                if null {
                    manifest["document"][key] = Value::Null;
                } else {
                    manifest["document"].as_object_mut().unwrap().remove(key);
                }
            });
            assert!(
                decode(&corrupt).unwrap_err().contains("profile"),
                "missing {key}"
            );
        }
    }
    let base = encode(&fixtures::hydrogen_pair()).unwrap();
    for feature in [ANNOTATIONS, MOLECULAR, ANALYSIS] {
        assert!(
            decode(&support::with_profile(
                &base,
                "eigenvista",
                &[BASE, feature]
            ))
            .is_err()
        );
        assert!(
            decode(&support::with_profile(
                &base,
                "molekel",
                &["molekel-preview-polynomial-v1", feature]
            ))
            .is_err()
        );
    }
}

#[test]
fn source_indices_and_status_masks_are_validated_after_transport_checks_pass() {
    let bytes = encode(&full_document()).unwrap();
    for (pointer, invalid, expected) in [
        ("/document/annotations/selections/0/atoms", 2, "Selection"),
        (
            "/document/molecular_surfaces/0/vertex_atoms",
            0,
            "mesh arrays",
        ),
        (
            "/document/field_analysis/items/1/valid",
            2,
            "cache dimensions",
        ),
    ] {
        let corrupt = mutate(&bytes, |manifest, files| {
            let reference = manifest.pointer(pointer).unwrap().clone();
            replace_u32(manifest, files, &reference, 0, invalid);
        });
        let error = decode(&corrupt).unwrap_err();
        assert!(error.contains(expected), "{pointer}: {error}");
        assert!(!error.contains("checksum"));
    }
    let corrupt = mutate(&bytes, |manifest, _| {
        manifest["document"]["annotations"]["measurements"][0]["atoms"] = json!([1, 2])
    });
    assert!(decode(&corrupt).unwrap_err().contains("Measurement"));
    let corrupt = mutate(&bytes, |manifest, _| {
        manifest["document"]["annotations"]["labels"][0]["residue"] = json!(0)
    });
    assert!(decode(&corrupt).unwrap_err().contains("exactly one"));
}

#[test]
fn persisted_fingerprints_reject_stale_cache_and_mesh_provenance() {
    let doc = full_document();
    let bytes = encode(&doc).unwrap();
    for key in ["source_hash", "sample_hash", "interpretation_hash"] {
        let corrupt = mutate(&bytes, |manifest, _| {
            manifest["document"]["field_analysis"]["items"][0][key] = "0".repeat(64).into()
        });
        assert!(decode(&corrupt).unwrap_err().contains("hash mismatch"));
    }
    let corrupt = mutate(&bytes, |manifest, _| {
        manifest["document"]["molecular_surfaces"][0]["source_hash"] = "0".repeat(64).into()
    });
    assert!(decode(&corrupt).unwrap_err().contains("provenance"));
    let mut changed = doc;
    changed.atoms[1].position[0] += 0.1;
    assert!(encode(&changed).is_err());
    assert!(validate_document(&changed).is_err());
}

#[test]
fn annotation_interpretation_and_material_edits_preserve_all_legacy_field_hashes() {
    let mut doc = full_document();
    let fields = ["bonding", "antibonding", "total"];
    let hashes: Vec<_> = fields
        .iter()
        .map(|field| compute::source_hash(&doc, field).unwrap())
        .collect();
    let old_surfaces = doc.surfaces.clone();
    let molecular_hash = doc.molecular_surfaces.as_ref().unwrap()[0]
        .source_hash
        .clone();
    doc.annotations.as_mut().unwrap().labels[0].text = "Renamed label".into();
    let analysis = doc.field_analysis.as_mut().unwrap();
    analysis.descriptors[0].origin = "user_declared".into();
    analysis.descriptors[0].note = "Explicit user interpretation".into();
    analysis.descriptors[0].display_unit = Some("angstrom^-3/2".into());
    for item in &mut analysis.items {
        item.descriptor = analysis.descriptors[0].clone();
        item.interpretation_hash = item.descriptor.interpretation_hash().unwrap();
        item.appearance.show_key = false;
    }
    let shape = &mut doc.molecular_surfaces.as_mut().unwrap()[0];
    shape.label = "Renamed shape".into();
    shape.color = "#998877".into();
    shape.opacity = 0.25;
    shape.visible = false;
    let restored = decode(&encode(&doc).unwrap()).unwrap();
    for (field, hash) in fields.iter().zip(hashes) {
        assert_eq!(compute::source_hash(&restored, field).unwrap(), hash);
    }
    assert_eq!(restored.surfaces, old_surfaces);
    assert_eq!(
        restored.molecular_surfaces.unwrap()[0].source_hash,
        molecular_hash
    );
    assert_eq!(restored.field_analysis, doc.field_analysis);
}

#[test]
fn aggregate_cache_above_the_former_sixteen_mib_limit_roundtrips() {
    let mut doc = fixtures::hydrogen_pair();
    let template = field_analysis::sample(
        &doc,
        &AnalysisRequest {
            id: "large-plane".into(),
            label: "Large cache fixture".into(),
            field: "antibonding".into(),
            definition: AnalysisDefinition::Plane {
                origin: [-1., -1., 0.],
                u: [2., 0., 0.],
                v: [0., 2., 0.],
                dims: [512, 512],
                atoms: None,
            },
            descriptor: None,
        },
    )
    .unwrap();
    assert_eq!(template.cache_bytes().unwrap(), 512 * 512 * 12);
    let items = (0..6)
        .map(|index| {
            let mut item = template.clone();
            item.id = format!("plane-{index}");
            item
        })
        .collect();
    doc.field_analysis = Some(FieldAnalysisState {
        show_field_key: false,
        descriptors: vec![],
        items,
    });
    validate_document(&doc).unwrap();
    assert_eq!(decode(&encode(&doc).unwrap()).unwrap(), doc);
}
