use super::*;
use eigenvista_core::{compute, fixtures};
use std::io::Read;

fn retained_document() -> Document {
    let mut doc = fixtures::hydrogen_pair();
    // Nonuniform primitive rows must retain the existing per-row packing path.
    doc.basis[0].exponents.push(2.);
    doc.basis[0].coefficients.push(0.25);
    let mut grid = compute::sample(&doc, "bonding", 24).unwrap();
    grid.id = "retained-grid".into();
    doc.grids.push(grid);
    for field in ["bonding", "antibonding"] {
        let grid = compute::sample(&doc, field, 24).unwrap();
        let hash = compute::source_hash(&doc, field).unwrap();
        for iso in [0.08, -0.08] {
            let surface = compute::mesh(&grid, iso, field, &hash, "#259d86", 0.6).unwrap();
            if !surface.indices.is_empty() {
                doc.surfaces.push(surface);
            }
        }
    }
    assert!(!doc.surfaces.is_empty());
    doc
}

#[test]
fn publication_and_save_match_with_retained_science_and_meshes() {
    let mut doc = retained_document();
    let later_surfaces = std::mem::take(&mut doc.surfaces);
    for surfaces in [vec![], later_surfaces[..1].to_vec(), later_surfaces] {
        doc.surfaces = surfaces;
        validate_document(&doc).unwrap();
        assert_eq!(decode(&encode(&doc).unwrap()).unwrap(), doc);
    }
}

#[test]
fn native_manifest_above_the_former_eight_mib_limit_roundtrips() {
    let mut doc = fixtures::hydrogen_pair();
    doc.title = "x".repeat(8 * 1024 * 1024 + 1);
    let prepared = preflight(&doc).unwrap();
    assert!(prepared.manifest.len() > 8 * 1024 * 1024);
    assert_eq!(decode(&encode_prepared(prepared).unwrap()).unwrap(), doc);
}

#[test]
fn more_than_the_former_zip_entry_limit_roundtrips() {
    let mut doc = fixtures::hydrogen_pair();
    let mut grid = compute::sample(&doc, "bonding", 2).unwrap();
    for index in 0..8193 {
        grid.id = format!("g{index}");
        // Alternating lengths prevent column grouping while keeping this test
        // small. Every array is referenced by a valid scientific object.
        grid.dims = if index % 2 == 0 { [2, 2, 2] } else { [2, 2, 3] };
        grid.values.resize(grid.dims.iter().product(), 0.);
        doc.grids.push(grid.clone());
    }
    let bytes = encode(&doc).unwrap();
    assert!(ZipArchive::new(Cursor::new(&bytes)).unwrap().len() > 8192);
    assert_eq!(decode(&bytes).unwrap(), doc);
}

#[test]
fn malformed_arrays_references_source_hashes_and_nonfinite_values_match_save() {
    let original = retained_document();
    let mutations: &[fn(&mut Document)] = &[
        |d| d.atoms[0].position[0] = f64::NAN,
        |d| d.bonds[0][1] = d.atoms.len(),
        |d| {
            d.basis[0].coefficients.pop();
        },
        |d| d.basis[0].exponents[0] = f64::INFINITY,
        |d| {
            d.orbitals[0].coefficients.pop();
        },
        |d| d.orbitals[0].energy = Some(f64::NEG_INFINITY),
        |d| {
            d.densities[0].matrix.pop();
        },
        |d| d.densities[0].matrix[0] = f64::NAN,
        |d| {
            d.grids[0].values.pop();
        },
        |d| d.grids[0].values[0] = f64::INFINITY,
        |d| {
            d.surfaces[0].normals.pop();
        },
        |d| d.surfaces[0].positions[0] = f64::NAN,
        |d| d.surfaces[0].indices[0] = u32::MAX,
        |d| d.surfaces[0].source_hash = Some("mismatched".into()),
        |d| d.surfaces[0].field = Some("missing".into()),
        |d| d.orbitals[0].coefficients[0] += 0.1,
        |d| d.view.field = Some("missing".into()),
    ];
    for (index, mutate) in mutations.iter().enumerate() {
        let mut doc = original.clone();
        mutate(&mut doc);
        let validation = validate_document(&doc);
        assert!(validation.is_err(), "mutation {index}");
        assert_eq!(validation, encode(&doc).map(|_| ()), "mutation {index}");
    }
    assert_eq!(original, decode(&encode(&original).unwrap()).unwrap());
    validate_document(&original).unwrap();
}

#[test]
fn authoritative_array_coverage_and_existing_bytes_are_preserved() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../fixtures/pyscf/water-rhf-ccpvdz.json"
    ))
    .unwrap();
    let doc: Document = serde_json::from_value(fixture["document"].clone()).unwrap();
    validate_document(&doc).unwrap();
    let bytes = encode(&doc).unwrap();
    // Captured from the original encoder at 3fef7d4 with the frozen input above.
    // The uncompressed manifest pins array ids, dtypes, shapes, entry names and
    // content hashes. Decode verifies those hashes against the actual entries;
    // compression and ZIP metadata are deliberately outside this contract.
    let mut archive = ZipArchive::new(Cursor::new(&bytes)).unwrap();
    let mut manifest = vec![];
    archive
        .by_name("manifest.json")
        .unwrap()
        .read_to_end(&mut manifest)
        .unwrap();
    assert_eq!(
        digest(&manifest),
        "ab7c8ec945eed6887d8ec29f6948f7e26844f909097671a2662e331515f18368"
    );
    assert_eq!(decode(&bytes).unwrap(), doc);
}
