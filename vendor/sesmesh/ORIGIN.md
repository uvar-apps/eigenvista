# Sesmesh integration source

Upstream: https://github.com/uvar-apps/sesmesh

Pinned source: `1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8`, version 1.1.2.
Copyright (c) 2026 Ugo Varetto. Used under the MIT license option; both upstream
license files are retained. This is the Rust library, not legacy Molekel code.

The library source and its data files were copied from that revision. Original
file digests are in `UPSTREAM-SHA256.json`. No upstream CLI, project automation,
private documents or application state is included.

Local integration changes:

1. Standalone Cargo metadata resolves the original workspace-inherited package
   and dependency declarations. EigenVista depends on `default-features=false`:
   no Rayon threads, gzip reader or TOML radius-file path is enabled.
2. `src/surface.rs` uses `web_time::Instant` on wasm32 and keeps the standard
   monotonic clock elsewhere. This avoids `std::time::Instant::now()` panicking
   in a browser Worker. Its public timing `Duration` values are unchanged.
3. `src/control.rs` retains `Sync` progress callbacks with the `parallel` feature,
   while the serial build accepts a thread-local `Fn` callback. This permits
   safe JavaScript worker callbacks without unsound `Send`/`Sync` assertions.
   Progress stages/counts and atomic cooperative cancellation are unchanged.
   `src/par.rs` correspondingly removes unused thread-safety bounds from the
   serial `map` / `map_init` signatures; their sequential bodies are unchanged.

4. Issue #92 removes `max_memory`, the estimate-based refusal/pilot and automatic
   grid coarsening from the vendored surface engine. Requested spacing is always
   used. The remaining memory estimate is diagnostic metadata only. The public
   spacing/probe validation accepts finite positive spacing and finite
   nonnegative probe radius; packed lattice keys and u32 mesh/CSR indices still
   require mathematically representable dimensions. Derived brick spans, sample
   buffers, evaluation ranges and integer frame origins report `SizeOverflow`
   if their floating-point/index representation cannot hold them; these are
   numerical storage constraints rather than estimated-memory policy limits.
5. `src/error.rs` provides fallible vector allocation/growth helpers with the
   underlying `TryReserveError`. The active EigenVista generation path uses them
   in arrangement/CSR construction, cell indices, sparse brick keys, SIMD sample
   and candidate buffers, mesh chunks, assembly and its hash map, edge validation,
   component analysis and final triangle grouping. Brick output arrays reserve
   their exact topology counts before emission. Scratch-pool retention is
   optional and drops a buffer if retaining it cannot allocate. `src/par.rs`
   provides ordered fallible iteration for this serial integration. The spatial
   neighbor index stores only occupied cells in sparse tuple-key/CSR storage,
   retaining the supplied cell edge without count thresholds or regridding.
   Per-axis key representation is checked, while the product of empty lattice
   dimensions is neither allocated nor required to fit an integer. Queries
   preserve z/y/x traversal and input order within each cell; their exact-work
   choice between box lookups and occupied-cell scans imposes no quota.
6. The unused upstream file-reader/assembly APIs also have no configured gzip,
   operator-range, copy-count or expanded-atom cap. Input/decompression output
   and expanded-model buffers grow fallibly; Cartesian-product arithmetic is
   checked for platform overflow. The obsolete `ResourceLimit` error variant
   was removed. Compression-library internal allocations retain their upstream
   behavior.
7. `Diagnostics::warn` and `merge` now return `Result<()>` and retain every
   occurrence example with fallible buffer growth. Merges reserve/check counts
   before changing content, preserving warning and example order. Strict radius
   assignment reports every missing atom using fallibly reserved text. Selection
   and all four format readers propagate diagnostic allocation failures; private
   parser errors preserve the actual cause, source position and input context
   through `Error::InputProcessing` rather than treating allocation failure as
   malformed scientific input. Diagnostic display streams all examples without
   allocating a second joined list.

Radii tables and numerical defaults are unchanged. Geometry evaluation, exact
edge refinement and cavity retention use the original algorithms. Upstream
optional post-processing and unrelated file readers/exporters retain their
upstream APIs; EigenVista uses analytic normals, no smoothing/decimation and
keeps all cavities. Actual EigenVista native/WASM qualification is recorded separately;
vendoring is not evidence that browser runtime tests have passed.
