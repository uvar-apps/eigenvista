# November code-review triage and repair plan

Reviewed 11 November 2026 against source revision
`fa76ac423e84dca137110b3ce45b3bee037ae0db`, branch `main`, EigenVista **0.5.12**.
This is the disposition and implementation plan for the supplied independent
review, local input `2026-11-11-code-review.md`. Preserve that untracked original
review unchanged; it is not added to the repair pull request. The plan records
the verified findings independently of that local input.

Fourteen new issues were opened and their complete bodies, titles and labels
were read back from GitHub. At initial triage sixteen were open: #30–#43 plus the existing
#20 and #22. The [5 November triage](2026-11-05-issue-priorities.md) records the
previous, completed repair batches; it is not the current queue.

## Batch A implementation follow-up

The user subsequently authorized #30/#31 on a separate branch and through a PR.
Both are implemented in [PR #44](https://github.com/uvar-apps/eigenvista/pull/44)
on `codex/native-exit-and-molden-contract`, runtime/test commit `36c8491`. A real native
probe reproduced dirty-document loss through AppKit's default Quit selector,
which bypassed the proposed Tauri ExitRequested-only guard. The fix includes the
macOS delegate hook, shared native token protocol and current-document modal
decisions. The [decision record](../design/2026-11-11-native-lifecycle-and-molden-limits.md)
and [status](../status.md#native-lifecycle-and-molden-limits-11-november-2026)
record the actual changes, fresh verification and manual qualification gaps.
Molden limits are unchanged; the documentation defect and boundary tests are fixed.

After this batch, next work is #32, #33 and #34, then the P3 investigations and
existing #20/#22. No implementation of those remaining issues is authorized by
the #30/#31 request. The table below preserves initial classifications/priorities.

## Batch B/C implementation follow-up

The user next authorized #32/#33/#34 through a separate branch and PR.
[PR #45](https://github.com/uvar-apps/eigenvista/pull/45) implements hosted
verification, the exact zero-occupation import optimization and shared full
publication preflight without compression. The
[decision/measurement record](../design/2026-11-11-ci-and-publication-preflight.md)
and [status](../status.md#ci-and-importpublication-performance-11-november-2026)
record scoped measurements, fresh local checks and hosted evidence locations.
Clean hosted installation also exposed the missing Node type dependency and
broken preferred Ubuntu mirror; both setup defects are handled under #32.

After merging this batch, #35–#43 and existing #20/#22 remain P3, plus the
new [#46 Vite advisory assessment](https://github.com/uvar-apps/eigenvista/issues/46).
Known affected upstream development-tool versions are recorded there; an
EigenVista exposure is not reproduced. Remaining feature/research work is not
authorized by the #32/#33/#34 request. The original queue below is historical.

## Research follow-up: 12 November 2026

The authorized research pass at merged main `06ecbb9` investigated #46, #39,
#37, #38 and #35 without application changes. The
[research index](../../plans/README.md) and
[evidence report](../../plans/2026-11-12-research.md) now supersede the initial
P3 ordering for those topics. Recommend the bounded Vite patch first and genuine
compatibility fixtures second. Qualify exact mesh indexing with shader identity
and extraction-peak contracts, then remeasure typed transfer on the smaller
payload. Larger Molden limits need a real target workload and actual browser/
persistence budgets; a constant increase alone is not supported by the evidence.

These remain maintenance, compatibility, optimization and capability activities,
not newly proven scientific-output bugs. Priorities stay P3. The original
classifications below remain historical; current implementation/readiness and
labels are recorded in the live issues. New #47/#48 proposals are separate from
this `needs-research` selection.

## Maintenance/fixture implementation follow-up

The user subsequently authorized #46 and only #39's immutable fixture phase in
[PR #49](https://github.com/uvar-apps/eigenvista/pull/49). Vite is upgraded only
to 7.3.8; the four small old/current archives and native/WASM/worker/UI tests now
freeze the agreed compatibility contract. [Status](../status.md#vite-maintenance-and-native-fixtures-12-november-2026)
and [handoff](../handoff.md) record verification and remaining platform gates.
#39's later typed writer stays open; #35/#37/#38/#40–#43, #20/#22/#47/#48 are not
implemented by this batch. Current labels/issues, not the historical initial
table, determine the remaining queue.

## Typed-writer implementation follow-up

The user then authorized #39's remaining encoding phase on
`codex/typed-native-encoding`. The [decision](../design/2026-11-12-typed-native-encoding.md)
and [status](../status.md#typed-native-encoding-12-november-2026) record direct typed
numeric emission, exact logical compatibility, native allocation measurements
and verification. The profile decision is resolved by preserving existing bytes;
`needs-research` is removed from #39. This is a memory/verification improvement,
not a newly demonstrated scientific-output bug. Other research priorities remain
unchanged, including #40's separate source-hashing allocations.

## What counts as a bug

A **bug** violates intended behavior or a stated contract. Evidence can establish
a missing protection or incorrect documentation through source inspection, but
that does not establish every claimed runtime consequence. Here there are two
confirmed defects: the missing application-level native exit guard and stale
Molden capacity documentation. Actual packaged data loss has **not** been
reproduced; reproduce close and quit separately as the first step of #30.

An **engineering improvement** removes identified redundant work or strengthens
verification without evidence that current scientific output is wrong. #32–#34
are in this category. They are scheduled P2 work, not numerical bug fixes.

An **investigation or enhancement** needs a measured problem, a scientific error
bound, a compatibility decision or a new capability contract before code changes.
An intentional allocation/domain rejection is not itself a bug. These issues
are P3 and carry `needs-research`. A completed investigation may justify closing
a ticket with no implementation, particularly #43.

The existing [taxonomy](../labels.md) still applies: one or more `area:` and
`kind:` labels and exactly one `priority:` on each new issue. Do not add the
overlapping stock `bug`/`enhancement` labels alongside `kind:`; classification
and evidence are stated explicitly in each body. Priority is independent of
classification:

- **P1:** credible loss of unsaved work; address the native protection gap first.
- **P2:** a confirmed documentation defect, existing verification gates, and
  narrowly scoped redundant work with a clear preservation contract.
- **P3:** unmeasured costs, intentional capability limits, precision/format
  decisions, platform-policy questions and unproven rendering hypotheses.

Promote a P3 investigation only when an agreed workload is blocked, a
representative failure is reproduced, a promised contract is shown to be broken,
or measured impact justifies it. Record the new evidence and acceptance checks
in the issue before broadening the implementation.

## Issue queue

| Issue | Classification | Priority | Next step / completion boundary |
| --- | --- | --- | --- |
| [#30 Native close/quit protection](https://github.com/uvar-apps/eigenvista/issues/30) | Confirmed missing protection; native consequence not reproduced | P1 | Reproduce packaged window close and Cmd+Q independently, then guard dirty documents and verify cancel/discard/save outcomes. |
| [#31 Molden capacity documentation](https://github.com/uvar-apps/eigenvista/issues/31) | Confirmed documentation bug | P2 | Correct 256-AO claims; document independent 1,024-AO/512-total-MO caps and test importer/core boundaries without raising them. |
| [#32 Hosted CI](https://github.com/uvar-apps/eigenvista/issues/32) | Engineering improvement | P2 | Automate existing pinned Rust/WASM/browser/packaging checks and explicit macOS shell tests; require real hosted results. |
| [#33 Zero-occupation density contractions](https://github.com/uvar-apps/eigenvista/issues/33) | Exact performance improvement | P2 | Measure import, skip zero contributions after validation and prove unchanged density/orbital semantics. |
| [#34 Validation without ZIP compression](https://github.com/uvar-apps/eigenvista/issues/34) | Performance/memory improvement | P2 | Share semantic and uncompressed-budget checks with encoding; stop deflating a discarded archive during publication. |
| [#35 Complete Molden spin-set capacity](https://github.com/uvar-apps/eigenvista/issues/35) | Capability design | P3, research | Choose representative workloads and peak-memory/persistence budgets before changing AO/MO limits or density representation. |
| [#36 Analytic sampling acceleration](https://github.com/uvar-apps/eigenvista/issues/36) | Performance research | P3, research | Baseline first; prefer exact shell/radial reuse, preserving arbitrary matrices and numeric safeguards. |
| [#37 Indexed meshes and precision](https://github.com/uvar-apps/eigenvista/issues/37) | Memory/precision design | P3, research | Measure duplication; decide sharing, raw/unique/triangle bounds and world-coordinate precision before changing storage. |
| [#38 Bulk typed worker outputs](https://github.com/uvar-apps/eigenvista/issues/38) | Transport optimization | P3, research | Measure mesh JSON/copies first; define buffer ownership and retain authoritative precision. |
| [#39 Frozen format fixtures and typed encoding](https://github.com/uvar-apps/eigenvista/issues/39) | Compatibility/allocation design | P3, research | Freeze current/legacy archives and explicit manifest/array expectations before a typed writer or layout change. |
| [#40 Source-hash allocation](https://github.com/uvar-apps/eigenvista/issues/40) | Compatibility-sensitive optimization | P3, research | Profile hashing; preserve canonical hash bytes or define a versioned migration for durable saved meshes. |
| [#41 Native save policy and portability](https://github.com/uvar-apps/eigenvista/issues/41) | Durability/permissions/filesystem investigation | P3, research | Distinguish atomic visibility from crash durability; reproduce permission and filesystem behavior before choosing policy. |
| [#42 Diffuse sampling domains](https://github.com/uvar-apps/eigenvista/issues/42) | Scientific capability design | P3, research | Reproduce overly conservative domains; require whole-field error bounds and cache/provenance decisions. |
| [#43 Anisotropic sampling and ray steps](https://github.com/uvar-apps/eigenvista/issues/43) | Unproven hypothesis | P3, research | Compare independent expectations against current affine/voxel-aware stepping; close without changes if no defect exists. |
| [#20 Crystal symmetry](https://github.com/uvar-apps/eigenvista/issues/20) | Existing feature/design work | P3 | Bounded expansion, identity/picking and periodic-boundary design remain prerequisites. |
| [#22 mmCIF export](https://github.com/uvar-apps/eigenvista/issues/22) | Existing feature/design work | P3 | Define minimal export versus faithful roundtrip and required retained metadata. |

Existing #20/#22 were checked for overlap and left unchanged. No closed ticket
was reopened. In particular, resident scientific inputs and typed sampled-grid
transfer from #5 already exist; #38 concerns the remaining bulk outputs.

## Implementation sequence

### Batch A: protect work and correct the public contract

1. **#30 first:** record actual packaged macOS clean/dirty window-close and
   Cmd+Q behavior. Implement one coordinated close/exit protocol, not just a
   browser listener or a window-only handler. Deduplicate prompts, avoid
   recursive close calls, and keep work after cancel, failed save or stale
   asynchronous completion. If native reproduction cannot be automated, record
   the manual acceptance gap explicitly instead of reporting it passed.
2. **#31:** correct README/Molden guide limits and add importer/core agreement
   checks. Complete restricted and two-spin sets have different effective AO
   ceilings under the total-MO cap. Partial input remains labeled as listed
   orbitals; nothing recovers omitted occupied contributions.

These are separate defects with separate acceptance evidence. A documentation
fix can be reviewed independently while native lifecycle qualification proceeds.

### Batch B: establish repeatable gates

3. **#32:** install the existing verification commands in hosted CI, with locked
   dependencies, the pinned compiler/WASM target and matching bindgen CLI.
   Explicitly test the desktop shell on macOS. Preserve browser reports and
   screenshots with bounded retention. A Linux build does not establish Linux
   distribution support; browser WebKit is not the packaged macOS WebView.

### Batch C: remove exact, identified waste

4. **#33:** record an import baseline with occupied and virtual orbitals, then
   omit zero-occupation outer products. Validate virtual orbitals even when they
   contribute zero. Preserve fractional/spin densities and missing-data notices.
5. **#34:** extract shared format validation/budget accounting and remove ZIP
   compression from publication checks. Preserve model validation, source-hash
   integrity, entry count/coverage, manifest size and total **uncompressed** bytes,
   including retained scientific arrays. Do not substitute a mesh-only estimate.

These changes are independent and can be developed separately after Batch A.
Capture before/after timing and memory evidence; do not put unstable elapsed-time
thresholds into correctness tests. Full validation can still scale with retained
data even after compression is removed.

### Batch D: measure before selecting larger changes

After the P1/P2 work, take bounded measurement/design steps from #35–#40:

- Use **#36** to separate evaluator time from import, transfer and validation;
  include native/WASM, cold/warm samples and representative 128-cubed fields.
- Use **#38** to measure mesh JSON and buffer lifetimes before redesigning bulk
  output. Typed worker outputs can preserve f64 and need not imply a format change.
- Start **#39** with compatibility fixtures. They must precede any persisted
  dtype/layout/hash changes in #37, #39 or #40.
- Decide **#35** only after import costs and peak-memory/persistence requirements
  are understood. Four dense matrices already cost 128 MiB at 2,048 AOs and
  512 MiB at 4,096 AOs, before other arrays and transport.
- Prefer exact sampling reuse in **#36** before approximate screening or threads.
  Consider **#37** after transport/storage costs and topology/precision risks
  are measured. Profile **#40** before changing hash implementation.

The default next implementation choice is the smallest measured bottleneck,
not an unconditional rewrite of all nine research items. Each investigation
ends with measurements, a documented decision and either a bounded fix scope
or an explicit no-change conclusion. A 10x sampling or 3x mesh reduction is not
an established requirement or a promised result.

### Batch E: remaining policy and capability investigations

**#41–#43** and existing **#20/#22** remain P3. Their design/reproduction phases
can be independent of performance work, but code changes require the issue's
evidence/decision gate. Investigate save policy promptly if an actual permission,
durability or unsupported-filesystem failure is reported. Do not force an
isotropic lattice or silently clip diffuse domains based on the review alone.

## Preservation requirements and corrections to the review

- Density-pair folding already happens once before sampling. Per-point
  overflow/underflow checks depend on actual AO values and cannot simply be
  moved out of the hot loop.
- An occupation sum of squared orbitals applies only to known occupation-derived
  densities. It cannot replace arbitrary supplied transition, difference or
  nonsymmetric matrices. Screening needs a coefficient-weighted whole-field
  error bound, not just an AO epsilon.
- Raw extraction still needs a bound even if final geometry is indexed.
  Quantized welding can merge distinct features and averaging normals changes
  shading. f64 affine/world transformations happen after f32 interpolation;
  narrowing world coordinates requires its own precision tests.
- The renderer already transforms rays into voxel coordinates. Unequal lattice
  spacing is not proof of incorrect marching.
- The format's current acceptance budget is uncompressed arrays plus manifest,
  with separate entry/manifest guards. A non-compressing path must retain all
  of them. Integral-valued scientific f64 arrays are not demonstrated to flip
  to u32 merely because of their values.
- Source hashes are a persistence contract for saved meshes. Preserve old hash
  results or explicitly version/migrate them. Freeze manifest/decompressed-entry
  expectations rather than requiring identical ZIP compression bytes.
- Native saves currently publish complete sibling files. Never replace their
  no-clobber path with `create_new(final) + write`; that exposes partial output.
  A post-publication directory-sync failure can leave the complete new file
  visible and needs truthful durability-error reporting.

## Deferred maintenance proposals

The remaining review suggestions are not established bugs or prerequisites for
this repair queue:

- Typed error enums and moving importers between crates are substantial
  refactors without a demonstrated current failure. Open separate bounded issues
  before implementing either; do not attach them opportunistically to bug fixes.
- Documentation restructuring should preserve dated evidence and the stable
  agent entry path. Decide a migration/link plan before moving historical files;
  length alone does not justify a repair ahead of the queue above.
- Moving a test module, aligning the remaining localhost spelling and adjusting
  narrowly justified tooling ignores are minor maintenance. Check actual paths,
  ownership and behavior before changing them.
- The review's proposed `cargo clean`, emptying `tmp/` and deleting
  `tmp/review.bundle` are not authorized. Preserve retained diagnostics, user
  artifacts, private exports and read-only references. Any later cleanup needs
  separately selected paths and user authorization.

## Delivery and verification

This request opens issues and records a plan only. It does not start
implementation, create a branch, commit, tag, push, publish or rebuild artifacts.
The app remains 0.5.12 at the reviewed source revision.

For each subsequently authorized repair batch:

1. Recheck Git status/diffs and current issues; preserve the supplied untracked
   review and all other user work. Use a separate `codex/` branch and merge
   through a pull request, following the user's established implementation workflow.
2. Reproduce/measure first, record the chosen scope in the issue and keep its
   acceptance checks current. Add meaningful regression coverage for changed
   behavior without rewriting frozen scientific references.
3. Run the affected checks from the [development guide](../development.md),
   then required broader Rust/strict Clippy/WASM/browser/native/packaging gates.
   Keep `TMPDIR`, `TMP` and `TEMP` inside this repository and unset
   `RUSTUP_TOOLCHAIN` for normal pinned checks.
4. Update user docs when behavior changes, architecture/format contracts when
   relevant, and living [handoff](../handoff.md)/[status](../status.md) with actual
   evidence and remaining gaps. Review the PR and merge only after its checks;
   issue creation alone does not authorize Git publication.

Fresh checks for this triage: source/issue duplicate review, exact GitHub
body/title/label readback, Markdown/local-link checks and final working-tree
inspection. No builds, runtime tests, native GUI reproduction or performance
benchmarks were run. The 0.5.12 release evidence remains dated 6 November and is
not reasserted as new validation.
