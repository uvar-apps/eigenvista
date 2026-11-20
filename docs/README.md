# Documentation map

Version **0.10.3** adds pending-edit Save coordination (#99), explicitly selected
atomic replacement for converter/AI exports to the tested Mac ExFAT volume
(#100), and the optional [Accessible elements palette](../palettes/accessible-elements.json)
(#72). It retains automatic field-plane updates, visible picking cues, live
SES/SAS progress, smooth camera-relative lighting and
[allocation-driven workloads](allocation-policy.md).
Historical release records retain the behavior of their original binaries.
The [0.10.3 notes](releases/0.10.3.md) and [living handoff](handoff.md)
record release preparation, validation and delivery (#103).

This is the documentation hub for the **EigenVista development preview**.
EigenVista is a modern rewrite of Molekel, the molecular visualization
application developed by Ugo Varetto between 2006 and 2010. See the original
[Molekel repository](https://github.com/ugovaretto/molekel) and
[Molekel website](https://ugovaretto.github.io/molekel/).

It separates the implemented application from the larger planned v1. Start
with the [user guide](user-guide.md) to use the program, or the
[root AGENTS.md](../AGENTS.md) to continue development.

The [public user website](https://uvar-apps.github.io/eigenvista/) presents
installation, a detailed manual, worked tutorials, an illustrated
[surface-shader guide](https://uvar-apps.github.io/eigenvista/surface-shaders.html)
and a gallery. Its prepared
static files live in `site/` on `main`; [website maintenance](website.md) covers
content updates, authentic capture provenance, local checks and the Pages-only
publisher. Application builds/tests continue to run locally before pushing.
The [project discovery guide](project-discovery.md) covers GitHub presentation,
the real-app shader demo/social image, and Search Console maintenance (#77).

**Scientific inspection, introduced in 0.10.0:** merged through PR #89, implementing
[Plan 009](../plans/009-scientific-inspection-implementation.md), tracked by
[#83–#86](https://github.com/uvar-apps/eigenvista/issues/83): measurements/labels
and ligand neighborhoods, SES/SAS molecular surfaces, and quantitative field
probes/planes/contours/profiles. All have shared API and external AI connector
paths. These additions are included in the 0.10.3 Mac package; older 0.8.0
binaries predate them. Use live capability discovery with the packaged connector.
Current artifact and qualification evidence belongs in [handoff](handoff.md)
and [status](status.md).
The approved [simple workspace pane](design/2026-11-17-simple-workspace-pane.md)
implements the user's preferred IDE-style arrangement: one wide pane on either
side, four internal top tabs, hide/reopen, and the original collapsible/draggable
widgets and application chrome (#88). It is the normal startup layout;
`?workspace=legacy` retains the previous comparison for regression/reference use. The
[earlier analysis and alternatives](design/2026-11-16-desktop-workspaces.md) are
preserved as historical research, with their separate captures and qualification.

The [implementation decision](design/2026-11-16-scientific-inspection.md) records
the contracts and evidence boundaries behind those workflows.

Current version: **0.10.3**, with pending-edit Save coordination, explicit
ExFAT replacement and the optional Accessible elements palette through existing
GUI/API/AI workflows. Other
features include smooth scene lighting, allocation-driven workloads, live orbital/density calculation progress,
voxel-relative sampled preview quality, explicit custom shader transparency,
scoped worker cancellation and resident document reuse.
Bond search uses conservative radius buckets, and mmCIF declared connections
are retained with source provenance.
BinaryCIF raw/gzip input shares those scientific rules. PNG export captures an
explicitly rendered frame without retaining the viewport drawing buffer, and
the native runtime badge is platform-neutral.
Sidebar headings collapse their controls independently, retain their settings,
and remember expansion and within-pane order in the current application profile.
Dedicated handles support dragging, keyboard moves and tap-accessible controls.
Sidebar reordering originated in 0.5.15 (#52). Version 0.6.0 adds optional
molecular ambient occlusion; see the
[decision](design/2026-11-14-molecular-ambient-occlusion.md) and
[release notes](releases/0.6.0.md). Version 0.6.0 is published with rebuilt,
independently audited Apple Silicon artifacts at its
[release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.6.0).
The earlier 0.5.15 package predates AO.

Version 0.8.0 introduced a shared application controller and packaged AI connector.
Use the installed app from Codex, Claude Code, Pi, OpenCode or a generic local
agent without a source checkout. The website includes four prompt-driven
scientific/visual tutorials. See [0.8.0 notes](releases/0.8.0.md),
[current status](status.md#source-version-080) and the
[AI setup guide](ai-connector.md).

Version 0.7.2 added scene background color/reset controls and transparent PNG
export (#73/#74), plus optional MatterViz Muted/Pastel files for the existing
atom-color loader. Fresh local macOS 0.7.2 checks passed, including all 526 browser
cases; the earlier feature batch retains its separate record. Rebuilt Apple
Silicon assets, independent artifact/native acceptance, production checks and
all three downloads passed verification. The
[0.7.2 release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.2)
provides the ZIP, checksum and build metadata. See the
[0.7.2 notes](releases/0.7.2.md) and [current status](status.md#source-version-072).
The published 0.7.1 release retains its original source and verified artifacts.

Version 0.7.1 renames the **Document** sidebar section to **Molecular data**
without changing controls, saved-file profiles or internal preference IDs.
Fresh local macOS verification passed, including all 504 browser cases.
Rebuilt, independently audited Apple Silicon assets are available at the
[0.7.1 release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.1),
with all three downloads verified. See the [0.7.1 release notes](releases/0.7.1.md) and
[current status](status.md#source-version-071). The published 0.7.0 artifacts
below retain their original source and verification evidence.

Version 0.7.0 includes biological metadata, chain/entity coloring, component
selection and protein trace/tube/ribbon/cartoon views under issues #62–#66,
merged through [PR #67](https://github.com/uvar-apps/eigenvista/pull/67).
Fresh local macOS release verification passed, including all 504 browser cases.
The rebuilt, independently audited Apple Silicon artifacts are published at the
[0.7.0 release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.0),
with all three asset downloads verified. See the
[0.7.0 release notes](releases/0.7.0.md) and current status. The published
0.6.0 package predates these views. Read the
[user workflow](user-guide.md#biological-structure-views),
[import contract](structure-imports.md#biological-identities)
and [ranked roadmap](../plans/007-molecular-visualization-roadmap.md).
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
| Current release changes and known limitations | [0.10.3 notes](releases/0.10.3.md), [handoff](handoff.md) and [status](status.md) |
| What EigenVista does, installation, controls, files, saving, troubleshooting | [User guide](user-guide.md) |
| Selections, measurements, labels, neighborhoods, SES/SAS and quantitative fields | [User guide](user-guide.md#scientific-inspection), [API additions](application-control.md#scientific-inspection-api-0100), [native capabilities](preview-format.md#scientific-inspection-capabilities-0100) |
| Development setup, run/build commands, tests, outputs | [Development guide](development.md) |
| Components, code ownership, scientific contracts, runtime data flow | [As-built architecture](architecture.md) |
| Install and use the connector with Codex, Claude Code, Pi, OpenCode or a generic local agent | [Connector installation and user guide](ai-connector.md), with a copyable setup prompt for the 0.10.3 Mac package |
| Prompt-driven orbital, density, large-molecule AO and protein-representation lessons | [AI website section](https://uvar-apps.github.io/eigenvista/ai.html); these four tutorials are maintained only on the website |
| External harness control, CLI, method discovery, jobs and scoped artifacts (introduced in 0.8.0; inspection additions in 0.10.0) | [Application control](application-control.md) and [accepted decision](design/2026-11-16-application-control-api.md) |
| Recorded natural-language orbital visualization, with PDF/HTML/Markdown and images | [Sample AI session](sample-ai-session/README.md) |
| AI console, model compatibility and protocol research | [Research report](research/2026-11-15-ai-console-and-agent-api.md); the selected implementation omits the embedded console and scripting runtime |
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
| Structure import policy, selected biological identities, automatic bonds and algorithm rationale | [Structure imports](structure-imports.md) |
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
