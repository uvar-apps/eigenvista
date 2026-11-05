# Sampled rendering quality and custom shader alpha

Status: implemented

Date: 6 November 2026. Baseline: `31c4876`, version 0.5.11.
Issues: [#12](https://github.com/uvar-apps/eigenvista/issues/12),
[#2](https://github.com/uvar-apps/eigenvista/issues/2).

## Decisions

Custom shader alpha cannot be inferred from uniform names or arbitrary GLSL.
Use a session-only **Shader transparency** checkbox, enabled by default. Enabled
means normal alpha blending with depth writes disabled. Disabled means opaque
depth-tested rendering with depth writes and output alpha one. The policy updates
live without rebuilding geometry. Built-in surface materials retain their own
document-opacity policy. It is not stored in `.params` or `.eigenvista`.
The supported fragment output is ShaderMaterial's `gl_FragColor`. A wrapper
calls the user main function and overrides its output alpha in opaque mode;
this does not infer arbitrary GLSL output-variable declarations.

Sampled volume/raycast quality is another session-only setting: Draft, Standard,
and Fine mean 1, 2, and 4 samples per voxel respectively; Standard is the default.
It changes display integration, not grid resolution, science, meshes, or dirty
state, and does not send work to the scientific worker. Mesh mode hides it.

For a normalized world ray, transform its direction into unit-grid coordinates,
then multiply by `dims - 1` to obtain `voxelDirection`. The ray's sample count is
`ceil(length(voxelDirection) * (exit - entry) * samplesPerVoxel)`. Thus nonuniform,
skewed and reflected axes use the full inverse transform; camera-inside rays
start at zero. Normal sampled previews have each dimension at most 256. Fine
therefore needs at most 1,767 lattice intervals along the unit-box diagonal.
A 4,096-iteration shader ceiling leaves room for brick-face traversal/fallbacks.
Renderer range construction rejects dimensions outside 2 through 256.

Use eight-cell bricks with f32 min/max ranges, including all source vertices on
each face, edge, and corner. These ranges bound trilinear interpolation inside
the whole brick. Range data use at most 262,144 bytes at 256 cubed, plus an equal
amount for the RG32F texture; no extra field-sized array is allocated. A WeakMap
reuses CPU ranges by immutable sampled-value buffer and dimensions. The display
buffer is an immutable snapshot from the worker; replacing its values requires
a new buffer. Each scene owns/disposes its field and range textures.

Raycast skips a brick only when neither signed isovalue is in its range. Volume
mode skips only when the maximum absolute value is below its zero-opacity band
(`0.3 * iso`). Classification expands the range with a small relative rounding
margin. This is a conservative practical guard, not a proof of GPU arithmetic.
Nonempty bricks keep the full field interpolation. Jumps stop at the exact next
brick face, sample that endpoint, and resume the global fine-step lattice.
Zero/negative face-distance cases take an ordinary fine step instead of applying
an arbitrary coordinate epsilon. Opacity uses the actual segment length and
retains alpha early termination. Inclusive end crossings avoid losing roots
that land exactly on a sample endpoint. If a coarse segment crosses both signed
isovalues, bisect both thresholds and composite them in front-to-back order;
neither sign may replace the other. An entry value equal to the threshold is
handled when the field changes, without treating a constant threshold field
as an artificial surface.

## Alternatives and Limits

Always blending custom materials cannot provide opaque depth semantics for
intersecting objects. Always deriving blending from document opacity ignores
shader-produced alpha. An explicit switch expresses the intent without parsing
fragment expressions. Blended transparent surfaces still use ordinary Three.js
sorting and two-sided rendering; intersecting layers are not order-independent.

Fixed 160-step rays disregard the display grid. Raising the constant uniformly
wastes work on small grids and empty space. Voxel-distance sampling plus
conservative brick bounds gives a bounded policy that adapts to the actual data.
Fine is deliberately more expensive; no universal frame-rate improvement is
claimed. This work does not replace the numerical evaluator or mesh extractor.

Half-voxel sampling does not guarantee every tangent or arbitrarily narrow
superlevel feature, nor does it certify topology. Ordinary volume/opaque-object
compositing and multi-layer transparency retain their documented limitations.
Only the exercised Mac/browser engines have verification evidence.

## Evidence Required

- Actual pixels: shader alpha at document opacity one, live policy changes,
  view-dependent alpha, opaque depth/overlap, and desktop/mobile controls.
- Independent thin signed fields: fixed160 misses demonstrated by CPU sampling
  and a GPU legacy clone; Standard/Fine visibility across affine/camera profiles.
- Skip versus dense adaptive comparisons, partial bricks/shared faces,
  interpolation-range checks, boundary/parallel rays, and finite input bounds.
- Quality changes send no worker operations, create no meshes/dirty changes,
  and preserve decoded saved documents exactly.
- Report preprocessing memory/time and synchronized warmed GPU diagnostics
  separately. Single-machine timings are measurements, not release guarantees.

Fresh run results belong in [status](../status.md) and the tracking issues.
