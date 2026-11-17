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

The scientific algorithms, radii tables, numerical defaults and mesh code are
unchanged. Actual EigenVista native/WASM qualification is recorded separately;
vendoring is not evidence that browser runtime tests have passed.
