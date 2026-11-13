# Volume visibility and representative depth

Issue: [#55](https://github.com/uvar-apps/eigenvista/issues/55).
Date: 13 November 2026. Baseline: main `5114cdc`, EigenVista 0.5.13.
Implementation branch: `codex/fix-volume-visibility`.

Later release note: version 0.5.14 includes this repair. The baseline and
original repair-batch scope below remain historical; see the
[release record](../status.md#version-0514) and [notes](../releases/0.5.14.md).

## Defect and selected contract

The old shader set its first volume-depth marker only when one segment's alpha
exceeded 0.001. Finer sampling divides a path into smaller segments: each can
fail that test while their aggregate opacity is visible. The missing marker
then discarded the entire ray. Independent constant-field controls reproduce
this on isotropic and anisotropic grids, both signs and both engines; it is not
a reason to change scientific sampling or resample grids isotropically.

Keep the existing aggregate visibility cutoff **0.005**. Composite each segment
with the unchanged alpha expression. When accumulated alpha first reaches the
cutoff, locate the representative depth inside that segment. If A is alpha
before the segment, k is its positive extinction `band * opacity * 1.4`, and s
is distance into it, the existing composition has transmittance
`(1-A) * exp(-k*s)`. Its threshold crossing is

`s = log((1-A)/(1-0.005))/k`.

Clamp that distance to the actual crossing segment. Marker selection uses the
actual post-composite alpha, with the same inclusive threshold that survives
the final `< 0.005` discard. It does not use a separately accumulated optical
depth that could disagree with computed visibility near the threshold. The
positive-rate guard avoids zero division; a zero-rate valid segment cannot
create an accumulated crossing. The first-crossing invariant keeps both log
operands positive. Zero and below-cutoff contributions remain absent.

The constant-field mathematical crossing is independent of sampling partition.
Float32 exponential/subtraction/composition and projection still introduce
error, amplified at low extinction. A ratio near one may round its offset to
zero; the clamp keeps the marker within the crossing segment. This is not a
promise of identical depth bits across quality settings or GPUs.

Retain the alpha expression, signed colors, 0.99 early termination, raycast
branch, voxel-relative lattice, brick skipping/interpolation, matrix mapping,
blend state, depth-write policy, caches, scientific data, limits and precision.
No extra field-sized buffers, scene-depth textures or prepasses are introduced.

## Depth testing and retained overlap limitation

Volume keeps `depthWrite:false` and enabled depth testing. In pinned Three.js
0.186.1 these are separate states; see [Material](https://threejs.org/docs/pages/Material.html).
An opaque object before the representative marker rejects the whole volume
fragment; one after it permits its preintegrated color. This defines a visible
prefix rather than letting an arbitrarily faint leading sample select depth.
Raycast retains depth writes and its first refined crossing.

The shader still integrates the whole ray before its one depth test. It does
not clip integration at opaque scene depth: an opaque object inside the ray
can leave behind-object contributions in the accepted color. This existing
mixed-scene limitation is explicit; satisfying the representative-depth policy
is not physically correct interleaved volume/opaque compositing or
order-independent transparency.

For cameras inside the box, integration starts at zero as before. A marker can
project before the near plane; GLES depth is clamped to [0,1], as specified in
[OpenGL ES 3.0.6](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf),
section 3.9.2.3. Ordinary volume draws leave the depth attachment unchanged;
clear depth 1 must not be interpreted as a volume marker. Assigned
`gl_FragDepth` still controls testing against existing opaque depth (sections
4.1.5 and 4.2.2).

## Regression method and provenance

The historical [research record](../../plans/006-anisotropic-rendering-research.md)
retains its old inputs, actual failures and causal diagnostic. The old probe and
configuration are preserved in [v0.5.13](https://github.com/uvar-apps/eigenvista/tree/v0.5.13/app/research).
Current production regressions use the unmodified factory shader and fixed
independent physical expectations, with no in-memory predicate replacement.

- [Visibility](../../app/tests/volume-visibility.spec.ts): original signed
  constant-field cases, qualities 1/2/4, isotropic/fine-axis grids, manual and
  hardware interpolation, zero and below/above-cutoff controls. Above-cutoff
  controls explicitly require nonzero output so an RGBA8 error budget cannot
  accept a blank field.
- [Depth and opaque objects](../../app/tests/volume-visibility-depth.spec.ts):
  independent Beer-Lambert threshold depth, real opaque planes/spheres/meshes,
  inside/affine/reflected views and near-plane clamping. Actual production
  depth-write state is checked separately from a labelled depth-write-only
  diagnostic that reads the same shader's real depth attachment.
- [Initially empty/faint contributions](../../app/tests/volume-visibility-prefix.spec.ts):
  independent transfer-band integrals distinguish a meaningful marker from a
  box-entry or first-positive shortcut.
- [Reference calculations](../../app/tests/volume-visibility-reference.ts) and
  the unchanged affine/raycast/tent oracles keep physical expectations separate
  from the production marcher. Finite quadrature/Float32/depth allowances are
  stated explicitly, not fitted to a failing output.

Before the fix, a fresh old-source run retained 40 production observations,
16 analytic mismatches and four failed tests, with no skips. The additional
historical diagnostic observations remain evidence of cause, never expected
values. Current focused/full verification and actual hosted PR-head results
belong in [status](../status.md), the issue and implementation PR. Raw evidence
is retained under `tmp/2026-11-13-volume55/`.

Version remains 0.5.13. The published tag/ZIP predates this source fix and is not
rebuilt or retagged by this issue. Physical native/clean-Mac installation,
universal nonlinear-field accuracy and general scene-depth compositing remain
separate qualification gates.
