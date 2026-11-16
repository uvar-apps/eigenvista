use eigenvista_core::{Atom, Document, inspection::*};

fn source(points: &[[f64; 3]]) -> Document {
    let mut document = Document::empty("inspection fixture");
    document.atoms = points
        .iter()
        .map(|&position| Atom {
            element: 6,
            position,
        })
        .collect();
    document
}

fn request(kind: MeasurementKind, atoms: &[usize]) -> MeasurementRequest {
    MeasurementRequest {
        kind,
        atoms: atoms.to_vec(),
    }
}

fn assert_value(document: &Document, kind: MeasurementKind, atoms: &[usize], expected: f64) {
    let result = measure(document, &request(kind, atoms)).unwrap();
    assert_eq!(result.status, MeasurementStatus::Defined);
    assert!(result.reason.is_none());
    assert!(
        (result.value.unwrap() - expected).abs() < 1e-11,
        "{result:?}, expected {expected}"
    );
}

#[test]
fn distance_uses_source_bohr_and_the_declared_angstrom_conversion() {
    let document = source(&[[0.; 3], [2., 0., 0.], [0.; 3]]);
    let value = measure(&document, &request(MeasurementKind::Distance, &[0, 1])).unwrap();
    assert_eq!(value.unit, "angstrom");
    assert_eq!(value.value, Some(1.058354421806));
    assert_value(&document, MeasurementKind::Distance, &[0, 2], 0.);
    assert!(measure(&document, &request(MeasurementKind::Distance, &[0, 0])).is_err());
}

#[test]
fn middle_atom_angles_preserve_valid_collinear_geometry() {
    let document = source(&[
        [1., 0., 0.],
        [0.; 3],
        [0., 1., 0.],
        [-1., 0., 0.],
        [2., 0., 0.],
        [0.; 3],
    ]);
    assert_value(&document, MeasurementKind::Angle, &[0, 1, 2], 90.);
    assert_value(&document, MeasurementKind::Angle, &[0, 1, 3], 180.);
    assert_value(&document, MeasurementKind::Angle, &[0, 1, 4], 0.);
    let undefined = measure(&document, &request(MeasurementKind::Angle, &[0, 1, 5])).unwrap();
    assert_eq!(undefined.value, None);
    assert_eq!(undefined.status, MeasurementStatus::Undefined);
    assert!(undefined.reason.unwrap().contains("zero-length"));
    let json = serde_json::to_string(&undefined.value).unwrap();
    assert_eq!(json, "null");
}

#[test]
fn torsion_follows_ordered_right_handed_convention_and_half_open_range() {
    let mut document = source(&[[1., 0., 0.], [0.; 3], [0., 1., 0.], [0., 1., -1.]]);
    assert_value(&document, MeasurementKind::Torsion, &[0, 1, 2, 3], 90.);
    assert_value(&document, MeasurementKind::Torsion, &[3, 1, 2, 0], -90.);
    document.atoms[3].position[2] = 1.;
    assert_value(&document, MeasurementKind::Torsion, &[0, 1, 2, 3], -90.);
    document.atoms[3].position = [-1., 1., 0.];
    assert_value(&document, MeasurementKind::Torsion, &[0, 1, 2, 3], -180.);
    document.atoms[3].position = [1., 1., -0.];
    let zero = measure(&document, &request(MeasurementKind::Torsion, &[0, 1, 2, 3]))
        .unwrap()
        .value
        .unwrap();
    assert_eq!(zero.to_bits(), 0f64.to_bits());
}

#[test]
fn geometry_is_translation_rotation_and_scale_invariant() {
    let document = source(&[[1., 0., 0.], [0.; 3], [0., 1., 0.], [0., 1., -1.]]);
    let mut moved = document.clone();
    for atom in &mut moved.atoms {
        let [x, y, z] = atom.position;
        atom.position = [x + 1e6, z - 2e6, -y + 3e6];
    }
    assert_value(&moved, MeasurementKind::Torsion, &[0, 1, 2, 3], 90.);
    assert_value(&moved, MeasurementKind::Angle, &[0, 1, 2], 90.);
    for scale in [1e-300, 1e300] {
        let mut scaled = document.clone();
        for atom in &mut scaled.atoms {
            atom.position = atom.position.map(|coordinate| coordinate * scale);
        }
        assert_value(&scaled, MeasurementKind::Torsion, &[0, 1, 2, 3], 90.);
        assert_value(&scaled, MeasurementKind::Angle, &[0, 1, 2], 90.);
    }
}

