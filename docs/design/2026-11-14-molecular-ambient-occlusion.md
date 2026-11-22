# Molecular screen-space ambient occlusion

Date: 14 November 2026. Status: implemented; current verification evidence and
remaining gates are recorded in status and the tracking issue.
Issue: [#59](https://github.com/uvar-apps/eigenvista/issues/59).

This record describes the original atom and bond AO. The
[architecture guide](../architecture.md) also describes the later independent
SES/SAS pass introduced in [#110](https://github.com/uvar-apps/eigenvista/issues/110).

## Visual target and rejected prototype

The user's primary reference is the old Molekel
[AO/No-AO comparison](https://ugovaretto.github.io/molekel/wiki/uploads/Main/Gallery/AO_AND_NOAO.png).
Its visible cue is broad shadowing in protein folds and cavities. The requested
active mode also uses actual Lambert materials without specular highlights.
Small local pixel differences or a functioning AO render pass alone do not
establish this visual result.

The earlier indirect-diffuse-only head
[`a6b58f3d678716d1af265ea41c70aada83736ca9`](https://github.com/uvar-apps/eigenvista/commit/a6b58f3d678716d1af265ea41c70aada83736ca9)
was visually rejected. Its Apple full-fit captures changed mean foreground
display luma by less than 1/255 for both space-fill and ball-and-stick. That
historical evidence cannot qualify the broader Lambert candidate.

The [historical Verify run](https://github.com/uvar-apps/eigenvista/actions/runs/43469717973)
also did not pass all four gates: Linux 232, Mac 7 and WebKit 230 passed, while
Chromium finished 229 passed/1 failed. The failure was the unchanged density
responsiveness heartbeat, which observed one animation frame during its 120 ms
probe; its cause is not established by that observation. Do not merge the PR at
that rejected head. Fresh visual qualification and all four actual job results
at the new final head are required; completed evidence and unresolved gaps belong in
[status](../status.md) and the living handoff.

The subsequent [Verify run 43479687125](https://github.com/uvar-apps/eigenvista/actions/runs/43479687125)
at head `04c8c9194c129ae2fa9b1993145b9068d699c63c` also remains historical:
Linux 232, Mac 7 and WebKit 232 passed, while Chromium finished 231 passed/1 failed.
Its new combined AO PNG case exceeded the existing 60-second per-test limit
during the zoom/orbit/resize sequence; this was not the earlier density heartbeat
failure or the 35-minute suite limit. The three completed full-size desktop
captures matched the compositor exactly (maximum 0, mean 0 at 1000×1042 physical
pixels). The trace showed slow drag/release/resize operations and a pending
Fit click, rather than a reported pixel mismatch. This head did not satisfy the
four-job merge gate.

## Scope and rendering contract

This optional display feature targets contact and broad fold/cavity cues for
molecular atoms and bonds. It is off initially. Appearance exposes strength 0–1,
Automatic AO radius (initially checked), and an angstrom readout/manual slider.
These are session settings outside Document, dirty state, scientific inputs,
worker scheduling and native files. Open retains the AO toggle, strength and
automatic/manual choice; reloading starts with AO off and automatic radius enabled.
A zero strength uses the original direct rendering path.

Automatic radius is 5% of the axis-aligned atom-coordinate bounding-box diagonal,
converted from world Bohr to angstrom, rounded to the nearest quarter angstrom
and clamped to 1.5–30 Å. It uses atom coordinates only: field bounds, display
representation and camera changes do not change the selected world radius.
App memoizes the calculation by the immutable atoms reference, so field/view
updates do not rescan a large molecule. For 4PJ1 it selects about 16.25 Å. Turning
Automatic off copies the current automatic value into the manual setting; the
manual range is 0.25–50 Å in quarter-angstrom steps. This is a display scale, not
a quantum-chemistry parameter or a changed molecular geometry.

The pinned Three.js 0.186.1 GTAOPass is used as a screen-space AO producer. Its
Off output still produces the normal/depth, GTAO and denoised gtaoMap without
copying a beauty frame. A reserved layer selects the existing atom/bond
InstancedMesh objects; no geometry or instance matrices are copied. While active,
their materials are replaced by owned MeshLambertMaterial instances (one per
distinct source material), preserving the original mesh,
instance colors and common diffuse/render properties. Their Lambert diffuse
lighting receives the denoised screen map through onBeforeCompile. There is no
PBR/specular contribution in this mode. The receiver raises clamped denoised
visibility to exponent 6 before mixing by the requested strength; both direct and
indirect diffuse terms receive that factor. This deliberately illustrative
Lambert-plus-SSAO shading is not a physical indirect-light-only approximation.
The final complete scene still uses the existing direct
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

AO uses GTAO sample parameter 32, distance exponent 2 and world-space radius;
the depth-thickness limit follows the same world radius. Poisson denoise uses
8 samples, radius 4 AO pixels and luma rejection 0.25. There is no temporal
accumulation or continuous redraw. Targets use the full physical drawing-buffer
dimensions, proportionally capped at 1024 on either edge and by device limits;
there is no unconditional half-resolution stage. Three RGBA16F
targets plus Depth24Stencil8 total an ideal 28 bytes per pixel, at most 28 MiB
of attachment payload before driver overhead and the ordinary canvas/MSAA
storage. This maximum is unchanged by using full resolution below the cap;
small/medium views can use more GPU work/storage than the half-resolution
prototype. Noise textures are small and fixed-size.
The controller allocates no AO GPU resources while off or with no molecular
participants.

Disabling/zero strength disposes owned targets, depth/noise textures, pass
materials and owned Lambert materials. It restores the exact borrowed original
material references and layer masks. Original material objects, properties,
hooks and programs are never mutated by the enhancement. Fresh owned Lambert
materials bind current uniforms on each enable, including ON-first/Off/ON;
there is no borrowed-Standard program-refresh workaround. Restore original
references before old-group disposal. The small shared-material count stays
independent of atom count.
The pinned pass omits its GTAO/blend materials from dispose, so the adapter
explicitly releases them. Resizing releases old target storage.

The adapter checks float render-target support and actual completeness of all
three FBOs. It restores the render target, effective and logical viewport/
scissor, clear state, scene override, camera mask and debug callbacks even on
failure. Shader diagnostics and material hooks record failures without throwing
through Three's unprotected internal compile/render stacks. Molecule-only
precompile plus forced lazy program validation finishes before a scoped failure
can deactivate the effect. Shader failure also retires failed owned material
programs so retry cannot reuse a bad cache entry. Failed enables latch until Off or a
new molecule set; the UI reports the error while retaining normal rendering.
Actual context loss retains the existing reload-to-recover warning.

Animation and synchronous PNG export call the same final-frame function, with
unchanged preserveDrawingBuffer=false. Camera, resize and settings invalidate
that frame rather than rebuilding chemistry/geometry or requesting workers.

## Evidence and source references

Independent contact/isolated geometry under ambient and actual scene lighting,
positive gloss controls with real Lambert materials, instanced/nonuniform bonds,
exact Off/zero/original-reference restoration, Auto/manual radius isolation,
field/depth/color preservation, PNG/camera, allocation/disposal and labelled
injected faults belong in the normal bounded Chromium/WebKit suite. Removing a
highlight alone must not count as AO localization: contact contrast requires
its own independent control.

### Bounded PNG verification

The combined PNG workflow is split into two independently bounded tests.
Case A retains the original three full-size desktop samples at DPR 2: idle,
repeated and zoomed. Case B retains the real browser window, toolbar and actions,
including zoom, the three-step orbit gesture, responsive window resize, Fit and
zero strength. Test-only CSS bounds only its real `.scene` render host from
240×128 to 160×160 CSS pixels at DPR 2. The test asserts actual canvas sizes of
480×256 before resize and 320×320 afterward, then measures the mobile/zero
samples through the unchanged capture helper.

Together the cases retain all five original PNG parity samples, exact repeated
identity, camera-change and zero-strength comparisons, and the existing pixel
oracles. The full browser window and controls are not replaced with mocks.
The separate allocation/resource case retains real 1024-cap coverage. These
test dimensions do not change production resolution, AO quality, or actual-app
1AON visual/performance qualification.

One combined local run of the split completed 100/100 cases in 194.985 seconds,
with zero skipped, flaky or unexpected cases. Production and helper hashes were
unchanged; only the spec's scheduling/render-host bounds changed. The normal
inventory is now 466 tests across both engines: 233 per engine, including 10 AO
cases per engine. The existing 60-second per-test, 35-minute suite-step,
60-minute job and one-worker limits remain unchanged. These local results do
not replace all four actual CI job results at the new final PR head.

### Real-file qualification and references

The user's current primary real-file acceptance input is the existing
[tracked 1AON mmCIF fixture](../../fixtures/cif/1AON.cif), SHA256
`6b202f340ffb9a1924d5315ce9e837e02cee1dbd745df675be76f6d4e1b8e66f`.
Qualify the full molecule through the actual App at default automatic radius,
and inspect its matte fold/cavity shading against the visual reference. The
65,963-atom 4PJ1 fixture remains secondary visual/measured evidence, including
its full-fit and close-up views. Preserve both fixture inputs.

Do not infer acceptance from a nonblank image, the rejected prototype or a small
average pixel change. Actual broad-radius and primary 1AON qualification results are recorded in
[status](../status.md) and the tracking issue; they are separate from the
prototype diagnostics.
Do not infer all-device performance or GPU memory from ideal attachment sizes.
Completed results and gaps belong in [status](../status.md).

The installed pinned implementation is authoritative where newer docs differ:
[GTAOPass](https://threejs.org/docs/pages/GTAOPass.html),
[Material customization](https://threejs.org/docs/pages/Material.html),
[renderer compile](https://threejs.org/docs/pages/WebGLRenderer.html), and
[framebuffer status](https://registry.khronos.org/webgl/specs/latest/2.0/).
Read the addon adapter and its browser regressions before changing the Three
pin, shader chunks, pass ownership, samples or buffer policy.
