// SPDX-License-Identifier: GPL-2.0-or-later
// Manual producer for the immutable 0.5.12 compatibility inputs, not a test helper.
// See README.md. Never run this to update an expected result after a test fails.
use eigenvista_core::{Atom, Document, Grid, compute};
use std::{fs, path::Path};

fn write_document(directory: &Path, id: &str, document: &Document) -> Result<(), String> {
    document.validate()?;
    let archive = eigenvista_format::encode(document)?;
    fs::write(directory.join(format!("{id}.eigenvista")), archive).map_err(|e| e.to_string())?;
    fs::write(
        directory.join(format!("{id}.document.json")),
        serde_json::to_vec_pretty(document).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

fn molecular_document(root: &Path, filename: &str, field: &str) -> Result<Document, String> {
    let input = fs::read(root.join("fixtures/pyscf").join(filename)).map_err(|e| e.to_string())?;
    let value: serde_json::Value = serde_json::from_slice(&input).map_err(|e| e.to_string())?;
    let mut document: Document =
        serde_json::from_value(value["document"].clone()).map_err(|e| e.to_string())?;
    document.bonds = eigenvista_core::bonds::perceive(&document.atoms, &document.bonds)?.bonds;
    for (source, levels) in [(field, vec![0.08, -0.08]), ("total", vec![0.08])] {
        let grid = compute::sample(&document, source, 16)?;
        let hash = compute::source_hash(&document, source)?;
        for level in levels {
            let color = if level > 0. { "#158f71" } else { "#c74870" };
            let mut surface = compute::mesh(&grid, level, source, &hash, color, 0.43)?;
            if surface.indices.is_empty() {
                return Err(format!(
                    "Expected nonempty compatibility mesh: {source} {level}"
                ));
            }
            surface.visible = source == field;
            document.surfaces.push(surface);
        }
    }
    document.view.field = Some(field.into());
    document.view.isovalue = 0.08;
    document.view.opacity = 0.43;
    document.view.positive_color = "#158f71".into();
    document.view.negative_color = "#c74870".into();
    Ok(document)
}

fn main() -> Result<(), String> {
    let root = std::env::current_dir().map_err(|e| e.to_string())?;
    let argument = std::env::args()
        .nth(1)
        .ok_or("Expected a NEW output directory under repository tmp")?;
    let output = root.join(&argument);
    if Path::new(&argument)
        .components()
        .any(|part| part == std::path::Component::ParentDir)
        || !output.starts_with(root.join("tmp"))
        || output.exists()
    {
        return Err(
            "Use a new repository-local tmp directory; frozen fixtures are never overwritten"
                .into(),
        );
    }
    fs::create_dir_all(&output).map_err(|e| e.to_string())?;

    let mut structure = Document::empty("Frozen structure and scalar layout probes");
    structure.id = "compatibility-structure-v0.5.12".into();
    structure.atoms = vec![
        Atom {
            element: 6,
            position: [-0.0, 1.0, 2.0],
        },
        Atom {
            element: 8,
            position: [1.25, 1.0, 2.0],
        },
    ];
    // Deliberately absent bonds exercise the separately reported Open supplementation policy.
    structure.grids.push(Grid {
        id: "layout-scalar".into(),
        label: "Constructed scalar layout probe".into(),
        quantity: "generic".into(),
        origin: [-0.0, 0.0, 0.0],
        axes: [[1.0, 0.0, -0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        dims: [2, 2, 2],
        values: vec![-0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0],
    });
    structure.provenance.push("Constructed compatibility layout data, not a quantum-chemistry calculation. Coordinates are bohr; generic scalar values have no assigned physical units.".into());
    write_document(&output, "structure-0.5.12", &structure)?;
    let water = molecular_document(&root, "water-rhf-ccpvdz.json", "spatial-5")?;
    write_document(&output, "water-rhf-0.5.12", &water)?;
    let hydroxyl = molecular_document(&root, "hydroxyl-uhf-sto3g.json", "alpha-5")?;
    write_document(&output, "hydroxyl-uhf-0.5.12", &hydroxyl)?;
    Ok(())
}
