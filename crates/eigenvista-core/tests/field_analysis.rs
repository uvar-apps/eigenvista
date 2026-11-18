use eigenvista_core::{
    Atom, BOHR_TO_ANGSTROM, BasisFunction, Density, Document, Grid, Term, compute,
    field_analysis::{
        self as analysis, AnalysisDefinition, AnalysisRequest, FieldAnalysisState, FieldDescriptor,
    },
};
use serde::Deserialize;

fn polynomial([x, y, z]: [f64; 3]) -> f64 {
    2. + 3. * x - 2. * y + 5. * z + x * y - 2. * x * z + 0.5 * y * z + 3. * x * y * z
}

fn grid_doc(axes: [[f64; 3]; 3], origin: [f64; 3]) -> Document {
    let mut doc = Document::empty("quantitative oracle");
    let dims = [4, 3, 5];
    let mut values = Vec::new();
    for z in 0..dims[2] {
        for y in 0..dims[1] {
            for x in 0..dims[0] {
                values.push(polynomial([x as f64, y as f64, z as f64]));
            }
        }
    }
    doc.grids.push(Grid {
        id: "grid".into(),
        label: "arbitrary cube".into(),
        quantity: "unknown".into(),
        origin,
        axes,
        dims,
        values,
    });
    doc.validate().unwrap();
    doc
}

fn request(definition: AnalysisDefinition) -> AnalysisRequest {
    AnalysisRequest {
        id: "analysis-1".into(),
        label: "Quantitative analysis".into(),
        field: "grid".into(),
        descriptor: None,
        definition,
    }
}

fn close(actual: f64, expected: f64) {
    assert!(
        (actual - expected).abs() <= 2e-11 + 1e-10 * expected.abs(),
        "{actual} != {expected}"
    );
}

#[test]
fn affine_trilinear_interpolation_matches_closed_form_at_corners_interiors_and_endpoints() {
    for axes in [
        [[0.7, 0., 0.], [0., 0.9, 0.], [0., 0., 1.1]],
        [[0.7, 0.2, -0.1], [0.1, 0.9, 0.3], [0.2, -0.1, 1.1]],
        [[-0.7, -0.2, 0.1], [0.1, 0.9, 0.3], [0.2, -0.1, 1.1]],
    ] {
        for origin in [[2., -3., 0.4], [1e6, -2e6, 3e6]] {
            let doc = grid_doc(axes, origin);
            let mut evaluator = analysis::FieldEvaluator::new(&doc, "grid").unwrap();
            for point in [
                [0., 0., 0.],
                [3., 2., 4.],
                [0.25, 0.4, 0.7],
                [1.2, 1.5, 3.1],
                [3., 0., 2.3],
            ] {
                let actual = evaluator
                    .value(doc.grids[0].position(point))
                    .unwrap()
                    .unwrap();
                let expected = polynomial(point);
                // Large-origin subtraction cannot recover precision absent in input f64 coordinates.
                assert!(
                    (actual - expected).abs() <= 1e-7 + 1e-9 * expected.abs(),
                    "{actual} != {expected}"
                );
            }
            assert_eq!(
                evaluator
                    .value(doc.grids[0].position([-0.01, 1., 1.]))
                    .unwrap(),
                None
            );
            assert_eq!(
                evaluator
                    .value(doc.grids[0].position([3.01, 1., 1.]))
                    .unwrap(),
                None
            );
        }
    }
}

#[test]
fn endpoint_roundoff_is_clamped_but_real_outside_points_are_not() {
    let doc = grid_doc([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], [0.; 3]);
    let mut evaluator = analysis::FieldEvaluator::new(&doc, "grid").unwrap();
    close(
        evaluator.value([-f64::EPSILON, 0., 0.]).unwrap().unwrap(),
        polynomial([0.; 3]),
    );
    close(
        evaluator
            .value([3. + 2. * f64::EPSILON, 2., 4.])
            .unwrap()
            .unwrap(),
        polynomial([3., 2., 4.]),
    );
    assert_eq!(evaluator.value([-1e-8, 0., 0.]).unwrap(), None);
    assert_eq!(evaluator.value([1e100, 0., 0.]).unwrap(), None);
    assert!(evaluator.value([f64::NAN, 0., 0.]).is_err());
}