#[test]
fn singular_geometry_is_undefined_and_invalid_arguments_are_errors() {
    let document = source(&[[0.; 3], [0., 1., 0.], [0., 2., 0.], [0., 3., 0.]]);
    let collinear = measure(&document, &request(MeasurementKind::Torsion, &[0, 1, 2, 3])).unwrap();
    assert_eq!(collinear.value, None);
    assert_eq!(collinear.status, MeasurementStatus::Undefined);
    for atoms in [&[0, 1][..], &[0, 1, 2, 4], &[0, 1, 2, 2]] {
        assert!(measure(&document, &request(MeasurementKind::Torsion, atoms)).is_err());
    }
    let mut invalid = document;
    invalid.atoms[0].position[0] = f64::NAN;
    assert!(measure(&invalid, &request(MeasurementKind::Distance, &[0, 1])).is_err());
    invalid.atoms[0].position = [f64::MAX, 0., 0.];
    invalid.atoms[1].position = [-f64::MAX, 0., 0.];
    assert!(measure(&invalid, &request(MeasurementKind::Distance, &[0, 1])).is_err());
}

fn definition(id: &str, atoms: &[usize]) -> MeasurementDefinition {
    MeasurementDefinition {
        id: id.into(),
        label: "Distance".into(),
        kind: MeasurementKind::Distance,
        atoms: atoms.to_vec(),
        visible: true,
        color: "#fb9a99".into(),
        always_visible: false,
    }
}

#[test]
fn persisted_annotations_validate_identity_order_targets_and_bounds() {
    let document = source(&[[0.; 3], [1., 0., 0.], [2., 0., 0.]]);
    let mut annotations = Annotations {
        selections: vec![NamedSelection {
            id: "picked".into(),
            label: "Original atoms".into(),
            atoms: vec![0, 2],
            neighborhood: None,
        }],
        measurements: vec![definition("measurement", &[2, 0])],
        labels: vec![AnnotationLabel {
            id: "label".into(),
            text: "Carbon".into(),
            atom: Some(0),
            residue: None,
            visible: true,
            color: "#a6cee3".into(),
            always_visible: true,
        }],
    };
    annotations.validate(&document).unwrap();
    let restored: Annotations =
        serde_json::from_str(&serde_json::to_string(&annotations).unwrap()).unwrap();
    assert_eq!(restored.measurements[0].atoms, [2, 0]);
    assert_eq!(restored, annotations);
    annotations.selections[0].atoms = vec![2, 0];
    assert!(annotations.validate(&document).is_err());
    annotations.selections[0].atoms = vec![0, 2];
    annotations.labels[0].residue = Some(0);
    assert!(annotations.validate(&document).is_err());
    annotations.labels[0].residue = None;
    annotations.labels[0].id = "measurement".into();
    assert!(annotations.validate(&document).is_err());
    annotations.labels[0].id = "label".into();
    annotations.labels[0].text = "x".repeat(257);
    assert!(annotations.validate(&document).is_err());
    annotations.labels[0].text = "valid".into();
    annotations.measurements = (0..=MAX_MEASUREMENTS)
        .map(|index| definition(&format!("measure-{index}"), &[0, 1]))
        .collect();
    assert!(annotations.validate(&document).is_err());
}

#[test]
fn canonical_sets_are_separate_from_measurement_order_and_unknown_fields_fail() {
    let document = source(&[[0.; 3], [1., 0., 0.], [2., 0., 0.]]);
    assert_eq!(canonical_selection(&document, &[2, 0, 2]).unwrap(), [0, 2]);
    assert!(canonical_selection(&document, &[3]).is_err());
    assert!(canonical_selection(&document, &[]).unwrap().is_empty());
    assert!(
        serde_json::from_str::<MeasurementRequest>(
            r#"{"kind":"distance","atoms":[0,1],"extra":true}"#
        )
        .is_err()
    );
}
