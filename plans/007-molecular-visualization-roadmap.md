# Plan 007: molecular visualization priorities

Recorded 14 November 2026 (Australia/Perth), against EigenVista 0.6.0 main
`d0983802c6e866c971b9a1200073dd399030bd6c`. Category: product direction.

**Status: first four additions and metadata prerequisite implemented following
authorization on 14 November 2026.** The initial roadmap was documentation only.
The user subsequently authorized implementation, issue tracking, a separate
branch and merge through a pull request. Work is on
`codex/biological-structure-views`, tracked by issues
[#62](https://github.com/uvar-apps/eigenvista/issues/62)–
[#66](https://github.com/uvar-apps/eigenvista/issues/66). Read the
[implementation decision](../docs/design/2026-11-14-biological-structure-views.md)
and [verification/delivery ledger](https://github.com/uvar-apps/eigenvista/issues/62#issuecomment-6874030097)
for the exact implementation revision and checks. Ranks 5–28 remain proposals;
no version bump, new release or unrelated dependency/scientific changes are
authorized by this batch.

These are feature opportunities and prerequisites, not newly discovered bugs.
Ranks below order this visualization backlog; they do not replace the overall
bug/research queue or change existing GitHub priority labels.

## Recommendation

Implement the following four bounded additions first, after the shared metadata
foundation. If selecting only three initially, stop after backbone traces/tubes;
the fourth delivers the requested ribbon/arrow protein-fold view.

| Order | Addition | Practical result |
| --- | --- | --- |
| 1 | Chain and entity coloring | Immediately distinguish subunits in large complexes such as 1AON. |
| 2 | Basic chain/component selection and mixed representations | Isolate chains, hide waters, focus regions and retain ligand/ion detail while changing the protein view. |
| 3 | Protein backbone trace and smooth tube | Read the chain path without displaying every atom; establish trustworthy backbone continuity. |
| 4 | Protein ribbons and secondary-structure cartoons | Read helices, beta-strand arrows and connecting loops, with optional secondary-structure colors. |

Cartoons have very high direct visual value. Their fourth position reflects the
identity, visibility and backbone work needed to implement them reliably. A
trace/tube is a useful independent feature, not a complete cartoon under another
name. Mixed views first support the existing atomic styles and subsequently
accept the new protein styles. Avoid treating all four as one small UI change.

The next family should be molecular-shape surfaces. Start with a clearly named
Gaussian envelope; solvent-accessible and solvent-excluded surfaces require
their own algorithm/semantics qualification. They are not implicit commitments
inside the first four additions.

## How the ordering was chosen

- Favor frequent questions: which subunit is this, how does the protein fold,
  where is the ligand, and what can be hidden to see it?
- Favor the user's actual large-protein workload, particularly tracked 1AON and
  4PJ1, while preserving quantum-chemistry workflows.
- Move enabling work ahead of features that depend on it. Reuse validated
  metadata and rendering layers rather than implementing each style in isolation.
- Discount features needing new scientific algorithms, external datasets or
  specialized interpretation until their prerequisites exist.
- Group presentation variants with their parent capability. Transparent versus
  dotted surfaces should not become unrelated projects.

This is an engineering/product judgment, not a measured user study. Effort is
coarse: S = a small increment, M = several coordinated changes, L = substantial
work across components. Estimates include verification and are not deadlines.

## Current implementation and evidence

The existing program has ball-and-stick, liquorice and Van der Waals views,
element palettes, atom picking, saved scientific meshes, sampled field
raycasting/volume rendering and molecular Lambert-plus-SSAO. Those are the
baseline to preserve, not new items in this roadmap.

| Evidence at the recorded commit | Consequence for future work |
| --- | --- |
| [Rust Atom](../crates/eigenvista-core/src/model.rs), lines 12–15; [TS AtomColumns](../app/src/types.ts), lines 11–14 | Atoms retain only element and position. There is no durable chain/residue/atom-name hierarchy. |
| [PDB conversion](../crates/eigenvista-core/src/import/pdb.rs), lines 257–265 and 295 | Parsed biological identity is deliberately discarded; unhandled records also need review for TER and secondary annotations. |
| [mmCIF identity parsing](../crates/eigenvista-core/src/import/cif.rs), lines 599–649, construction at 720–728 and warning at 785 | Label/author identifiers and insertion information already assist selection, but are not retained as document attributes. |
| [BinaryCIF category filter](../crates/eigenvista-import/src/bcif/mod.rs), lines 79–85 | Only atom_site, struct_conn, cell, symmetry and space_group are expanded. New polymer/secondary categories must be handled here as well as in text mmCIF. |
| [View validation](../crates/eigenvista-core/src/model.rs), line 396; [Representation UI](../app/src/App.tsx), lines 758–768 | Exactly three global atomic representation names are accepted today. |
| [Viewport](../app/src/Viewport.tsx), lines 335–424 and retinting from 529 | Atom and bond instancing must be retained. Per-instance atom color is a useful starting point; bonds currently share a neutral material. |
| [Typed writer](../crates/eigenvista-format/src/typed.rs), lines 33–64 and 218 onward; [atom column visitor](../crates/eigenvista-core/src/model.rs), lines 142–172 | New metadata needs coordinated serialization, typed packing, validation, TS and profile decisions. Adding keys to the current atom-column object is not transparently compatible. |
| [Field source hash](../crates/eigenvista-core/src/compute.rs), lines 184–203; [worker registration](../app/src/scienceRegistration.ts), lines 22–34 | Field hashes cover basis and selected quantum/grid inputs. Display metadata must not change those hashes; registration/validation must still observe any new authoritative metadata. |

For example, today's Rust atom is exactly:

```rust
pub struct Atom {
    pub element: u16,
    pub position: [f64; 3],
}
```

The current TypeScript transport likewise contains only `elements` and
`positions`. A coloring dropdown alone cannot reconstruct lost chain identity.
The [user guide](../docs/user-guide.md#supported-files) documents the current
structure-only import policy. See [architecture](../docs/architecture.md),
[native profile](../docs/preview-format.md) and
[frozen native fixtures](../fixtures/native/README.md) before designing changes.

## Shared prerequisite: biological metadata

**Effort L; compatibility risk high; confidence in the prerequisite high.**
This is part of the first implementation batch's cost, not a fifth visible style
or a claim that the current importers violate their documented contract.

Design bounded optional structure metadata associated with stable source atom
indices. Decide its persisted profile before changing model types. Minimum
information for the first four includes:

- Chain identity, distinct mmCIF author/label identifiers and entity identity
  where supplied. Distinguish a molecule instance from an entity/type.
- Residue identity, sequence identifiers, insertion codes and named atoms.
- Polymer/ligand/water/ion classification with explicit unknown states. A modified
  polymer residue is not necessarily a ligand merely because it uses HETATM.
- Observed segment boundaries and trustworthy ordering. Respect TER, missing
  residues/representative atoms and chain breaks; do not derive biological chains
  by taking connected components of the distance-perceived bond graph.
- Mapping after the existing first-model/alternate/zero-occupancy selection;
  metadata must describe precisely the atoms that survived selection.

Maintain PDB, mmCIF and BinaryCIF semantic parity. Add categories and bounds only
as needed; copying an entire source file into unbounded per-atom strings is not
the metadata design. Preserve existing allocation and archive limits and measure
the added retained/peak memory on 1AON and 4PJ1.

Existing native, XYZ, cube and Molden documents remain usable without fabricated
chains or residues. Old native documents that discarded identity cannot recover
it reliably; reimporting the original structural source may be needed. Specify
feature availability for missing metadata and forward/backward native-file
compatibility explicitly. Do not silently discard newly saved hierarchy or
regenerate frozen archives to accommodate a changed writer.

## Boundaries and acceptance for the first four

### 1. Chain/entity coloring

**Value very high; effort M after metadata; risk medium.**

Provide a separate coloring choice beside the existing element palette. Chain
colors identify individual subunits; entity colors identify molecular types.
Define a deterministic palette, legend, displayed identifier namespace and
unknown/non-polymer policy. Preserve element-based coloring as a usable choice.
Bond tinting is an explicit design choice, not an accidental consequence of atom
color changes. Do not overload the JSON element-palette schema with chain IDs.

Acceptance: corresponding atoms receive consistent colors across imports where
equivalent identifiers or explicit correspondence exist, and across save/reopen;
identifiers in the legend match picking. PDB need not supply mmCIF entity IDs;
absent identity follows the explicit unknown policy. Existing palette
loading/reset, molecular AO and current-frame PNG
export continue to work. Recoloring does not resample fields or alter scientific
arrays, source hashes or saved mesh geometry.

### 2. Basic selection, visibility and mixed views

**Value very high; effort L; risk medium/high.**

Begin with bounded chain/component controls: show/hide, isolate/show all, focus,
and independent use of the existing atomic representations. Protein, ligand,
ion and solvent groups can be presented differently. Basic named-residue/range
selection supports inspecting an active site; a general query language and
automatic chemical-contact analysis are separate future work.

Acceptance: isolate a 1AON chain, restore the complete structure, hide waters
and retain ligands/ions without deleting source atoms. Picking on compacted draw
instances resolves original atom/residue identities. Atom/bond endpoint masks
are consistent. Camera fit, screenshots, cancellation and existing field/surface
visibility remain coherent. Decide which view settings are session preferences
versus persisted document state before adding fields; define dirty-state rules.
Keep stable source indices and bounded render-layer ownership.

### 3. Backbone trace and smooth tube

**Value high; effort L; risk medium.**

Start with protein C-alpha traces, then optionally smooth their geometry.
Use named backbone atoms and preserved residue/segment order. RNA/DNA backbone
conventions require separate explicit scope; do not guess a universal trace atom.
Missing or unsuitable data must be apparent to the user rather than connected
into an invented continuous path.

Acceptance: independent small fixtures establish which residue pairs connect.
Never bridge chains, TER boundaries or unsupported gaps. Test duplicate residue
numbers across chains, insertion codes, nonmonotonic source order, absent C-alpha
atoms and alternate selection. Display a real complete 1AON and preserve chain
colors, component masks and picking. Use bounded geometry and shared resources;
do not replace atom instancing with one scene object per residue.

### 4. Ribbons/cartoons and secondary-structure coloring

**Value very high; effort L; scientific interpretation risk high.**

Add oriented protein ribbons and the conventional helix/strand-arrow/loop
cartoon on top of tested backbone continuity. Preserve deposited secondary
annotations and their provenance. Before implementing a coordinate-derived
assignment, choose and qualify the algorithm/reference and define behavior for
absent, conflicting or incomplete assignments. Biochemical interpretation and
derived assignment belong in Rust; geometry and display belong in the renderer.

Acceptance: independently annotated structures establish helix/strand/loop
segments, strand direction and ribbon orientation. Verify bent helices,
termini, missing atoms and transitions without twisting artifacts or fabricated
secondary segments. Compare the complete protein view with a recognized viewer.
Then demonstrate chain-colored cartoons with ligand sticks and water visibility
controls. Define the lighting/AO policy for the new geometry deliberately;
preserve existing Lambert-plus-SSAO behavior for atom/bond instances and field
isolation. A plain smoothed tube does not satisfy cartoon acceptance.

## Ordered remainder of the catalog

Ranks 1–4 above are the recommended starting batch. The following order is the
subsequent product queue, subject to new user needs and evidence. Distinct data
requirements remain explicit even where related options share a row.

| Rank | Options | Why here / required information | Effort |
| --- | --- | --- | --- |
| 5 | Molecular-shape surfaces: Gaussian envelope, then SAS and SES; solid/mesh/dots, transparency and clipping as associated styles | Broad value for shape and interfaces. Gaussian shape can reuse mesh/rendering experience, but is not quantum or measured density. SAS/SES need separately qualified algorithms and correct accessibility/probe-radius semantics; no algorithm/library is selected here. | L; stage separately |
| 6 | Atom/residue/chain labels and distance, angle, dihedral measurements | Common inspection tasks once stable selection exists. Label density and useful defaults need UI attention. | M |
| 7 | Sequence rainbow, residue identity, biochemical-class/hydrophobicity colors and manual domain/region highlighting | Useful inexpensive information once residue mapping exists. Name the scale/classification and provide legends. Imported biological annotations are rank 21. | M |
| 8 | Ligand neighborhoods and typed interaction overlays: hydrogen bonds, salt bridges, aromatic contacts, disulfides and metal coordination | Strong binding-site value after selection. Current display rods already retain some deposited disulfide/metal connections; dedicated styling and complete chemical interaction analysis are additional work. Requires declared chemical/geometric rules, not bond-distance inference alone. | L |
| 9 | Occupancy, B-factor and explicitly identified confidence coloring | Useful model interpretation with retained values. Distinguish experimental B-factor/disorder from prediction confidence such as pLDDT. Missing values remain missing. | M |
| 10 | DNA/RNA backbone, simplified bases, plates/blocks and base-pair ladders | Expands biological coverage. Requires nucleotide identities, appropriate backbone/base coordinates and validated pairing where rungs are drawn. | L |
| 11 | Biological assemblies; crystal unit cells, packing and symmetry mates | Essential for some entries but increases instances and metadata scope substantially. Biological assembly and crystal expansion are separate capabilities. Reuse existing issue #20 for crystal symmetry when selected. | L; research |
| 12 | Solvent-exposure/burial coloring and molecular interface patches | Adds meaning to rank 5 surfaces and selected interacting components. Requires calculated accessibility/contact definitions. | M/L |
| 13 | Residue beads and chain/domain overview ellipsoids | Useful scale-dependent views of exceptionally large assemblies; less fold detail than cartoons. Requires reliable grouping. These overview ellipsoids are distinct from rank 25 displacement ellipsoids. | M |
| 14 | Linked sequence tracks; residue contact/distance matrices; interaction networks and 2D ligand diagrams | Useful complementary views after selection and interaction semantics exist. Coordinate-derived matrices and chemically interpreted ligand diagrams are separate increments. | M/L |
| 15 | Structural superposition/deviation colors, deposited-model/NMR ensemble overlays and alternate-conformer inspection | Valuable comparison work, with a larger model/alignment scope. Multiple deposited models are not automatically a chronological trajectory. | L |
| 16 | Glycan 3D-SNFG symbols with atomic context | Important for glycoproteins; requires recognized sugar types and glycosidic connectivity. More specialized than protein/nucleic depictions. | L |
| 17 | Putty / property-scaled backbone widths | Builds on tubes/cartoon data. Identify the mapped scalar and its scale; RMSF requires an ensemble/trajectory, not a single B-factor column. | M |
| 18 | Experimental X-ray/cryo-EM map overlays, slices and map isosurfaces | Important structural context, but requires additional maps/coefficients, coordinate alignment and supported map formats. Existing cube/QC field rendering is a foothold, not complete experimental-map support. | L |
| 19 | Pocket, cavity, tunnel and pore detection/depiction | Specialized geometric analysis beyond showing the molecular surface. Qualify detection and parameter meanings separately from rendering. | L; research |
| 20 | Electrostatic surface coloring and potential displays | Relevant to chemistry, but coordinates alone do not supply a defensible potential. Requires explicit charges/radii, protonation assumptions and a calculation or imported potential. | L; research |
| 21 | Conservation, functional/domain and mutation/variant annotations | Useful with mapped external biological data. Conservation requires sequence analysis; manual range colors already appear at rank 7. | L |
| 22 | Validation colors/overlays: clashes, geometry/torsion outliers and model-data agreement | Valuable analysis after chemical/experimental data handling. Requires qualified calculations or imported validation reports, not visual judgments about crowded atoms. | L |
| 23 | Atomic wireframe/lines, points and dotted atom views | Relatively low cost, but less additional explanatory value for this workload than traces/cartoons; may move up for a concrete wireframe/point-cloud use case. | S/M |
| 24 | Schematic/rocket helices and rope abstractions | Variants after accurate backbone/cartoon work. Helpful for selected presentation tasks; not a substitute for the baseline fold depiction. | M |
| 25 | Atomic anisotropic displacement ellipsoids | Requires optional ANISOU/U tensors. One isotropic B-factor cannot provide ellipsoid orientation/shape. Specialized crystallography demand. | M/L |
| 26 | Hyperball atomic style | A visual alternative with little new structural information over current atomic modes. | M |
| 27 | Glycan PaperChain and Twister styles | Specialized ring-pucker and glycosidic-orientation views; follow basic glycan identity/connectivity and SNFG. | M/L |
| 28 | Time-dependent trajectories and motion/ensemble statistics | A larger data-management and analysis feature needing coordinate frames, correspondence, topology/time as appropriate. Separate from simple deposited-model browsing at rank 15. | L |

## Implementation sequencing and verification boundaries

Suggested dependency sequence:

```text
Metadata/profile design and independent import/roundtrip fixtures
  -> chain/entity coloring
  -> basic component selection, visibility and mixed atomic views
  -> backbone trace -> smooth tube
  -> secondary annotation/assignment qualification -> ribbon/cartoon
  -> extend mixed views with cartoon + ligand/ion detail
  -> molecular-shape surface work
```

The individual issue/PR plans must set concrete allocation, lifecycle and visual
acceptance gates. Use existing instancing, owned worker clients, immutable
registered inputs and shared current-frame PNG rendering. Derived depiction
geometry is separate from molecular coordinates, perceived bonds and saved
scientific field meshes. Keep quantum data, f64 precision, field hashes and
source-independent saved surfaces intact. Do not enable the experimental indexed
mesh work from [Plan 003](003-indexed-mesh-qualification.md) as an implicit part
of molecular surfaces.

Reuse tracked [1AON](../fixtures/cif/1AON.cif) as the primary large visual case,
[4PJ1](../fixtures/large-structure/README.md) for an independent large PDB case,
and the [BinaryCIF corpus](../fixtures/bcif/README.md) for transport/semantic
parity. Add independent small biological edge-case fixtures without changing
the existing frozen files or generating expected topology from the algorithm
under test. Preserve the authentic [native compatibility corpus](../fixtures/native/README.md).

Future runtime work should follow the existing [development verification](../docs/development.md#verification-commands):

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
unset RUSTUP_TOOLCHAIN
cargo fmt --manifest-path Cargo.toml --all --check
npm --prefix app test
cargo clippy --manifest-path Cargo.toml --locked --workspace --all-targets -- -D warnings
npm --prefix app run build
npm --prefix app run test:e2e
npm --prefix app run test:packaging
```

Add the explicit desktop tests if native behavior changes, and fresh package
verification when a distribution is requested. Browser dependencies must already
be installed; inspect port ownership and do not stop the user's preview server.
New functionality needs real import, save/reopen, worker, picking and visual
tests, with negative controls appropriate to each feature. Keep the existing
per-test and hosted-suite deadlines; the current 233-case-per-engine baseline
will grow, not be replaced by a smaller feature-only suite.

Planning verification in this pass is limited to source/doc inspection,
read-only issue review, catalog coverage and Markdown links. No application
tests, builds or performance measurements were rerun for this document. Effort,
algorithm suitability and future geometry/memory costs remain estimates. This
is not a general code/security audit, dependency selection or an implementation
contract for all 28 ranks at once.

## Sources and interpretation

The sources establish what the visualizations mean and which input data they
need. The priority ordering is EigenVista-specific judgment, not a ranking
claimed by those projects.

- [RCSB protein hierarchy and cartoon illustrations](https://pdb101.rcsb.org/learn/guide-to-understanding-pdb-data/protein-hierarchical-structure).
- [Mol* chain, sequence, secondary and hydrophobic coloring](https://molstar.org/viewer-docs/faqs-scenarios/).
- [Mol* component representations, assemblies and map views](https://molstar.org/viewer-docs/managing-the-display/).
- [NGL molecular representation catalog](https://nglviewer.org/ngl/api/manual/usage/molecular-representations.html).
- [VMD Gaussian molecular envelopes](https://www.ks.uiuc.edu/Research/vmd/vmd-new/ug/node73.html).
- [wwPDB chain, entity and residue identifiers](https://mmcif.wwpdb.org/docs/user-guide/resources/coordinate_section.html).
- [wwPDB anisotropic displacement tensors](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Categories/atom_site_anisotrop.html).
- [ConSurf conservation data and structure mapping](https://consurf.tau.ac.il/quick_help/).
- [PDB2PQR electrostatics prerequisites](https://pdb2pqr.readthedocs.io/en/latest/using/examples.html).
- [MOLE cavity/channel computation and views](https://old.mole.upol.cz/tour/).

Existing related issues: [#20 crystal symmetry](https://github.com/uvar-apps/eigenvista/issues/20)
is the applicable future work item; [#22 mmCIF export](https://github.com/uvar-apps/eigenvista/issues/22)
may benefit from retained metadata but is not implemented by this roadmap.
[#61 crates.io publication](https://github.com/uvar-apps/eigenvista/issues/61)
remains a separate low-priority distribution task. No visualization issues were
created or existing priorities edited during this documentation pass.
