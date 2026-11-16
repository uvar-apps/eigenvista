# Plan 008: scientific workflow priorities after EigenVista 0.8.0

**Date:** 16 November 2026, Australia/Perth.\
**Reviewed source:** `6a728d918cfdf4291a6a04ae9327d668fd449283`, EigenVista 0.8.0.\
**Status:** proposed product roadmap; no implementation authorized by this document.\
**Scope:** practical feature value for chemists, biologists, quantum chemists and physicists. This is a focused source/documentation review and primary-source research, not a new numerical qualification, security audit or user study.

## Recommendation

Implementation update, 16 November 2026: priorities 1–3 are implemented and
locally qualified on `codex/scientific-inspection` under
[Plan 009](009-scientific-inspection-implementation.md). The user will test before
any PR/merge. Their source version is now **0.9.0 (unreleased)**; these additions
are not in the published 0.8.0 downloads. The
ranking/research below remains the planning record; subsequent priorities are
not implicitly authorized. Current evidence is in the [handoff](../docs/handoff.md).

Prioritize workflows that turn an attractive rendering into a useful scientific inspection:

1. **Select, measure and annotate:** geometry measurements, stable atom/residue selections and ligand neighborhoods.
2. **Show molecular shape:** qualify the existing Rust **Sesmesh** library for solvent-accessible and solvent-excluded surfaces.
3. **Inspect fields quantitatively:** explicit quantity/units, numerical probes, color keys, slices and line profiles.
4. **Keep the scientific view:** save named presentation states and reproducible figure settings.

These are four feature families, not four small implementation tickets. Deliver the bounded first slices described below. A **linked orbital-energy diagram** is a useful smaller QC addition that can proceed independently of the larger surface/comparison work.

The strongest subsequent additions are **supplied-property surface coloring**, especially electrostatic potential (ESP), and **explicit structural comparison/superposition**. Both benefit from the foundations above.

EigenVista already has substantial rendering variety. Additional decorative atomic styles have less practical value now than measurement, interpretation, comparison and reproducibility.

## What is already implemented

The recommendations start from the 0.8.0 implementation, not the historical rewrite proposal:

- Molden orbital/basis import; Gaussian cube scalar grids; PDB, mmCIF, BinaryCIF and XYZ structures; native `.eigenvista` storage.
- Automatic display bonds; orbital tables with spin, occupation and energy; multi-orbital selection; generated signed meshes, ray-cast previews and volume rendering.
- Where complete supplied alpha/beta occupations permit it, Molden import already constructs total, alpha, beta and spin densities. The native model can represent additional density kinds. **Displaying a supplied spin/difference field is not a new feature proposal.**
- Atomic representations, protein traces/tubes/ribbons/cartoons, chain/entity/deposited-secondary colors, chain/component filters, residue-range selection and mixed representations.
- Molecular Lambert + SSAO, custom atom palettes/backgrounds, X-ray/clipping surface shaders, opaque/transparent PNG export, progress and cancellation.
- Cached scientific meshes saved with their source information, and a packaged external-agent connector. **An embedded chat console or another automation API is not needed to enable the features in this roadmap.**

The retained [Plan 007](007-molecular-visualization-roadmap.md) is the larger biological depiction catalog. Its metadata prerequisite and first four additions shipped before this review. This document supplies a new cross-disciplinary order; it does not erase that catalog or turn its proposed features into implemented ones.

## How the priorities were chosen

The order balances the frequency/value of the scientific task, reach across the four disciplines, availability of suitable input data, leverage from the existing implementation, and the cost of making the result scientifically trustworthy. This is editorial judgment, not measured market demand or a benchmark-derived score.

**H / M / L** below mean high, medium and limited value within the relevant scientific workflows. They are not claims that every member of a discipline needs the feature. Physics here means molecular/real-space electronic-structure physics and a possible materials/crystallography expansion, not a general replacement for every physics visualization package.

**Effort:** M = bounded multi-module work; L = a larger data/science/persistence capability; M→L = a useful first increment with a substantially larger complete workflow. These are relative estimates, not delivery dates. Integration experiments may change them.

Confidence is high in the directly inspected model/UI gaps. Confidence in the
benefit ordering is provisional because no scientist interviews or task-timing
study were conducted. Sesmesh integration suitability remains unqualified;
its existence reduces the need to invent an algorithm, not the need to validate
its behavior inside EigenVista.

