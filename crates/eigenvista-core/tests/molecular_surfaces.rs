use eigenvista_core::{Atom, BOHR_TO_ANGSTROM, Document, molecular_surface::*};
use std::f64::consts::PI;

fn document(points_angstrom: &[[f64; 3]]) -> Document {
    let mut doc = Document::empty("Molecular surface reference");
    doc.atoms = points_angstrom
        .iter()
        .map(|p| Atom {
            element: 6,
            position: p.map(|v| v / BOHR_TO_ANGSTROM),
        })
        .collect();
    doc
}

fn request(kind: MolecularSurfaceKind, spacing: f64) -> MolecularSurfaceRequest {
    MolecularSurfaceRequest {
        id: "shape".into(),
        label: "Molecular shape".into(),
        kind,
        atom_indices: vec![],
        radii_set: RadiiSet::Bondi,
        radii_overrides: vec![RadiusOverride {
            element: 6,
            radius_angstrom: 1.5,
        }],
        probe_radius: 1.4,
        spacing,
        color: "#8aa7bb".into(),
        opacity: 0.75,
    }
}

fn generate(doc: &Document, request: &MolecularSurfaceRequest) -> MolecularSurface {
    create(doc, request, |_, _, _| Ok(())).unwrap()
}

fn relative(actual: f64, expected: f64, tolerance: f64) {
    assert!(
        (actual - expected).abs() / expected.abs() < tolerance,
        "{actual} versus {expected}, tolerance {tolerance}"
    );
}

// Upstream's exact refinement stops at |F| <= 1e-5 Å, then keeps crossing-edge
// vertices at least 1e-4 of an edge apart to avoid degenerate triangles. The
// field is 1-Lipschitz, so that spacing-dependent displacement must be included,
// along with a conservative f32 rounding bound for these <6 Å local fixtures.
fn field_tolerance(spacing: f64) -> f64 {
    1e-5 + spacing * 1e-4 + 8.0 * f64::from(f32::EPSILON) * 6.0
}

#[test]
fn single_sphere_ses_and_sas_have_independent_radius_normals_area_and_volume() {
    let doc = document(&[[0.0; 3]]);
    for (kind, radius) in [
        (MolecularSurfaceKind::Ses, 1.5),
        (MolecularSurfaceKind::Sas, 2.9),
    ] {
        let surface = generate(&doc, &request(kind, 0.25));
        assert_eq!(surface.stats.components, 1);
        assert_eq!(surface.stats.cavities, 0);
        assert!(surface.vertex_atoms.iter().all(|&index| index == 0));
        relative(
            surface.stats.area_angstrom2,
            4.0 * PI * radius * radius,
            0.015,
        );
        relative(
            surface.stats.volume_angstrom3,
            4.0 * PI * radius.powi(3) / 3.0,
            0.025,
        );
        for (p, n) in surface
            .positions
            .as_chunks::<3>()
            .0
            .iter()
            .zip(surface.normals.as_chunks::<3>().0.iter())
        {
            let p: Vec<_> = p.iter().map(|v| v * BOHR_TO_ANGSTROM).collect();
            let actual_radius = p[0].hypot(p[1]).hypot(p[2]);
            assert!(
                (actual_radius - radius).abs() < field_tolerance(0.25),
                "radius {actual_radius}, expected {radius}"
            );
            assert!(p.iter().zip(n).map(|(p, n)| p * n).sum::<f64>() / radius > 0.999);
        }
        assert!(surface.stats.estimated_engine_bytes > 0);
        surface.validate(&doc).unwrap();
    }
}

#[test]
fn refinement_converges_towards_closed_form_sphere_measures() {
    let doc = document(&[[0.0; 3]]);
    let coarse = generate(&doc, &request(MolecularSurfaceKind::Ses, 0.5));
    let fine = generate(&doc, &request(MolecularSurfaceKind::Ses, 0.25));
    let expected_area = 4.0 * PI * 1.5f64.powi(2);
    let expected_volume = 4.0 * PI * 1.5f64.powi(3) / 3.0;
    assert!(
        (fine.stats.area_angstrom2 - expected_area).abs()
            < (coarse.stats.area_angstrom2 - expected_area).abs()
    );
    assert!(
        (fine.stats.volume_angstrom3 - expected_volume).abs()
            < (coarse.stats.volume_angstrom3 - expected_volume).abs()
    );
    assert!(fine.positions.len() > coarse.positions.len());
}

