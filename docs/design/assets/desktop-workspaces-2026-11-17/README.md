# Historical workspace comparison captures

These images depict the superseded five-task dock, bottom-workbench and
floating-palette candidate. On 17 November the user chose a simpler pane;
[the current design](../../2026-11-17-simple-workspace-pane.md) documents that
replacement. The current `?workspace=lab` no longer offers the pictured layout
selector, and the old candidate's 636-case run does not validate the replacement.
These PNGs and their original provenance remain unchanged.

Actual EigenVista browser captures, 16–17 November 2026. No synthesized molecular
images, cropping, stretching or painted controls. All PNGs retain their original
dimensions. They illustrate the earlier unreleased workspace experiment (#88),
not native detached windows or a published application default.

[captures.json](captures.json) records each image's original stage, SHA-256,
viewport/tool geometry, exact camera and public controller state, input hashes,
and observed source hashes. The ordinary-layout baseline predates the experiment;
the other images use the then-final tested candidate on checkpoint `9617a31` plus
its uncommitted changes. Original stage reports remain in ignored repository-local
`tmp/gui-design/baseline/` and `experiments-accepted/`.

Inputs already in this repository:

- `fixtures/bcif/1crn.bcif`: 327-atom crambin. Actual SES, 1.4 Å probe,
  0.5 Å spacing, MatterViz Pastel and the bundled X-ray shader. Camera fit then
  orbit 20° horizontally and 15° vertically.
- `tools/site/examples/bicyclic-c7h10.molden`: actual C7H10 HOMO `molden-mo-26`,
  48³ raycast preparation, 96 × 96 authoritative plane with contours. Camera
  position `[10,-13,23]`, target `[0,0,0]`, up `[0,1,0]`. Native plane origin
  `[-7,-6,0]`, vectors `[14,0,0]` and `[0,12,0]`; displayed range ±0.06.
- `palettes/matterviz-pastel.json`: existing upstream-derived palette; see
  [the palette documentation](../../../../palettes/README.md) for attribution.

The camera/scientific objects were preserved while changing layouts and window
sizes. This deliberately makes the costs of a shallow workbench and overlapping
floating controls visible. The captures were taken after actual scene draws and
ResizeObserver updates settled; no explicit image-export redraw was used to
conceal a resize failure. The original experiment test source was retained
locally at `tmp/gui-design/workspace-experiments-accepted.spec.ts` when the
candidate was superseded. The current
[workspace-experiments.spec.ts](../../../../app/tests/workspace-experiments.spec.ts)
now targets the [simple-pane design](../../2026-11-17-simple-workspace-pane.md);
it is not an executable reproduction of the layouts pictured here.