| Rank | Feature family | Chemist | Biologist | Quantum chemist | Physicist | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Selections, measurements, labels and ligand neighborhoods | H | H | H | H | M→L |
| 2 | Molecular-shape surfaces: qualified SAS/SES integration | H | H | M | M | L; qualify first |
| 3 | Quantitative field inspection, units, keys, slices and profiles | H | M | H | H | M→L |
| 4 | Named scene states and reproducible figures | H | H | H | H | M→L |
| 5 | Supplied-property surface coloring, starting with ESP | H | M | H | H | L |
| 6 | Structural superposition and synchronized comparisons | H | H | H | H | L |
| 7 | Linked orbital-energy diagram and frontier summary | M | L | H | M | M |
| 8 | Linked sequence navigation and explicitly sourced property tracks | M | H | L | L | M→L |
| 9 | Vibrational modes, displacement animation and supplied IR intensities | H | L | H | H | L |
| 10 | Compatible-field arithmetic and density comparisons | H | M | H | H | L |
| 11 | Explicit biological assembly selection/generation | M | H | L | M | L |
| 12 | Unit-cell display, crystal packing and periodic context | M | M | M | H | M→L; research |
| 13 | Experimental cryo-EM/X-ray map overlays | L | H | L | M | L |
| 14 | Chemical metadata, MOL/SDF input and qualified interaction overlays | H | H | M | L | L |
| 15 | Bounded model/trajectory browsing and motion analysis | H | H | M | H | L |
| 16 | Supplied excited-state spectra and NTO-pair workspace | M | L | H | H | L; research |

The high-impact but expensive comparison feature ranks below several smaller foundations because a trustworthy comparison needs correspondence, transforms and independent view state. Its absolute scientific value remains high.

## The four scientific perspectives

### Chemist

The immediate question is usually about a structure: a coordination distance, torsion, local environment, conformer difference or chemical surface. Start with **1**, **4** and **6**. Add **2** and **5** for shape/polarity interpretation; **9** is particularly useful for spectroscopy and computational-chemistry users.

For medicinal/small-molecule chemistry, move **14** upward: preserving supplied bond orders, charges and stereochemical information in common ligand files is more valuable than another coordinate-only import format. Geometry inspection should arrive before a full molecular editor, force field or docking engine.

Example outcome: “Compare these two conformers, report the selected torsions, show their ESP on the same color scale, and save the annotated figures and settings.”

### Biologist

The highest-value next workflow is **binding-site inspection**, combining **1** with existing cartoons/mixed representations. **2** makes interfaces and shape understandable; **8** makes large structures easier to navigate. **6** supports apo/holo, mutant/reference and predicted/experimental comparisons.

For experimental structural biologists, **13** should move above much of the general backlog. For entries where deposited coordinates do not represent the functional oligomer, **11** is essential. If RNA/DNA or glycobiology becomes a primary audience, promote the dedicated nucleic-acid/glycan proposals retained in Plan 007 instead of assuming protein cartoons cover them.

Example outcome: “Select this particular ligand, show complete neighboring residues, label and measure the local geometry, and check the region against the supplied experimental map.”

### Quantum chemist

The largest interpretive gains come from **3**, **5** and **10**: inspect values and nodes, map a separately calculated potential onto density, and compare compatible calculations. **7** is a good earlier delivery because the source orbital metadata already exists. **9** exploits data sections present in the user's existing Molden test file but deliberately omitted by the current importer.

Do not spend an early increment rebuilding the orbital list or adding generic “spin-density rendering”; these already exist. Excited-state/natural transition orbital (NTO) analysis (**16**) is valuable, but requires state/pair/weight metadata rather than guesses from ordinary occupied/virtual MOs.

Example outcome: “Show the HOMO/LUMO ordering, inspect a nodal plane, compare two densities, and export an ESP-mapped density surface with its units and fixed color key.”

### Physicist

For molecular and real-space electronic-structure work, start with **3**, **6**, **10** and, where applicable, **9**. Quantitative planes/profiles, common coordinates, explicit normalization and reproducible scales matter more than additional shading styles.

For solid-state/materials work, move **12** into the first group. A field without its cell, orientation and boundary convention is insufficient for many physical interpretations. This audience also needs careful distinctions between all-electron and pseudodensity, potential energy and electric potential, and periodic versus isolated-system comparisons. Quantum ESPRESSO's own post-processing documentation illustrates why a generic cube filename cannot establish these meanings ([pp.x](https://www.quantum-espresso.org/Doc/INPUT_PP.html)).

