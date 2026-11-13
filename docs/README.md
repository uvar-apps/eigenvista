# Documentation map

This is the documentation hub for the **Rust EigenVista development preview**.
It separates the implemented application from the larger planned v1. Start
with the [user guide](user-guide.md) to use the program, or the
[root AGENTS.md](../AGENTS.md) to continue development.

Current source version: **0.5.14**, including live orbital/density calculation
progress, voxel-relative sampled preview quality, and explicit custom shader
transparency, plus scoped worker cancellation and resident document reuse.
Bond search uses conservative radius buckets, and mmCIF declared connections
are retained with source provenance.
BinaryCIF raw/gzip input shares those scientific rules. PNG export captures an
explicitly rendered frame without retaining the viewport drawing buffer, and
the native runtime badge is platform-neutral.
Sidebar headings collapse their controls independently, retain their settings,
and remember expansion in the current application profile.
Check the [living handoff](handoff.md) and [status](status.md) for
publication, artifact, and verification state; timestamped restart documents
are historical snapshots, not the current release record.

The active rewrite is now EigenVista. Historical Molekel names in research,
release evidence, repository URLs, and Git tags are preserved. Existing
`.molekel` preview files remain supported; new saves default to `.eigenvista`.
The [native profile](preview-format.md) explains input compatibility and the
limits of opening new saves in older builds.

## Current documentation

| Need | Read |
| --- | --- |
| Restart from a fresh coding-agent session without the old chat | [Session handoff](session-handoff-2026-10-21_173143-AWST.md) and [ready-to-use prompt](restart-prompt-2026-10-21_173143-AWST.md) |
| Changes in the current release and known limitations | [0.5.14 release notes](releases/0.5.14.md) |
| What EigenVista does, installation, controls, files, saving, troubleshooting | [User guide](user-guide.md) |
| Development setup, run/build commands, tests, outputs | [Development guide](development.md) |
| Components, code ownership, scientific contracts, runtime data flow | [As-built architecture](architecture.md) |
| Agent continuation, current baseline, priorities, verification gaps | [Handoff](handoff.md) and [root AGENTS.md](../AGENTS.md) |
| Latest selected-issue research, measured tradeoffs and follow-up plans | [Research index](../plans/README.md) and [12 November findings](../plans/2026-11-12-research.md) |
| Native save visibility, permissions and actual filesystem limits | [Plan 005](../plans/005-native-save-contract-research.md): APFS/ExFAT, full/read-only, CLI and unchanged actual writers |
| Volume visibility across quality, representative depth and opaque-object limits | [Visibility/depth decision](design/2026-11-13-volume-visibility.md) and normal regression tests |
| Affine/anisotropic rendering references and confirmed opacity/quality follow-up | [Plan 006](../plans/006-anisotropic-rendering-research.md): independent GPU comparisons, sampling tradeoff and #55 |
| Exact indexed-mesh qualification, shader identity and measured memory limits | [Qualification decision](design/2026-11-12-indexed-mesh-qualification.md), [frozen layout corpus](../fixtures/indexed-mesh-qualification/README.md) and [Plan 003](../plans/003-indexed-mesh-qualification.md) |
| Standalone repository provenance, extracted history, legacy fixture boundary | [Migration record](migration.md) |
| Implemented features, test evidence, M0-M7 progress | [Implementation status](status.md) |
| Repeatable Apple Silicon tester ZIP, contents, signing boundaries | [Tester packaging](tester-packaging.md) |
| Implemented `.eigenvista` container, validation, persistence | [Native preview format](preview-format.md) |
| XYZ/PDB import policy, automatic bonds across formats, algorithm rationale | [Structure imports](structure-imports.md) |
| Molden profile, shared Rust importer, CLI, conversion workflow | [Molden import](molden-import.md) and [independent fixtures](../fixtures/molden/README.md) |
| Gaussian cube profile, volume/raycast previews, signed meshes, preserved grids | [Cube import](cube-import.md) and [analytic fixture](../fixtures/cube/README.md) |
| Libraries, provenance, licensing | [Dependency record](dependencies.md) and [license](../LICENSE) |
| Independent scientific references and regeneration | [PySCF fixtures](../fixtures/pyscf/README.md) |
| Large-structure rendering and format regression input (RCSB PDB 4PJ1) | [Large-structure fixtures](../fixtures/large-structure/README.md) |
| Hosted verification jobs, failure artifacts and local portability checks | [CI guide](../ci/README.md) |
| Zero-occupation import, exact non-compressing publication validation and measurements | [CI/preflight decisions](design/2026-11-11-ci-and-publication-preflight.md) |
| Design decisions, rejected alternatives, and their reasoning before implementation | [Design records](design/README.md) |
| Dated independent review, verification evidence, and prioritised findings | [2026-10-04 code review](reviews/2026-10-04-code-review.md) |
| Sampled preview quality, conservative brick skipping, and shader alpha policy | [Rendering decisions](design/2026-11-06-rendering-quality.md) |
| Scientific worker ownership, cancellation, and resident cache registration | [Worker decisions](design/2026-11-06-worker-ownership-and-registration.md) |
| Conservative bond-query bounds and declared mmCIF connectivity | [Bond/mmCIF decisions](design/2026-11-06-bond-search-and-cif-connections.md) |
| Bounded BinaryCIF transport, current-frame PNG export, and runtime labels | [BinaryCIF/capture decisions](design/2026-11-06-binarycif-and-capture.md) |
| Current review triage: confirmed bugs, scoped improvements, research priorities and repair plan | [2026-11-11 issue priorities](reviews/2026-11-11-issue-priorities.md) |
| Native close/quit decisions, save preservation and actual Molden capacity | [Lifecycle and limits decisions](design/2026-11-11-native-lifecycle-and-molden-limits.md) |
| Previous issue triage and completed repair batches | [2026-11-05 issue review](reviews/2026-11-05-issue-priorities.md) |
| Issue triage conventions — area, kind, and priority label axes | [Issue label taxonomy](labels.md) |
| Fast project overview | [Rewrite README](../README.md) |

