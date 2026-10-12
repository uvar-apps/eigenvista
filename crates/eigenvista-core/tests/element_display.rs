//! Pins the frontend element display data against the Rust scientific sources.
//!
//! Symbols and radii live in `app/src/elements.ts`; colours live in
//! `app/src/atom-colors.json`, the single source of truth for the default
//! palette. Both are re-derived here rather than trusted to stay in step by hand.
//! A failure means the frontend no longer matches the source it documents, not
//! that a source changed upstream on its own.

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

const COLORS_FORMAT: &str = "eigenvista-atom-colors";
const COLORS_VERSION: u64 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Source {
    BondiDefault,
    Alvarez,
    Rahm,
    Extrapolated,
}

/// The radius the display table must carry for an atomic number, and where it
/// comes from.
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

fn read(name: &str) -> String {
    let full = format!("{}/../../app/src/{}", env!("CARGO_MANIFEST_DIR"), name);
    std::fs::read_to_string(&full).unwrap_or_else(|e| panic!("cannot read {full}: {e}"))
}

/// Every `N: { symbol: "..", radius: .. },` row of the element table.
fn table() -> Vec<(usize, String, f64)> {
    let source = read("elements.ts");
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
        let radius = number(body, "radius:").expect("every row carries a radius");
        rows.push((z, symbol, radius));
    }
    rows
}

/// The default palette as parsed JSON.
fn palette_json() -> serde_json::Value {
    let source = read("atom-colors.json");
    serde_json::from_str(&source).expect("atom-colors.json must be valid JSON")
}

/// Every `(z, color)` entry of the default palette.
fn palette() -> Vec<(usize, String)> {
    palette_json()["colors"]
        .as_array()
        .expect("\"colors\" must be an array")
        .iter()
        .map(|entry| {
            let z = entry["z"].as_u64().expect("every entry needs an integer z") as usize;
            let color = entry["color"]
                .as_str()
                .expect("every entry needs a color")
                .to_owned();
            (z, color)
        })
        .collect()
}

fn is_hex_triplet(color: &str) -> bool {
    color.len() == 7
        && color.starts_with('#')
        && color[1..]
            .chars()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
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
    for (z, symbol, _) in table() {
        let reference = Element::new(z).expect("valid element").symbol();
        assert_eq!(
            symbol.to_ascii_uppercase(),
            reference,
            "symbol mismatch at Z={z}"
        );
    }
}

#[test]
fn every_display_radius_matches_its_published_source() {
    let mut counted = [0usize; 4];
    for (z, _, radius) in table() {
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
    for (z, _, radius) in table() {
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
        let (_, _, got) = rows
            .iter()
            .find(|(n, ..)| n == z)
            .unwrap_or_else(|| panic!("Z={z} missing from the table"));
        assert_eq!(got, want, "Z={z} drifted from its pinned Bondi value");
    }
}

#[test]
fn the_element_table_carries_no_colour_of_its_own() {
    // Colour must live only in atom-colors.json. A `color:` field creeping back
    // into elements.ts recreates the two-sources-of-truth problem.
    let source = read("elements.ts");
    assert!(
        !source.contains("color:"),
        "elements.ts must not declare colours; they belong in atom-colors.json"
    );
}

#[test]
fn the_palette_declares_the_supported_format_and_version() {
    let document = palette_json();
    assert_eq!(
        document["format"].as_str(),
        Some(COLORS_FORMAT),
        "unexpected palette format"
    );
    assert_eq!(
        document["version"].as_u64(),
        Some(COLORS_VERSION),
        "unexpected palette version"
    );
}

#[test]
fn the_palette_covers_every_supported_element_exactly_once() {
    let entries = palette();
    assert_eq!(entries.len(), 118, "expected one colour per element");
    for z in 1..=118usize {
        let matches = entries.iter().filter(|(n, _)| *n == z).count();
        assert_eq!(
            matches, 1,
            "palette entry for Z={z} appears {matches} times"
        );
    }
}

#[test]
fn palette_colors_are_lowercase_hex_triplets() {
    for (z, color) in palette() {
        assert!(
            is_hex_triplet(&color),
            "Z={z} has an invalid colour {color}; expected lowercase #rrggbb"
        );
    }
}

#[test]
fn every_element_gets_a_distinct_colour() {
    // The regression this exists to prevent: the 0.5.5/0.5.6 palette used 13
    // distinct colours across 118 elements, with #e6e600 alone covering 32 of
    // them including sulfur and chlorine. Colour only carries element identity if
    // no two elements share it.
    let entries = palette();
    let mut seen: Vec<(String, usize)> = vec![];
    for (z, color) in &entries {
        if let Some((_, first)) = seen.iter().find(|(c, _)| c == color) {
            panic!("Z={first} and Z={z} share colour {color}; elements must be distinguishable");
        }
        seen.push((color.clone(), *z));
    }
    assert_eq!(seen.len(), entries.len());
}

#[test]
fn palette_symbols_match_the_fixed_element_table() {
    // Mirrors the TypeScript typo guard: `symbol` is a human label, never a
    // lookup key, and must agree with the authoritative table.
    let rows = table();
    let document = palette_json();
    for entry in document["colors"].as_array().expect("colors array") {
        let z = entry["z"].as_u64().expect("integer z") as usize;
        let Some(symbol) = entry.get("symbol").and_then(|s| s.as_str()) else {
            continue;
        };
        let expected_symbol = rows
            .iter()
            .find(|(n, ..)| *n == z)
            .unwrap_or_else(|| panic!("Z={z} missing from elements.ts"))
            .1
            .clone();
        assert_eq!(
            symbol.to_ascii_uppercase(),
            expected_symbol.to_ascii_uppercase(),
            "palette entry for Z={z} is labelled {symbol}"
        );
    }
}