#[test]
fn separated_spheres_preserve_components_and_original_atom_attribution() {
    let doc = document(&[[-5.0, 0.0, 0.0], [5.0, 0.0, 0.0]]);
    for kind in [MolecularSurfaceKind::Ses, MolecularSurfaceKind::Sas] {
        let surface = generate(&doc, &request(kind, 0.3));
        assert_eq!(surface.stats.components, 2);
        assert!(surface.vertex_atoms.contains(&0));
        assert!(surface.vertex_atoms.contains(&1));
        let radius: f64 = if kind == MolecularSurfaceKind::Ses {
            1.5
        } else {
            2.9
        };
        relative(
            surface.stats.area_angstrom2,
            8.0 * PI * radius.powi(2),
            0.02,
        );
        relative(
            surface.stats.volume_angstrom3,
            8.0 * PI * radius.powi(3) / 3.0,
            0.03,
        );
    }
}

#[test]
fn overlapping_sas_matches_analytic_union_area_volume() {
    let separation = 2.5;
    let radius: f64 = 2.9;
    let doc = document(&[[-separation / 2.0, 0.0, 0.0], [separation / 2.0, 0.0, 0.0]]);
    let surface = generate(&doc, &request(MolecularSurfaceKind::Sas, 0.25));
    // Union of two equal spheres: exposed spherical caps and overlap lens.
    let area = 4.0 * PI * radius.powi(2) + 2.0 * PI * radius * separation;
    let lens = PI * (4.0 * radius + separation) * (2.0 * radius - separation).powi(2) / 12.0;
    let volume = 8.0 * PI * radius.powi(3) / 3.0 - lens;
    relative(surface.stats.area_angstrom2, area, 0.015);
    relative(surface.stats.volume_angstrom3, volume, 0.02);
    assert_eq!(surface.stats.components, 1);
}

#[test]
fn two_atom_ses_vertices_follow_spheres_or_independent_reentrant_torus() {
    let half_separation: f64 = 1.25;
    let radius: f64 = 1.5;
    let probe: f64 = 1.4;
    let circle_radius = ((radius + probe).powi(2) - half_separation.powi(2)).sqrt();
    let contact_x = half_separation * probe / (radius + probe);
    let doc = document(&[[-half_separation, 0.0, 0.0], [half_separation, 0.0, 0.0]]);
    let surface = generate(&doc, &request(MolecularSurfaceKind::Ses, 0.25));
    let mut saddle_vertices = 0;
    for p in surface.positions.as_chunks::<3>().0.iter() {
        let x = p[0] * BOHR_TO_ANGSTROM;
        let radial = (p[1] * BOHR_TO_ANGSTROM).hypot(p[2] * BOHR_TO_ANGSTROM);
        let left = (x + half_separation).hypot(radial);
        let right = (x - half_separation).hypot(radial);
        let torus_distance = x.hypot(radial - circle_radius);
        let tolerance = field_tolerance(0.25);
        let convex = (left - radius).abs().min((right - radius).abs()) < tolerance;
        let saddle = x.abs() <= contact_x + tolerance && (torus_distance - probe).abs() < tolerance;
        assert!(convex || saddle, "not on sphere or torus: {x}, {radial}");
        if saddle && !convex {
            saddle_vertices += 1;
        }
    }
    assert!(saddle_vertices > 10);
}

#[test]
fn radii_are_explicit_and_unsupported_elements_never_receive_a_fallback() {
    let mut doc = document(&[[0.0; 3]]);
    doc.atoms[0].element = 26;
    let mut req = request(MolecularSurfaceKind::Ses, 0.5);
    req.radii_overrides.clear();
    assert!(req.resolve(&doc).unwrap_err().contains("26"));
    req.radii_set = RadiiSet::Alvarez;
    let (_, radii) = req.resolve(&doc).unwrap();
    assert!(radii[0] > 0.0);
    req.radii_set = RadiiSet::Bondi;
    req.radii_overrides = vec![RadiusOverride {
        element: 26,
        radius_angstrom: 2.0,
    }];
    assert_eq!(req.resolve(&doc).unwrap().1, vec![2.0]);
    req.radii_overrides.push(req.radii_overrides[0].clone());
    assert!(req.resolve(&doc).is_err());
}

#[test]
fn bondi_and_alvarez_are_distinct_scientific_choices() {
    let doc = document(&[[0.0; 3]]);
    let mut req = request(MolecularSurfaceKind::Ses, 0.5);
    req.radii_overrides.clear();
    assert_eq!(req.resolve(&doc).unwrap().1, vec![1.7]);
    req.radii_set = RadiiSet::Alvarez;
    assert_eq!(req.resolve(&doc).unwrap().1, vec![1.77]);
}