Vector/magnetic fields, complex Bloch orbitals and reciprocal-space/band tools are possible later directions. The current real-coefficient molecular-orbital model is not a basis for claiming those capabilities today.

## Feature assessments

### 1. Select, measure and annotate molecular geometry

**Value:** read distances, angles and signed torsions; identify one ligand copy; inspect its surrounding residues; retain sparse labels in an exported figure.

**Current gap:** atom picking currently returns inspection text, rather than a stable multi-atom selection/measurement model. The [user guide](../docs/user-guide.md) explicitly states there is no measurement tool and that existing PNG export omits text overlays. [Viewport.tsx](../app/src/Viewport.tsx), around lines 451–472, handles the picked label. Existing chain/component/range controls in [molecularDisplay.ts](../app/src/molecularDisplay.ts) should be reused.

**First slice:** 1A adds stable atom selections, distance/angle/torsion monitors and a results table. 1B adds named atom/residue sets, individual ligand selection and “within N Å,” optionally expanded to complete residues. Export readable labels/monitors and tabular values.

**Success boundary:** calculate from authoritative f64 coordinates, with declared units and torsion convention; handle coincident/collinear inputs explicitly. Selection must distinguish insertion codes, repeated residue numbers and ligand copies. Camera changes must not change a measurement. A proximity overlay is not a chemically assigned hydrogen bond or a binding-affinity result.

**Risk:** medium interaction/persistence scope; higher scientific scope if chemically typed contacts are included. Defer those to 14. This advances Plan 007 ranks 6 and the geometric portion of 8.