#[test]
fn finite_values_beyond_gpu_precision_remain_available_and_interpolate_without_overflow() {
    let mut doc = grid_doc([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], [0.; 3]);
    doc.grids[0].values.fill(1e308);
    let item = analysis::sample(
        &doc,
        &request(AnalysisDefinition::Probe {
            point: [0.5; 3],
            atom: None,
        }),
    )
    .unwrap();
    assert_eq!(item.values, [1e308]);
    assert_eq!(item.valid, [1]);
    assert!(
        analysis::export_csv(&item)
            .unwrap()
            .contains("100000000000000000")
    );
    // Opposite extremes must not overflow an intermediate subtraction.
    for z in 0..5 {
        for y in 0..3 {
            doc.grids[0].values[(z * 3 + y) * 4 + 1] = -1e308;
        }
    }
    let mut evaluator = analysis::FieldEvaluator::new(&doc, "grid").unwrap();
    assert_eq!(evaluator.value([0.5; 3]).unwrap(), Some(0.));
}

#[test]
fn quantitative_inverse_rejects_ill_conditioning_without_changing_format_acceptance() {
    let doc = grid_doc([[1e13, 0., 0.], [0., 1., 0.], [0., 0., 1e-13]], [0.; 3]);
    assert!(doc.validate().is_ok());
    assert!(analysis::FieldEvaluator::new(&doc, "grid").is_err());
}

#[derive(Deserialize)]
struct Fixture {
    document: Document,
    reference: Reference,
}
#[derive(Deserialize)]
struct Reference {
    points: Vec<[f64; 3]>,
    fields: Vec<FieldReference>,
}
#[derive(Deserialize)]
struct FieldReference {
    id: String,
    samples: Vec<[f64; 4]>,
}

#[test]
fn prepared_analytic_sampling_matches_independent_pyscf_values_for_closed_and_open_shells() {
    for json in [
        include_str!("../../../fixtures/pyscf/water-rhf-ccpvdz.json"),
        include_str!("../../../fixtures/pyscf/hydroxyl-uhf-sto3g.json"),
        include_str!("../../../fixtures/pyscf/general-spdfg-spherical.json"),
        include_str!("../../../fixtures/pyscf/general-spdfg-cartesian.json"),
    ] {
        let fixture: Fixture = serde_json::from_str(json).unwrap();
        for field in &fixture.reference.fields {
            let mut evaluator =
                analysis::FieldEvaluator::new(&fixture.document, &field.id).unwrap();
            for (point, expected) in fixture.reference.points.iter().zip(&field.samples) {
                let value = evaluator.value(*point).unwrap().unwrap();
                assert!((value - expected[0]).abs() <= 1e-10 + 1e-8 * expected[0].abs());
            }
        }
    }
}

#[test]
fn unknown_cube_semantics_stay_unknown_and_unit_declarations_never_rescale_cache_or_mesh_hash() {
    let doc = grid_doc([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], [0.; 3]);
    let source_hash = compute::source_hash(&doc, "grid").unwrap();
    let mut input = request(AnalysisDefinition::Probe {
        point: [1.; 3],
        atom: None,
    });
    let unknown = analysis::sample(&doc, &input).unwrap();
    assert_eq!(unknown.descriptor.quantity, "unspecified");
    assert_eq!(unknown.descriptor.value_unit, "unspecified");
    input.descriptor = Some(FieldDescriptor {
        field: "grid".into(),
        quantity: "electron_density".into(),
        value_unit: "electron/bohr^3".into(),
        origin: "user_declared".into(),
        note: "Known external density producer".into(),
        display_unit: Some("electron/angstrom^3".into()),
    });
    let declared = analysis::sample(&doc, &input).unwrap();
    assert_eq!(unknown.values, declared.values);
    assert_eq!(unknown.sample_hash, declared.sample_hash);
    assert_ne!(unknown.interpretation_hash, declared.interpretation_hash);
    assert_eq!(source_hash, compute::source_hash(&doc, "grid").unwrap());
    close(
        declared.descriptor.display_factor().unwrap(),
        BOHR_TO_ANGSTROM.powi(-3),
    );
    let mut invalid = declared.descriptor.clone();
    invalid.value_unit = "V".into();
    assert!(invalid.validate(&doc).is_err());
    invalid = declared.descriptor.clone();
    invalid.origin = "guessed_from_filename".into();
    assert!(invalid.validate(&doc).is_err());
}

