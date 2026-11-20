# Atom colour palettes

Two softer, ready-to-load adaptations of the [MatterViz element colour schemes](https://matterviz.janosh.dev/periodic-table/element-colors):

- [MatterViz Muted](matterviz-muted.json): subdued colours with more contrast
  than Pastel. Oxygen is a dusty rose (`#dca0a0`).
- [MatterViz Pastel](matterviz-pastel.json): lighter colours, with pale pink
  oxygen (`#ffb3b3`).

For best results with molecular ambient occlusion, use
[MatterViz Pastel](matterviz-pastel.json). Load it using the steps below, then
enable **Appearance → Ambient occlusion**.

## Load a palette

1. Open **Atom colours → Colours file…** in EigenVista.
2. Select a JSON palette from this directory.
3. For biological structures, choose **Molecular data → Biological structure →
   Coloring → Element** to display element colours.

**Reset to defaults** restores the built-in palette. Palettes are session display
settings; load the file again after restarting the application. They are not
stored in saved molecular documents.

Both MatterViz files contain the upstream definitions for atomic numbers **1–109**.
Elements **110–118** retain EigenVista's built-in defaults, using the existing
partial-palette loading behavior.

| Element | Muted     | Pastel    |
| ------- | --------- | --------- |
| H       | `#ebc8c8` | `#ffcccc` |
| C       | `#787878` | `#c8c8c8` |
| N       | `#a0b4c8` | `#add8e6` |
| O       | `#dca0a0` | `#ffb3b3` |
| F       | `#b4d2b4` | `#b4eeb4` |
| P       | `#c8aab4` | `#ffbe78` |
| S       | `#dcd28c` | `#ffffb4` |
| Cl      | `#aac8aa` | `#96f596` |

## Accessible elements

[Accessible elements](accessible-elements.json) is an optional alternative for
inspecting common elements with more separation between dark carbon, blue
nitrogen and vermilion oxygen. It uses selected Okabe–Ito hues, neutral hydrogen
and carbon, and additional shades for halogens and common metal ions. It is a
different mapping from CPK: oxygen is orange-red and chlorine is sky blue.

It has been compared with the existing palettes on water and the full 1AON
complex, using ordinary shading and ambient occlusion on the default light
background. Simulated red-green deficiencies preserve useful separation of the
common carbon, nitrogen and oxygen colours in those views. Grayscale and some
supplemental element pairs remain ambiguous; use the identity cues below.

The file overrides exactly these **14 elements**; the other **104** keep their
built-in colours. It uses the same loader and session-only behavior as the softer
palettes. Through an AI agent, ask: “Load the Accessible elements colour palette
and show the molecule using element colours.” Give the agent the palette file
if it is not already beside the installed application.

| Element | Colour    | Element | Colour    |
| ------- | --------- | ------- | --------- |
| H       | `#e6e6e6` | C       | `#333333` |
| N       | `#0072b2` | O       | `#d55e00` |
| F       | `#009e73` | Mg      | `#007d5a` |
| P       | `#cc79a7` | S       | `#f0e442` |
| Cl      | `#56b4e9` | Ca      | `#7ac99d` |
| Fe      | `#e69f00` | Zn      | `#999999` |
| Br      | `#8c510a` | I       | `#6c3a80` |

Colour alone cannot reliably identify every element, particularly in deep
shadows, dense overlapping atoms or grayscale. Use picking and element labels
to confirm identity. The palette is not a guarantee for every form or severity
of colour vision deficiency. Its [design and rendered evaluation](https://github.com/uvar-apps/eigenvista/blob/main/docs/design/2026-11-20-accessibility-palette.md)
record the tested conditions and remaining ambiguities. The element assignment
and supplementary shades are EigenVista work under the repository license;
base hues credit [Masataka Okabe and Kei Ito](https://jfly.uni-koeln.de/color/).
No CUD certification or endorsement is implied.

## Source and attribution

Source: Janosh Riebesell's MatterViz, revision
`fae7a3e7fddf26f9625391ea76f28c7ebd261de9`:
[Muted](https://github.com/janosh/matterviz/blob/fae7a3e7fddf26f9625391ea76f28c7ebd261de9/src/lib/colors/muted-colors.json)
and [Pastel](https://github.com/janosh/matterviz/blob/fae7a3e7fddf26f9625391ea76f28c7ebd261de9/src/lib/colors/pastel-colors.json).
The original RGB values are unchanged; they were converted to lowercase hex and
associated with EigenVista's atomic numbers and element symbols. These files use
the `eigenvista-atom-colors` version 1 envelope.

The upstream MIT copyright and permission notice is retained in
[LICENSE-MatterViz.txt](LICENSE-MatterViz.txt). These palettes come from MatterViz;
no palette values were taken from the AMI reference.