#[test]
fn isolated_selection_uses_original_indices_and_excludes_other_atoms() {
    let doc = document(&[[0.0, 0.0, 0.0], [2.0, 0.0, 0.0], [5.0, 0.0, 0.0]]);
    let mut req = request(MolecularSurfaceKind::Ses, 0.5);
    req.atom_indices = vec![2];
    let surface = generate(&doc, &req);
    assert_eq!(surface.atom_indices, vec![2]);
    assert!(surface.vertex_atoms.iter().all(|&index| index == 2));
    let mut changed = doc.clone();
    changed.atoms[0].position[0] += 10.0;
    surface.validate(&changed).unwrap();
    changed.atoms[2].position[0] += 0.01;
    assert!(surface.validate(&changed).is_err());
}

#[test]
fn local_origin_preserves_small_mesh_details_at_large_world_coordinates() {
    let doc = document(&[[0.0; 3], [2.5, 0.0, 0.0]]);
    let req = request(MolecularSurfaceKind::Ses, 0.5);
    let original = generate(&doc, &req);
    let mut moved = doc.clone();
    let offset = [1e9, -2e9, 3e9];
    for atom in &mut moved.atoms {
        for (coordinate, shift) in atom.position.iter_mut().zip(offset) {
            *coordinate += shift;
        }
    }
    let translated = generate(&moved, &req);
    assert_eq!(original.indices, translated.indices);
    for (index, (a, b)) in original
        .positions
        .iter()
        .zip(&translated.positions)
        .enumerate()
    {
        assert!((b - offset[index % 3] - a).abs() < 2e-6);
    }
}

#[test]
fn appearance_does_not_change_geometry_fingerprint() {
    let doc = document(&[[0.0; 3]]);
    let a = request(MolecularSurfaceKind::Ses, 0.5);
    let mut b = a.clone();
    b.color = "#ffaaaa".into();
    b.opacity = 0.2;
    let first = generate(&doc, &a);
    let second = generate(&doc, &b);
    assert_eq!(first.source_hash, second.source_hash);
    assert_eq!(first.positions, second.positions);
    assert_eq!(first.indices, second.indices);
    assert_eq!(first.engine, ENGINE);
}

#[test]
fn validation_rejects_bad_parameters_identity_arrays_and_source_cache() {
    let doc = document(&[[0.0; 3], [2.0, 0.0, 0.0]]);
    let mut req = request(MolecularSurfaceKind::Ses, 0.5);
    for bad in [vec![0, 0], vec![1, 0], vec![2]] {
        req.atom_indices = bad;
        assert!(req.resolve(&doc).is_err());
    }
    req.atom_indices.clear();
    req.spacing = f64::NAN;
    assert!(req.resolve(&doc).is_err());
    req.spacing = 0.0;
    assert!(req.resolve(&doc).is_err());
    req.spacing = 0.5;
    req.probe_radius = -0.1;
    assert!(req.resolve(&doc).is_err());
    req.probe_radius = 1.4;
    let surface = generate(&doc, &req);
    let mut bad = surface.clone();
    bad.vertex_atoms[0] = 99;
    assert!(bad.validate(&doc).is_err());
    let mut bad = surface.clone();
    bad.indices[0] = u32::MAX;
    assert!(bad.validate(&doc).is_err());
    let mut bad = surface.clone();
    bad.normals[0] = f64::INFINITY;
    assert!(bad.validate(&doc).is_err());
    let mut bad = surface.clone();
    bad.source_hash = "0".repeat(64);
    assert!(bad.validate(&doc).is_err());
    let mut bad = surface;
    bad.radii_angstrom[0] += 0.1;
    assert!(bad.validate(&doc).is_err());
}

#[test]
fn honest_stage_progress_and_callback_cancellation_are_preserved() {
    let doc = document(&[[0.0; 3]]);
    let mut reports = vec![];
    create(
        &doc,
        &request(MolecularSurfaceKind::Ses, 0.5),
        |stage, done, total| {
            assert!(done <= total);
            reports.push((stage.to_owned(), done, total));
            Ok(())
        },
    )
    .unwrap();
    for name in ["geometry", "classify", "mesh", "assemble", "measure"] {
        assert!(
            reports
                .iter()
                .any(|(stage, done, _)| stage == name && *done == 0)
        );
        assert!(
            reports
                .iter()
                .any(|(stage, done, total)| stage == name && done == total)
        );
    }
    let error = create(&doc, &request(MolecularSurfaceKind::Ses, 0.5), |_, _, _| {
        Err("cancelled by owner".into())
    })
    .unwrap_err();
    assert_eq!(error, "cancelled by owner");
    generate(&doc, &request(MolecularSurfaceKind::Sas, 0.5));
}

