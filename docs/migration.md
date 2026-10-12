# Standalone repository migration

EigenVista now has a dedicated repository at
[`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista). Its Rust
workspace, `app/`, `crates/`, `docs/`, `tools/`, `packaging/`, and `fixtures/`
live at the repository root. Extraction retained version **0.4.0**, the application
icon, logo, scientific model, and native-file compatibility. See
[status](status.md) for subsequent releases.

## Source and history

The source is the `next/` rewrite subtree from
[`ugovaretto/molekel` at `4edabf6852db44ff849e82223bef6c0702730e3c`](https://github.com/ugovaretto/molekel/tree/4edabf6852db44ff849e82223bef6c0702730e3c/next).
Subtree extraction preserves eight rewrite-only commits, with new commit
identities because their trees and ancestry differ from the original repository:

| Extracted commit | Historical increment |
| --- | --- |
| `00a430b` | Initial Rust rewrite and native/web preview |
| `8a6e02e` | macOS tester packaging and documentation |
| `215cbb3` | Molden import and conversion, 0.2.0 |
| `73e3099` | Cube rendering and automatic bonds, 0.2.1 |
| `0b00ceb` | Orbital browser and larger density jobs, 0.3.0 |
| `22aa839` | High-resolution grids, 0.3.1 |
| `802a33b` | Camera redraw and zoom controls, 0.3.2 |
| `da27738` | EigenVista name and compatibility release, 0.4.0 |

These identify the extracted history before the root-layout migration changes.
The new checkout starts on `main`; inspect Git for later commits, branch changes,
remote configuration, and publication state. Original commits and tags, including
`molekel-next-start` and `v0.4.0`, remain in the original repository. They are not
aliases for the new hashes and should not be assumed to exist locally.

The original Molekel checkout is not modified by this migration. Legacy C++/Qt/VTK
application source and build machinery are not copied into this repository.
Private chat exports, old generated packages, development caches, and the
original repository's unrelated history are not application source here.

## Research and fixture boundary

The [original brief](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/prompt-and-info.md)
and [research overview](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/README.md)
remain at the pinned original revision. The [documentation map](README.md)
links every historical plan there. They are not copied into the standalone
checkout or packaged as current implementation instructions.

Eight unchanged, data-only regression inputs are retained under
[`fixtures/legacy/`](../fixtures/legacy/README.md): four PDB structures, the
Molden regression, and three cube files. Their original `data/` and `all_data/`
subpaths are preserved beneath that directory. Their
[license](../fixtures/legacy/LICENSE) and provenance remain with the inputs.
They are test data, not a copied legacy application. Existing first-party
PySCF/Molden/cube fixtures and third-party test-data notices remain separate.

## Working from the root

Use [AGENTS.md](../AGENTS.md) as the self-contained working agreement and the
[development guide](development.md) for current commands. There is no parent
repository dependency or `next/` wrapper. Typical commands from this root are
`npm --prefix app run dev` and `cargo test --locked --workspace`. Temporary
storage is this repository's ignored `tmp/`, never system `/tmp` or the original
Molekel checkout. Data paths now begin with `fixtures/legacy/` where applicable.

Tester source archives include the standalone root layout, documentation, and
required data-only fixtures. They do not include legacy application code or
the remote research archive. Old `.molekel` preview files remain readable;
new saves use `.eigenvista` and EigenVista identifiers, as described by the
[native profile](preview-format.md). No user data files are bulk-migrated.

## Verification boundary

The standalone checkout passes 108 workspace Rust tests, 114 browser cases,
11 packaging tests, production WASM/frontend build, formatting, Clippy, fixture
checksums, and local documentation links. Scientific/UI behavior, dependencies,
icons, and frozen references are unchanged. Full standalone macOS ZIP build and
extracted-artifact verification also pass. That archive identifies the uncommitted
migration snapshot used before the final documentation evidence update; it is not
a newly tagged release. Native interaction and clean-machine installation remain
separate gates.
See [status](status.md) and [handoff](handoff.md) for current evidence. Earlier
dated counts describe the original checkout. Use Git and each archive's
`BUILD-INFO.json` to establish source identity and completed publication/package
checks; subtree history alone does not establish either.
