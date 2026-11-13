# Molecular screen-space ambient occlusion

Date: 14 November 2026. Status: implemented; completed local verification recorded in status.
Issue: [#59](https://github.com/uvar-apps/eigenvista/issues/59).

## Scope and rendering contract

This optional display feature improves contact/depth cues for molecular atoms
and bonds. It is off initially. Appearance exposes a strength of 0–1 and a world
radius of 0.25–4 angstrom (default 1.5); these are session settings, outside
Document, dirty state, scientific inputs, worker scheduling and native files.
Open retains them; reloading starts with AO off. A zero strength uses the
original direct rendering path.

The pinned Three.js 0.186.1 GTAOPass is used as a screen-space AO producer. Its
Off output still produces the normal/depth, GTAO and denoised gtaoMap without
copying a beauty frame. A reserved layer selects the existing atom/bond
InstancedMesh objects; no geometry or instance matrices are copied. Their
MeshStandardMaterial indirectDiffuse receives the denoised screen map through
onBeforeCompile. The final complete scene still uses the existing direct
renderer, depth buffer, color conversion, transparency and scientific shaders.
A full-scene postmultiply/composer was rejected because it can darken field
colors and lose the molecular depth required by transparent fields.

Saved surfaces, custom shaders and volume/raycast boxes are neither AO
occluders nor recipients. Transparent fields can show the changed molecular
backdrop through ordinary blending; their final pixels need not be identical.
This is an approximate view-dependent depth cue, not global illumination or a
scientific observable. It does not repair the existing whole-ray volume/opaque
intersection approximation or change field values, hashes, profiles or limits.

## Bounds and lifetime

AO uses a fixed GTAO sample parameter of 16 and eight Poisson denoise samples,
with no temporal
accumulation or continuous redraw. Targets use half the actual drawing-buffer
dimensions, capped at 1024 on either edge and by device limits. Three RGBA16F
targets plus Depth24Stencil8 total an ideal 28 bytes per pixel, at most 28 MiB
of attachment payload before driver overhead. Noise textures are small and fixed.
The controller allocates no AO GPU resources while off or with no molecular
participants.

Disabling/zero strength disposes owned targets, depth/noise textures and pass
materials, restores molecular hooks/layer masks and releases references. Normal
material program variants remain bounded in Three's material cache until the
corresponding molecule materials release them; toggles must not grow that cache.
Fresh AO attachment refreshes material program references to bind the correct
uniform map even when a molecule first rendered with AO already enabled.
The pinned pass omits its GTAO/blend materials from dispose, so the adapter
explicitly releases them. Resizing releases old target storage.

The adapter checks float render-target support and actual completeness of all
three FBOs. It restores the render target, effective and logical viewport/
scissor, clear state, scene override, camera mask and debug callbacks even on
failure. Shader diagnostics and material hooks record failures without throwing
through Three's unprotected internal compile/render stacks. Molecule-only
precompile plus forced lazy program validation finishes before a scoped failure
can deactivate the effect. Shader failure also retires failed material programs
so retry cannot reuse a bad cache entry. Failed enables latch until Off or a
new molecule set; the UI reports the error while retaining normal rendering.
Actual context loss retains the existing reload-to-recover warning.

Animation and synchronous PNG export call the same final-frame function, with
unchanged preserveDrawingBuffer=false. Camera, resize and settings invalidate
that frame rather than rebuilding chemistry/geometry or requesting workers.

## Evidence and source references

Independent contact/isolated geometry, real instanced/nonuniform bond rendering,
background and exact Off/zero checks, field/depth/color isolation, PNG/camera,
allocation/disposal and labelled injected faults belong in the normal bounded
Chromium/WebKit suite. The real 65,963-atom 4PJ1 fixture is a separate measured
qualification; do not infer all-device performance or GPU memory from ideal
attachment sizes. Completed results and gaps belong in [status](../status.md).

The installed pinned implementation is authoritative where newer docs differ:
[GTAOPass](https://threejs.org/docs/pages/GTAOPass.html),
[Material customization](https://threejs.org/docs/pages/Material.html),
[renderer compile](https://threejs.org/docs/pages/WebGLRenderer.html), and
[framebuffer status](https://registry.khronos.org/webgl/specs/latest/2.0/).
Read the addon adapter and its browser regressions before changing the Three
pin, shader chunks, pass ownership, samples or buffer policy.