#[test]
fn profiles_and_planes_include_endpoints_keep_outside_masks_and_report_real_progress() {
    let doc = grid_doc([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], [0.; 3]);
    let input = request(AnalysisDefinition::Profile {
        start: [-1., 1., 1.],
        end: [4., 1., 1.],
        count: 6,
        atoms: None,
    });
    let mut events = Vec::new();
    let item = analysis::sample_with_progress(&doc, &input, |done, total| {
        events.push((done, total));
        Ok(())
    })
    .unwrap();
    assert_eq!(item.valid, [0, 1, 1, 1, 1, 0]);
    assert_eq!(item.values[0], 0.);
    assert_eq!(events, [(0, 6), (6, 6)]);
    for i in 1..5 {
        close(item.values[i], polynomial([(i - 1) as f64, 1., 1.]));
    }
    assert_eq!(
        analysis::sample_position(&item.definition, 0).unwrap(),
        [-1., 1., 1.]
    );
    assert_eq!(
        analysis::sample_position(&item.definition, 5).unwrap(),
        [4., 1., 1.]
    );
    let csv = analysis::export_csv(&item).unwrap();
    assert!(
        csv.lines()
            .nth(1)
            .unwrap()
            .contains(",,\"unspecified\",outside,")
    );
    assert!(
        csv.lines()
            .last()
            .unwrap()
            .contains(&(5. * BOHR_TO_ANGSTROM).to_string())
    );
    let plane = request(AnalysisDefinition::Plane {
        origin: [0.; 3],
        u: [3., 0., 0.],
        v: [0., 2., 0.],
        dims: [4, 3],
        atoms: None,
    });
    events.clear();
    let plane = analysis::sample_with_progress(&doc, &plane, |done, total| {
        events.push((done, total));
        Ok(())
    })
    .unwrap();
    assert_eq!(events, [(0, 12), (4, 12), (8, 12), (12, 12)]);
    for (i, value) in plane.values.iter().enumerate() {
        close(*value, polynomial([(i % 4) as f64, (i / 4) as f64, 0.]));
    }
    let error = analysis::sample_with_progress(&doc, &input, |done, _| {
        if done == 0 {
            Err("cancelled by observer".into())
        } else {
            Ok(())
        }
    })
    .unwrap_err();
    assert!(error.contains("cancelled"));
}

#[test]
fn atom_defined_frames_have_explicit_orientation_and_reject_degeneracy_and_stale_references() {
    let mut doc = grid_doc([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], [0.; 3]);
    doc.atoms = [[1., 1., 1.], [2., 1., 1.], [1., 2., 1.], [3., 1., 1.]]
        .map(|position| Atom {
            element: 6,
            position,
        })
        .to_vec();
    let definition = analysis::plane_through_atoms(&doc, [0, 1, 2], [2., 4.], [3, 5]).unwrap();
    if let AnalysisDefinition::Plane { origin, u, v, .. } = &definition {
        assert_eq!(*origin, [0., -1., 1.]);
        assert_eq!(*u, [2., 0., 0.]);
        assert_eq!(*v, [0., 4., 0.]);
    } else {
        panic!("wrong definition");
    }
    definition.validate(&doc).unwrap();
    assert!(analysis::plane_through_atoms(&doc, [0, 1, 3], [2.; 2], [3; 2]).is_err());
    assert!(analysis::plane_through_atoms(&doc, [0, 0, 2], [2.; 2], [3; 2]).is_err());
    doc.atoms[0].position[0] += 0.1;
    assert!(definition.validate(&doc).is_err());
    assert!(
        AnalysisDefinition::Probe {
            point: [0.; 3],
            atom: Some(99)
        }
        .validate(&doc)
        .is_err()
    );
    assert!(
        AnalysisDefinition::Profile {
            start: [0.; 3],
            end: [0.; 3],
            count: 2,
            atoms: None
        }
        .validate(&doc)
        .is_err()
    );
}

