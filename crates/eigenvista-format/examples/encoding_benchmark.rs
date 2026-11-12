//! Isolated native 128³ encode measurements; RSS includes the whole process.
use eigenvista_core::{compute, fixtures};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::{hint::black_box, path::PathBuf, time::Instant};

fn main() -> Result<(), String> {
    let mut args = std::env::args().skip(1);
    let operation = args
        .next()
        .ok_or("usage: encoding_benchmark encode [ARCHIVE] | validate")?;
    let archive = args.next().map(PathBuf::from);
    if !matches!(operation.as_str(), "encode" | "validate")
        || args.next().is_some()
        || (operation == "validate" && archive.is_some())
    {
        return Err("expected encode [ARCHIVE] or validate".into());
    }
    let mut doc = fixtures::hydrogen_pair();
    let seed = serde_json::to_vec(&doc).map_err(|e| e.to_string())?;
    let seed_sha256 = format!("{:x}", Sha256::digest(&seed));
    let sampling = Instant::now();
    let mut grid = compute::sample(&doc, "bonding", 128)?;
    grid.id = "authoritative-128-grid".into();
    let sampling_ms = sampling.elapsed().as_secs_f64() * 1000.;
    // Identify the exact sampled f64 input without a second numeric JSON tree.
    let mut grid_hash = Sha256::new();
    for value in grid
        .origin
        .iter()
        .chain(grid.axes.iter().flatten())
        .chain(grid.values.iter())
    {
        grid_hash.update(value.to_le_bytes());
    }
    let grid_sha256 = format!("{:x}", grid_hash.finalize());
    let dims = grid.dims;
    let samples = grid.values.len();
    doc.grids.push(grid);

    let start = Instant::now();
    let encoded = match operation.as_str() {
        "encode" => Some(eigenvista_format::encode(black_box(&doc))?),
        "validate" => {
            eigenvista_format::validate_document(black_box(&doc))?;
            None
        }
        _ => unreachable!(),
    };
    let elapsed_ms = start.elapsed().as_secs_f64() * 1000.;
    let archive_sha256 = encoded
        .as_ref()
        .map(|bytes| format!("{:x}", Sha256::digest(bytes)));
    if let (Some(path), Some(bytes)) = (archive, encoded.as_ref()) {
        // Refuse to overwrite an earlier measurement artifact.
        use std::io::Write;
        let mut output = std::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(path)
            .map_err(|e| e.to_string())?;
        output.write_all(bytes).map_err(|e| e.to_string())?;
    }
    println!(
        "{}",
        json!({
            "operation": operation,
            "document_id": doc.id,
            "grid_id": doc.grids[0].id,
            "source_field": "bonding",
            "dims": dims,
            "samples": samples,
            "seed_document_sha256": seed_sha256,
            "grid_numeric_sha256": grid_sha256,
            "sampling_ms": sampling_ms,
            "elapsed_ms": elapsed_ms,
            "archive_bytes": encoded.as_ref().map(Vec::len),
            "archive_sha256": archive_sha256,
        })
    );
    black_box(encoded);
    Ok(())
}
