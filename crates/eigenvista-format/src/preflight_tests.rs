use super::*;
use eigenvista_core::{compute, fixtures};

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

fn assert_budget_decision(doc: &Document, budget: PreviewBudget, accepted: bool) {
    let validation = preflight(doc, budget).map(|_| ());
    let encoding = preflight(doc, budget).and_then(encode_prepared);
    assert_eq!(
        validation,
        encoding.as_ref().map(|_| ()).map_err(Clone::clone)
    );
    assert_eq!(validation.is_ok(), accepted);
    if let Ok(bytes) = encoding {
        assert_eq!(decode(&bytes).unwrap(), *doc);
    }
}

#[test]
fn exact_native_budget_boundaries_match_save_with_retained_science_and_meshes() {
    // Exercise the production preflight at reduced limits to avoid multi-GiB
    // serde expansions in ordinary tests. Production thresholds stay unchanged.
    assert_eq!(PREVIEW_BUDGET.array_entries, 8191);
    assert_eq!(PREVIEW_BUDGET.manifest_bytes, 8 * 1024 * 1024);
    assert_eq!(PREVIEW_BUDGET.total_bytes, 128 * 1024 * 1024);
    let mut doc = retained_document();
    let later_surfaces = std::mem::take(&mut doc.surfaces);
    for surfaces in [vec![], later_surfaces[..1].to_vec(), later_surfaces] {
        doc.surfaces = surfaces;
        let prepared = preflight(&doc, PREVIEW_BUDGET).unwrap();
        let array_entries = prepared.entries.len();
        let manifest_bytes = prepared.manifest.len();
        let total_bytes =
            manifest_bytes + prepared.entries.iter().map(|e| e.1.len()).sum::<usize>();
        let archive_bytes = encode(&doc).unwrap();
        let mut archive = ZipArchive::new(Cursor::new(archive_bytes)).unwrap();
        assert_eq!(archive.len() - 1, array_entries);
        assert_eq!(
            archive.by_name("manifest.json").unwrap().size(),
            manifest_bytes as u64
        );
        assert_eq!(
            (0..archive.len())
                .map(|i| archive.by_index(i).unwrap().size())
                .sum::<u64>(),
            total_bytes as u64
        );
        validate_document(&doc).unwrap();
        let exact = PreviewBudget {
            array_entries,
            manifest_bytes,
            total_bytes,
        };
        assert_budget_decision(&doc, exact, true);
        for (array_entries, manifest_bytes, total_bytes) in [
            (array_entries - 1, manifest_bytes, total_bytes),
            (array_entries, manifest_bytes - 1, total_bytes),
            (array_entries, manifest_bytes, total_bytes - 1),
        ] {
            assert_budget_decision(
                &doc,
                PreviewBudget {
                    array_entries,
                    manifest_bytes,
                    total_bytes,
                },
                false,
            );
        }
        for (array_entries, manifest_bytes, total_bytes) in [
            (array_entries + 1, manifest_bytes, total_bytes),
            (array_entries, manifest_bytes + 1, total_bytes),
            (array_entries, manifest_bytes, total_bytes + 1),
        ] {
            assert_budget_decision(
                &doc,
                PreviewBudget {
                    array_entries,
                    manifest_bytes,
                    total_bytes,
                },
                true,
            );
        }
    }
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
