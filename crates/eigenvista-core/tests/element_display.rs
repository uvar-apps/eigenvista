//! Pins the frontend element display table against the Rust scientific sources.
//!
//! `app/src/elements.ts` carries the CPK colour and van der Waals radius used to
//! draw atoms. The radii come from published tables that `pdbtbx` already ships,
//! so the display table is re-derived here instead of being trusted to stay in
//! step by hand. A failure means the TypeScript table no longer matches the
//! source it documents, not that a source changed upstream on its own.

use pdbtbx::Element;

/// Elements EigenVista shipped before the table was completed. Their Bondi (1966)
/// values are pinned deliberately so existing documents keep rendering as they
/// did, rather than following a later radius table.
const BONDI_DEFAULTS: &[(usize, f64)] = &[
    (1, 1.20),
    (6, 1.70),
    (7, 1.55),
    (8, 1.52),
    (9, 1.47),
    (15, 1.80),
    (16, 1.80),
    (17, 1.75),
];

/// Fm(100)-Og(118) have no published van der Waals radius. They use the Pyykko
/// single-bond covalent radius scaled by the mean unbound/cov1 ratio over
/// Ac(89)-Cm(96), which keeps the periodic trend rather than flattening it.
const EXTRAPOLATION_FACTOR: f64 = 1.65;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Source {
    BondiDefault,
    Alvarez,
    Rahm,
    Extrapolated,
}

/// The radius the display table must carry for an atomic number, and where it comes from.
fn expected(z: usize) -> (f64, Source) {
    if let Some((_, value)) = BONDI_DEFAULTS.iter().find(|(n, _)| *n == z) {
        return (*value, Source::BondiDefault);
    }
    let radius = Element::new(z)
        .expect("atomic number 1..=118")
        .atomic_radius();
    if let Some(value) = radius.van_der_waals {
        return (value, Source::Alvarez);
    }
    if let Some(value) = radius.unbound {
        return (value, Source::Rahm);
    }
    (
        radius.covalent_single * EXTRAPOLATION_FACTOR,
        Source::Extrapolated,
    )
}

fn quoted(body: &str, key: &str) -> Option<String> {
    let after = body.split_once(key)?.1;
    let open = after.find('"')?;
    let rest = &after[open + 1..];
    let close = rest.find('"')?;
    Some(rest[..close].to_owned())
}

fn number(body: &str, key: &str) -> Option<f64> {
    let after = body.split_once(key)?.1.trim_start();
    let end = after.find([',', '}']).unwrap_or(after.len());
    after[..end].trim().parse::<f64>().ok()
}

/// Every `N: { symbol: "..", color: "#..", radius: .. },` row of the table.
fn table() -> Vec<(usize, String, String, f64)> {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../app/src/elements.ts");
    let source =
        std::fs::read_to_string(path).unwrap_or_else(|e| panic!("cannot read {path}: {e}"));
    let mut rows = vec![];
    for line in source.lines() {
        let line = line.trim();
        let Some((head, body)) = line.split_once(": {") else {
            continue;
        };
        let Ok(z) = head.parse::<usize>() else {
            continue;
        };
        let symbol = quoted(body, "symbol:").expect("every row carries a symbol");
        let color = quoted(body, "color:").expect("every row carries a color");
        let radius = number(body, "radius:").expect("every row carries a radius");
        rows.push((z, symbol, color, radius));
    }
    rows
}

#[test]
fn the_display_table_covers_every_supported_element_exactly_once() {
    let rows = table();
    assert_eq!(rows.len(), 118, "expected one row per element");
    for z in 1..=118usize {
        let matches = rows.iter().filter(|(n, ..)| *n == z).count();
        assert_eq!(matches, 1, "atomic number {z} appears {matches} times");
    }
}

#[test]
fn display_symbols_agree_with_the_element_table() {
    for (z, symbol, _, _) in table() {
        let reference = Element::new(z).expect("valid element").symbol();
        assert_eq!(
            symbol.to_ascii_uppercase(),
            reference,
            "symbol mismatch at Z={z}"
        );
    }
}

#[test]
fn display_colors_are_valid_lowercase_hex_triplets() {
    for (z, _, color, _) in table() {
        assert!(
            eigenvista_core::valid_color(&color),
            "Z={z} has an invalid colour {color}"
        );
        assert_eq!(
            color,
            color.to_lowercase(),
            "Z={z} colour {color} should be lowercase"
        );
    }
}

#[test]
fn every_display_radius_matches_its_published_source() {
    let mut counted = [0usize; 4];
    for (z, _, _, radius) in table() {
        let (want, source) = expected(z);
        // Published values are copied verbatim; the extrapolated tier is rounded
        // to two decimals in the table, so it gets that much slack.
        let tolerance = if source == Source::Extrapolated {
            5e-3
        } else {
            1e-9
        };
        assert!(
            (radius - want).abs() <= tolerance,
            "Z={z}: table has {radius}, expected {want} ({source:?})"
        );
        counted[match source {
            Source::BondiDefault => 0,
            Source::Alvarez => 1,
            Source::Rahm => 2,
            Source::Extrapolated => 3,
        }] += 1;
    }
    // Guards against a source swap silently changing how the table is filled.
    assert_eq!(
        counted,
        [8, 85, 6, 19],
        "unexpected split across radius sources"
    );
}

#[test]
fn display_radii_are_physically_plausible() {
    // Catches a unit slip (pm/nm) or a shifted column, which a per-element
    // comparison against a changed upstream table would not reveal.
    for (z, _, _, radius) in table() {
        assert!(
            (0.8..=3.6).contains(&radius),
            "Z={z} radius {radius} is outside the plausible van der Waals range"
        );
    }
}

#[test]
fn the_bondi_defaults_are_pinned_not_drifting() {
    let rows = table();
    for (z, want) in BONDI_DEFAULTS {
        let (_, _, _, got) = rows
            .iter()
            .find(|(n, ..)| n == z)
            .unwrap_or_else(|| panic!("Z={z} missing from the table"));
        assert_eq!(got, want, "Z={z} drifted from its pinned Bondi value");
    }
}
