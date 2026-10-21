use eigenvista_core::{Document, Grid, compute, fixtures};

fn observed(doc: &Document, field: &str, resolution: usize) -> (Grid, Vec<(usize, usize)>) {
    let mut events = Vec::new();
    let grid = compute::sample_with_progress(doc, field, resolution, |done, total| {
        events.push((done, total));
        Ok(())
    })
    .unwrap();
    let legacy = compute::sample(doc, field, resolution).unwrap();
    assert_eq!(
        serde_json::to_value(&grid).unwrap(),
        serde_json::to_value(legacy).unwrap()
    );
    assert_eq!(events.first(), Some(&(0, grid.dims[2])));
    assert_eq!(events.last(), Some(&(grid.dims[2], grid.dims[2])));
    assert!(events.windows(2).all(|pair| pair[0].0 < pair[1].0));
    assert!(
        events
            .iter()
            .all(|(done, total)| *total == grid.dims[2] && done <= total)
    );
    (grid, events)
}

#[test]
fn orbital_and_density_progress_preserves_samples_and_counts_each_slice() {
    let doc = fixtures::hydrogen_pair();
    for field in [&doc.orbitals[0].id, &doc.densities[0].id] {
        let (_, events) = observed(&doc, field, 24);
        assert_eq!(events, (0..=24).map(|done| (done, 24)).collect::<Vec<_>>());
    }
}

#[test]
fn imported_grid_copy_and_resample_report_real_slice_totals() {
    let mut doc = fixtures::hydrogen_pair();
    let mut grid = compute::sample(&doc, &doc.orbitals[0].id, 16).unwrap();
    grid.id = "imported-grid".into();
    grid.axes[0][0] *= -1.;
    grid.axes[1][0] = 0.1;
    doc.grids.push(grid);
    let (copied, events) = observed(&doc, "imported-grid", 24);
    assert_eq!(events, vec![(0, 16), (16, 16)]);
    assert_eq!(copied.values, doc.grids[0].values);
    let (_, events) = observed(&doc, "imported-grid", 12);
    assert_eq!(events.len(), 13);
}

#[test]
fn validation_and_callback_failure_never_report_false_completion() {
    let doc = fixtures::hydrogen_pair();
    let field = &doc.orbitals[0].id;
    let mut events = Vec::new();
    assert!(
        compute::sample_with_progress(&doc, field, 257, |done, total| {
            events.push((done, total));
            Ok(())
        })
        .is_err()
    );
    assert!(events.is_empty());
    let result = compute::sample_with_progress(&doc, field, 24, |done, total| {
        events.push((done, total));
        if done == 3 {
            Err("Observer stopped".into())
        } else {
            Ok(())
        }
    });
    assert_eq!(result.unwrap_err(), "Observer stopped");
    assert_eq!(events.last(), Some(&(3, 24)));
}
