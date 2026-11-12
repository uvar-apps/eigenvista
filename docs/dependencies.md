# Dependency record

The application code is new Rust and TypeScript. No legacy Molekel application
source or C++ source is included. Historical research checkouts from the original
repository are not part of this standalone repository or its build dependencies.

Direct dependency versions are resolved in the committed lockfiles `Cargo.lock` and `app/package-lock.json`:

| Dependency | Role | Upstream license |
| --- | --- | --- |
| mcubes 0.1.7 | Classic marching-cubes implementation | MIT |
| lin_alg | mcubes-compatible vector types | MIT |
| kiddo 5.2.4 | Exact immutable k-d-tree neighbor search, native/WASM | MIT OR Apache-2.0 |
| pdbtbx 0.12.0 | PDB atomic-record parser and published covalent-radius dataset | MIT |
| serde / serde_json | Structured model serialization | MIT OR Apache-2.0 |
| sha2 | Scientific and binary-array hashes | MIT OR Apache-2.0 |
| zip | Portable native document container | MIT |
| flate2 (Rust backend) | Bounded gzip-wrapped BinaryCIF input | MIT OR Apache-2.0 |
| wasm-bindgen 0.2.108 | Shared Rust browser bindings | MIT OR Apache-2.0 |
| Tauri 2 and its dialog/fs plugins | Desktop shell and local file selection | MIT OR Apache-2.0 |
| objc2 0.6.4 / objc2-app-kit 0.3.2 (macOS only) | Typed native termination/delegate integration | MIT / Zlib OR Apache-2.0 OR MIT |
| React / React DOM | Interface | MIT |
| Three.js | Scene graph, camera controls, WebGL2 renderer | MIT |
| lucide-react | Interface icons | ISC |
| Vite 7.3.8 / TypeScript | Frontend build | MIT / Apache-2.0 |
| Playwright | Browser workflow and rendering checks | Apache-2.0 |
| @types/node 26.1.2 and its undici-types dependency | Development declarations for Node-based tests/configuration | MIT |
| Prettier | Source formatting | MIT |

The 12 November 2026 maintenance patch updates only the Vite lock entry from
7.3.6 to 7.3.8 and raises its declared minimum to `^7.3.8`; other npm package
entries retain their versions and integrity values. Clean installation and the
current npm audit pass with no reported advisories. The installed Vite MIT
license and generated runtime dependency notices are byte-identical to the
previous resolution. See [#46](https://github.com/uvar-apps/eigenvista/issues/46)
for the upstream advisory assessment and implementation verification.

The app icon is newly authored in `app/src-tauri/icons/source.svg`; bitmap/native icon formats are generated with the Tauri icon tool. It is not copied from the legacy application.

The native lifecycle fix makes the already-locked objc2/AppKit bindings direct
macOS-only dependencies. Their external versions are unchanged; they do not add
a scientific C library or a browser dependency. The small Rust delegate hook is
documented in the [lifecycle decisions](design/2026-11-11-native-lifecycle-and-molden-limits.md).

Independent numerical reference generation uses PySCF 2.14.0 (Apache-2.0) in an ignored development-only Python environment under repository `tmp/`. Its compiled numerical libraries are not linked into EigenVista or shipped in the desktop/browser builds. The frozen generated data and conventions are documented in [fixtures/pyscf/README.md](../fixtures/pyscf/README.md); generator dependencies are pinned in `tools/reference-requirements.txt`. Normal tests require only Rust and the existing frontend toolchain.

The rewrite retains Molekel's GPL-2.0-or-later terms in `LICENSE`. The tester
packager uses pinned cargo-about 0.9.1 and installed npm license files to collect
locked dependency notices, supplements omitted upstream notices from pinned
revisions, and includes dependency source archives. Notices are embedded in the
app as well as the ZIP. The packager checks for non-system dynamic libraries.
See [tester packaging](tester-packaging.md). This is an automated development
inventory, not a completed release-license audit or legal compatibility opinion.
An ad-hoc-signed tester bundle is not a Developer ID-signed/notarized public release.

The Molden importer and CLI add no new external runtime dependencies. Their
normalization implementation is new Rust, with no copied legacy or IOData code.
[Molden reference generation](../fixtures/molden/README.md) additionally uses a
pinned IOData revision in the optional development-only Python environment.
One authentic ORCA test export and its derived reference are retained under
IOData's GPL-3.0-or-later test-data terms, with provenance, upstream license,
and attribution in [fixtures/molden/third-party](../fixtures/molden/third-party/README.md).
They are source/test data, not linked runtime code or the packaged water example.
Tester archives retain these notices separately under `Third-party-notices/Molden-test-data`
and in the source snapshot. This does not change the application's license.

The BinaryCIF transport is new Rust in `eigenvista-import`: a bounded borrowing
MessagePack reader and checked column transforms, sharing the existing mmCIF
scientific importer. It adds no runtime dependency on Molstar, `python-mmcif`,
or another CIF/MessagePack library. `flate2`, already present transitively in
the locked dependency graph, is now a direct import-crate dependency with
default features disabled and `rust_backend` enabled; no scientific C library
or external decompression program is introduced.

[BinaryCIF fixtures](../fixtures/bcif/README.md) include original RCSB PDB 1CRN
text/binary data under the wwPDB CC0 policy, plus original GPL-2.0-or-later
selection/connection policy data. Independent fixture checks and policy encoding
used MIT-licensed Molstar 5.13.1 only offline under repository-local `tmp/`.
Normal builds/tests use the frozen bytes and checksums without installing or
running that encoder. Fixture notices and original deposited metadata are
preserved; the application license is unchanged.
