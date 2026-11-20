# Save coordination and ExFAT publication

20 November 2026 (Australia/Perth); source follow-up to released 0.10.2,
baseline `e9b0ef1`. Work is tracked in #99 (from #83/#85), #100 (from #41),
and #72 for the accompanying optional accessibility palette. The user authorizes
a separate branch, local qualification and a PR merge, without a version bump,
tag or public release. Published 0.10.2 assets remain immutable.

## Save coordination

GUI Save previously captured the last accepted document while an inspection
write could still be awaiting synchronization/validation. The dirty-state check
preserved newer work but the exported file could omit the intended edit.

A small synchronous admission tracker now spans both the shared controller's
request and the GUI's complete coalesced-command lifetime. Save explicitly
refuses with an actionable message while an edit is applying. This is preferable
to silently waiting across validation failure or saving an earlier snapshot.
Once the command settles, normal Save retains the accepted state. API Save
reports busy; failed/stale requests release admission. Native clean-exit checks
and browser unload also observe admission, before React renders a dirty marker.
No scientific cache, geometry, document format or numerical policy changes.

Committed plane intent also acquires admission synchronously, before definition
preparation and the 180 ms update delay. Admission survives busy retries and
ends on completion, failure, cancellation, supersession, source/field change or
unmount. Mere text drafts do not acquire it. Manual preparation has an owned
abort signal and rechecks its intent/source before submitting. Old finalizers
cannot release a newer edit's admission.

Real browser regressions delay only delivery of actual validation requests,
then exercise the actual WASM validator, downloaded archive decode/reopen,
rapid coalesced appearance edits, validation errors, stale revision and native
IPC Save/exit. Native IPC simulation does not establish physical OS quit or
file-dialog qualification. Actual helper acceptance is recorded separately.

## ExFAT contract and user decision

Actual macOS27.0 (26A428) probes reject hard links and both
`renamex_np(RENAME_EXCL)` and pinned-directory `renameatx_np(RENAME_EXCL)` on the
owned ExFAT volume with ENOTSUP45 for absent targets. Existing-target calls
refuse with EEXIST; ordinary rename succeeds. APFS controls succeed, including
a twelve-contender exclusive-rename race with exactly one complete winner.

Apple documents exclusive renaming as a
[filesystem capability](https://developer.apple.com/documentation/foundation/urlresourcevalues/volumesupportsexclusiverenaming.md).
The [XNU headers](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/stdio.h)
declare the flags/APIs; the [VFS implementation](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/vfs/vfs_syscalls.c)
delegates requested semantics to the filesystem. These sources do not promise
exclusive publication on every volume. The actual syscall observations decide
the tested driver behavior.

The user explicitly chose an optional replacement mode after being told it can
replace a destination created during export. Default exports still refuse
overwrites and therefore remain unavailable on this ExFAT driver. They never
fall back to a partial final file or an unapproved replacement.

- CLI `--replace` grants atomic replacement at publication, for existing and
  initially absent targets. It is mutually exclusive with `--force` and `--check`.
- Existing `--force` keeps its preflight-only permission. Initially absent
  outputs remain no-clobber, including under `--force`.
- Native document/PNG/CSV APIs accept explicit `overwrite:true`; omission and
  false retain no-clobber behavior. Browser data exports reject replacement.
- Scoped writes stage, validate and sync complete bytes in the pinned destination
  directory, then use descriptor-relative rename only when replacement is chosen.
  Source-path/inode protection and destination validation remain in force.
- API capability discovery advertises native replacement support. Agents must
  retain fresh-name defaults and obtain explicit user authorization for the
  selected output before using replacement.

The existing Unix staging permission policy and absence of a power-loss
durability guarantee are unchanged. Broader #41 permissions/durability/platform
research remains open. This is qualified Mac ExFAT interoperability, not a claim
that every filesystem or platform behaves the same way.

## Qualification record

The living [handoff](../handoff.md) and [status](../status.md) record final-source
checks, actual filesystem/helper observations, artifact identities and PR delivery.
Retained diagnostics are under `tmp/save-exfat-accessibility/`. The first
SwiftShader dense-render attempt was interrupted and is not a qualification
pass; the initial Save test harness corrected strict job receipt arguments and
accessible button names. The actual source correction and guards are covered by
the subsequent successful tests. Historical #41 research remains unchanged.

The new queued-plane regressions were independently run with the original
editor restored temporarily: Save accepted the previous plane, and the native
IPC exit probe approved request 902 during the held delay. Both intended
assertions failed. The exact corrected source was restored and all 58 focused
Chromium/WebKit cases pass, including the existing plane-update/controller
suites and ten Save tests per engine. Real linear-field values/positions,
cache reopening, failed/draft/cancelled intent and manual-preflight cleanup
are exercised. A later complete-suite run supersedes the intentionally
interrupted pre-correction run.

The next complete run passed 751 of 752 cases. Its new manual-preparation test
waited for the published plane and controller idle state, which can precede the
GUI command's terminal-job poll and final synchronization. Save correctly
refused during that interval. The test now waits for the completed edit form
and enabled Recompute control; independent review confirms that transition
follows command completion. All 58 focused cases pass again. This changes test
readiness only; the earlier refusal assertions remain and no product source
changed. The full rerun and final delivery state belong to the living handoff.

Actual native/helper acceptance also exposed the obsolete `overwrite:true`
rejection in the raw EVT1 metadata decoder. The boundary now retains both typed
boolean values; malformed/missing metadata and invalid framing remain rejected.
Its new desktop regression and the rebuilt app/helper's three real ExFAT export
paths pass. See living evidence for exact final binary and delivery identities.
