# Browser qualification

The normal application URL uses the production four-tab pane. `control=1`
only opts into application control; it does not select an alternate UI.

- `workspace-experiments.spec.ts` qualifies the default pane, persisted widgets,
  actual scientific workflows, cancellation and Zen/fullscreen. Its separately
  named legacy-comparison case checks the explicit compatibility route.
- `production-workflows.spec.ts` exercises the default GUI without the control
  API: protein representations, AO/palette/background/transparent PNGs, Cube
  volume/raycast without meshes, custom shaders, Save/Open and conversion.
- Other normal-route GUI tests cover inspection, quantitative analysis,
  molecular surfaces, density/orbital progress and native IPC lifecycle.
- Normal-route API and WASM tests qualify their scientific/transport contracts;
  their counts must not be described as additional GUI workflow coverage.
- Isolated renderer harnesses can intercept the exact root URL with a blank
  test document. These qualify the imported renderer and scientific code, not
  application startup or the production GUI; their route must match the mock.
- Historical sidebar and fixed-frame reference tests explicitly request
  `workspace=legacy`. Their original scenarios, numerical oracles and pixel
  thresholds remain intact. They do **not** qualify the default pane.

`workspace.ts` follows visible user actions to activate a tab and disclose one
widget. It neither changes application state behind the GUI nor opens all tabs.
Browser native-IPC tests do not replace native macOS acceptance.
