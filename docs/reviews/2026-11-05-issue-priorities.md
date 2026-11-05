# Open issue priorities

Reviewed 5 November 2026 at `38caf41644dc05d72749cdbb3ab4488189e2bac3`,
`main`, source version 0.5.11. Live origin main matched that revision at review.
Read all 16 initially open issue bodies; none then had comments. The authenticated GitHub CLI
provided access after the connector denied repository access. The initial review
proposed priorities following the [taxonomy](../labels.md); the user subsequently
approved the tracker changes recorded below.

## Applied triage

Implementation follow-up: the first batch (#11, #9, #10, and supporting #8) is
merged in [PR #25](https://github.com/uvar-apps/eigenvista/pull/25) at `31c4876`,
closing all four issues, with verification in
[status](../status.md#priority-fixes-5-november-2026). The second batch implements
#12 and #2 in [PR #26](https://github.com/uvar-apps/eigenvista/pull/26), developed
on `codex/next-rendering-fixes`; its
[design](../design/2026-11-06-rendering-quality.md) and
[verification](../status.md#rendering-fixes-6-november-2026) record the explicit
alpha policy, voxel-relative quality, empty-brick skipping, and measurements.
The rendering batch merged as `c5ebcbb`, closing both issues. The third batch
implements #6 then #5 on `codex/worker-ownership-and-cache`; see its
[design](../design/2026-11-06-worker-ownership-and-registration.md) and
[verification](../status.md#worker-ownership-and-registration-6-november-2026).
The table preserves the original ordering. Next outstanding: measured
bond-search work (#3), then declared mmCIF connections (#19).

On 5 November 2026, closed [#16 as completed](https://github.com/uvar-apps/eigenvista/issues/16#issuecomment-6661704198)
using the shipped 0.5.7/0.5.8 fixes and the current 118-colour check. There were
15 open issues at that tracker-update checkpoint. Updated labels and added rationale/acceptance comments:

- [#11](https://github.com/uvar-apps/eigenvista/issues/11#issuecomment-6661697705):
  P2 to P1, plus `kind:scientific`.
- [#19](https://github.com/uvar-apps/eigenvista/issues/19#issuecomment-6661699734):
  P3 to P2.
- [#3](https://github.com/uvar-apps/eigenvista/issues/3#issuecomment-6661701772):
  P1 to P2, with representative-input measurement required.
- [#6](https://github.com/uvar-apps/eigenvista/issues/6#issuecomment-6661703477):
  P1 to P2, with overlapping-consumer reproduction required.

Existing area/kind labels were retained. The first implementation batch remains
#11, #9, and #10, with #8 as supporting work. This tracker update implements no
application fixes and changes no source versions or release artifacts.

## Recommended order

Effort is relative: small is contained, medium spans a workflow, large needs
design and broader coverage. It is not a duration estimate.

| Order | Issue | Priority | Effort | Rationale |
| --- | --- | --- | --- | --- |
| 1 | [#11: column-index wrapping](https://github.com/uvar-apps/eigenvista/issues/11) | P1, raised from P2 | Small | Malformed references can silently change basis centers in WASM and affect subsequent calculations. |
| 2 | [#9: shader parameter mismatch](https://github.com/uvar-apps/eigenvista/issues/9) | P1 | Medium | Accepted parameters can crash rendering and interrupt access to unsaved work. |
| 3 | [#10: native parameter export](https://github.com/uvar-apps/eigenvista/issues/10) | P2 | Small/medium | Save parameters cannot work through the molecular-document save command on macOS. |
| 4 | [#8: compiler selection](https://github.com/uvar-apps/eigenvista/issues/8) | P2 | Small | Resolve the documented 1.92.0 versus tested stable 1.99.0 ambiguity before more releases. |
| 5 | [#12: custom shader blending](https://github.com/uvar-apps/eigenvista/issues/12) | P2 | Medium | Shader alpha and material blending/depth state disagree. |
| 6 | [#2: fixed raymarch steps](https://github.com/uvar-apps/eigenvista/issues/2) | P2 | Medium/large | Fixed 160-step rays can miss detail in the 256-cubed field workflow. |
| 7 | [#6: global cancellation](https://github.com/uvar-apps/eigenvista/issues/6) | P2, lowered from P1 | Medium | Confirm overlapping-consumer impact before changing worker scheduling; normal UI workflows already serialize much of the work. |
| 8 | [#5: cache identity](https://github.com/uvar-apps/eigenvista/issues/5) | P2 | Medium | Repeated scientific payload serialization is present; measure cost and coordinate identity/invalidation with worker ownership. |
| 9 | [#3: global-radius bond queries](https://github.com/uvar-apps/eigenvista/issues/3) | P2, lowered from P1 | Medium | Extra candidates are real; the representative valid-input failure still needs demonstration. Accepted bonds already use pair-specific cutoffs. |
| 10 | [#19: declared mmCIF connections](https://github.com/uvar-apps/eigenvista/issues/19) | P2, raised from P3 | Large | Preserve authoritative connections in an already supported format before expanding crystallographic features. |
| 11 | [#21: BinaryCIF import](https://github.com/uvar-apps/eigenvista/issues/21) | P3 | Medium/large | Useful expansion; text mmCIF already provides an import route. Move up when actual user inputs require it. |
| 12 | [#7: drawing-buffer retention](https://github.com/uvar-apps/eigenvista/issues/7) | P3 | Small/medium | Renderer optimization that must preserve reliable PNG capture. |
| 13 | [#4: native platform label](https://github.com/uvar-apps/eigenvista/issues/4) | P3 | Small | Easy correction, little immediate impact on the exercised macOS release. |
| 14 | [#20: crystal symmetry](https://github.com/uvar-apps/eigenvista/issues/20) | P3, research | Large | Needs bounded expansion, identity/picking, rendering, and boundary contracts. |
| 15 | [#22: mmCIF export](https://github.com/uvar-apps/eigenvista/issues/22) | P3, research | Large | Fidelity depends on retaining metadata the current model discards. |

The formerly open issue [#16](https://github.com/uvar-apps/eigenvista/issues/16)
is now closed using the shipped 0.5.7/0.5.8 fix.
The active default palette has 118 entries and 118 distinct colours, confirmed
again during this review. It does not need another palette implementation.

## First batch

**#11:** [Unchecked conversion](../../crates/eigenvista-format/src/lib.rs#L250)
narrows `u64` to `usize`. Executed the existing generated WASM with the real
example, removed cached surfaces, encoded it, and replaced two basis-center
indices with `4294967297` and `4294967296`. Decode accepted them and swapped
the centers. ZIP manipulation stayed in memory; array bytes/checksums were
unchanged. Fix with checked conversion, retaining row bounds and single-use
validation. Acceptance: native and actual-WASM oversized-index rejection,
negative/fractional/duplicate/ordinary invalid references, and exact valid
legacy/columnar roundtrips. Added `kind:scientific`; this affects
input integrity, not the numerical evaluator or a demonstrated memory exploit.

**#9:** [Parameter publication](../../app/src/ShaderPanel.tsx#L97) and
[uniform merging](../../app/src/shaderTools.ts#L278) accept incompatible values;
[vector controls](../../app/src/ShaderPanel.tsx#L260) assume arrays. Executed the
real parser, merger, Lambert declarations, and React server rendering of
`ShaderPanel`: `float lightDir 1` reproduces `nums.map is not a function`.
Validate types/component counts before publishing parameters or changed shader
sources. Acceptance: real file loading and source switches in Chromium/WebKit,
visible rejection, and retained editor/applied shader/document. A render error
boundary is secondary containment, not a replacement for validation.

**#10:** [saveParams](../../app/src/ShaderPanel.tsx#L139) passes text to
[saveBytes](../../app/src/files.ts#L48); native
[save_native](../../app/src-tauri/src/main.rs#L28) requires a valid EigenVista
ZIP before showing a dialog. The 0.5.10 picker fix (#23) fixed loading only.
Provide a parameter-text export operation, `.params` filtering, safe writes,
and visible errors. Acceptance: native save/reload/cancel/write failure and
browser downloads; preserve molecular-document validation/source protection.

**#8:** No `rust-toolchain.toml` exists. Setup selects 1.92.0; 0.5.11 release
evidence records stable 1.99.0. Choose the tested compiler policy, declare its
targets/components, align setup/build/package instructions, and keep
wasm-bindgen CLI/crate versions matched. Verify host tests, strict Clippy,
WASM build, and desktop build with the selected compiler.

## Important implementation constraints

- **#12:** Real [material construction](../../app/src/shaderTools.ts#L220)
  with shader opacity 0.5 and document opacity 1 yields `transparent: false`,
  `depthWrite: true`; live uniform updates do not change those flags. Define a
  custom-shader transparency policy independent of a particular uniform name.
  Verify overlapping geometry and view-dependent alpha with actual pixels.
- **#2:** [Marching](../../app/src/volume.ts#L97) uses 160 steps for both sampled
  modes. Start with bounded steps tied to voxel traversal, including affine
  grids, and thin signed-field comparisons. Empty-space skipping can follow
  measurement. Correct the issue's unconditional-cost claim: rays already
  [terminate early](../../app/src/volume.ts#L128) once alpha exceeds 0.99.
  Adaptive stepping does not establish topology certification.
- **#6:** [cancel](../../app/src/science.ts#L60) rejects every request and kills
  the sole worker, shared with conversion. However, Convert is
  [disabled during App work](../../app/src/App.tsx#L552), and its dialog is
  [modal](../../app/src/ConvertFiles.tsx#L68). Add overlapping-owner regressions
  and define ownership/queueing or separate worker lifetimes first. An
  AbortSignal or queued message cannot by itself interrupt synchronous WASM;
  preserve active-job termination and a separate fatal-worker teardown path.
- **#5:** [Worker requests](../../app/src/science.worker.ts#L53) serialize both
  the document and all scientific arrays. Measure real Molden/cube clone and
  serialization costs. Use explicit scientific revisions or validated dependency
  identities; preserve sample reuse on appearance changes and invalidation on
  scientific edits and worker restart. Coordinate this after #6. The issue's
  every-slider-frame claim was not reproduced here.
- **#3:** [Queries](../../crates/eigenvista-core/src/bonds.rs#L77) use the maximum
  observed radius, but [acceptance](../../crates/eigenvista-core/src/bonds.rs#L95)
  already uses actual pair radii. The broad bound is conservative. Benchmark
  heterogeneous inputs against brute force before changing it. Radius buckets
  or a proven variable-cutoff strategy may help; an arbitrary smaller
  "plausible" radius can miss valid pairs. Preserve all guards and exact bonds.
- **#19:** [mmCIF import](../../crates/eigenvista-core/src/import/cif.rs#L447)
  currently supplies no explicit bonds and records the loss. Define stable
  selected-row identity, connection types, declared/perceived precedence and
  provenance before implementation. Test alternate sites, models, absent
  references, duplicate links, and symmetry-related endpoints.
- **#21:** [Dispatch](../../crates/eigenvista-import/src/lib.rs#L99) and
  [file selection](../../app/src/files.ts#L6) lack BinaryCIF. Share text-mmCIF
  policies, enforce decoded allocation bounds, and compare twin fixtures.
  The issue's ecosystem-wide default-format claim was not independently checked
  and does not determine this priority.
- **#7:** [Renderer setup](../../app/src/Viewport.tsx#L156) retains the buffer;
  [PNG export](../../app/src/Viewport.tsx#L497) reads the canvas directly. Render
  before capture or use an export target; verify idle/moving exports and GPU
  memory in both engines before removing retention.
- **#4:** The [footer](../../app/src/App.tsx#L1088) labels every native runtime
  macOS. Platform-neutral native wording is a contained correction.
- **#20:** Correct the issue's budget assumption: the tokenizer accepts up to
  250,000 source rows, but [bonds](../../crates/eigenvista-core/src/bonds.rs#L44)
  and [document validation](../../crates/eigenvista-core/src/model.rs#L280) cap
  the resulting structure at 100,000 atoms. Cell drawing and full symmetry
  expansion need separate acceptance contracts.
- **#22:** Define minimal export versus faithful roundtrip first. An emitter
  cannot reconstruct discarded hierarchy/metadata. Verify the agreed contract
  using independent validation and import/export/reimport fixtures.
- **#16:** [Palette resolution](../../app/src/atomColors.ts#L112) uses the JSON
  default with 118 unique colours; the source tests and release history record
  its shipped correction.

## Execution and evidence limits

First batch: **#11, #9, #10**, with **#8** as a small supporting task. Then
**#12 and #2** for quantum-field viewing. Resolve worker ownership (#6) before
changing cached registration (#5). #3 starts with measurement; #19 starts with
the connection contract. The first-batch fixes otherwise have no hard dependency.

The initial review read issue bodies, source, tests, release history, and live remote
identity. Only the focused in-memory reproductions above ran. No fresh build,
browser/native session, bond benchmark, or full test suite was performed; the
generated WASM was exercised without rebuilding it. The 0.5.11 release's 145
Rust/158 browser/13 packaging tests remain dated evidence. The subsequent
user-approved tracker changes are recorded above. No application source,
versions, releases, or Git publication changed during that initial review. The
preexisting untracked `docs/references/` was left alone.
