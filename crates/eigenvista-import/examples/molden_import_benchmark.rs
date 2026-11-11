//! Repeat a bounded import without sampling/meshing or serialization.
//! Run an already-built release executable under the platform's RSS tool.
//! `stress-uhf` is synthetic valid input, not a converged physical wavefunction.

use eigenvista_import::import_bytes;
use sha2::{Digest, Sha256};
use std::{fmt::Write, hint::black_box, time::Instant};

fn stress_uhf() -> Vec<u8> {
    let mut text = String::from("[Molden Format]\n[Atoms] AU\nH 1 1 0 0 0\n[GTO]\n1 0\n");
    for index in 0..512 {
        writeln!(text, "s 1 1.00\n{} 1", 1. + index as f64 * 0.01).unwrap();
    }
    text.push_str("[MO]\n");
    for (spin, occupied) in [("Alpha", 24), ("Beta", 16)] {
        for index in 0..256 {
            writeln!(
                text,
                "Sym={spin}-{}\nEne={}\nSpin={spin}\nOccup={}\n{} 0.8\n{} 0.6",
                index + 1,
                -1. + index as f64 * 0.01,
                usize::from(index < occupied),
                index + 1,
                index + 257,
            )
            .unwrap();
        }
    }
    text.into_bytes()
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let source = args.next().unwrap_or_else(|| "stress-uhf".into());
    let repetitions: usize = args.next().unwrap_or_else(|| "5".into()).parse()?;
    if repetitions == 0 || args.next().is_some() {
        return Err(
            "usage: molden_import_benchmark [stress-uhf|hydroxyl-uhf|PATH] [repetitions > 0]"
                .into(),
        );
    }
    let bytes = match source.as_str() {
        "stress-uhf" => stress_uhf(),
        "hydroxyl-uhf" => {
            include_bytes!("../../../fixtures/molden/hydroxyl-uhf-sto3g.molden").to_vec()
        }
        _ => std::fs::read(&source)?,
    };
    let mut elapsed = std::time::Duration::ZERO;
    let mut density_digest = String::new();
    for index in 0..repetitions {
        let start = Instant::now();
        let imported = import_bytes(black_box(&bytes), "benchmark.molden")?;
        elapsed += start.elapsed();
        black_box(&imported);
        if index == 0 {
            let document = &imported.document;
            let mut digest = Sha256::new();
            for density in &document.densities {
                digest.update(density.kind.as_bytes());
                for value in &density.matrix {
                    digest.update(value.to_le_bytes());
                }
            }
            density_digest = format!("{:x}", digest.finalize());
            println!(
                "source={source} bytes={} sha256={:x} aos={} mos={} occupied={} densities={}",
                bytes.len(),
                Sha256::digest(&bytes),
                document.basis.len(),
                document.orbitals.len(),
                document
                    .orbitals
                    .iter()
                    .filter(|orbital| orbital.occupation.is_some_and(|value| value > 0.))
                    .count(),
                document.densities.len(),
            );
        }
    }
    println!(
        "imports={repetitions} import_total_ms={:.3} import_mean_ms={:.3} density_sha256={density_digest}",
        elapsed.as_secs_f64() * 1000.,
        elapsed.as_secs_f64() * 1000. / repetitions as f64,
    );
    Ok(())
}
