# Plan 005: native-save contract research

Issue: [#41](https://github.com/uvar-apps/eigenvista/issues/41). Research performed
13 November 2026 against EigenVista 0.5.12, baseline
`a3d71d077da28e38d3e031d531888fd08d98c279`. This phase adds research probes and
regression checks; the production writers, CLI, dependencies and format are unchanged.

## Result and classification

Ordinary APFS observations support complete-file replacement and atomic
no-clobber publication. Replacement changes a prepared `0640` file to a new
inode with `0600` mode bits. This follows the implementation's existing staging
strategy; no corruption or permission-preservation promise violation was
demonstrated. The proposed explicit permission policy is distinguished below.

A real ExFAT image reproduced the documented capability limit: initially absent
CLI outputs fail because same-filesystem hard links are unavailable. File
`sync_all` and replace-rename independently succeed there, and existing-output
`--force` conversion succeeds. ExFAT reports synthesized `0700` mode bits even
after a successful `chmod(0640)`. Neither portable permission preservation nor
portable `0600` privacy can be inferred from Unix API success.

The research does **not** establish power-loss durability. The current writers
sync the staging file, publish it, and do not explicitly sync its parent
directory. Keep #41 as a P3 contract/platform follow-up, with this capability
failure now reproduced. No atomic-save corruption was observed. A future request
to support initially absent outputs on removable ExFAT volumes should have a
focused implementation issue and a qualified exclusive-publication primitive.

## Actual code and primary-source facts

The probe calls unchanged [`native::save_atomic` and `save_atomic_new`](../crates/eigenvista-format/src/native.rs).
Both decode the archive before creating a sibling staging file, use exclusive
creation with requested Unix mode `0600`, write all bytes, call `File::sync_all`,
close, then publish. Replacement uses rename; no-clobber uses a hard link and
best-effort removal of the staging name. Failure cleanup is also best effort.
A successful hard link followed by an unlink failure can therefore leave a
staging alias; no such remainder occurred in these probes.

The pure-std [`shader_parameters.rs`](../app/src-tauri/src/shader_parameters.rs)
is included directly by the research module through
`#[path = "../../../../app/src-tauri/src/shader_parameters.rs"]`, resolved from
`examples/save_contract_probe/probes.rs`. It is compiled in the format crate's
host example/test context, without copying its writer or invoking the Tauri GUI.
Its actual validation, staging, file sync and replace-rename path are exercised.

Pinned Rust is **1.99.0**, compiler commit
`b940084d7eb6a299eb4bfeb8e34901bc051e7ac4`, host
`aarch64-apple-darwin`, LLVM 23.1.1; Cargo is 1.99.0. In that exact standard
library, `File::sync_all` reaches `File::fsync`, whose Apple implementation
directly calls `fcntl(F_FULLFSYNC)`; other Unix targets call `fsync`. There is
**no Apple fsync fallback** in this pinned implementation.
See the [Rust 1.99 source](https://github.com/rust-lang/rust/blob/1.99.0/library/std/src/sys/fs/unix.rs#L1264-L1275).
Do not substitute the current stable documentation or another Rust version's
implementation when interpreting these results.

Apple's [fsync manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fsync.2.html)
distinguishes filesystem synchronization from flushing a drive's cache through
`F_FULLFSYNC`. Apple's [rename manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/rename.2.html)
describes atomic destination-name replacement, including its crash-related
wording; that is not a measurement that the newest successfully returned bytes
survive a later power failure. Apple's [link manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/link.2.html)
describes atomic link creation and `EEXIST` for an existing destination.
The [Linux fsync manual](https://man7.org/linux/man-pages/man2/fsync.2.html)
separately explains the need to sync the containing directory for its entry's
durability. These are API/source facts, not cross-platform runtime qualification.

No parent-directory synchronization appears in either production writer. A
future directory policy must identify the actual operation: on this compiler,
`File::open(parent).sync_all()` requests Apple's `F_FULLFSYNC`, whereas a direct
`fsync(directory_fd)` is a different capability. The research records both
separately. Their success on the tested volumes is not a simulated crash test,
and missing explicit directory sync is not proof that APFS loses saved files.

## Protocol and independent controls

The retained [`save_contract_probe`](../crates/eigenvista-format/examples/save_contract_probe.rs)
only creates a new output directory below repository `tmp/`. Its `blocked`
operation additionally requires an exact owned-fixture marker and known native
and parameter bytes. It exercises actual production functions, not a replacement
implementation. Direct writes are confined to fixture preparation and separate
filesystem capability controls.

The protocol checks:

- Successful output bytes, SHA-256, native decoding, inode and mode before/after.
- Validation, missing-parent, existing-target and directory-destination errors,
  with independent checks that prior bytes/directories remain intact.
- A bounded reader during 12 replacements, requiring every sampled archive to
  equal one of two complete known byte strings and observing both versions.
- Twelve simultaneous no-clobber contenders with **12 uniquely identified valid
  documents**; exactly one success and a byte-for-byte match to that winner.
- Separate file-sync, directory-`sync_all`, POSIX-directory-`fsync`, hard-link and
  replace-rename controls, including independently checked renamed bytes.
- The actual converter process, including exit status, inputs/output identities,
  no-force refusal, force-existing, force-absent, source protection and `--check`.
- A newly created bounded image with independently confirmed full and read-only
  states; no existing volume, host crash or elevated operation is involved.

`Result<(), String>` has no phase tag. A generic save error alone does not locate
the failed system call. Independent capabilities plus source inspection support
the ExFAT hard-link explanation, but they do not constitute production syscall
tracing. Real storage `EIO`/sync failures were not induced.

## Observations on macOS

Host: macOS **27.0, build 26A428**, Apple Silicon. The repository is on APFS.
The other volume is a newly created **64 MiB ExFAT disk image**, mounted only
below this research's repository-local temporary directory. APFS observations
are not substitutes for Linux, Windows, network or other removable-filesystem
qualification.

| Check                                                  | APFS                                  | ExFAT, writable/free space                                            |
| ------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------- |
| Actual new native save                                 | Success, exact bytes, decodes, `0600` | Error 45 (`ENOTSUP`), no destination                                  |
| Actual native replacement                              | Success, exact bytes, valid decode    | Success, exact bytes, valid decode                                    |
| Actual parameter replacement                           | Success, exact text                   | Success, exact text                                                   |
| Prepared replacement mode                              | `0640` → `0600`, new inode            | `chmod(0640)` succeeds but reports `0700`; replacement reports `0700` |
| File `sync_all`                                        | Success                               | Success                                                               |
| Directory `sync_all` / direct POSIX `fsync`            | Both succeed independently            | Both succeed independently                                            |
| Hard link / replace-rename                             | Both succeed; rename bytes checked    | Link error 45; rename succeeds with checked bytes                     |
| Invalid archive / existing no-replace / missing parent | Errors; original bytes preserved      | Same observed outcome                                                 |
| Native/parameter directory destination                 | Errors; directory preserved           | Same observed outcome                                                 |
| Oversized parameter text                               | Rejected; prior bytes preserved       | Same observed outcome                                                 |
| Staging remnants after ordinary attempts               | None observed                         | None observed                                                         |

The final APFS run sampled **240 complete old** and **228 complete new** archives
over 12 replacements, with no absent, partial or unexpected sampled contents.
The 12 unique no-clobber contenders produced **one success and 11 errors**;
winner index 8 had SHA-256
`94d801f62bf984a30d83b2a88bf5abb5b514604251e4d4d433b32ed33d40a8ec`,
equal to the actual destination. These are bounded observations, not every
possible interleaving. ExFAT's concurrency suite was explicitly not run because
its initial actual no-clobber save failed; no ExFAT race result is claimed.

The actual converter returned:

| Case                                       | Exit and independently observed output        |
| ------------------------------------------ | --------------------------------------------- |
| APFS new                                   | 0; complete native output                     |
| APFS existing without force                | 2; bytes, inode and prepared `0640` unchanged |
| APFS existing with force                   | 0; new complete bytes, new inode, `0600`      |
| APFS source equals destination, with force | 2; original bytes unchanged                   |
| APFS `--check --json`                      | 0; validation-only operation                  |
| ExFAT new                                  | 1; error 45; no destination                   |
| ExFAT missing destination with force       | 1; error 45; no destination                   |
| ExFAT existing destination with force      | 0; complete changed output                    |

The missing-destination force result follows actual CLI planning:
`replace: exists && options.force`. `--force` never grants permission to
overwrite an output created after preflight. Do not suggest creating a
placeholder to bypass the no-clobber limitation.

On the owned ExFAT image, a first 1 MiB filler write hit `ENOSPC` while 170
4 KiB blocks were still available. A small raw write and actual replacement
could still succeed; the blocked-write harness rejected that premise. This
attempt is retained but **excluded** from full-volume failure evidence. After
restoring known fixtures, bounded 4 KiB residual writes reached
`bfree = bavail = 0`; an independent small write then returned `ENOSPC`.
All three actual writer operations returned error 28, retained the exact prior
native/parameter hashes, created no new destination and left no staging files.

The same owned image was detached and reattached read-only. An independent
create/write control returned `EROFS`, and all three actual writers returned
error 30 with the same byte preservation and cleanup observations. The image
was detached at completion; image, filler, metadata and logs remain under
repository `tmp/`. Filling never targeted the host APFS volume.

## Proposed contract and follow-up boundary

1. Keep complete-file visibility distinct from crash durability. Describe
   successful ordinary saves as validation plus synchronized staging-file
   publication on supported filesystems. Do not promise universal power-loss
   survival or infer guaranteed data loss from these probes.
2. Retain private staging (`0600` requested on Unix) and explicitly document that
   replacement creates a new file and resets ordinary POSIX mode bits where
   supported. Preservation of existing modes, ownership, ACLs, xattrs, aliases
   or other metadata is a separate policy/design; this research does not
   implement or qualify it. Mode bits alone do not establish ACL privacy.
3. Keep atomic no-clobber publication mandatory. A filesystem lacking the
   required capability must fail explicitly and leave the absent destination
   absent. Never fall back to creating the final name and streaming bytes into
   it. Research an OS-specific exclusive rename primitive before proposing a
   portable fallback, preserving source-file and race protections.
4. If directory synchronization is later added, distinguish a failure before
   publication from **published, durability uncertain**. After publication,
   complete new bytes may already be visible: a generic failure must not claim
   nothing was written or trigger a blind retry. Choose supported directory
   synchronization operations and platform coverage before implementing them.
5. Preserve best-effort cleanup language. Ordinary tests found no leftovers,
   but cleanup/unlink failure or a crash can leave staging names. Do not promise
   universal `Err` means no write on untested/network filesystems.

The native dialog handlers return `Ok(false)` before writer invocation when a
dialog is cancelled, by source inspection. Physical native dialog cancellation
was **not** exercised here; CLI `--check` is not that acceptance check. Other
remaining gaps are power-loss/reboot injection, sync/hardware failure,
ACL/ownership/xattr policy, unwritable-parent permissions distinct from a
read-only file, Windows, Linux runtime filesystem probes, network mounts and
exhaustive race scheduling. No existing issue acceptance box should be checked
solely from an untested item or a source-only observation.

## Reproduction and provenance

From the repository root, with the pinned toolchain and an unused probe directory:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
unset RUSTUP_TOOLCHAIN
cargo build --locked -p eigenvista-format --example save_contract_probe
cargo build --locked -p eigenvista-convert
cargo test --locked -p eigenvista-format --test save_contract_research
cargo clippy --locked -p eigenvista-format --example save_contract_probe --test save_contract_research -- -D warnings
target/debug/examples/save_contract_probe probe "$PWD/tmp/save-contract-fresh-run"
```

The focused integration target passed **2/2** tests: the actual writer
permission/visibility/race check and the directly included actual parameter
module's existing regression. Strict focused Clippy passed. Disk-image creation,
filling and mounting are opt-in local research, never part of ordinary CI.
The parent task records broader/final-head checks separately.

CLI inputs were two ASCII XYZ files:
`3\nWater\nO 0 0 0\nH 0.758 0 0.504\nH -0.758 0 0.504\n` and
`3\nChanged water\nO 0 0 0\nH 0.85 0 0.6\nH -0.85 0 0.6\n`. Reproduce using
`target/debug/eigenvista-convert --json -o OUTPUT.eigenvista INPUT.xyz`, then
repeat without/with `--force`, with an existing/missing destination. Also run
`--check --json INPUT.xyz` and `--force --json -o OUTPUT.eigenvista OUTPUT.eigenvista`
to distinguish validation-only and input-protection behavior. Prepare only
new research files; record bytes before and after every refusal/failure.

The image was made with `hdiutil create -size 64m -fs ExFAT -volname EVSave41
-nospotlight IMAGE.dmg`, then attached with a repository-local mountpoint,
`-noautoopen -nobrowse -plist`. Device association was verified before detaching
only this image. The read-only reattachment added `-readonly`. macOS 27 prints
deprecation warnings for these working commands; do not guess another device or
use an unsafe fallback if image support is unavailable. The `blocked` probe
requires its marker, encoded `fixtures::hydrogen_pair()` original and
`float opacity 1\n` parameter original. A full-image probe must first demonstrate
a small raw `ENOSPC` control; a large allocation failure alone is insufficient.

Raw local evidence lives at `tmp/2026-11-13-research41-43/save41/`:
`apfs-run2.json`, `exfat-run2.json`, `cli-results.json`,
`full-volume-final.json`, `read-only.json`, independent control JSON, build/test
logs, the retained image, attach/detach metadata and `provenance.json`. Earlier
runs and the rejected fullness attempt are retained separately. The provenance
manifest records exact source/compiler/binary/input/output SHA-256 identities;
volume UUIDs and device metadata are confined to local ignored artifacts.

Key SHA-256 identities for the actual observed binaries and unchanged writers:

| Artifact                             | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `native.rs`                          | `1926ffe102e238bcbec0428b348a2cc23ad1190f7d6a9724b1e8669fb35f8389` |
| `shader_parameters.rs`               | `1e3c56d0402004f8181d22f3165b72b72c01be52774ed8aabc79125acf43500b` |
| Debug research example               | `dd8a637fd006bffd6f74ff33df7b005090ebc36771ee596c87e0df871581b0c1` |
| Debug actual converter               | `bb82579d8d8498e17bdb5b2e455eaaaa816278c443675697ba36ede13cacb069` |
| Known native original, 2419 bytes    | `41ffa1239269de181091ed914f30d0acb43638a85f9d48dd96f1f364534fe034` |
| Known native replacement, 2017 bytes | `2b95ea511f039b2d749c3f20501d4b5c76f4c65e5d9072659a72351f7d53e7a5` |
| Known parameter original             | `9a1922835ee24cd8fe7fdebcd2656c554610b80e58b08fc86ad98d3e7822d86d` |

Hashes identify these exact observations; fresh native-compatible builds need
not reproduce platform-specific binary identities or thread scheduling counts.