fn square(values: [f64; 4]) -> analysis::FieldAnalysisItem {
    let mut doc = Document::empty("square");
    // Grid x-fastest order [bottom-left, bottom-right, top-left, top-right].
    doc.grids.push(Grid {
        id: "grid".into(),
        label: "square".into(),
        quantity: "unknown".into(),
        origin: [0.; 3],
        axes: [[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]],
        dims: [2; 3],
        values: values.into_iter().chain(values).collect(),
    });
    let mut item = analysis::sample(
        &doc,
        &request(AnalysisDefinition::Plane {
            origin: [0.; 3],
            u: [1., 0., 0.],
            v: [0., 1., 0.],
            dims: [2; 2],
            atoms: None,
        }),
    )
    .unwrap();
    item.appearance.contour_levels = vec![0.];
    item
}

#[test]
fn contours_match_linear_crossings_and_bilinear_asymptotic_saddle_topology() {
    let linear = square([-1., 1., -1., 1.]);
    let segments = analysis::contours(&linear).unwrap();
    assert_eq!(segments.len(), 1);
    assert_eq!(segments[0].start, [0.5, 0., 0.]);
    assert_eq!(segments[0].end, [0.5, 1., 0.]);
    let saddle = square([2., -1., -1., 2.]);
    let segments = analysis::contours(&saddle).unwrap();
    assert_eq!(segments.len(), 2);
    close(segments[0].start[0], 2. / 3.);
    close(segments[0].end[1], 1. / 3.);
    assert_eq!(segments[0].start[1], 0.);
    assert_eq!(segments[0].end[0], 1.);
    let mut hole = linear.clone();
    hole.valid[0] = 0;
    assert!(analysis::contours(&hole).unwrap().is_empty());
    assert!(analysis::contours(&square([0.; 4])).unwrap().is_empty());
    let tie = analysis::contours(&square([1., -1., -1., 1.])).unwrap();
    assert_eq!(tie.len(), 2);
    assert_eq!(tie[0].start, [0.5, 0., 0.]);
    assert_eq!(tie[0].end, [1., 0.5, 0.]);
}

#[test]
fn saddle_topology_preserves_product_sign_across_f64_dynamic_range_and_near_ties() {
    let tiny = f64::from_bits(1);
    let perturbation = 2f64.powi(-27);
    // Source arrays are x-fastest: bottom-left, bottom-right, top-left, top-right.
    // Every case has negative exact bilinear determinant, so its first contour
    // must connect bottom and left rather than bottom and right.
    for (values, level) in [
        ([1e308, -1., -1., 5e-309], 0.),
        ([1. + perturbation, -1., -1., 1. - perturbation], 0.),
        ([1e308, -1e308, -f64::MAX, 1e308], 0.),
        ([1e-300, -2e-300, -2e-300, 1e-300], 0.),
        ([2. * tiny, -3. * tiny, -3. * tiny, 2. * tiny], 0.),
        ([1.7e308, -1e308, -1e308, 1.00000001e308], 1e308),
    ] {
        let mut item = square(values);
        item.appearance.contour_levels = vec![level];
        let segments = analysis::contours(&item).unwrap();
        assert!(!segments.is_empty(), "{values:?}, {level}");
        assert_eq!(segments[0].start[1], 0., "{values:?}, {level}");
        assert_eq!(segments[0].end[0], 0., "{values:?}, {level}");
    }
    let mut item = square([1e308, -1., -1., 5e-309]);
    item.appearance.contour_levels = vec![0.];
    let segments = analysis::contours(&item).unwrap();
    assert_eq!(segments.len(), 1);
    assert_eq!(segments[0].start, [1., 0., 0.]);
    assert_eq!(segments[0].end, [0., 1., 0.]);
}

