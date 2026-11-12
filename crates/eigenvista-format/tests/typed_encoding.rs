//! Writer-layout edges captured from the unchanged encoder at f92e063.
//! These constructed persistence probes complement the immutable native corpus;
//! no test regenerates expected hashes or compares ZIP compression bytes.

use eigenvista_core::{Atom, BasisFunction, Density, Document, Grid, Orbital, Surface, Term};
use eigenvista_format::{decode, encode};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    io::{Cursor, Read},
};
use zip::ZipArchive;

fn document(rows: usize) -> Document {
    let mut doc = Document::empty("typed layout / \"λ\"");
    doc.id = "typed-layout-v1".into();
    doc.view.opacity = -0.;
    doc.provenance = vec!["Constructed storage probe, not a scientific reference.\n".into()];
    for index in 0..rows {
        doc.atoms.push(Atom {
            element: 118,
            position: [index as f64, -0., 1.],
        });
        doc.basis.push(BasisFunction {
            center: [index as f64, -0., 1.],
            exponents: vec![1., 2.],
            coefficients: vec![1., -0.],
            terms: vec![
                Term {
                    powers: [1, 0, 0],
                    weight: -0.,
                },
                Term {
                    powers: [0, 1, 0],
                    weight: 1.,
                },
            ],
        });
        doc.orbitals.push(Orbital {
            id: format!("mo-{index}"),
            label: "layout".into(),
            spin: "spatial".into(),
            occupation: if index == 0 { Some(1.) } else { None },
            energy: if index == 0 { Some(-0.) } else { None },
            coefficients: vec![1.; rows],
        });
        doc.densities.push(Density {
            id: format!("density-{index}"),
            label: "layout".into(),
            kind: "transition".into(),
            matrix: vec![-0.; rows * rows],
        });
        doc.grids.push(Grid {
            id: format!("grid-{index}"),
            label: "layout".into(),
            quantity: "generic".into(),
            origin: [-0., 0., 1.],
            axes: [[-1., 0., 0.], [0., 1., 0.], [0., 0., 1.]],
            dims: [2, 2, 2],
            values: vec![-0., 1., 2., 3., 4., 5., 6., 7.],
        });
        doc.surfaces.push(Surface {
            id: format!("surface-{index}"),
            label: "layout".into(),
            field: None,
            source_hash: None,
            isovalue: if index == 0 { Some(-0.) } else { None },
            algorithm: "constructed-layout-v1".into(),
            resolution: [0, u32::MAX as usize, 16],
            grid_origin: [-0., 0., 1.],
            grid_axes: [[-1., 0., 0.], [0., 1., 0.], [0., 0., 1.]],
            precision: "f64".into(),
            positions: vec![-0., 0., 0., 1., 0., 0., 0., 1., 0.],
            normals: vec![0., 0., 1., 0., 0., 1., 0., 0., 1.],
            indices: vec![0, 1, 2],
            color: "#259d86".into(),
            opacity: -0.,
            visible: index == 0,
        });
    }
    if rows == 2 {
        doc.bonds.push([0, 1]);
    }
    doc.validate().unwrap();
    doc
}

fn heterogeneous() -> Document {
    let mut doc = document(2);
    doc.basis[1].exponents.push(3.);
    doc.basis[1].coefficients.push(2.);
    doc.basis[1].terms.pop();
    doc.grids[1].dims = [2, 3, 2];
    doc.grids[1].values.resize(12, 2.);
    doc.surfaces[1].positions.truncate(6);
    doc.surfaces[1].normals.truncate(6);
    doc.surfaces[1].indices.clear();
    doc
}

fn empty_geometry() -> Document {
    let mut doc = document(2);
    for surface in &mut doc.surfaces {
        surface.positions.clear();
        surface.normals.clear();
        surface.indices.clear();
    }
    doc
}

#[cfg(target_pointer_width = "64")]
fn wide_resolution(rows: usize) -> Document {
    let mut doc = document(rows);
    doc.surfaces.last_mut().unwrap().resolution = [
        usize::try_from(u64::from(u32::MAX) + 1).unwrap(),
        usize::MAX,
        0,
    ];
    doc
}

fn entries(bytes: &[u8]) -> BTreeMap<String, Vec<u8>> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).unwrap();
    (0..archive.len())
        .map(|index| {
            let mut entry = archive.by_index(index).unwrap();
            let name = entry.name().to_owned();
            let mut data = vec![];
            entry.read_to_end(&mut data).unwrap();
            (name, data)
        })
        .collect()
}

/// Frame sorted logical entry names and bytes, independently of ZIP metadata.
fn logical_digest(entries: &BTreeMap<String, Vec<u8>>) -> String {
    let mut digest = Sha256::new();
    for (name, data) in entries {
        digest.update((name.len() as u64).to_le_bytes());
        digest.update(name.as_bytes());
        digest.update((data.len() as u64).to_le_bytes());
        digest.update(data);
    }
    format!("{:x}", digest.finalize())
}

