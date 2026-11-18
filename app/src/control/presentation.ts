import { ControlError } from "../control";
import {
  defaultStructureDisplay,
  isAtomVisible,
  selectResidueRange,
  type ColorMode,
  type MolecularRepresentation,
  type StructureDisplayState,
} from "../molecularDisplay";
import type { ComponentKind, EigenVistaDocument } from "../types";

type Style = MolecularRepresentation | null;
/** Shape validation belongs to the controller; source identity validation lives here. */
export interface StructurePatch {
  reset?: boolean;
  showAll?: boolean;
  clearStyles?: boolean;
  colorMode?: ColorMode;
  hiddenChains?: number[];
  hiddenKinds?: ComponentKind[];
  isolatedChain?: number | null;
  residueRange?: { chainIndex: number; first: string; last: string } | null;
  chainStyles?: { chainIndex: number; representation: Style }[];
  componentStyles?: Partial<Record<ComponentKind, Style>>;
}

const structureOf = (document: EigenVistaDocument) => {
  if (!document.structure)
    throw new ControlError(
      "unavailable",
      "This document has no biological chain/residue metadata",
    );
  return document.structure;
};
const checkChain = (document: EigenVistaDocument, index: number) => {
  if (index >= structureOf(document).chains.length)
    throw new ControlError("not_found", "Unknown chain index");
};
const checkProteinStyle = (style: Style, protein: boolean) => {
  if (
    style &&
    ["trace", "tube", "ribbon", "cartoon"].includes(style) &&
    !protein
  )
    throw new ControlError(
      "invalid_arguments",
      "Protein representations require protein residues",
    );
};

/** Validate the entire patch before returning a new session state; never touch source arrays. */
export const patchStructureDisplay = (
  document: EigenVistaDocument,
  current: StructureDisplayState,
  patch: StructurePatch,
): StructureDisplayState => {
  const structure = structureOf(document);
  const next = { ...(patch.reset ? defaultStructureDisplay() : current) };
  if (patch.showAll)
    Object.assign(next, {
      hiddenChains: [],
      hiddenKinds: [],
      isolatedChain: null,
      residueSelection: null,
    });
  if (patch.clearStyles)
    Object.assign(next, { chainStyles: {}, kindStyles: {} });
  if (patch.colorMode !== undefined) next.colorMode = patch.colorMode;
  if (patch.hiddenChains !== undefined) {
    for (const index of patch.hiddenChains) checkChain(document, index);
    if (new Set(patch.hiddenChains).size !== patch.hiddenChains.length)
      throw new ControlError(
        "invalid_arguments",
        "Hidden chains must be distinct",
      );
    next.hiddenChains = [...patch.hiddenChains];
  }
  if (patch.hiddenKinds !== undefined) {
    if (new Set(patch.hiddenKinds).size !== patch.hiddenKinds.length)
      throw new ControlError(
        "invalid_arguments",
        "Hidden component kinds must be distinct",
      );
    next.hiddenKinds = [...patch.hiddenKinds];
  }
  if (patch.isolatedChain !== undefined) {
    if (patch.isolatedChain !== null) checkChain(document, patch.isolatedChain);
    next.isolatedChain = patch.isolatedChain;
    if (patch.isolatedChain !== null) {
      const kinds = new Set(
        structure.residues
          .filter((residue) => residue.chain === patch.isolatedChain)
          .map((residue) => residue.kind),
      );
      next.hiddenChains = next.hiddenChains.filter(
        (index) => index !== patch.isolatedChain,
      );
      next.hiddenKinds = next.hiddenKinds.filter((kind) => !kinds.has(kind));
      next.residueSelection = null;
    }
  }
  if (patch.residueRange !== undefined) {
    if (patch.residueRange === null) next.residueSelection = null;
    else {
      checkChain(document, patch.residueRange.chainIndex);
      try {
        next.residueSelection = selectResidueRange(
          structure,
          patch.residueRange.chainIndex,
          patch.residueRange.first,
          patch.residueRange.last,
        );
      } catch (error) {
        throw new ControlError(
          "invalid_arguments",
          error instanceof Error ? error.message : String(error),
        );
      }
      const kinds = new Set(
        next.residueSelection.map((index) => structure.residues[index].kind),
      );
      next.isolatedChain = null;
      next.hiddenChains = next.hiddenChains.filter(
        (index) => index !== patch.residueRange!.chainIndex,
      );
      next.hiddenKinds = next.hiddenKinds.filter((kind) => !kinds.has(kind));
    }
  }
  if (patch.chainStyles !== undefined) {
    if (
      new Set(patch.chainStyles.map((item) => item.chainIndex)).size !==
      patch.chainStyles.length
    )
      throw new ControlError(
        "invalid_arguments",
        "Chain style selectors must be distinct",
      );
    next.chainStyles = { ...next.chainStyles };
    for (const { chainIndex, representation } of patch.chainStyles) {
      checkChain(document, chainIndex);
      checkProteinStyle(
        representation,
        structure.residues.some(
          (residue) =>
            residue.chain === chainIndex && residue.kind === "protein",
        ),
      );
      if (representation === null) delete next.chainStyles[String(chainIndex)];
      else next.chainStyles[String(chainIndex)] = representation;
    }
  }
  if (patch.componentStyles !== undefined) {
    next.kindStyles = { ...next.kindStyles };
    for (const [kind, style] of Object.entries(patch.componentStyles) as [
      ComponentKind,
      Style,
    ][]) {
      checkProteinStyle(style, kind === "protein");
      if (style === null) delete next.kindStyles[kind];
      else next.kindStyles[kind] = style;
    }
  }
  return next;
};

/** Use the same visibility predicate as the GUI; focusing cannot reveal hidden data. */
export const visibleStructureAtoms = (
  document: EigenVistaDocument,
  display: StructureDisplayState,
  chainIndex?: number,
): number[] => {
  const structure = structureOf(document);
  if (chainIndex !== undefined) checkChain(document, chainIndex);
  const atoms: number[] = [];
  for (let atom = 0; atom < structure.atom_residues.length; atom++) {
    const residue = structure.residues[structure.atom_residues[atom]];
    if (
      (chainIndex === undefined || residue.chain === chainIndex) &&
      isAtomVisible(document, display, atom)
    )
      atoms.push(atom);
  }
  return atoms;
};

/** Expose bounded selectors/counts, never per-atom or residue index arrays. */
export const structureDisplaySummary = (
  document: EigenVistaDocument | null,
  display: StructureDisplayState,
) => ({
  colorMode: display.colorMode,
  hiddenChains: [...display.hiddenChains],
  hiddenChainCount: display.hiddenChains.length,
  hiddenKinds: display.hiddenKinds,
  isolatedChain: display.isolatedChain,
  selectedResidueCount: display.residueSelection?.length ?? null,
  chainStyles: { ...display.chainStyles },
  chainStyleCount: Object.keys(display.chainStyles).length,
  componentStyles: display.kindStyles,
  visibleAtomCount: document?.structure
    ? document.structure.atom_residues.reduce(
        (count, _, atom) =>
          count + (isAtomVisible(document, display, atom) ? 1 : 0),
        0,
      )
    : (document?.atoms.positions.length ?? 0),
});
