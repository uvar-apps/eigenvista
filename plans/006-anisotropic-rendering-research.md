# Anisotropic sampled rendering research (#43)

Research snapshot: 2026-11-13, EigenVista 0.5.12, baseline
`a3d71d077da28e38d3e031d531888fd08d98c279`. This phase adds independent tests,
an opt-in failing reproducer, and observations. Production shaders, sampling
policy, scientific fixtures, dependencies, limits, and release artifacts are
unchanged. The fields below are manufactured mathematical controls, without a
quantum-chemistry interpretation.

## Disposition

The tested affine grids do not justify replacing the current grid with an
automatically isotropic one. Actual production raycast and volume draws agree
with independent physical-space references in the bounded envelope below.
An equal-memory counterexample also shows that redistributing grid samples can
erase a feature before rendering.

The research did find a concrete **volume first-marker bug**, now tracked by
[#55](https://github.com/uvar-apps/eigenvista/issues/55): increasing sample
quality can make an otherwise visible constant field disappear. It reproduces
on isotropic as well as anisotropic grids, both signs, Chromium and WebKit, and
manual and hardware-linear texture interpolation. It is separate from a claim
that anisotropic voxel spacing is intrinsically incorrect.

Recommended #43 outcome: close as investigated with this defined evidence
envelope and follow #55 for the product repair. Do not infer arbitrary nonlinear
field accuracy, a general resampling policy, or complete rendering qualification
from these results.

## Source and execution identity

The actual unmodified factory is [volume.ts](../app/src/volume.ts), with
[volumeRanges.ts](../app/src/volumeRanges.ts) empty-space ranges. SHA-256:

| Input                                 | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `app/src/volume.ts`                   | `70a7587d80a69b2fba8439ea61c591becee8406384cd16dbfa2ef6f2336a1d88` |
| `app/src/volumeRanges.ts`             | `df5f899bb7c8ebec284b7d9ae8cd7b99e512efa570d2deee9c6f0389b1f15d8f` |
| Production factory fragment string    | `36c88b2d34a134ca5cdf7b395e025ab3333fbeadb9e7f8d4fbf9b4e745180296` |
| Opt-in counterfactual fragment string | `4d9f9daa38c4eb0f19e2bbd65a31cc01546f364243c40bfaff0691ecf732c879` |

Local observations used Darwin 27.0.0 arm64, Node v26.0.0, Playwright 1.63.0,
Three.js 0.186.1, Chromium 153.0.8010.12 and WebKit 26.6. Actual WebGL renderer
identities were Chromium ANGLE/Vulkan SwiftShader (LLVM 10.0.0) and WebKit
`Apple GPU`. Both exposed `OES_texture_float_linear`; filtered controls actually
used it. Browser versions identify the observed installations, not minimum
supported versions or a guarantee for other drivers.

Tests start the application, wait for its initial scene, then import the actual
production `volumeObject` factory into the browser. Each bounded draw uses its
real material, textures, range acceleration, geometry and GPU pipeline. The
passing suite always verifies the diagnostic flag is false and rendered
fragment hash equals the production fragment hash. No shader stepping is copied
into the reference solution.

## Independent measurements and budgets

[anisotropyReference.ts](../app/tests/anisotropyReference.ts) defines physical
box vectors separately from node counts. Independent perspective rays and
six-plane/Cramer's-rule clipping give physical entry/exit distances. Pixel
coordinates refer to bottom-up render-target readback.

For a constant field `F = +1` or `-1`, iso 0.25 makes the transfer band exactly
one. Beer-Lambert composition has the partition-independent result
`alpha = 1 - exp(-1.4 * opacity * physical_path_length)`. This closed form does
not march, use the shader's sample count, or depend on its first marker.
Opacity 0.4 keeps all accepted profile rays below alpha 0.95, excluding early
saturation from this control. Positive fields are green; negative fields red.
The linear RGBA target starts at transparent black. Actual alpha, the matching
color channel, both zero channels, and clear depth are checked with a 2/255
alpha/color budget. Volume's `depthWrite:false` means clear depth 1 is expected;
it is never interpreted as a volume hit.

For `F(p) = n dot (p - center)`, exact physical roots of `F = +/-0.25` establish
first distance, sign order and raycast composition. Trilinear interpolation of
a linear field is exact apart from measured Float32 node rounding. Exact
gradient/light direction and opacity 0.55 determine the two signed surface
colors independently of the marching lattice. The RGBA acceptance budget is
5/255. Roots are excluded if `abs(n dot ray) < 0.15`, outside the clipped box,
or if finite-difference shading offsets approach the clamped grid boundary
(grid-coordinate interior margin 0.02). These exclusions are explicit coverage
limits, not permission to accept missing roots. All 25 preselected ROI rays
qualified in every observed profile draw.

A real depth texture records the production raycast material's `gl_FragDepth`.
A second read-only shader transports the sampled high-precision float bits into
four byte channels with no blending; it does not predict depth or modify the
production material. Independent perspective inversion converts the read depth
to physical ray distance. This use follows the documented
[Three.js depth texture](https://threejs.org/docs/pages/DepthTexture.html) and
[render-target readback](https://threejs.org/docs/pages/WebGLRenderer.html#readRenderTargetPixels)
interfaces. `floatBitsToUint` transports the highp encoding as specified by the
[Khronos GLSL ES 3.00 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf),
section 8.3. Readbacks and captures happen after actual draws complete.

Manual-interpolation distance tolerance is the sum of:

- maximum observed Float32 node error divided by `abs(n dot ray)`;
- physical voxel-axis Frobenius norm divided by `quality * 1024`, bounding
  the midpoint uncertainty after nine bisection iterations on a bracket;
- a **predeclared empirical** projection/depth allowance of 16 Float32 epsilon
  units propagated through perspective inversion, plus 0.00002 world units.

The last allowance is not a universal hardware error guarantee. Hardware-linear
interpolation uses the larger of that total and an empirical 0.003 world-unit
floor; it is reported separately. These budgets were fixed before the observed
profile runs. They were not loosened to fit a failure.

## Bounded profile matrix

All profile targets are `center = (0.15,-0.2,0.1)` unless the row says otherwise;
the box origin is center minus half the sum of its three physical vectors.
Unrotated field gradient is `n = (0.16,-0.23,0.96)`. The camera uses perspective
45 degrees, near 0.04, far 40, square 97 by 97 pixels and up `(0,1,0)`.
ROI coordinates are every pair from `{40,44,48,52,56}`. No molecule, mesh or
other occluder is present in these mathematical controls.

| Profile                  | Physical box vectors               | Node counts | Camera eye minus center |
| ------------------------ | ---------------------------------- | ----------- | ----------------------- |
| isotropic-cube           | `(2,0,0); (0,2,0); (0,0,2)`        | `33,33,33`  | `(0,0,3)`               |
| physical-elongation      | `(8,0,0); (0,2,0); (0,0,1)`        | `33,33,33`  | `(0,0,3)`               |
| same-box-fine-short-axis | same physical box as preceding row | `17,33,65`  | `(0,0,3)`               |
| skew-oblique             | `(8,0,0); (0.8,2,0); (0.2,0.3,1)`  | `17,33,65`  | `(2,0.8,2.5)`           |
| reflected-reverse        | `(-8,0,0); (0.8,2,0); (0.2,0.3,1)` | `17,33,65`  | `(0,0,-3)`              |
| rotated-reflected-inside | preceding vectors rotated by R     | `17,33,65`  | `R*(0.1,-0.1,0)`        |

R is Rodrigues rotation through 0.65 radians about normalized `(0.3,1,0.2)`.
The final row also rotates the gradient and up; its target is
`center + R*(0.2,0,1)`, placing the camera inside the reflected box. Exact numeric
vectors and camera parameters are attached in each JSON observation. The
same-box comparison separates physical elongation from voxel allocation; its
axis-aligned cell spacings differ by 32:1.

Each profile/mode is an independent test with two bounded draws, not one large
GPU callback or a Cartesian test expansion. Volume uses positive q2 manual and
negative q4 hardware-linear controls; raycast uses the signed linear field at
q2 manual and q4 hardware-linear. The passing normal suite has 13 tests per
engine: 12 profile/mode tests and one two-sign sampling-allocation control.

### Observed normative results

The final current-source focused run at 2026-11-13 07:20:21 UTC passed **26/26**
tests in 53.3 seconds: no skips, expected failures, flaky or unexpected results.
There were 300 accepted constant-alpha rays and 300 accepted linear-field rays
per engine, plus two tent center rays per engine. All draws reported GL error 0.
Measured maxima over the six profiles and two qualities:

| Engine                 | Constant-alpha absolute error | Linear first-distance error, world units | Linear RGBA channel error |
| ---------------------- | ----------------------------: | ---------------------------------------: | ------------------------: |
| Chromium / SwiftShader |                   0.001988682 |                              0.000175712 |               0.001439626 |
| WebKit / Apple GPU     |                   0.001940125 |                              0.000193622 |               0.003885517 |

The largest observed distance error was the WebKit filtered inside-camera
profile. These maxima are below the predeclared per-ray budgets; the retained
JSON includes every expected/observed distance, path length, error and budget.
Actual PNGs were visually inspected for the skew volume, rotated inside
raycast, and fine/erased tent controls. PNG appearance alone was not the oracle.

## Sampling allocation is a separate question

One control uses the physical `8 by 2 by 1` box centered at zero and camera
`(0,0,3)` toward zero. Its manufactured signed field is
`+/-max(0, 1 - abs(z - 3/64)/(1/64))`. The following grid allocations differ
by under 0.4 percent in sample count:

| Allocation                        | Node counts | Samples | Independently checked node data |
| --------------------------------- | ----------- | ------: | ------------------------------- |
| fine short axis                   | `17,17,65`  |  18,785 | absolute peak exactly 1         |
| uniform physical cell spacing 0.1 | `81,21,11`  |  18,711 | every sample exactly 0          |

At iso 0.25 the fine grid's first plane is exactly `z = 0.05859375`, hence
physical ray distance 2.94140625. Both engines and both signs measured
2.9414021786266704, error 0.000004071374 against a 0.000683911 budget. Positive
center RGBA was `[0,221,0,255]`, negative `[221,0,0,255]`; the uniformly spaced
grid correctly rendered `[0,0,0,0]` with clear depth 1 because its sampled data
is identically zero. This is a meaningful sensitivity/negative control with
an exact crossing, not an assertion that any nonblank image is correct.

The control demonstrates one actual allocation tradeoff. It neither establishes
a universally optimal grid nor claims all narrow nonlinear features are found.
Existing [adaptive-volume tests](../app/tests/adaptive-volume.spec.ts) retain
their separate fixed-160-step thin-feature negative controls unchanged.

## Confirmed first-marker defect and causal control (#55)

The opt-in [anisotropy.probe.ts](../app/research/anisotropy.probe.ts) deliberately
keeps the closed-form correctness assertion. Its four tests (two signs, two
engines) **exit with failure** on the unchanged product. It is outside normal
`app/tests` discovery, with no skip or expected-failure annotation.

Inputs: unit physical cube from `(0,0,0)` to `(1,1,1)`, camera `(0.5,0.5,2)`
toward its center, center ray physical length exactly 1, constant `+1` or `-1`,
iso 0.25, same projection and 97-pixel target as above.

| Grid and opacity | Exact aggregate alpha | Actual q1 | Actual q2 | Actual q4 |
| ---------------- | --------------------: | --------: | --------: | --------: |
| `33^3`, 0.25     |   0.29531191028128656 |    75/255 |    75/255 |    75/255 |
| `2,2,256`, 0.25  |   0.29531191028128656 |    75/255 |     **0** |     **0** |
| `33^3`, 0.05     |   0.06760618009405177 |    17/255 |    17/255 |     **0** |

Values were the same for both signs and engines. An additional actual
hardware-linear q2 control for `2,2,256`, opacity 0.25 also measured alpha 0 in
both engines/signs. The isotropic low-opacity row rules out anisotropy as a
necessary cause. Every observed alpha 0 was actual transparent-black RGBA.

Source inspection identifies the segment-level predicate
`if(alpha>0.001&&first<0.0)first=nextT;` and subsequent discard when `first<0`.
Small segments can each fall below 0.001 while their aggregate opacity remains
0.2953 or 0.0676. For the fine-axis q2 center ray, segment alpha is approximately
0.000686; the exact accumulated alpha remains 0.29531191028128656.

The approved diagnostic creates a fresh in-memory material and changes exactly
that predicate's threshold from `0.001` to `0.0`. A one-occurrence guard rejects
unexpected source; the diagnostic flag defaults false; all ordinary tests use
the original factory string. The fragment hashes above record the exact
one-line difference. It is never used as an expected-data generator.

The final probe run at 07:23:43 UTC retained 60 observations in 49.1 seconds:
40 baseline draws (16 analytic mismatches), and 20 counterfactual draws (zero
mismatches at 2/255). The four probes failed as intended after preserving all
rows. This provides strong causal evidence for #55, **not a qualified product
fix**: `first` also feeds fragment depth and can affect depth testing against
opaque objects even though volume does not write the depth attachment. A repair
must separately qualify its chosen depth/occlusion policy.

## Interpretation and limits

For a unit physical ray, the existing inverse-affine voxel direction represents
voxel-coordinate displacement per world length. When traversal completes within
the fixed loop budget, choosing
`ceil(norm(voxel_direction) * clipped_length * quality)` bounds each nominal
sampled segment's voxel displacement by `1/quality`. Empty-brick skips are
separate jumps over conservative ranges excluding the relevant iso levels or
volume transfer band; the segment bound is not a bound on those empty jumps.
Unequal physical spacing alone does not establish understepping. This metric
reasoning is separate from the independent image/depth expectations above.

It is not a universal root guarantee: along a ray a trilinear field can be
cubic, and two crossings or a tangency can lie inside one interval. The
constant/linear controls qualify mapping, clipping, signed composition and
depth on their defined profiles; the tent adds one resolved nonlinear
feature/control. They do not certify arbitrary molecular orbitals, transfer
functions, tangencies, subvoxel structures, grazing or boundary shading, large
origins, all camera projections, worst-case 4096-iteration behavior, opaque
scene intersections, all GPUs, or packaged application performance. No
automatic grid default, resampling implementation or scientific accuracy claim
is supported by this research alone.

## Reproduction and retained evidence

From this repository, with the documented dependencies/browser installations:

```sh
cd /Users/ugo/projects/eigenvista
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
unset RUSTUP_TOOLCHAIN
lsof -nP -iTCP:5178 -sTCP:LISTEN
# Continue only if the strict port is free; do not stop an unknown server.
cargo run --locked -p eigenvista-format --example reference_documents
cd app
npx playwright test tests/anisotropy-research.spec.ts --config ../ci/playwright.config.mts
# Separate opt-in correctness reproducer; exit 1 on the documented defect:
npx playwright test --config research/playwright.config.ts
```

The owned-server config preserves existing one-worker, timeout, engine and
failure-trace settings and refuses to reuse an existing server. Local research
used already generated WASM and temporary config overrides to start Vite
directly while independent native research built; no Cargo build was attributed
to these GPU results. Final-head hosted qualification is recorded separately
by the integration workflow, not implied by the local focused run.

Local diagnostics are under ignored
`tmp/2026-11-13-research41-43/anisotropy43/`:

- `environment.json`: actual tool/engine versions and executable identities.
- `normative-final-report.json`, `normative-final-summary.json`,
  `normative-final-captures/`: 26 passing tests, raw per-ray comparisons,
  exact profiles, source hashes and 56 completed-draw PNGs.
- `probe-final-report.json`, `probe-final-summary.json`, `probe-final-captures/`
  and `probe-final-results/`: 60 fixed-expectation observations, source/variant
  hashes, original failing assertions, traces and screenshots.
- `probe-*` and earlier `normative-*`/`sampling-*` artifacts retain the initial
  observations separately; reruns did not replace those diagnostics.

The committed tests attach comparable JSON and PNGs on reproduction. No frozen
scientific expected result was changed or regenerated. Follow #55 for the
separate repair and its regression acceptance gates.
