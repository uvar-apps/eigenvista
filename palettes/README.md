# Softer atom colours

Two ready-to-load adaptations of the [MatterViz element colour schemes](https://matterviz.janosh.dev/periodic-table/element-colors):

- [MatterViz Muted](matterviz-muted.json): subdued colours with more contrast
  than Pastel. Oxygen is a dusty rose (`#dca0a0`).
- [MatterViz Pastel](matterviz-pastel.json): lighter colours, with pale pink
  oxygen (`#ffb3b3`).

## Load a palette

1. Open **Atom colours → Colours file…** in EigenVista.
2. Select either JSON file from this directory.
3. For biological structures, choose **Molecular data → Biological structure →
   Coloring → Element** to display element colours.

**Reset to defaults** restores the built-in palette. Palettes are session display
settings; load the file again after restarting the application. They are not
stored in saved molecular documents.

Both files contain the upstream definitions for atomic numbers **1–109**.
Elements **110–118** retain EigenVista's built-in defaults, using the existing
partial-palette loading behavior.

| Element | Muted | Pastel |
| --- | --- | --- |
| H | `#ebc8c8` | `#ffcccc` |
| C | `#787878` | `#c8c8c8` |
| N | `#a0b4c8` | `#add8e6` |
| O | `#dca0a0` | `#ffb3b3` |
| F | `#b4d2b4` | `#b4eeb4` |
| P | `#c8aab4` | `#ffbe78` |
| S | `#dcd28c` | `#ffffb4` |
| Cl | `#aac8aa` | `#96f596` |

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
