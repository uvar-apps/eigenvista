# Accessible elements: optional palette

20 November 2026 (Australia/Perth), EigenVista 0.10.2 source follow-up,
[#72](https://github.com/uvar-apps/eigenvista/issues/72). No scientific data,
rendering algorithm, existing palette, native schema or default choice changes.

## Decision and scope

Offer [accessible-elements.json](../../palettes/accessible-elements.json) through
the existing GUI palette loader and shared API/AI connector. It is an optional
common-element design, not a claim that 118 elements can be universally identified
by colour. The exact coverage is H, C, N, O, F, Mg, P, S, Cl, Ca, Fe, Zn, Br and I;
all other 104 atomic numbers retain the built-in defaults. The file uses the
existing version 1 partial-override envelope. Colours remain session preferences,
not saved document data. The [palette guide](../../palettes/README.md#accessible-elements)
contains the complete symbol/colour mapping and user instructions; the JSON
records the corresponding atomic numbers.

Prioritize the common C/N/O distinction: dark neutral carbon, blue nitrogen and
vermilion oxygen. Neutral light hydrogen and yellow sulfur preserve useful
brightness differences. Seven chromatic base values come from the Okabe–Ito
palette; assigning them to elements and choosing neutral/supplemental shades is
new EigenVista work, covered by the repository license. This is an adaptation,
not an official molecular palette or certified CUD product. Existing MatterViz
palettes and their MIT attribution remain unchanged.

## Method and primary references

The [Color Universal Design guidance by Masataka Okabe and Kei Ito](https://jfly.uni-koeln.de/color/)
supports combining distinguishable hues/lightness with redundant identity cues.
Existing atom picking and labels supply those cues; no claim is made that a
colour-only molecular image conveys element identity accessibly to everyone.

Diagnostic comparisons use the full-severity matrices of
[Machado, Oliveira and Fernandes (2009)](https://doi.org/10.1109/TVCG.2009.113),
as retained in the primary
[colorspace conversion tables](https://github.com/cran/colorspace/blob/47585523bc3017903be49327bb50724c270b6946/R/cvd.R).
The author supplement timed out during this work; the cited package's complete
tables and
[implementation documentation](https://github.com/cran/colorspace/blob/29fd3fc67e02d02dddadd3866dd5e618405a7e51/R/simulate_cvd.R)
were independently fetched and retained. Decode sRGB to linear RGB, multiply the
severity-1 matrix, clamp to the displayable range and re-encode sRGB. Grayscale
uses linear Rec.709 luminance, not an unweighted average of encoded channels.
Alpha and image dimensions are preserved. Identity, black/white and independent
red-primary controls check transformation order and channel orientation.

Rendered comparisons use original application PNGs, not flat swatches
alone. The protocol exports the same water molecule and full 58,870-atom
1AON structure with the default, MatterViz Muted, MatterViz Pastel and Accessible
elements palettes, under ordinary molecular shading and Lambert+AO, on the
default `#e8edef` background. Each original is retained beside protanopia,
deuteranopia, tritanopia and grayscale diagnostic derivatives. Contact sheets
preserve the 4:3 source proportions. These simulated views are clearly labeled
and are not substituted for scientific rendering or gallery originals.

Pairwise CIE76 distances for all 14 selected flat colours are supporting
diagnostics only. They do not constitute a pass threshold for recognition of
shaded spheres, and text-contrast ratios are not applied to molecular geometry.
Actual shadows, highlights, occlusion, object size and background can overwhelm
base-colour differences. Evaluation is not a study involving people with colour
vision deficiencies; user feedback remains welcome.

The checked flat-colour calculation gives the following minimum C/N/O pairwise
CIE76 distances (rounded to one decimal). These summarize this specific design
goal, not an accessibility certification or a shaded-image detection test:

| Palette             | Normal | Protanopia | Deuteranopia | Tritanopia | Grayscale |
| ------------------- | ------ | ---------- | ------------ | ---------- | --------- |
| Built-in            | 47.5   | 24.3       | 46.5         | 30.2       | 2.7       |
| MatterViz Muted     | 25.4   | 16.7       | 24.4         | 25.5       | 1.1       |
| MatterViz Pastel    | 16.1   | 7.0        | 13.1         | 21.7       | 0.7       |
| Accessible elements | 48.3   | 47.4       | 50.3         | 40.7       | 8.3       |

Other distinctions remain weak: P/Zn are close in the deuteranopia simulation
(7.4); N/Mg are close in tritanopia (10.8), and their rounded grayscale values
coincide. Cl/Fe (0.7) and H/S (2.1) are also close in grayscale. Related F/Mg
shades remain relatively close across the simulations. Confirm those element
identities using picking or labels. No threshold in this table establishes
recognition in a molecular image.

## Rendered observations

Visual review of the Chromium water/AO, Chromium 1AON/ordinary, WebKit
water/ordinary and WebKit 1AON/AO contact sheets finds consistent element
mapping and identical molecular silhouettes across the four palette columns.
The bent water geometry is visible; ordinary shading has one headlight
highlight and AO is matte. The new oxygen remains strongly separated from its
light hydrogen neighbours in the red-green simulations; the Muted and Pastel
versions converge more closely in tone. This is an observation of these images,
not a recognition test involving affected users.

In the dense 1AON view, the new dark-carbon background and blue/orange N/O
patches remain visibly separated under the protanopia/deuteranopia simulations.
Tritanopia changes the hues substantially; grayscale loses much of the element
distinction despite preserving the molecular outline. AO communicates depth
without restoring hue distinctions that a simulated visual condition removes.
At 480 × 360 the complete complex is an overview; it cannot qualify the
identification of every tiny atom. The two subjects do not establish rendered
distinguishability of every supplemental halogen or metal pair.

Each tile retains its original 480 × 360, 4:3 image area. The 1920 × 1940
contact sheets add a separate caption band without stretching the image.
Full-resolution inspection and independent pixel checks confirm nonempty,
opaque caption bands in all 80 tiles of the four sheets reviewed here. Captions
can disappear in a reduced chat preview; the actual PNGs contain readable labels.
Original PNG hashes match their completed-test manifests, and simulated views
preserve alpha and pixel dimensions. Chromium records the Apple M4 ANGLE Metal
renderer; WebKit records Apple GPU. The initial incomplete software-GPU attempt
and unavailable font-name diagnostic are retained separately, not counted as
qualification results.

## Verification state

All eight palette cases (four in each engine) pass in the final focused
**58-case Chromium/WebKit run**. They cover every documented entry, all 104
unlisted defaults, real GUI versus API loading, reset, malformed-input
preservation, AO/representation retention and exact scientific-document
invariance. TypeScript, formatting and independent matrix/primary controls pass.
The completed comparisons contain **32 original PNGs, 160 diagnostic views and
eight contact sheets**. The integrated full-suite and separate native/helper
acceptance belong to the parent batch's living handoff; the focused result here
does not stand in for them or imply a new published binary release.

Ignored reproducible scripts, pinned reference tables, original PNGs, diagnostic
derivatives, contact sheets and pair metrics live under
`tmp/save-exfat-accessibility/palette/`. The protocol does not test alternate
backgrounds, every display/device, every molecular style or individual visual
experience. Simulation cannot certify universal accessibility.
