//! Reproducible native publication/Save measurements; not a browser or OOM guarantee.
use eigenvista_core::{Document, compute};
use serde::Deserialize;
use std::{hint::black_box, path::Path, time::Instant};

#[derive(Deserialize)]
struct Fixture {
    document: Document,
}

fn prepare(directory: &Path) -> Result<(), String> {
    std::fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let mut doc: Document = serde_json::from_str::<Fixture>(include_str!(
        "../../../fixtures/pyscf/water-rhf-ccpvdz.json"
    ))
    .map_err(|e| e.to_string())?
    .document;
    let fields: Vec<_> = doc.orbitals.iter().take(16).map(|o| o.id.clone()).collect();
    // Retain an authoritative grid alongside the basis, orbitals and density.
    let mut source = compute::sample(&doc, &fields[0], 64)?;
    source.id = "retained-grid".into();
    doc.grids.push(source);
    for (index, field) in fields.iter().enumerate() {
        let grid = compute::sample(&doc, field, 64)?;
        let hash = compute::source_hash(&doc, field)?;
        for level in [0.08, -0.08] {
            let surface = compute::mesh(&grid, level, field, &hash, "#259d86", 0.6)?;
            if !surface.indices.is_empty() {
                doc.surfaces.push(surface);
            }
        }
        if [0, 7, 15].contains(&index) {
            let path = directory.join(format!("batch-{}.json", index + 1));
            std::fs::write(path, serde_json::to_vec(&doc).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
            println!(
                "batch={} surfaces={} vertices={}",
                index + 1,
                doc.surfaces.len(),
                doc.surfaces
                    .iter()
                    .map(|s| s.positions.len() / 3)
                    .sum::<usize>()
            );
        }
    }
    Ok(())
}

fn main() -> Result<(), String> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() < 3 {
        return Err("usage: publication_benchmark prepare DIRECTORY | encode DOCUMENT [ARCHIVE] | validate DOCUMENT".into());
    }
    if args[1] == "prepare" {
        return prepare(Path::new(&args[2]));
    }
    if !matches!(args[1].as_str(), "encode" | "validate")
        || args.len() > 4
        || (args[1] == "validate" && args.len() != 3)
    {
        return Err("expected encode DOCUMENT [ARCHIVE] or validate DOCUMENT".into());
    }
    let doc: Document =
        serde_json::from_slice(&std::fs::read(&args[2]).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
    let mut elapsed = vec![];
    for _ in 0..5 {
        let start = Instant::now();
        let bytes = match args[1].as_str() {
            "encode" => Some(eigenvista_format::encode(black_box(&doc))?),
            "validate" => {
                eigenvista_format::validate_document(black_box(&doc))?;
                None
            }
            _ => unreachable!(),
        };
        elapsed.push(start.elapsed().as_secs_f64() * 1000.);
        if let (Some(path), Some(bytes)) = (args.get(3), &bytes) {
            std::fs::write(path, bytes).map_err(|e| e.to_string())?;
        }
        black_box(bytes);
    }
    elapsed.sort_by(f64::total_cmp);
    println!(
        "operation={} surfaces={} min_ms={:.3} median_ms={:.3} max_ms={:.3}",
        args[1],
        doc.surfaces.len(),
        elapsed[0],
        elapsed[2],
        elapsed[4]
    );
    Ok(())
}
