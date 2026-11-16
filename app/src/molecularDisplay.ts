import { resolveAtomColor, type AtomPalette } from "./atomColors";
import type {
  ComponentKind,
  EigenVistaDocument,
  SecondaryStructure,
  StructureChain,
  StructureMetadata,
  StructureResidue,
} from "./types";

export type MolecularRepresentation =
  | "ball-stick"
  | "liquorice"
  | "space-fill"
  | "trace"
  | "tube"
  | "ribbon"
  | "cartoon";
export type ColorMode = "element" | "chain" | "entity" | "secondary";
/** Session-only presentation; every index refers to the unchanged source data. */
export interface StructureDisplayState {
  colorMode: ColorMode;
  hiddenChains: number[];
  hiddenKinds: ComponentKind[];
  chainStyles: Record<string, MolecularRepresentation>;
  kindStyles: Partial<Record<ComponentKind, MolecularRepresentation>>;
  isolatedChain: number | null;
  residueSelection: number[] | null;
  atomSelection?: number[] | null;
  focus: { atoms: number[]; revision: number } | null;
}

export const COMPONENT_KINDS: readonly ComponentKind[] = [
  "protein",
  "nucleic",
  "ligand",
  "water",
  "ion",
  "unknown",
];
export const REPRESENTATION_OPTIONS: readonly {
  value: MolecularRepresentation;
  label: string;
}[] = [
  { value: "ball-stick", label: "Ball and stick" },
  { value: "liquorice", label: "Liquorice" },
  { value: "space-fill", label: "Van der Waals" },
  { value: "trace", label: "Backbone trace" },
  { value: "tube", label: "Smooth tube" },
  { value: "ribbon", label: "Ribbon" },
  { value: "cartoon", label: "Secondary-structure cartoon" },
];
export const UNKNOWN_STRUCTURE_COLOR = "#8a939a";
export const SECONDARY_COLORS: Readonly<Record<SecondaryStructure, string>> = {
  helix: "#d65c91",
  sheet: "#d5aa28",
  coil: "#4b9d8a",
  unknown: UNKNOWN_STRUCTURE_COLOR,
};

export const defaultStructureDisplay = (): StructureDisplayState => ({
  colorMode: "element",
  hiddenChains: [],
  hiddenKinds: [],
  chainStyles: {},
  kindStyles: {},
  isolatedChain: null,
  residueSelection: null,
  focus: null,
});

