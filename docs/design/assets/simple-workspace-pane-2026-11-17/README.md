# Simple pane captures

Original EigenVista captures from 17 November 2026, for the user's selected
single-pane design (#88). Images retain their native 1280 × 800 dimensions;
no cropping, stretching or replacement of application controls/scientific images.

[captures.json](captures.json) records actual pane/viewport geometry, camera,
scientific display state, input hashes, runtime hashes and original image hashes.
The source was uncommitted after checkpoint `9617a31`, version 0.9.0 unreleased.
These images show browser presentation, not native OS tool windows.

- Crambin: existing `fixtures/bcif/1crn.bcif`, actual SES, MatterViz Pastel atoms,
  bundled X-ray shader, left pane and saved surface parameters.
- C7H10: existing `tools/site/examples/bicyclic-c7h10.molden`, real HOMO section
  with contours, right pane. Quantum fields and Field rendering are collapsed
  to expose the expanded Quantitative field inspection widget.
- Zen: the same C7H10 source and camera with tools/chrome hidden.

Earlier three-placement images remain in their historical directory; none was
relabeled as this design. Original evidence and all 20 new captures are retained
under repository-local `tmp/gui-design-simple/accepted/`. See the
[current design](../../2026-11-17-simple-workspace-pane.md) and
[palette attribution](../../../../palettes/README.md).
