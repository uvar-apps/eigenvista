# Issue label taxonomy

Labels on [`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista/labels) are
organised on three orthogonal axes plus a small meta set. Every label carries a
description in GitHub itself; this page explains how the axes are meant to be used
together.

## Axes

An issue should carry **one or more `area:`** labels and **one or more `kind:`**
labels, plus exactly one `priority:`. The axes are independent — `area:core` says
where the code is, `kind:scientific` says what sort of problem it is, and neither
implies the other.

### `area:` — where the code lives

| Label | Scope |
| --- | --- |
| `area:renderer` | Three.js scene graph, instancing, materials, camera, picking |
| `area:volume` | Density sampling, raymarching, isosurface generation |
| `area:core` | `eigenvista-core` science: bond perception, integrals, model types |
| `area:format` | `.eigenvista` encode/decode, columnar packing, validation, budgets |
| `area:import` | Chemistry readers: PDB, XYZ, Cube, Molden |
| `area:wasm-bridge` | `eigenvista-wasm`, `science.worker.ts`, request/cancel protocol |
| `area:ui` | React app chrome: panels, badges, summary, controls |
| `area:desktop` | Tauri shell, native windowing, platform integration |
| `area:tooling` | Build wrappers, fixtures, wasm-bindgen pinning, local CI scripts |

Use several when a change genuinely spans them (a rendering bug that also needs a
format change). Do not use them as a proxy for effort.

### `kind:` — what sort of problem

| Label | Scope |
| --- | --- |
| `kind:scientific` | Affects numerical or scientific accuracy. Highest stakes in this project. |
| `kind:correctness` | Produces wrong output or wrong behaviour on valid input |
| `kind:robustness` | Fails, or errors misleadingly, on input that should work |
| `kind:performance` | Unnecessary compute cost, scaling, or latency |
| `kind:memory` | Unnecessary allocation or retained memory |
| `kind:dx` | Developer experience: build, setup, toolchain, clarity of failure |
| `kind:polish` | Cosmetic, wording, or presentation only |

`kind:scientific` is deliberately separate from `kind:correctness`. A wrong atom
colour is a correctness problem; a wrong integral changes the science a user
reports to their colleagues. They are triaged differently and should not be
conflated.

### `priority:` — how soon

| Label | Meaning |
| --- | --- |
| `priority:P1` | Blocks real use, or silently misleads. Fix soon. |
| `priority:P2` | Matters. Schedule it. |
| `priority:P3` | Nice to have; no current impact. |

Priority is about consequence, not about how much work something is. A one-line
fix that misleads users is `P1`; a large refactor with no user impact is `P3`.

### Meta

| Label | Meaning |
| --- | --- |
| `good first issue` | Self-contained, well-scoped, no cross-cutting design decision required |
| `needs-research` | Requires a design decision or measurement before implementing |

`good first issue` is GitHub's built-in label and is what the upstream newcomer
browsing expects — use it rather than a custom variant.

## Relationship to GitHub's default labels

The repository also carries GitHub's stock set (`bug`, `enhancement`,
`documentation`, `duplicate`, `invalid`, `question`, `wontfix`, `help wanted`,
`accessibility`). These are kept because GitHub's automation and outside
contributors expect them.

The `kind:` axis is more precise than `bug` versus `enhancement`, so prefer `kind:`
in new issues. `bug` and `enhancement` are not used on issues that already carry a
`kind:` label — two overlapping classifications on the same axis is worse than
either one alone.

## Initial review snapshot

The eight issues filed with the 0.5.3 review used the following labels. This is
the initial snapshot; subsequent priorities and closures are recorded in the
[5 November review](reviews/2026-11-05-issue-priorities.md) and live GitHub issues.

| Issue | Labels |
| --- | --- |
| [#1](https://github.com/uvar-apps/eigenvista/issues/1) Unknown elements render as one generic sphere | `area:renderer` `area:ui` `kind:correctness` `priority:P2` |
| [#2](https://github.com/uvar-apps/eigenvista/issues/2) Fixed 160-step volume raymarch | `area:volume` `kind:performance` `needs-research` `priority:P2` |
| [#3](https://github.com/uvar-apps/eigenvista/issues/3) Global max radius in bond search | `area:core` `kind:robustness` `kind:performance` `priority:P1` |
| [#4](https://github.com/uvar-apps/eigenvista/issues/4) "macOS desktop" on all platforms | `area:desktop` `area:ui` `kind:polish` `priority:P3` `good first issue` |
| [#5](https://github.com/uvar-apps/eigenvista/issues/5) Full-document JSON cache key | `area:wasm-bridge` `kind:performance` `priority:P2` |
| [#6](https://github.com/uvar-apps/eigenvista/issues/6) Global cancel rejects all requests | `area:wasm-bridge` `kind:correctness` `priority:P1` |
| [#7](https://github.com/uvar-apps/eigenvista/issues/7) `preserveDrawingBuffer` retention | `area:renderer` `kind:memory` `priority:P3` |
| [#8](https://github.com/uvar-apps/eigenvista/issues/8) No `rust-toolchain.toml` | `area:tooling` `kind:dx` `priority:P2` `good first issue` |

That initial review filed no `kind:scientific` issues. Later issues #19
(declared mmCIF connections) and #11 (WASM column-index integrity) use that
label. Consult the live tracker for current state rather than inferring that
scientific defects are absent from this historical table.