/** Hash source identity, rather than list position, so filtering cannot recolor it. */
const identityColor = (identity: string): string => {
  let hash = 2166136261;
  for (const character of identity) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0;
  }
  // Finalize the presentation hash so nearby identifiers do not cluster in hue.
  // MurmurHash3 fmix32 (public domain): github.com/aappleby/smhasher.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  const hue = (hash % 360) / 60;
  const saturation = 0.58 + ((hash >>> 9) % 13) / 100;
  const lightness = 0.43 + ((hash >>> 17) % 9) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const rgb =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return (
    "#" +
    rgb
      .map((v) =>
        Math.round((v + lightness - chroma / 2) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
};

const baseChainLabel = (chain: StructureChain, index: number): string => {
  const label = chain.label_id || chain.author_id;
  if (!label) return `Unassigned ${index + 1}`;
  return chain.label_id && chain.author_id && chain.label_id !== chain.author_id
    ? `${label} (author ${chain.author_id})`
    : label;
};
const baseChainColor = (chain: StructureChain): string =>
  chain.label_id || chain.author_id
    ? identityColor(
        chain.label_id && chain.author_id && chain.label_id !== chain.author_id
          ? JSON.stringify([chain.label_id, chain.author_id])
          : (chain.label_id || chain.author_id)!,
      )
    : UNKNOWN_STRUCTURE_COLOR;

const chainIdentity = (chain: StructureChain): string =>
  JSON.stringify([chain.label_id, chain.author_id, chain.entity_id]);
interface ChainPresentation {
  labels: string[];
  colors: string[];
  indices: Map<StructureChain, number>;
  identities: Map<string, number>;
}
const chainPresentationCache = new WeakMap<
  StructureMetadata,
  ChainPresentation
>();

/** Resolve aliases once against the complete source, independently of filters. */
function chainPresentation(structure: StructureMetadata): ChainPresentation {
  const cached = chainPresentationCache.get(structure);
  if (cached) return cached;
  const labels = structure.chains.map(baseChainLabel);
  const colors = structure.chains.map(baseChainColor);
  const indices = new Map(
    structure.chains.map((chain, index) => [chain, index]),
  );
  const keys = structure.chains.map(chainIdentity);
  const identities = new Map(keys.map((key, index) => [key, index]));
  const groups = new Map<string, number[]>();
  labels.forEach((label, index) => {
    const group = groups.get(label);
    if (group) group.push(index);
    else groups.set(label, [index]);
  });
  const pending = [...groups.values()]
    .filter((group) => group.length > 1)
    .flat();
  const qualified = new Set<number>();
  for (let cursor = 0; cursor < pending.length; cursor++) {
    const index = pending[cursor];
    if (qualified.has(index)) continue;
    qualified.add(index);
    const chain = structure.chains[index];
    const supplied = (value: string | null) =>
      value === null ? "unavailable" : JSON.stringify(value);
    labels[index] =
      `${labels[index]} [label ${supplied(chain.label_id)}; author ${supplied(chain.author_id)}; entity ${supplied(chain.entity_id)}; chain record ${index + 1}]`;
    // A source ID may literally equal another chain's qualified label. Qualify
    // that record too; each group is reached at most once, with no quadratic scan.
    for (const collision of groups.get(labels[index]) ?? [])
      if (!qualified.has(collision)) pending.push(collision);
  }
  const colored = new Set(
    [...qualified].filter(
      (index) =>
        structure.chains[index].label_id || structure.chains[index].author_id,
    ),
  );
  const usedColors = new Set(colors.filter((_, index) => !colored.has(index)));
  let fallback = 0;
  for (const index of [...colored].sort((a, b) =>
    keys[a] < keys[b] ? -1 : keys[a] > keys[b] ? 1 : 0,
  )) {
    let color = identityColor(`biological-chain:${keys[index]}`);
    // Resolve rare RGB collisions with one shared full-cycle cursor. It visits
    // each candidate once, rather than rescanning earlier colors for every chain.
    while (usedColors.has(color)) {
      fallback = (fallback + 0x9e3779) & 0xffffff;
      color = `#${fallback.toString(16).padStart(6, "0")}`;
    }
    colors[index] = color;
    usedColors.add(color);
  }
  const result = { labels, colors, indices, identities };
  chainPresentationCache.set(structure, result);
  return result;
}

function chainPresentationIndex(
  chain: StructureChain,
  presentation: ChainPresentation,
) {
  return (
    presentation.indices.get(chain) ??
    presentation.identities.get(chainIdentity(chain))
  );
}

export const chainLabel = (
  chain: StructureChain,
  index: number,
  structure?: StructureMetadata,
): string => {
  if (!structure) return baseChainLabel(chain, index);
  const presentation = chainPresentation(structure);
  const source = chainPresentationIndex(chain, presentation);
  return source === undefined
    ? baseChainLabel(chain, index)
    : presentation.labels[source];
};
export const chainColor = (
  chain: StructureChain,
  structure?: StructureMetadata,
): string => {
  if (!structure) return baseChainColor(chain);
  const presentation = chainPresentation(structure);
  const source = chainPresentationIndex(chain, presentation);
  return source === undefined
    ? baseChainColor(chain)
    : presentation.colors[source];
};

export const entityColor = (entity: string | null): string =>
  entity ? identityColor(`entity:${entity}`) : UNKNOWN_STRUCTURE_COLOR;
export const residueIdentifier = (residue: StructureResidue): string =>
  `${residue.author_seq_id ?? residue.label_seq_id ?? "?"}${residue.insertion_code ?? ""}`;
export const residueLabel = (
  structure: StructureMetadata,
  index: number,
): string => {
  const residue = structure.residues[index];
  if (!residue) return "Unknown residue";
  return `${residue.name} ${residueIdentifier(residue)} · chain ${chainLabel(structure.chains[residue.chain], residue.chain, structure)}`;
};

const visibilityCache = new WeakMap<
  StructureDisplayState,
  {
    chains: Set<number>;
    kinds: Set<ComponentKind>;
    residues: Set<number> | null;
    atoms: Set<number> | null;
  }
>();
const visibility = (state: StructureDisplayState) => {
  let result = visibilityCache.get(state);
  if (!result) {
    result = {
      chains: new Set(state.hiddenChains),
      atoms: state.atomSelection ? new Set(state.atomSelection) : null,
      kinds: new Set(state.hiddenKinds),
      residues:
        state.residueSelection === null
          ? null
          : new Set(state.residueSelection),
    };
    visibilityCache.set(state, result);
  }
  return result;
};

/** O(1) subset lookup, including large residue selections, without copying atoms. */
export const isAtomVisible = (
  doc: EigenVistaDocument,
  state: StructureDisplayState,
  atom: number,
): boolean => {
  const hidden = visibility(state);
  if (hidden.atoms !== null && !hidden.atoms.has(atom)) return false;
  const structure = doc.structure;
  if (!structure) return true;
  const index = structure.atom_residues[atom];
  const residue = structure.residues[index];
  if (!residue) return true;
  return (
    !hidden.chains.has(residue.chain) &&
    !hidden.kinds.has(residue.kind) &&
    (state.isolatedChain === null || state.isolatedChain === residue.chain) &&
    (hidden.residues === null || hidden.residues.has(index))
  );
};

export const atomRepresentation = (
  doc: EigenVistaDocument,
  state: StructureDisplayState,
  atom: number,
): MolecularRepresentation => {
  const structure = doc.structure;
  const residue = structure?.residues[structure.atom_residues[atom]];
  const selected =
    (residue &&
      (state.chainStyles[String(residue.chain)] ??
        state.kindStyles[residue.kind])) ||
    (doc.view.representation as MolecularRepresentation);
  if (
    residue?.kind === "protein" ||
    ["ball-stick", "liquorice", "space-fill"].includes(selected)
  )
    return selected;
  return ["ball-stick", "liquorice", "space-fill"].includes(
    doc.view.representation,
  )
    ? (doc.view.representation as MolecularRepresentation)
    : "ball-stick";
};

const colorCache = new WeakMap<
  StructureMetadata,
  { chains: string[]; entities: string[] }
>();
export const atomDisplayColor = (
  doc: EigenVistaDocument,
  state: StructureDisplayState,
  atom: number,
  palette?: AtomPalette,
): string => {
  const structure = doc.structure;
  const residue = structure?.residues[structure.atom_residues[atom]];
  if (!structure || !residue || state.colorMode === "element")
    return resolveAtomColor(doc.atoms.elements[atom], palette);
  if (state.colorMode === "secondary")
    return SECONDARY_COLORS[residue.secondary];
  let colors = colorCache.get(structure);
  if (!colors) {
    colors = {
      chains: chainPresentation(structure).colors,
      entities: structure.chains.map((chain) => entityColor(chain.entity_id)),
    };
    colorCache.set(structure, colors);
  }
  return (
    (state.colorMode === "entity" ? colors.entities : colors.chains)[
      residue.chain
    ] ?? UNKNOWN_STRUCTURE_COLOR
  );
};

/** Select named deposited residues; this orders labels, never infers topology. */
export const selectResidueRange = (
  structure: StructureMetadata,
  chain: number,
  first: string,
  last: string,
): number[] => {
  const authorNumber = (value: string | null): number | null => {
    if (value === null || !/^[+-]?\d+$/.test(value)) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : null;
  };
  const listed = structure.residues
    .map((residue, index) => ({
      residue,
      index,
      author: authorNumber(residue.author_seq_id),
    }))
    .filter(({ residue }) => residue.chain === chain);
  // Pick one namespace for the complete list: pairwise namespace switching can
  // produce a non-transitive comparator when labels are only partly supplied.
  const labeled = listed.every(({ residue }) => residue.label_seq_id !== null);
  const numericAuthor = listed.every(({ author }) => author !== null);
  listed.sort((a, b) => {
    const x = a.residue,
      y = b.residue;
    if (labeled) return x.label_seq_id! - y.label_seq_id! || a.index - b.index;
    if (!numericAuthor) return a.index - b.index;
    const number = a.author! - b.author!;
    const xi = x.insertion_code ?? "",
      yi = y.insertion_code ?? "";
    return number || (xi < yi ? -1 : xi > yi ? 1 : a.index - b.index);
  });
  const endpoint = (query: string) => {
    const normalized = query.trim().toUpperCase();
    const found = listed
      .map(({ residue }, index) => ({ residue, index }))
      .filter(({ residue }) =>
        [
          residueIdentifier(residue),
          `${residue.name} ${residueIdentifier(residue)}`,
        ].some((name) => name.toUpperCase() === normalized),
      );
    if (found.length !== 1)
      throw new Error(
        found.length
          ? `Residue ${query} is ambiguous; select a chain with unique identifiers.`
          : `Residue ${query || "(empty)"} was not found in this chain.`,
      );
    return found[0].index;
  };
  const start = endpoint(first),
    end = endpoint(last);
  if (start > end)
    throw new Error("The first residue must precede the last residue.");
  return listed.slice(start, end + 1).map(({ index }) => index);
};