#[test]
fn engine_preserves_requested_spacing_without_a_memory_policy() {
    let params = sesmesh::SurfaceParams::ses(1.4).with_spacing(0.25);
    let output = sesmesh::compute_surface(&[sesmesh::Sphere::new([0.0; 3], 1.5)], &params).unwrap();
    assert_eq!(output.stats.spacing, 0.25);
    assert!(!output.mesh.triangles.is_empty());
    // Estimates are metadata, including when loading caches from large runs.
    let doc = document(&[[0.0; 3]]);
    let mut surface = generate(&doc, &request(MolecularSurfaceKind::Ses, 0.5));
    surface.stats.estimated_engine_bytes = 2 * 1024 * 1024 * 1024;
    surface.validate(&doc).unwrap();
}

#[test]
fn molecular_surface_resolution_accepts_positive_values_without_policy_ranges() {
    let doc = document(&[[0.0; 3]]);
    for spacing in [0.001, 4.0] {
        request(MolecularSurfaceKind::Ses, spacing)
            .resolve(&doc)
            .unwrap();
    }
    let mut req = request(MolecularSurfaceKind::Ses, 0.5);
    req.probe_radius = 0.0;
    req.resolve(&doc).unwrap();
    for spacing in [0.0, -1.0, f64::INFINITY, f64::NAN] {
        assert!(
            request(MolecularSurfaceKind::Ses, spacing)
                .resolve(&doc)
                .is_err()
        );
    }
}

#[test]
fn unrepresentable_lattice_reports_a_size_error_without_panicking() {
    let doc = document(&[[0.0; 3]]);
    for spacing in [f64::MAX, f64::MIN_POSITIVE] {
        let req = request(MolecularSurfaceKind::Ses, spacing);
        req.resolve(&doc).unwrap();
        let error = create(&doc, &req, |_, _, _| Ok(())).unwrap_err();
        assert!(error.contains("cannot be represented"), "{error}");
    }
}

#[test]
fn far_sparse_atoms_generate_without_a_dense_empty_neighbor_lattice() {
    let single = document(&[[0.0; 3]]);
    let pair = document(&[[0.0; 3], [10_000.0; 3]]);
    let req = request(MolecularSurfaceKind::Ses, 0.5);
    let one = generate(&single, &req);
    let two = generate(&pair, &req);
    assert_eq!(two.atom_indices, [0, 1]);
    assert_eq!(two.spacing, 0.5);
    assert_eq!(two.stats.components, 2);
    assert_eq!(two.stats.cavities, 0);
    relative(
        two.stats.area_angstrom2,
        2.0 * one.stats.area_angstrom2,
        0.01,
    );
    relative(
        two.stats.volume_angstrom3,
        2.0 * one.stats.volume_angstrom3,
        0.01,
    );
    two.validate(&pair).unwrap();
}

// Independent SAS oracle: cover each atom sphere with spherical triangles.
// A cap containing a triangle gives a conservative distance interval to every
// other atom, hence wholly exposed/occluded patches can be accepted exactly.
// Ambiguous patches are subdivided; at the final depth their complete solid
// angle contributes only to the upper bound. This uses no Sesmesh field/mesh.
fn exposed_sphere_area_bounds(spheres: &[([f64; 3], f64)]) -> (f64, f64) {
    fn dot(a: [f64; 3], b: [f64; 3]) -> f64 {
        a.iter().zip(b).map(|(a, b)| a * b).sum()
    }
    fn normalized(a: [f64; 3]) -> [f64; 3] {
        let norm = a[0].hypot(a[1]).hypot(a[2]);
        a.map(|v| v / norm)
    }
    fn midpoint(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
        normalized(std::array::from_fn(|i| a[i] + b[i]))
    }
    fn patch(
        spheres: &[([f64; 3], f64)],
        atom: usize,
        corners: [[f64; 3]; 3],
        depth: u32,
    ) -> (f64, f64) {
        let [a, b, c] = corners;
        let center = normalized(std::array::from_fn(|i| a[i] + b[i] + c[i]));
        let radius = spheres[atom].1;
        let world: [f64; 3] = std::array::from_fn(|i| spheres[atom].0[i] + radius * center[i]);
        let cap_cosine = corners
            .iter()
            .map(|&v| dot(center, v))
            .fold(1.0f64, f64::min);
        let cover = radius * (2.0 - 2.0 * cap_cosine).max(0.0).sqrt() + 1e-12;
        let triple = a[0] * (b[1] * c[2] - b[2] * c[1])
            + a[1] * (b[2] * c[0] - b[0] * c[2])
            + a[2] * (b[0] * c[1] - b[1] * c[0]);
        let area =
            2.0 * triple.abs().atan2(1.0 + dot(a, b) + dot(b, c) + dot(c, a)) * radius * radius;
        let mut exposed = true;
        for (other, &(point, other_radius)) in spheres.iter().enumerate() {
            if other == atom {
                continue;
            }
            let distance = (world[0] - point[0])
                .hypot(world[1] - point[1])
                .hypot(world[2] - point[2]);
            if distance + cover < other_radius {
                return (0.0, 0.0);
            }
            exposed &= distance - cover >= other_radius;
        }
        if exposed {
            return (area, area);
        }
        if depth == 0 {
            return (0.0, area);
        }
        let (ab, bc, ca) = (midpoint(a, b), midpoint(b, c), midpoint(c, a));
        [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]
            .into_iter()
            .map(|corners| patch(spheres, atom, corners, depth - 1))
            .fold((0.0, 0.0), |(lo, hi), (a, b)| (lo + a, hi + b))
    }
    let mut result = (0.0, 0.0);
    for atom in 0..spheres.len() {
        for x in [-1.0, 1.0] {
            for y in [-1.0, 1.0] {
                for z in [-1.0, 1.0] {
                    let (lo, hi) = patch(
                        spheres,
                        atom,
                        [[x, 0.0, 0.0], [0.0, y, 0.0], [0.0, 0.0, z]],
                        10,
                    );
                    result.0 += lo;
                    result.1 += hi;
                }
            }
        }
    }
    result
}