#[test]
fn caches_validate_fingerprints_masks_ranges_and_serde_strictness() {
    let doc = grid_doc([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], [0.; 3]);
    let item = analysis::sample(
        &doc,
        &request(AnalysisDefinition::Probe {
            point: [1.; 3],
            atom: None,
        }),
    )
    .unwrap();
    item.validate(&doc).unwrap();
    let mut state = FieldAnalysisState {
        show_field_key: false,
        descriptors: vec![item.descriptor.clone()],
        items: vec![item.clone()],
    };
    state.validate(&doc).unwrap();
    state.items[0].source_hash = "0".repeat(64);
    assert!(state.validate(&doc).is_err());
    let mut invalid = item.clone();
    invalid.valid[0] = 2;
    assert!(invalid.validate(&doc).is_err());
    invalid = item.clone();
    invalid.range = Some([0., 0.]);
    assert!(invalid.validate(&doc).is_err());
    invalid = item.clone();
    invalid.values[0] = f64::NAN;
    assert!(invalid.validate(&doc).is_err());
    invalid = item.clone();
    invalid.descriptor.note = "changed interpretation".into();
    assert!(invalid.validate(&doc).is_err());
    state.items = vec![item; 129];
    for (i, item) in state.items.iter_mut().enumerate() {
        item.id = format!("probe-{i}");
    }
    state.validate(&doc).unwrap();
    assert!(
        AnalysisDefinition::Plane {
            origin: [0.; 3],
            u: [1., 0., 0.],
            v: [0., 1., 0.],
            dims: [513, 2],
            atoms: None
        }
        .validate(&doc)
        .is_ok()
    );
    assert!(
        AnalysisDefinition::Profile {
            start: [0.; 3],
            end: [1.; 3],
            count: 4097,
            atoms: None
        }
        .validate(&doc)
        .is_ok()
    );
    assert!(serde_json::from_value::<AnalysisRequest>(serde_json::json!({"id":"a","label":"x","field":"grid","definition":{"kind":"probe","point":[0,0,0]},"unknown":true})).is_err());
}

#[test]
fn aggregate_caches_and_contours_are_complete_above_the_former_ceilings() {
    let mut doc = Document::empty("dense contours");
    let values: Vec<_> = (0..2)
        .flat_map(|_| {
            (0..512).flat_map(|y| (0..512).map(move |x| if (x + y) % 2 == 0 { 1. } else { -1. }))
        })
        .collect();
    doc.grids.push(Grid {
        id: "grid".into(),
        label: "checkerboard".into(),
        quantity: "unknown".into(),
        origin: [0.; 3],
        axes: [[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]],
        dims: [512, 512, 2],
        values,
    });
    let mut item = analysis::sample(
        &doc,
        &request(AnalysisDefinition::Plane {
            origin: [0.; 3],
            u: [511., 0., 0.],
            v: [0., 511., 0.],
            dims: [512; 2],
            atoms: None,
        }),
    )
    .unwrap();
    assert_eq!(item.cache_bytes().unwrap(), 512 * 512 * 12);
    let mut items = vec![item.clone(); 6];
    for (index, item) in items.iter_mut().enumerate() {
        item.id = format!("plane-{index}");
    }
    let state = FieldAnalysisState {
        show_field_key: false,
        descriptors: vec![],
        items,
    };
    state.validate(&doc).unwrap();
    item.appearance.contour_levels = vec![-0.5, 0., 0.5];
    let contours = analysis::contours(&item).unwrap();
    assert_eq!(contours.len(), 3 * 2 * 511 * 511);
    item.validate(&doc).unwrap();
    assert_eq!(item.values.len(), 512 * 512);
    item.appearance.contour_levels = vec![0.];
    item.validate(&doc).unwrap();
    let mut other = item.clone();
    other.id = "second-plane".into();
    other.appearance.visible = false;
    other.validate(&doc).unwrap();
    let aggregate = FieldAnalysisState {
        descriptors: vec![],
        items: vec![item, other],
        show_field_key: false,
    };
    aggregate.validate(&doc).unwrap();
}

