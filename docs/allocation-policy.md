# Allocation-driven workloads

EigenVista **0.10.1** implements the correction tracked by
[#92](https://github.com/uvar-apps/eigenvista/issues/92), removing application-imposed
memory ceilings. Historical release notes and qualification snapshots retain
the limits that applied to their original binaries.

EigenVista attempts the requested allocation instead of rejecting a job against
an estimated memory budget. This applies to molecular SES/SAS generation,
quantum sampling and meshes, imported structures/fields, annotation and analysis
records, native documents, conversion queues, and the application-control/AI
connection. Native requests have no imposed processing deadline; progressing
transfers have no total-duration allowance. Socket inactivity and caller-selected
deadlines remain separate from the requested computation. SES spacing is never
automatically coarsened. Orbital batches and saved geometry are not truncated to
fit a preset count.

On macOS 14 and newer, the desktop shell disables WebKit's inactive scheduling
throttle so calculation and Save workers can continue while its window is hidden.
Older macOS versions do not implement this setting. It does not prevent system
sleep or process termination.

Critical Rust buffers reserve fallibly. Size products and index conversions are
checked before use. A reported allocator failure or unrepresentable size ends
the operation with an error; recoverable failures and cancellation retain the
previous accepted document/result. JavaScript array/typed-array and canvas/GPU
allocation errors are surfaced through the existing operation/rendering errors.
The SES neighbor index stores occupied cells instead of allocating empty space,
retaining its requested cell edge without a cell-count quota or regridding.
Native Save transfers encoded archives as raw binary rather than expanding every
byte into a JSON number. Native files keep scoped access, source protection and
atomic/no-clobber saves. Native profiles, scientific source hashes and floating-point contracts remain
unchanged. API callers have the same policy as GUI users; pagination has a
convenient default, without restricting the total accessible data.

Available physical memory is not the same as an addressable allocation. In
particular, the current WASM32 scientific runtime has a finite address space,
JavaScript and Rust buffers have representation bounds, native formats have
actual integer/offset fields, and graphics devices report texture/index
capabilities. These are reported as runtime/format/device constraints, never as
an invented application memory allowance. Viewport and field-key canvases retain
the device pixel ratio and actual drawing-buffer dimensions without a fixed
application resolution cap. BinaryCIF parsing, transform traversal and tree
cleanup use allocation-backed iterative traversal without a fixed nesting allowance. Semantic validation still
rejects invalid numbers, mismatched dimensions, invalid references and malformed
payloads; declared lengths are checked against actual input before allocation.

An OS, browser or graphics driver can terminate a process after overcommitting
memory. That is not a recoverable allocator error the application can always
catch. Save important work before very large calculations. Users can explicitly
choose a smaller source set, coarser spacing or lower resolution; EigenVista does
not silently make that choice for them.

Grid presets remain convenient choices. Custom grid resolution accepts safe
integer dimensions of at least two; the allocation/runtime decides whether a
particular requested calculation can be completed. For scale, one 256³ f64 field
uses 128 MiB for its values alone, with another 64 MiB for the f32 display copy,
before geometry, transfer copies and graphics resources.