#[test]
fn water_sas_area_matches_independent_spherical_patch_bounds() {
    // Declared idealized water geometry, not a claim about a particular experiment.
    let angle = 104.52f64.to_radians();
    let points = [
        [0.0; 3],
        [0.9572, 0.0, 0.0],
        [0.9572 * angle.cos(), 0.9572 * angle.sin(), 0.0],
    ];
    let mut doc = document(&points);
    for (atom, element) in doc.atoms.iter_mut().zip([8, 1, 1]) {
        atom.element = element;
    }
    let mut req = request(MolecularSurfaceKind::Sas, 0.25);
    req.radii_overrides.clear();
    let surface = generate(&doc, &req);
    assert_eq!(surface.radii_angstrom, [1.52, 1.2, 1.2]);
    let spheres: Vec<_> = points
        .into_iter()
        .zip(surface.radii_angstrom.iter().map(|r| r + req.probe_radius))
        .collect();
    let (lo, hi) = exposed_sphere_area_bounds(&spheres);
    assert!(
        (hi - lo) / lo < 0.01,
        "independent bound too coarse: [{lo}, {hi}]"
    );
    // A triangle mesh approximates the curved surface; the analytic interval is
    // kept separate from the qualified <=1% discretization allowance.
    assert!(
        surface.stats.area_angstrom2 >= lo * 0.99 && surface.stats.area_angstrom2 <= hi * 1.01,
        "water SAS area {} outside independent [{lo}, {hi}] with 1% mesh tolerance",
        surface.stats.area_angstrom2
    );
}

#[test]
fn real_crambin_and_selected_1aon_residues_generate_bounded_shapes() {
    let crambin =
        eigenvista_core::import::cif(include_str!("../../../fixtures/bcif/1crn.cif"), "1crn.cif")
            .unwrap();
    let mut whole_request = request(MolecularSurfaceKind::Ses, 0.5);
    whole_request.radii_overrides.clear();
    let entire = generate(&crambin, &whole_request);
    assert_eq!(entire.atom_indices.len(), crambin.atoms.len());
    assert!(entire.positions.len() > 300);
    entire.validate(&crambin).unwrap();

    let complex =
        eigenvista_core::import::cif(include_str!("../../../fixtures/cif/1AON.cif"), "1AON.cif")
            .unwrap();
    let structure = complex.structure.as_ref().unwrap();
    let mut req = request(MolecularSurfaceKind::Ses, 0.5);
    req.radii_overrides.clear();
    req.atom_indices = structure
        .atom_residues
        .iter()
        .enumerate()
        .filter_map(|(atom, &residue)| (residue < 20).then_some(atom))
        .collect();
    let selected = generate(&complex, &req);
    assert_eq!(selected.atom_indices, req.atom_indices);
    assert!(selected.atom_indices.len() > 100 && selected.atom_indices.len() < 300);
    assert!(
        selected
            .vertex_atoms
            .iter()
            .all(|atom| req.atom_indices.binary_search(&(*atom as usize)).is_ok())
    );
    assert!(selected.stats.estimated_engine_bytes > 0);
    selected.validate(&complex).unwrap();
}
