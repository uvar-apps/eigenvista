//! Reproduce large SES requests without an application memory allowance.
//! Run with a coordinate mmCIF path and optional spacing in angstrom.
use eigenvista_core::{allocation, import, molecular_surface::*};
use std::{error::Error, io, time::Instant};

fn main() -> Result<(), Box<dyn Error>> {
    let mut args = std::env::args().skip(1);
    let source = args.next().ok_or("Expected a coordinate mmCIF path")?;
    let spacing: f64 = args.next().as_deref().unwrap_or("0.5").parse()?;
    let text = std::fs::read_to_string(&source)?;
    let doc = import::cif(&text, &source).map_err(io::Error::other)?;
    let mut atoms = allocation::buffer(doc.atoms.len(), "SES probe source indices")
        .map_err(io::Error::other)?;
    atoms.extend(0..doc.atoms.len());
    let request = MolecularSurfaceRequest {
        id: "full-source-ses".into(),
        label: "Full source SES allocation probe".into(),
        kind: MolecularSurfaceKind::Ses,
        atom_indices: atoms,
        radii_set: RadiiSet::Alvarez,
        radii_overrides: vec![],
        probe_radius: 1.4,
        spacing,
        color: "#b9c5df".into(),
        opacity: 0.7,
    };
    let started = Instant::now();
    let mut previous = String::new();
    let surface = create(&doc, &request, |stage, done, total| {
        if stage != previous || done == total {
            eprintln!("{stage}: {done}/{total}");
            previous = stage.into();
        }
        Ok(())
    })
    .map_err(io::Error::other)?;
    surface.validate(&doc).map_err(io::Error::other)?;
    serde_json::to_writer_pretty(
        io::stdout(),
        &serde_json::json!({
            "source": source, "atoms": doc.atoms.len(), "spacing": surface.spacing,
            "probe_radius": surface.probe_radius, "vertices": surface.positions.len() / 3,
            "triangles": surface.indices.len() / 3, "stats": surface.stats,
            "elapsed_seconds": started.elapsed().as_secs_f64(), "source_hash": surface.source_hash,
        }),
    )?;
    Ok(())
}
