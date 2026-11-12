//! Opt-in #37 research driver. Does not change extraction, encoding or rendering.
//! `measure` deliberately excludes restoration and encoding from process RSS.
#[path = "indexed_mesh_qualification/allocation.rs"]
mod allocation;
#[path = "indexed_mesh_qualification/packing.rs"]
mod packing;

use eigenvista_core::{Atom, Document, Grid, Result, Surface, compute, fixtures};
use packing::{
    Strategy, capacity_bytes, expanded_digest, index_digest, numeric_bytes, vertex_digest,
};
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{collections::HashSet, hint::black_box, io::Write, path::Path};

#[global_allocator]
static ALLOCATOR: allocation::TrackedSystem = allocation::TrackedSystem;

const BASE: &str = "2f7aeec61ba871d8e52f6c7bf5b63aa8fb9a6b8b";
const WATER: &str = include_str!("../../../fixtures/pyscf/water-rhf-ccpvdz.json");

#[derive(Deserialize)]
struct Fixture {
    document: Document,
}

fn sha(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn oracle(surface: &Surface) -> Value {
    json!({"vertices": surface.positions.len()/3, "indices": surface.indices.len(),
        "numeric_bytes": numeric_bytes(surface), "capacity_bytes": capacity_bytes(surface),
        "vertex_bits_sha256": vertex_digest(surface), "indices_sha256": index_digest(surface),
        "expanded_triangle_bits_sha256": expanded_digest(surface)})
}

/// Constructed field used for layout/shader qualification, not a quantum reference.
fn case_document(id: &str, reflected: bool, skew: bool, large: bool) -> Document {
    let mut doc = Document::empty(id);
    doc.atoms = vec![
        Atom {
            element: 1,
            position: [-0.7, 0., 0.],
        },
        Atom {
            element: 1,
            position: [0.7, 0., 0.],
        },
    ];
    doc.bonds = vec![[0, 1]];
    let mut grid = Grid {
        id: "constructed-signed-field".into(),
        label: "x exp(-r²/2), constructed layout control".into(),
        quantity: "generic".into(),
        origin: [if reflected { 2. } else { -2. }, -2., -2.],
        axes: [
            [if reflected { -0.25 } else { 0.25 }, 0., 0.],
            [0., 0.25, 0.],
            [0., 0., 0.25],
        ],
        dims: [17; 3],
        values: vec![],
    };
    if skew {
        grid.axes[1][0] = 0.07;
        grid.axes[2][1] = -0.03;
    }
    // Values are evaluated in a local coordinate frame. World positions remain
    // small distinct f64 offsets around 1e8, a deliberate f32 narrowing control.
    if large {
        grid.origin = [1e8; 3];
        grid.axes = [[0.0001, 0., 0.], [0., 0.0001, 0.], [0., 0., 0.0001]];
    }
    for z in 0..17 {
        for y in 0..17 {
            for x in 0..17 {
                let p = if large {
                    [
                        x as f64 * 0.25 - 2.,
                        y as f64 * 0.25 - 2.,
                        z as f64 * 0.25 - 2.,
                    ]
                } else {
                    grid.position([x as f64, y as f64, z as f64])
                };
                grid.values
                    .push(p[0] * (-0.5 * p.iter().map(|v| v * v).sum::<f64>()).exp());
            }
        }
    }
    doc.view.field = Some(grid.id.clone());
    doc.view.isovalue = 0.12;
    doc.view.opacity = 1.;
    doc.grids.push(grid);
    doc.provenance.push("Constructed scalar x exp(-r²/2) sampled on 17³ grid; two display H atoms. Layout control, not electronic structure reference. Unchanged core::compute::mesh at baseline 2f7aeec.".into());
    doc
}

fn case_mesh(doc: &Document, sign: f64) -> Result<Surface> {
    let grid = &doc.grids[0];
    compute::mesh(
        grid,
        sign * 0.12,
        &grid.id,
        &compute::source_hash(doc, &grid.id)?,
        if sign > 0. { "#259d86" } else { "#cb4e72" },
        1.,
    )
}

fn same_arrays(left: &Surface, right: &Surface) -> bool {
    vertex_digest(left) == vertex_digest(right) && index_digest(left) == index_digest(right)
}

fn qualify(raw: &Surface) -> Result<(Surface, Surface, Surface)> {
    let (compact, _) = packing::compact(raw, Strategy::Hash)?;
    let (sorted, _) = packing::compact(raw, Strategy::Sort)?;
    if !same_arrays(&compact, &sorted) {
        return Err("Hash/sort first-seen layouts disagree".into());
    }
    let restored = packing::restore(&compact)?;
    let naive = packing::naive_unroll(&compact)?;
    if !same_arrays(raw, &restored) {
        return Err("Raw identity reconstruction differs".into());
    }
    for candidate in [&compact, &restored, &naive] {
        if expanded_digest(raw) != expanded_digest(candidate) {
            return Err("Expanded triangle attributes differ".into());
        }
    }
    if eigenvista_core::determinant(raw.grid_axes) < 0. && same_arrays(raw, &naive) {
        return Err("Reflected naive unroll failed to expose raw vertex identity".into());
    }
    Ok((compact, naive, restored))
}

fn self_check() -> Result<Value> {
    let mut cases = 0;
    for reflected in [false, true] {
        for sign in [1., -1.] {
            for skew in [false, true] {
                let doc = case_document("native-control", reflected, skew, false);
                let raw = case_mesh(&doc, sign)?;
                qualify(&raw)?;
                if packing::restore(&raw).is_ok() {
                    return Err("Marker-free mesh was reconstructed".into());
                }
                let mut indexed = raw.clone();
                indexed.indices.reverse(); // Old arbitrary indices are valid and preserved by Save.
                let before = oracle(&indexed);
                let mut old_doc = doc;
                old_doc.surfaces.push(indexed);
                let reopened = eigenvista_format::decode(&eigenvista_format::encode(&old_doc)?)?;
                if oracle(&reopened.surfaces[0]) != before
                    || packing::restore(&reopened.surfaces[0]).is_ok()
                {
                    return Err("Old arbitrary indexed identity changed".into());
                }
                cases += 1;
            }
        }
    }
    let large = case_mesh(&case_document("large-origin", false, false, true), 1.)?;
    qualify(&large)?;
    let distinct64: HashSet<_> = large
        .positions
        .as_chunks::<3>()
        .0
        .iter()
        .map(|p| [p[0].to_bits(), p[1].to_bits(), p[2].to_bits()])
        .collect();
    let distinct32: HashSet<_> = large
        .positions
        .as_chunks::<3>()
        .0
        .iter()
        .map(|p| {
            [
                (p[0] as f32).to_bits(),
                (p[1] as f32).to_bits(),
                (p[2] as f32).to_bits(),
            ]
        })
        .collect();
    if distinct64.len() <= distinct32.len() {
        return Err("Large-origin narrowing control did not lose positions".into());
    }

    // Raw-format topology independent of real-field controls, preserving seams
    // and signed zero even when coordinates are numerically equal.
    let mut seam = case_mesh(&case_document("seam", false, false, false), 1.)?;
    seam.field = None;
    seam.source_hash = None;
    seam.positions = vec![0.; 18];
    seam.positions[3] = -0.;
    seam.normals = vec![
        0., 0., 1., 0., 0., 1., 0., 1., 0., 0., 0., 1., 0., 0., 1., 0., 0., 1.,
    ];
    seam.indices = packing::canonical_indices(6, false);
    let (compact, _, _) = qualify(&seam)?;
    if compact.positions.len() / 3 != 3 {
        return Err("Signed-zero or normal seam was welded".into());
    }
    let mut doc = Document::empty("native signed-zero seam control");
    doc.surfaces.push(compact.clone());
    let reopened = eigenvista_format::decode(&eigenvista_format::encode(&doc)?)?;
    if !same_arrays(&compact, &reopened.surfaces[0]) {
        return Err("Native Save lost signed-zero bits".into());
    }
    let mut bad = compact.clone();
    bad.indices.pop();
    if packing::restore(&bad).is_ok() {
        return Err("Malformed triangle count accepted".into());
    }
    bad = compact.clone();
    bad.indices[0] = u32::MAX;
    if packing::restore(&bad).is_ok() {
        return Err("Invalid compact index accepted".into());
    }
    bad = compact.clone();
    bad.indices.swap(0, 2);
    if packing::restore(&bad).is_ok() {
        return Err("Non-first-seen IDs accepted".into());
    }
    bad = compact;
    bad.indices.resize(eigenvista_core::MAX_VERTICES + 1, 0);
    if packing::restore(&bad).is_ok() {
        return Err("Generated raw corner limit bypassed".into());
    }
    Ok(
        json!({"actual_mesh_affine_signed_cases": cases, "large_origin_distinct_f64_positions": distinct64.len(),
        "large_origin_distinct_world_f32_positions": distinct32.len(), "normal_seam_signed_zero_unique_tuples":3,
        "native_signed_zero_save_reopen":true, "marker_free_arbitrary_indexed_save_reopen_unchanged":true,
        "malformed_tagged_count_index_first_seen_rejected":true}),
    )
}

fn create(path: &Path, bytes: &[u8]) -> Result<()> {
    let mut file = std::fs::OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .map_err(|e| e.to_string())?;
    file.write_all(bytes).map_err(|e| e.to_string())
}

fn prepare(directory: &Path) -> Result<()> {
    let repo_tmp = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tmp")
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let parent = directory
        .parent()
        .ok_or("Missing output parent")?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !parent.starts_with(repo_tmp) {
        return Err("Artifacts must be inside repository tmp".into());
    }
    std::fs::create_dir(directory).map_err(|e| e.to_string())?;
    let checks = self_check()?;
    let mut entries = vec![];
    for reflected in [false, true] {
        for sign in [1., -1.] {
            let id = format!(
                "{}-{}",
                if reflected { "reflected" } else { "ordinary" },
                if sign > 0. { "positive" } else { "negative" }
            );
            let mut doc = case_document(&id, reflected, false, false);
            let raw = case_mesh(&doc, sign)?;
            let raw_identity = (vertex_digest(&raw), index_digest(&raw));
            let (compact, naive, restored) = qualify(&raw)?;
            let mut documents = serde_json::Map::new();
            let mut oracles = serde_json::Map::new();
            let mut archives = serde_json::Map::new();
            for (name, surface) in [
                ("raw", raw),
                ("compact", compact),
                ("naive", naive),
                ("restored", restored),
            ] {
                doc.surfaces = vec![surface];
                let bytes = eigenvista_format::encode(&doc)?;
                let reopened = eigenvista_format::decode(&bytes)?;
                if !same_arrays(&doc.surfaces[0], &reopened.surfaces[0]) {
                    return Err("Save/reopen changed arrays".into());
                }
                if name == "compact" {
                    let from_saved = packing::restore(&reopened.surfaces[0])?;
                    if (vertex_digest(&from_saved), index_digest(&from_saved)) != raw_identity {
                        return Err("Reopened compact-only restoration differs".into());
                    }
                }
                let file = format!("{id}.{name}.eigenvista");
                create(&directory.join(&file), &bytes)?;
                archives.insert(
                    name.into(),
                    json!({"file":file,"bytes":bytes.len(),"sha256":sha(&bytes)}),
                );
                oracles.insert(name.into(), oracle(&doc.surfaces[0]));
                documents.insert(
                    name.into(),
                    serde_json::to_value(&doc).map_err(|e| e.to_string())?,
                );
            }
            let case = json!({"id":id,"sign":sign,"reflected":reflected,"documents":documents,"oracles":oracles});
            let bytes = serde_json::to_vec_pretty(&case).map_err(|e| e.to_string())?;
            let file = format!("{id}.json");
            create(&directory.join(&file), &bytes)?;
            entries.push(
                json!({"id":id,"case_file":file,"case_sha256":sha(&bytes),"archives":archives}),
            );
        }
    }
    let mut arbitrary_doc = case_document("arbitrary-indexed", false, false, false);
    let (mut arbitrary, _) = packing::compact(&case_mesh(&arbitrary_doc, 1.)?, Strategy::Sort)?;
    arbitrary.algorithm = "legacy-arbitrary-indexed-qualification".into();
    arbitrary.indices.reverse();
    arbitrary_doc.surfaces.push(arbitrary);
    let arbitrary_bytes = eigenvista_format::encode(&arbitrary_doc)?;
    let arbitrary_reopened = eigenvista_format::decode(&arbitrary_bytes)?;
    if !same_arrays(&arbitrary_doc.surfaces[0], &arbitrary_reopened.surfaces[0])
        || packing::restore(&arbitrary_reopened.surfaces[0]).is_ok()
    {
        return Err("Arbitrary indexed control changed".into());
    }
    create(
        &directory.join("arbitrary-indexed.eigenvista"),
        &arbitrary_bytes,
    )?;
    let arbitrary_json = serde_json::to_vec_pretty(&arbitrary_doc).map_err(|e| e.to_string())?;
    create(&directory.join("arbitrary-indexed.json"), &arbitrary_json)?;
    let manifest = json!({"schema":"eigenvista-indexed-mesh-qualification-v1", "source_base":BASE,
        "prototype_algorithm":packing::MARKER,"constructed_field":"x * exp(-0.5 * (x*x+y*y+z*z)); world coordinates, 17³, abs(iso)=0.12",
        "raw_indices":"sequential original corner order; each reflected triangle swaps index slots 1 and 2",
        "restoration":"Only compact native arrays + explicit marker + determinant(grid_axes). Invert reflected swap to recover original RAW ordinal tuple; restore original IBO.",
        "self_check":checks,"cases":entries,"arbitrary_indexed":{"file":"arbitrary-indexed.eigenvista","sha256":sha(&arbitrary_bytes),"bytes":arbitrary_bytes.len(),"case_file":"arbitrary-indexed.json","case_sha256":sha(&arbitrary_json),"oracle":oracle(&arbitrary_doc.surfaces[0])}});
    create(
        &directory.join("manifest.json"),
        &serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?,
    )?;
    println!(
        "{}",
        json!({"directory":directory,"cases":4,"self_check":checks})
    );
    Ok(())
}

fn record_mesh(
    raw: Surface,
    strategy: Option<Strategy>,
    ordinal: usize,
    phases: &mut Vec<allocation::Phase>,
    records: &mut Vec<Value>,
    retained: &mut Vec<Surface>,
) -> Result<()> {
    let raw_oracle = oracle(&raw);
    let (surface, layout) = if let Some(strategy) = strategy {
        let (result, phase) =
            allocation::measure("compact", ordinal, || packing::compact(&raw, strategy));
        phases.push(phase);
        let (surface, layout) = result?;
        if expanded_digest(&surface) != expanded_digest(&raw) {
            return Err("Measured candidate changed expanded attributes".into());
        }
        (surface, Some(layout))
    } else {
        retained.push(raw);
        records.push(json!({"ordinal":ordinal,"raw":raw_oracle,
        "retained_surfaces":retained.len(),"retained_capacity_bytes":retained.iter().map(capacity_bytes).sum::<usize>()}));
        return Ok(());
    };
    drop(raw);
    let result_oracle = oracle(&surface);
    retained.push(surface);
    records.push(json!({"ordinal":ordinal,"raw":raw_oracle,"output":result_oracle,"layout":layout,
        "retained_surfaces":retained.len(),"retained_capacity_bytes":retained.iter().map(capacity_bytes).sum::<usize>()}));
    Ok(())
}

fn measure(workload: &str, method: &str, publication: bool) -> Result<()> {
    let strategy = match method {
        "raw" => None,
        "hash" => Some(Strategy::Hash),
        "sort" => Some(Strategy::Sort),
        _ => return Err("Expected raw/hash/sort".into()),
    };
    let mut phases = Vec::with_capacity(128);
    let mut records = Vec::with_capacity(32);
    let mut retained = Vec::with_capacity(32);
    let mut publication_doc = Document::empty("Qualification retained meshes");
    let input_sha;
    if workload == "worst" {
        input_sha = "synthetic-1999998-unique-corner-tuples-no-sharing".into();
        let doc = case_document("worst", false, false, false);
        let mut raw = case_mesh(&doc, 1.)?;
        let ((), phase) = allocation::measure("construct_unique_stress", 0, || {
            let count = eigenvista_core::MAX_VERTICES / 3 * 3;
            raw.positions = Vec::with_capacity(count * 3);
            raw.normals = Vec::with_capacity(count * 3);
            for i in 0..count {
                raw.positions.extend([i as f64, 0., 0.]);
                raw.normals.extend([0., 0., 1.]);
            }
            raw.indices = packing::canonical_indices(count, false);
            raw.field = None;
            raw.source_hash = None;
        });
        phases.push(phase);
        record_mesh(raw, strategy, 0, &mut phases, &mut records, &mut retained)?;
    } else {
        let mut doc = match workload {
            "h2" => fixtures::hydrogen_pair(),
            "water" => {
                serde_json::from_str::<Fixture>(WATER)
                    .map_err(|e| e.to_string())?
                    .document
            }
            _ => return Err("Expected h2/water/worst".into()),
        };
        input_sha = if workload == "water" {
            sha(WATER.as_bytes())
        } else {
            sha(&serde_json::to_vec(&doc).map_err(|e| e.to_string())?)
        };
        let fields: Vec<_> = if workload == "water" {
            doc.orbitals.iter().take(16).map(|o| o.id.clone()).collect()
        } else {
            vec!["bonding".to_string()]
        };
        let resolution = if workload == "water" { 64 } else { 128 };
        if workload == "water" {
            let (grid, phase) =
                allocation::measure("retained_authoritative_grid_sample", 0, || {
                    compute::sample(&doc, &fields[0], 64)
                });
            phases.push(phase);
            let mut grid = grid?;
            grid.id = "retained-grid".into();
            doc.grids.push(grid);
        }
        for (i, field) in fields.iter().enumerate() {
            let (grid, phase) =
                allocation::measure("sample", i, || compute::sample(&doc, field, resolution));
            phases.push(phase);
            let grid = grid?;
            let (hash, phase) = allocation::measure("source_hash_unchanged_issue40", i, || {
                compute::source_hash(&doc, field)
            });
            phases.push(phase);
            let hash = hash?;
            for (sign_index, level) in [0.08, -0.08]
                .into_iter()
                .enumerate()
                .take(if workload == "h2" { 1 } else { 2 })
            {
                let ordinal = i * 2 + sign_index;
                let (raw, phase) =
                    allocation::measure("extract_unchanged_core_mesh", ordinal, || {
                        compute::mesh(&grid, level, field, &hash, "#259d86", 0.6)
                    });
                phases.push(phase);
                let raw = raw?;
                if !raw.indices.is_empty() {
                    record_mesh(
                        raw,
                        strategy,
                        ordinal,
                        &mut phases,
                        &mut records,
                        &mut retained,
                    )?;
                }
            }
        }
        publication_doc = doc;
    }
    publication_doc.surfaces = retained;
    let retained = &publication_doc.surfaces;
    if publication {
        let (result, phase) =
            allocation::measure("publication_validation_unchanged_issue40", 0, || {
                eigenvista_format::validate_document(&publication_doc)
            });
        phases.push(phase);
        result?;
    }
    println!(
        "{}",
        json!({"source_base":BASE,"workload":workload,"method":method,"input_sha256":input_sha,
        "allocation_metric":"requested Rust allocator live bytes, not RSS/overhead; excludes System realloc internal old/new overlap; single-threaded stage observer",
        "rss_scope":"whole fresh optimized process including sample/hash/extraction, streaming digest oracles and JSON/report allocations; optional publication validation separately identified; excludes restoration and Save",
        "cumulative_requested_peak_before_report_bytes":allocation::cumulative_peak(),
        "publication_validation":publication,
        "retained_surfaces":retained.len(),"retained_numeric_bytes":retained.iter().map(numeric_bytes).sum::<usize>(),
        "retained_capacity_bytes":retained.iter().map(capacity_bytes).sum::<usize>(),"phases":phases,"meshes":records})
    );
    black_box(retained);
    Ok(())
}

fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    match args.as_slice() {
        [operation] if operation=="self-check"=>{ println!("{}",self_check()?); Ok(()) },
        [operation,directory] if operation=="prepare"=>prepare(Path::new(directory)),
        [operation,workload,method] if operation=="measure" || operation=="publication"=>measure(workload,method,operation=="publication"),
        _=>Err("usage: indexed_mesh_qualification self-check | prepare REPO_TMP_NEW_DIRECTORY | measure|publication h2|water|worst raw|hash|sort".into())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn exact_layout_native_identity_and_negative_controls() {
        super::self_check().unwrap();
    }
}