Primary workflow reference: [Mol* measurements](https://molstar.org/viewer-docs/tips/measurements/).

### 2. Add real molecular-shape surfaces through a qualified Sesmesh integration

**Value:** inspect protein/ligand shape, openings and interfaces using an explicitly defined solvent-accessible surface (SAS), solvent-excluded surface (SES), or van der Waals boundary.

**Current gap:** the seven current atomic/protein representations do not generate these surfaces. Existing quantum-field meshes are a different scientific object.

**New opportunity:** the author's [Sesmesh project](https://github.com/uvar-apps/sesmesh) now documents a Rust library accepting spheres and surface parameters, alongside SAS/SES/vdW functionality and MIT/Apache-2.0 licensing. Its reviewed source was `1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8`. This makes a bounded integration/qualification experiment more compelling than immediately writing another surface algorithm.

**First slice:** assess shared native/WASM-worker compatibility, threading/SIMD assumptions, cancellation and memory behavior. Feed EigenVista's selected authoritative atoms, explicit radii and original identities into the library; do not re-import the same file with different alternate/model-selection rules. Qualify one bounded SES workflow, then SAS and selected-region surfaces.

**Success boundary:** convert bohr/Å explicitly; record radii, probe radius, spacing, algorithm/version, selected atoms and cavity policy. Test isolated/two-sphere cases and independent molecular references under matching definitions, then a representative 1AON selection. Preserve normals, cached meshes, PNGs and custom shaders. Any quality reduction must be visible. Existing atom/bond SSAO does not automatically qualify AO on a new surface class.

**Risk:** high integration/resource uncertainty until the experiment passes. Upstream claims are not EigenVista performance or accuracy measurements; licensing/packaging review is still needed. A cavity is not automatically a functional pocket, and molecular-shape surfaces are not quantum electron density.

**Change from Plan 007:** re-evaluate its Gaussian-first order. A Gaussian envelope remains an optional illustrative fallback, clearly labeled; it should not be presented as a validated SES substitute.

### 3. Add quantitative scalar-field inspection

**Value:** read a field at a point, inspect a true sampled plane, plot a line through a bond or feature, and export values with an interpretable scale.

**Current foothold:** [compute.rs](../crates/eigenvista-core/src/compute.rs), line 56, already evaluates analytic orbital/density values and gradients. [Grid](../crates/eigenvista-core/src/model.rs) stores affine geometry and f64 samples. The current public render modes are mesh/raycast/volume, not numerical slice/profile workflows. Cube import already has a peak-based initial isovalue heuristic; this is not a proposal to add that existing behavior again.

**First slice:** 3A introduces structured quantity/unit/provenance labels, numerical point probes and exportable numeric color keys. 3B adds a coordinate-plane or three-atom-defined slice, contours and a line-profile CSV. A histogram/range display can make isovalue choice more understandable without pretending that a heuristic is a scientific threshold.

**Success boundary:** separate coordinate units from scalar-value units. Unknown cube meanings remain unknown until explicitly supplied and recorded. Identify analytic evaluation versus grid interpolation; handle skewed/reflected axes and out-of-domain points. Use independent field-value oracles, rather than reading rounded GPU colors. A clipping shader is not a quantitative slice, and upsampling is not new source information.

**Risk:** medium numerical/display risk, with larger scope for full persistence. This also enables 5, 10 and later experimental-map work.

Primary examples: [VESTA lattice-plane sections](https://jp-minerals.org/vesta/en/doc/VESTAch9.html), [VESTA 2D data and line profiles](https://jp-minerals.org/vesta/en/doc/VESTAch14.html).

### 4. Save named scene states and reproducible figure settings

**Value:** reopen “HOMO X-ray,” “active site” or “comparison view” with its intended camera, selections, palette, shader parameters, field scales and appearance.

**Current gap:** the [saved View](../app/src/types.ts) contains only a subset of display settings. The [user guide](../docs/user-guide.md), around lines 734–737, explicitly excludes camera, active mode and transient sample cache; biological display and shader choices also have session-only state. Saved scientific meshes already persist and should keep working independently.

**First slice:** a versioned scene preset referencing existing scientific objects, plus a figure sidecar describing inputs/hashes, fields, isovalues, units, sampling, camera and appearance. Add multiple named presets after one complete state restores reliably. Reuse the native container or a defined sidecar; do not redesign the existing asset format wholesale.

**Success boundary:** preserve source science separately from presentation. Reopening a cached mesh should not require regeneration. Restoring a sampled mode may schedule cancellable resampling. Resolve missing/stale references explicitly; package required shader/palette assets under an agreed policy. Reproduce scientific settings without promising identical pixels across GPUs.

**Risk:** medium/high compatibility and lifecycle scope. This is particularly valuable for the existing external-agent workflow, which can already prepare complex views.

Primary precedent: [ChimeraX save/session documentation](https://www.rbvi.ucsf.edu/chimerax/docs/user/commands/save.html).

### 5. Map a supplied property onto a surface, starting with ESP

**Value:** color a density isosurface or molecular-shape surface by an independently calculated electrostatic potential, with units, a fixed range and visible color key.

**Current gap:** [Surface](../crates/eigenvista-core/src/model.rs), lines 62–78, stores a uniform color. [Viewport.tsx](../app/src/Viewport.tsx), around line 714, builds its geometry/material; there is no supplied-field-to-surface association. Custom shaders do not by themselves provide a validated mapping/data workflow.

**First slice:** associate two explicitly compatible fields: geometry from one, property values from the other. Start with supplied density/ESP cubes; this does not require SAS/SES or a new electrostatics solver. ORCA's official [ESP example](https://www.faccts.de/docs/orca/6.1/tutorials/prop/esp.html) uses separate density and potential cube files, illustrating a practical producer workflow without a direct ORCA reader.

**Success boundary:** establish shared coordinates, coverage, quantity, units and potential convention. Mark missing map coverage; do not silently use zero. Preserve both source identities and the chosen range in saved/exported results. Orbital sign colors are not charge, and density is not an electrostatic potential. Protein electrostatics based on assigned charges requires documented preparation assumptions; APBS describes a separate [preparation/calculation/visualization workflow](https://apbs.readthedocs.io/en/latest/using/index.html).

**Risk:** medium/high scientific association and persistence risk. Refines Plan 007 rank 20 into an import-first capability.

### 6. Compare structures and fields in independent, synchronized views

**Value:** compare conformers, apo/holo structures, mutants, calculated/reference geometries or two fields with explicit correspondence and common visual scales.

**Current gap:** [App.tsx](../app/src/App.tsx), line 88, owns one active document. Displaying several saved surfaces together already works, but is not an independent multi-document comparison workspace.

**First slice:** two views, explicit reference/mobile roles, known atom correspondence, proper rigid alignment, fitted root-mean-square deviation (RMSD) and synchronized cameras. Sequence-assisted protein correspondence and per-residue deviation coloring follow separately.

**Success boundary:** report matched/unmatched atoms, fit subset, method and exclusions. Do not equate row numbers across unrelated inputs or permit a reflection to hide stereochemical differences. Display transforms must move atoms, meshes and grids together while preserving original coordinates and quantum basis relationships. A single RMSD is not a universal similarity score.

**Risk:** high state/transform/resource scope. New comparison does not authorize subtraction; 10 supplies that scientific contract.

Primary references: [ChimeraX alignment](https://www.rbvi.ucsf.edu/chimerax/docs/user/commands/align.html), [RCSB sequence-to-3D comparison](https://www.rcsb.org/docs/grouping-structures/explore-sequence-alignments-in-3d).

### 7. Add a linked orbital-energy diagram

**Value:** see occupied/virtual levels and spin channels, select levels in the diagram and render the corresponding existing orbitals.

**Current foothold:** [OrbitalBrowser.tsx](../app/src/OrbitalBrowser.tsx), lines 124–209, already displays optional spin/occupation/energy values with stable orbital IDs. The new value is the diagram and interpretation, not another list.

**First slice:** linked table/diagram selection, alpha/beta lanes where applicable, explicit missing-energy handling and an orbital-energy-gap summary in hartree/eV. Retain source numbering when sorting visually.

**Success boundary:** define frontier labels for fractional/open-shell occupations and partial exports; never invent missing virtual levels. A Kohn–Sham orbital-energy difference is not generally an optical excitation or fundamental gap. Independently test unit conversion and degeneracies.

**Risk:** relatively bounded UI work with important interpretation rules. Source quantities are defined in the [Molden specification](https://www.theochem.ru.nl/molden/molden_format.html); excited-state results are separate data.

### 8. Link sequence navigation to explicitly sourced biological properties

Start with an **observed-residue strip** using existing [structure identities](../crates/eigenvista-core/src/structure.rs), linked bidirectionally to 3D selection. A complete deposited sequence, missing-coordinate positions, occupancy/B factors and prediction-confidence tracks need additional retained metadata and format qualification; they are not all present in today's model.

Preserve author/label numbering, insertion codes, modified residues and missing values. B factors, occupancy and pLDDT are different properties; a 0–100 value range does not identify confidence. Name the property, source and scale. This extends Plan 007 ranks 7, 9 and 14. See [Mol* sequence navigation](https://molstar.org/viewer-docs/navigating-by-sequence/) and [EMBL-EBI confidence interpretation](https://www.ebi.ac.uk/training/online/courses/alphafold/inputs-and-outputs/evaluating-alphafolds-predicted-structures-using-confidence-scores/plddt-understanding-local-confidence/).

### 9. Import and animate supplied vibrations

Add a separately qualified Molden vibration profile, a frequency list, displacement animation/arrows and optional supplied infrared (IR) intensities. The [current importer policy](../docs/molden-import.md), around lines 240–250, explicitly omits these sections from the existing real `molden.input` fixture. The [original format](https://www.theochem.ru.nl/molden/molden_format.html) defines a vibration profile independently of orbital data.

Validate atom/mode correspondence, coordinate/displacement units, imaginary frequencies and missing intensities. Animation speed/amplitude are illustrative; an imaginary mode alone does not establish a transition state. Do not deform static orbitals/density along moving nuclei as though a new electronic calculation had been performed. Restore source coordinates after playback. Broad Gaussian/ORCA log support is not required to deliver this first increment.

### 10. Create controlled, compatible field differences

Support an explicit operation such as density A minus density B, initially on matching grids with declared comparable quantities and units. The current [document model](../crates/eigenvista-core/src/model.rs) stores field arrays but no derived-operation provenance. Existing spin-density construction in [molden.rs](../crates/eigenvista-import/src/molden.rs), around lines 785–799, is already implemented.

Record operands, physical frame and operation; qualify resampling only as a later stage. Check A−A=0, independent analytic differences and converged-domain integrals where appropriate. Reject silent zero-padding and mismatched all-electron/pseudodensity conventions. Density redistribution is not automatically a quantified charge-transfer analysis; raw orbital subtraction also has phase/basis correspondence problems. Producer examples: [ORCA density plotting/algebra](https://www.faccts.de/docs/orca/6.1/manual/contents/utilitiesvisualization/plots.html), [Quantum ESPRESSO pp.x](https://www.quantum-espresso.org/Doc/INPUT_PP.html).

### 11. Choose and generate biological assemblies explicitly

Retain assembly definitions/operators and present deposited coordinates versus named biological assemblies as explicit choices. Already expanded assembly coordinate files can be opened today; the missing feature is interpreting/generating their assembly definitions in the app. The [BinaryCIF category whitelist](../crates/eigenvista-import/src/bcif/mod.rs), around lines 81–94, and current structure model do not retain those operators.

Bound instance expansion before allocation; preserve original atom identity plus instance identity for picking, selections and saved scenes. Validate against archive-provided assembly coordinates, including operator products and multiple choices. Biological assembly generation is **separate from crystal packing** in 12. See [RCSB biological assemblies](https://pdb101.rcsb.org/learn/guide-to-understanding-pdb-data/biological-assemblies).

### 12. Add unit-cell and periodic/crystallographic context

Stage this as typed lattice metadata and a cell box first, then bounded crystal mates/supercells and explicitly defined boundary-aware bonds/measurements. The [mmCIF import profile](../docs/structure-imports.md), lines 124 onward, records cell/symmetry information in provenance but does not apply it; [cif.rs](../crates/eigenvista-core/src/import/cif.rs), around line 798, makes that limitation explicit. Reuse existing [issue #20](https://github.com/uvar-apps/eigenvista/issues/20).

Qualify non-orthogonal cells, coordinate transforms, image identities, expansion budgets and periodic versus displayed-image distances. Do not infer a complete symmetry description from a name without choosing/validating a setting and operation source. This is a high-priority audience-specific branch for materials physics, not a small renderer toggle. [VESTA's real-space/cell workflows](https://www.jp-minerals.org/vesta/en/doc/VESTA.html) are a useful primary reference.

### 13. Overlay experimental maps with atomic models

Start with supplied local MRC/CCP4 volumes and an explicitly associated model, contour controls and a bounded region of interest. Current affine cube rendering is useful infrastructure, not an MRC/CCP4 reader or model–map validation system.

Qualify map axes, starts/origin, spacing, handedness, numeric modes and coordinate registration using independent map/model pairs. Large maps require new region/chunk memory decisions. Record contour normalization; an EM reconstruction is not automatically QC electron density in electrons/bohr³. Keep map-coefficient/FFT generation outside the first increment. Primary specification context: [EMDataResource map format](https://www.emdataresource.org/mapformat.html).

### 14. Preserve chemical identity and then qualify typed interactions

Introduce optional bond order/aromaticity, formal charge and other required chemical metadata; a bounded read-only 3D MOL/SDF profile is a useful concrete entry point. The current [Atom/Document model](../crates/eigenvista-core/src/model.rs), lines 12–15 and 206 onward, stores element/position and bond index pairs, not a complete chemical graph.

Then qualify donor/acceptor typing and hydrogen bonds, salt bridges or aromatic contacts using explicit supplied chemistry or validated templates/preparation rules. Do not require SDF specifically for standard biological templates, but do not classify interactions from distance alone. Preserve unknown and unsupported values. Defer editing, SMILES-to-3D generation and automatic protonation. [RDKit's chemistry documentation](https://www.rdkit.org/docs/RDKit_Book.html) is a semantic reference, **not** a recommendation to introduce its C++ runtime into EigenVista.

### 15. Browse models and trajectories with bounded data management

Begin with explicit deposited-model or optimization-step selection, then a separately defined trajectory profile with atom correspondence, topology, time and optional periodic cells. The current [PDB/mmCIF policy](../docs/structure-imports.md) intentionally selects one model; [Document](../crates/eigenvista-core/src/model.rs) contains one coordinate set.

NMR ensemble members are not automatically chronological frames. Do not infer physical time from an uncalibrated frame index, bond a wrapped molecule incorrectly, or calculate root-mean-square fluctuation (RMSF) from a single B-factor column. Frame/region caching and cancellation need explicit budgets before large MD formats are adopted. Existing XYZ/Molden geometry sequences offer a bounded first producer profile; current views can remain the first-frame fallback only when that behavior is explicit.

### 16. Associate supplied excited states, spectra and NTO pairs

Add explicit state/energy/oscillator-strength and hole/particle-pair/weight metadata around already supplied fields, followed by spectrum-linked selection. An individual NTO cube can already be rendered as a scalar field; the new feature is its scientifically correct association and interpretation.

The current [model](../crates/eigenvista-core/src/model.rs) has no excited-state/spectrum/NTO-pair structure. NTO pair weights are not ordinary MO electron occupations; canonical Molden orbitals do not supply missing excitation energies or transition densities. Start with independently generated data and frozen fixtures, preserving state numbering and method/relaxed-density semantics. See the official [ORCA UV/Vis and NTO tutorial](https://www.faccts.de/docs/orca/6.1/tutorials/spec/UVVis.html). This remains a research-led specialty feature, not the next general release requirement.

## Dependencies and a practical first delivery sequence

```text
1A Stable selections + geometric measurements + exportable labels
  -> 1B Ligand/whole-residue neighborhoods
  -> 8 Observed-sequence navigation
  -> 14 Qualified chemically typed interactions, once chemistry is available

2A Sesmesh shared-target/resource qualification
  -> 2B Bounded molecular surfaces -> selected surfaces -> interface analysis

3A Quantity/units/provenance + probes + numeric keys
  -> 3B Slices/profiles
  -> 5 Supplied ESP/property mapping
  -> 10 Compatible-field arithmetic

4A One complete reproducible scene state -> multiple named scenes
  -> 6 Independent/synchronized comparison views

7 Linked orbital-energy diagram can run independently using current metadata
```

The starting recommendation is **1A, 2A, 3A and 4A**. Follow 2A with actual surface work only if its qualification supports the shared app architecture. Failure of that experiment should not block measurements or quantitative field inspection. A QC-focused batch could pair 3A with 7 before the broader comparison work.

These are dependencies of the proposed increments, not a claim that every possible implementation must follow one architecture. Each selected family still needs its own issue, design boundary and acceptance plan before code changes.

## Existing issues and work that should stay separate

Issue states were read on 16 November 2026; this review creates or edits none.

| Existing item | Relationship to this roadmap |
| --- | --- |
| [#71: remaining Plan 007 representations](https://github.com/uvar-apps/eigenvista/issues/71) | Retain the catalog; selected biological families should reference it and get bounded implementation issues. |
| [#20: crystal symmetry](https://github.com/uvar-apps/eigenvista/issues/20) | Existing home for 12's research; biological assemblies need a distinct contract. |
| [#22: mmCIF export](https://github.com/uvar-apps/eigenvista/issues/22) | Useful interoperability follow-up, but faithful metadata/export policy precedes an emitter. It is not solved by scene saving or selection export. |
| [#35: complete Molden spin-set capacity](https://github.com/uvar-apps/eigenvista/issues/35) | Remains relevant for larger QC workloads; choose measured import/worker/save budgets before expanding capacity. |
| [#42: diffuse sampling domains](https://github.com/uvar-apps/eigenvista/issues/42) | Scientific-domain research can become important for diffuse-field analysis. Do not silently clip a field or assume a larger grid resolves domain coverage. |
| [#36](https://github.com/uvar-apps/eigenvista/issues/36), [#37](https://github.com/uvar-apps/eigenvista/issues/37), [#38](https://github.com/uvar-apps/eigenvista/issues/38), [#40](https://github.com/uvar-apps/eigenvista/issues/40) | Sampling, mesh/transport and hash work are measured capacity enablers, not new scientific capabilities. No blanket speedup or automatic compaction is justified by this review. |
| [#41: native-save contracts](https://github.com/uvar-apps/eigenvista/issues/41) | Preserve existing evidence and limitations when adding new persisted assets; no crash/power-loss guarantee follows from a normal roundtrip. |
| [#72: accessible atom palette](https://github.com/uvar-apps/eigenvista/issues/72) | Important parallel work. New legends, curves and selection markers also need readable, non-color-only distinctions. |
| [#82: in-app AI setup](https://github.com/uvar-apps/eigenvista/issues/82) | Useful access/convenience work around the existing connector, not a substitute for the scientific features above. |
| [#61: crates.io](https://github.com/uvar-apps/eigenvista/issues/61), [#77: discovery](https://github.com/uvar-apps/eigenvista/issues/77) | Distribution/reach tracks; do not confuse them with a new scientific data capability. |

Trusted Mac installation and qualified Linux distribution can have greater user reach than another renderer option. Keep that delivery work visible in parallel; the two future local Linux hosts are not current qualification evidence.

## Deliberately lower priority

- **More decorative renderers, VR/AR and photorealism:** revisit with an identified task. Existing AO, cartoons and custom shaders already provide substantial visual range.
- **Embedded AI console, autonomous chemical interpretation or a scripting language:** the external connector already handles natural-language operation. New GUI features should be exposed through that same controller, not depend on a new model client.
- **Full force-field/SCF/DFT/docking/protonation engines:** large scientific product expansions. Prefer useful inspection/import of independently calculated results first.
- **Built-in QTAIM, NCI, ELF, Bader or other advanced analyses:** importing appropriately identified result fields can be useful sooner. Computing these reliably needs separately chosen methods, derivatives/domain/topology tests and provenance; rendering an isosurface does not implement the analysis.
- **Native readers for every QC package:** select formats when they unlock chosen data, such as vibrations or excited states. Existing ORCA-to-Molden and cube producer workflows reduce the immediate need for a direct ORCA reader.
- **Nucleic-acid/glycan specialist depictions, conservation/variant annotation, pockets/tunnels, magnetic vectors and complex/reciprocal-space data:** retain as audience-driven opportunities. Plan 007 already covers much of the biological catalog; cavity geometry alone does not constitute pocket or functional analysis.

## Contracts to preserve when a feature is selected

- Keep scientific ownership in Rust and the existing shared worker/controller architecture; TypeScript owns interaction/rendering. No copied legacy implementation or unapproved C/C++ dependency is implied by a cited tool.
- Keep original coordinates, basis, field values and source hashes authoritative. New derived data and presentation transforms need explicit identities/provenance; preserve old native files and source-independent cached meshes.
- Design GUI and external-agent access together. A user should be able to request each supported scientific outcome in ordinary language; new functionality must not become a GUI-only step in an otherwise automated workflow.
- Preserve cancellable background work, transactional publication, scoped file access and separate import/working-set/mesh/archive budgets. A new successful import must not make a useful result inevitably unsavable.
- Export legends, annotations, units and settings through the same real capture path. Preserve transparency, shader behavior and AO isolation. Do not silently change topology/vertex identity or enable experimental packing as part of another feature.
- Use small independent analytic cases plus realistic files; do not derive every expected answer from the algorithm being tested. Reuse the [numerical references](../fixtures/pyscf/README.md), [1AON](../fixtures/cif/1AON.cif), [large-structure corpus](../fixtures/large-structure/README.md), [cube fixtures](../fixtures/cube/README.md) and [native compatibility corpus](../fixtures/native/README.md), preserving frozen inputs.
- Define the accepted scientific claim narrowly: a depiction, a geometric measurement, a numerical field operation and a physical interpretation are different deliverables.

## Review evidence, boundaries and next decision

Key source locations read during this review: [Rust model](../crates/eigenvista-core/src/model.rs), [analytic evaluator](../crates/eigenvista-core/src/compute.rs), [structure metadata](../crates/eigenvista-core/src/structure.rs), [TypeScript model](../app/src/types.ts), [current display state](../app/src/molecularDisplay.ts), [viewport](../app/src/Viewport.tsx), [orbital browser](../app/src/OrbitalBrowser.tsx), [main document state](../app/src/App.tsx), [Molden importer](../crates/eigenvista-import/src/molden.rs), [CIF importer](../crates/eigenvista-core/src/import/cif.rs) and [BinaryCIF category selection](../crates/eigenvista-import/src/bcif/mod.rs).

Source gaps were cross-checked against the current user/import/architecture documentation and live open issues. Primary references establish scientific meanings and existing workflow examples, not independent demand estimates or proof that an upstream library will work inside EigenVista. The Sesmesh README/API opportunity was inspected, but its code was not built, benchmarked or audited here.

No application builds/tests, numerical experiments, performance measurements or UI trials were run for this planning document. Existing release evidence remains in [status](../docs/status.md); that evidence is not new validation of any proposed capability. Only this roadmap and its index are changed; no issues, application code, dependencies, branch, version, tag, commit, push or deployment are part of this review.

Before execution, choose a first slice and create/reuse the appropriate issue. Its implementation plan must specify input semantics, format compatibility, independent fixtures and the applicable local verification from [development](../docs/development.md). The normal runtime gate includes formatting, locked Rust tests, strict workspace/all-targets Clippy, desktop tests when applicable, WASM/TypeScript/production build, both complete browser suites and relevant packaging/native/visual acceptance. All relevant checks must pass locally before a later authorized push; GitHub application CI is not the verification plan.

**Recommended decision:** choose the first bounded measurement/selection increment and a Sesmesh qualification experiment, while defining the quantity/unit and scene-state contracts that unlock the next QC/physics workflows.