#[test]
fn csv_preserves_negative_numeric_values_and_neutralizes_untrusted_text_only() {
    let doc = grid_doc([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], [0.; 3]);
    let mut item = analysis::sample(
        &doc,
        &request(AnalysisDefinition::Probe {
            point: [0., 2., 0.],
            atom: None,
        }),
    )
    .unwrap();
    item.descriptor.note = "=HYPERLINK(\"example\")".into();
    let csv = analysis::export_csv(&item).unwrap();
    assert!(
        csv.lines()
            .nth(1)
            .unwrap()
            .contains(",-2,\"unspecified\",valid,")
    );
    assert!(csv.contains("\"'=HYPERLINK(\"\"example\"\")\""));
    let mut renamed = request(item.definition.clone());
    renamed.label = "new presentation label".into();
    assert_eq!(
        analysis::sample(&doc, &renamed).unwrap().sample_hash,
        item.sample_hash
    );
    item.values[0] = f64::NAN;
    assert!(analysis::export_csv(&item).is_err());
}

#[test]
fn mid_plane_observer_error_stops_sampling_and_invalid_parameters_fail_before_progress() {
    let doc = grid_doc([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], [0.; 3]);
    let input = request(AnalysisDefinition::Plane {
        origin: [0.; 3],
        u: [3., 0., 0.],
        v: [0., 2., 0.],
        dims: [4, 3],
        atoms: None,
    });
    let mut completed = Vec::new();
    let error = analysis::sample_with_progress(&doc, &input, |done, _| {
        completed.push(done);
        if done == 4 {
            Err("cancelled after first row".into())
        } else {
            Ok(())
        }
    })
    .unwrap_err();
    assert!(error.contains("cancelled"));
    assert_eq!(completed, [0, 4]);
    let mut invalid = input.clone();
    invalid.definition = AnalysisDefinition::Plane {
        origin: [0.; 3],
        u: [1., 0., 0.],
        v: [2., 0., 0.],
        dims: [4, 3],
        atoms: None,
    };
    assert!(
        analysis::sample_with_progress(&doc, &invalid, |_, _| panic!(
            "invalid input must fail before progress"
        ))
        .is_err()
    );
}

#[test]
fn nonsymmetric_transition_matrix_keeps_both_halves_and_signed_density() {
    let mut doc = Document::empty("independent two Gaussian matrix");
    doc.basis = [0., 1.]
        .map(|x| BasisFunction {
            center: [x, 0., 0.],
            exponents: vec![1.],
            coefficients: vec![1.],
            terms: vec![Term {
                powers: [0; 3],
                weight: 1.,
            }],
        })
        .to_vec();
    doc.densities.push(Density {
        id: "transition".into(),
        label: "transition".into(),
        kind: "transition".into(),
        matrix: vec![1., 3., -2., -0.5],
    });
    let mut input = request(AnalysisDefinition::Probe {
        point: [0.; 3],
        atom: None,
    });
    input.field = "transition".into();
    let item = analysis::sample(&doc, &input).unwrap();
    close(item.values[0], 1. + (-1f64).exp() - 0.5 * (-2f64).exp());
    assert_eq!(item.descriptor.quantity, "transition_density");
    input.definition = AnalysisDefinition::Probe {
        point: [2., 0., 0.],
        atom: None,
    };
    let value = analysis::sample(&doc, &input).unwrap().values[0];
    close(value, (-8f64).exp() + (-5f64).exp() - 0.5 * (-2f64).exp());
    assert!(value < 0.);
}