#[test]
fn exact_writer_layout_matches_pre_typed_encoder_at_shape_edges() {
    let cases = [
        (
            "empty",
            document(0),
            "6d7ba458b0f1537a9e0305782d0004aeb5bc17d2e827aeba2b10f73eb24e136b",
        ),
        (
            "singleton",
            document(1),
            "2caace5529d00ca68d85bb4c44f4b332f74ae39d83066723a1a6826dcaa0e387",
        ),
        (
            "uniform",
            document(2),
            "007d9203b40b86412977ae242d458efdcbcb2de86801f10c579f10be3fc6efc6",
        ),
        (
            "heterogeneous",
            heterogeneous(),
            "98f4d6fd78aacbd50e974f2425d18dad53984ec15a0ee3d9eaaa015c07735cb9",
        ),
        (
            "empty_geometry",
            empty_geometry(),
            "ab96aaff1b8b33fea7cacc73b3388845bf8fa3e5ec4b8b60b711c3358092de02",
        ),
    ];
    for (name, doc, expected) in cases {
        doc.validate().unwrap();
        let encoded = encode(&doc).unwrap();
        let actual = logical_digest(&entries(&encoded));
        assert_eq!(actual, expected, "{name}");
        let restored = decode(&encoded).unwrap();
        assert_eq!(restored, doc, "{name}");
        assert_eq!(restored.view.opacity.to_bits(), (-0_f64).to_bits());
        if let Some(orbital) = restored.orbitals.first() {
            assert_eq!(orbital.energy.unwrap().to_bits(), (-0_f64).to_bits());
        }
    }
}

#[test]
fn empty_vectors_stay_inline_and_integral_float_arrays_stay_f64() {
    let logical = entries(&encode(&empty_geometry()).unwrap());
    let manifest: Value = serde_json::from_slice(&logical["manifest.json"]).unwrap();
    let document = &manifest["document"];
    for surface in document["surfaces"].as_array().unwrap() {
        for key in ["positions", "normals", "indices"] {
            assert_eq!(surface[key], json!([]));
        }
    }
    for (reference, dtype, shape) in [
        (&document["atoms"]["elements"], "u32", vec![2]),
        (&document["atoms"]["positions"], "f64", vec![2, 3]),
        (&document["basis"][0]["coefficients"], "f64", vec![2, 2]),
        (
            &document["basis"][0]["terms"][0]["powers"],
            "u32",
            vec![2, 3],
        ),
        (&document["surfaces"][0]["resolution"], "u32", vec![2, 3]),
    ] {
        let descriptor = &manifest["arrays"][reference["$array"].as_str().unwrap()];
        assert_eq!(descriptor["dtype"], dtype);
        assert_eq!(descriptor["shape"], json!(shape));
    }
}

#[test]
fn equal_value_lengths_coalesce_despite_different_grid_dimensions() {
    let mut doc = document(2);
    doc.grids[0].dims = [2, 2, 4];
    doc.grids[1].dims = [4, 2, 2];
    for grid in &mut doc.grids {
        grid.values.resize(16, 2.);
    }
    doc.validate().unwrap();
    let encoded = encode(&doc).unwrap();
    let logical = entries(&encoded);
    let manifest: Value = serde_json::from_slice(&logical["manifest.json"]).unwrap();
    let rows = &manifest["document"]["grids"];
    let id = rows[0]["values"]["$array"].as_str().unwrap();
    assert_eq!(rows[1]["values"]["$array"], id);
    assert_eq!(rows[0]["values"]["$index"], 0);
    assert_eq!(rows[1]["values"]["$index"], 1);
    assert_eq!(manifest["arrays"][id]["shape"], json!([2, 16]));
    assert_eq!(manifest["arrays"][id]["dtype"], "f64");
    assert_eq!(decode(&encoded).unwrap(), doc);
}

#[cfg(target_pointer_width = "64")]
#[test]
fn oversized_usize_retains_the_existing_whole_leaf_or_column_float_fallback() {
    for (name, rows, expected) in [
        (
            "wide_singleton",
            1,
            "343cd6755433f94b42c1c75cc0f5cfe01546e89da79de19eb8d4235deb36ea75",
        ),
        (
            "wide_column",
            2,
            "6fc444ed518b68672c4f5fa754a3d049096a2d20b41fef5e4390bafffe7da84d",
        ),
    ] {
        let doc = wide_resolution(rows);
        doc.validate().unwrap();
        let logical = entries(&encode(&doc).unwrap());
        let actual = logical_digest(&logical);
        assert_eq!(actual, expected, "{name}");
        let manifest: Value = serde_json::from_slice(&logical["manifest.json"]).unwrap();
        let reference = &manifest["document"]["surfaces"][0]["resolution"];
        let descriptor = &manifest["arrays"][reference["$array"].as_str().unwrap()];
        assert_eq!(descriptor["dtype"], "f64");
        assert_eq!(
            descriptor["shape"],
            if rows == 1 { json!([3]) } else { json!([2, 3]) }
        );
        let expected_bytes: Vec<u8> = doc
            .surfaces
            .iter()
            .flat_map(|surface| {
                surface
                    .resolution
                    .iter()
                    .flat_map(|n| (*n as f64).to_le_bytes())
            })
            .collect();
        assert_eq!(
            logical[descriptor["entry"].as_str().unwrap()],
            expected_bytes
        );
        // This pins existing writer behavior. The unchanged reader cannot in
        // general reconstruct oversized usize values from the f64 fallback.
    }
}
