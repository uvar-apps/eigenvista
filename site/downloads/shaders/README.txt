# Classic surface shaders

Unmodified GLSL 1.x vertex/fragment/parameter samples copied from Molekel's
`shaders/` directory. Load them in EigenVista under **Appearance → Surface
shader** (vertex + fragment + optional `.params`).

## Contents

| Pair | Notes |
| --- | --- |
| `lambert.*` | Simple diffuse + saturation |
| `phong.*`, `phong-plastic*.params` | Multi-light Phong (VMD-derived notes in sources) |
| `phong_fog.*` | Phong with fog |
| `clip.*`, `clip_phong.*` | Axis-aligned clipping |
| `x-ray.*`, `x-ray2.*`, `*_vtk5.1.frag` | View-angle opacity (X-ray) |
| `doc/` | Original Molekel `readme` and a lambert sample |

## Provenance

Byte-for-byte copies of the files in
`/Users/ugo/projects/molekel/shaders` at the time of this import (Molekel
GPL-2.0-or-later). Several Phong sources carry the comment
“Simplified version of VMD vertex/fragment shader”; that is upstream Molekel
wording and is retained. No EigenVista-specific edits were applied here;
runtime compatibility shims live in `app/src/shaderTools.ts`.

## License

These files are distributed under the same terms as Molekel:
**GPL-2.0-or-later** (see the repository root [LICENSE](../LICENSE)).
Retain this attribution with the shaders. This is not a change to EigenVista's
application license.

Parameter files use Molekel's text format: `type name<TAB>value...` per line
(`float`, `int`, `bool`, `vec2`–`vec4`).