## Planning archive

The [original brief](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/prompt-and-info.md) and [research overview](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/README.md)
explain the goal and early investigation. These are **historical planning
documents**, not a description of the current executable. Their "not started"
statements refer to that phase. Preserve them as evidence; record subsequent
decisions and progress in the current documents above.
These links are pinned to the original Molekel revision used for extraction.
The planning archive and legacy application code are not copied into EigenVista.

| Planning question | Historical document |
| --- | --- |
| What did the original application do? | [Legacy review](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/01-legacy-review.md) |
| What is required for full v1? | [Requirements](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/02-requirements.md) |
| Why the shared browser/native approach? | [Architecture decision](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/03-architecture-decision.md) |
| Which scientific/rendering methods were considered? | [Scientific methods](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/04-scientific-methods.md) |
| What is the proposed complete native format? | [Full format proposal](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/05-molekel-format.md) |
| How should external producers be converted? | [Conversion strategy](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/06-conversion-strategy.md) |
| What evidence is required before release? | [Validation and delivery](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/07-validation-and-delivery.md) |
| Where did the research come from? | [Sources](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/08-sources.md) |
| What is the implementation sequence? | [M0-M7 plan](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/09-implementation-plan.md) |

Later decisions take precedence for the current implementation: a clean Rust
scientific core instead of the proposed scientific C integrations; classic
`mcubes` as a temporary mesher; bohr coordinates in the scene; WASM worker jobs
in both browser and desktop; a restricted preview format; and ad-hoc-signed
tester ZIPs rather than a public release. The [architecture](architecture.md)
records these differences without treating the remaining requirements as waived.

## Keeping documentation current

The code and tests establish behavior; the status document records dated
evidence. When they disagree, investigate and correct the current docs. Update
the user guide for visible behavior, architecture/format docs for contracts,
development/packaging docs for commands, and status/handoff for changed gates.
Never turn an unverified design intention into a supported-feature claim.

Tester ZIPs include a standalone `User-guide.md`. Their first-party source
archive contains this documentation tree, the root agent entry point, and the
data-only regression fixtures with their licenses. The original brief and
planning archive remain accessible through the pinned links above; legacy
application code, development caches, private chats, and Git history are excluded.
