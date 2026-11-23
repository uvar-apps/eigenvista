import { useEffect, useMemo, useState } from "react";
import type { ComponentKind, EigenVistaDocument } from "./types";
import {
  chainColor,
  chainLabel,
  COLOR_MODE_OPTIONS,
  COMPONENT_KINDS,
  entityColor,
  isAtomVisible,
  REPRESENTATION_OPTIONS,
  RESIDUE_CLASS_LEGEND,
  SECONDARY_COLORS,
  selectResidueRange,
  type ColorMode,
  type MolecularRepresentation,
  type StructureDisplayState,
} from "./molecularDisplay";
import "./structure-controls.css";

const LIST_LIMIT = 50;
const KIND_LABELS: Record<ComponentKind, string> = {
  protein: "Protein",
  nucleic: "Nucleic acid",
  ligand: "Ligand",
  water: "Water",
  ion: "Ion",
  unknown: "Unknown component",
};

function StyleSelect({
  label,
  value,
  protein,
  onChange,
}: {
  label: string;
  value?: MolecularRepresentation;
  protein: boolean;
  onChange: (style: MolecularRepresentation | undefined) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(event) =>
        onChange((event.target.value as MolecularRepresentation) || undefined)
      }
    >
      <option value="">Use global representation</option>
      {REPRESENTATION_OPTIONS.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={
            !protein &&
            ["trace", "tube", "ribbon", "cartoon"].includes(option.value)
          }
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Presentation controls only: never edits or serializes the molecular document. */
export function StructureControls({
  doc,
  value,
  onChange,
}: {
  doc: EigenVistaDocument;
  value: StructureDisplayState;
  onChange: (value: StructureDisplayState) => void;
}) {
  const [filter, setFilter] = useState("");
  const [rangeChain, setRangeChain] = useState(0);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [rangeError, setRangeError] = useState("");
  const structure = doc.structure;
  useEffect(() => {
    setFilter("");
    setRangeChain(0);
    setFirst("");
    setLast("");
    setRangeError("");
  }, [structure]);
  const summary = useMemo(() => {
    const chains =
      structure?.chains.map(() => ({
        atoms: [] as number[],
        protein: false,
        residues: 0,
      })) ?? [];
    const kinds = Object.fromEntries(
      COMPONENT_KINDS.map((kind) => [kind, 0]),
    ) as Record<ComponentKind, number>;
    structure?.residues.forEach((residue) => {
      chains[residue.chain].residues++;
      if (residue.kind === "protein") chains[residue.chain].protein = true;
    });
    structure?.atom_residues.forEach((residueIndex, atom) => {
      const residue = structure.residues[residueIndex];
      chains[residue.chain].atoms.push(atom);
      kinds[residue.kind]++;
    });
    return { chains, kinds };
  }, [structure]);

  if (!structure)
    return (
      <div className="structure-controls">
        <p className="structure-note">
          Chain and protein views are unavailable for this file. Open or
          reimport a PDB or mmCIF with chain and residue information.
        </p>
      </div>
    );

  const query = filter.trim().toLowerCase();
  const matches = structure.chains
    .map((chain, index) => ({ chain, index }))
    .filter(({ chain, index }) =>
      `${chainLabel(chain, index, structure)} ${chain.entity_id ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  const selectedChain = Math.min(
    rangeChain,
    Math.max(0, structure.chains.length - 1),
  );
  const hasVisibleAtoms = structure.atom_residues.some((_, atom) =>
    isAtomVisible(doc, value, atom),
  );
  const focus = (atoms: number[]) => {
    const visible = atoms.filter((atom) => isAtomVisible(doc, value, atom));
    if (visible.length)
      onChange({
        ...value,
        focus: { atoms: visible, revision: (value.focus?.revision ?? 0) + 1 },
      });
  };
  const showAll = () =>
    onChange({
      ...value,
      hiddenChains: [],
      hiddenKinds: [],
      isolatedChain: null,
      residueSelection: null,
    });
  const updateStyle = (
    key: string,
    style: MolecularRepresentation | undefined,
  ) => {
    const chainStyles = { ...value.chainStyles };
    if (style) chainStyles[key] = style;
    else delete chainStyles[key];
    onChange({ ...value, chainStyles });
  };
  const legend =
    value.colorMode === "chain"
      ? structure.chains.map((chain, index) => ({
          key: `chain:${index}`,
          label: `Chain ${chainLabel(chain, index, structure)}`,
          color: chainColor(chain, structure),
        }))
      : value.colorMode === "entity"
        ? Array.from(
            new Set(structure.chains.map((chain) => chain.entity_id)),
          ).map((entity) => ({
            key: `entity:${JSON.stringify(entity)}`,
            label: entity ? `Entity ${entity}` : "Unknown entity",
            color: entityColor(entity),
          }))
        : value.colorMode === "secondary"
          ? Object.entries(SECONDARY_COLORS).map(([secondary, color]) => ({
              key: `secondary:${secondary}`,
              label:
                secondary === "unknown" ? "Unknown / unassigned" : secondary,
              color,
            }))
          : value.colorMode === "residue-class"
            ? RESIDUE_CLASS_LEGEND
            : [];

  return (
    <section className="structure-controls" aria-label="Structure display">
      <h3>Biological structure</h3>
      <p className="structure-note">
        Display settings apply to the current session.
      </p>
      <label>
        Coloring
        <select
          aria-label="Structure coloring"
          value={value.colorMode}
          onChange={(event) =>
            onChange({ ...value, colorMode: event.target.value as ColorMode })
          }
        >
          {COLOR_MODE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {value.colorMode === "element" && (
        <p className="structure-note">
          Element colors include your atom-color overrides.
        </p>
      )}
      {value.colorMode === "residue-class" && (
        <p className="structure-note">
          Colors group protein residues by side-chain chemistry. Nonprotein
          atoms use element colors.
        </p>
      )}
      {legend.length > 0 && (
        <ul className="structure-legend" aria-label="Structure color legend">
          {legend.slice(0, LIST_LIMIT).map((entry) => (
            <li key={entry.key}>
              <span
                className="structure-swatch"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              {entry.label}
            </li>
          ))}
        </ul>
      )}
      {legend.length > LIST_LIMIT && (
        <p className="structure-note">
          Legend shows {LIST_LIMIT} of {legend.length} entries.
        </p>
      )}
      <p className="structure-note">
        {structure.secondary_source === "deposited"
          ? "Secondary structure uses deposited annotations. Unassigned residues remain unknown."
          : "Secondary structure unavailable. Unknown residues use an unassigned loop; no secondary structure is predicted."}
      </p>

      <div className="structure-actions">
        <button type="button" onClick={showAll}>
          Show all components
        </button>
        <button
          type="button"
          disabled={!hasVisibleAtoms}
          onClick={() =>
            focus(structure.atom_residues.map((_, index) => index))
          }
        >
          Focus visible structure
        </button>
      </div>
      <details className="structure-group">
        <summary>Components</summary>
        <div className="structure-component-list">
          {COMPONENT_KINDS.filter((kind) => summary.kinds[kind] > 0).map(
            (kind) => (
              <div className="structure-component" key={kind}>
                <label className="structure-check">
                  <input
                    type="checkbox"
                    aria-label={`Show ${KIND_LABELS[kind]}`}
                    checked={!value.hiddenKinds.includes(kind)}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        hiddenKinds: event.target.checked
                          ? value.hiddenKinds.filter(
                              (hidden) => hidden !== kind,
                            )
                          : [...value.hiddenKinds, kind],
                      })
                    }
                  />
                  {KIND_LABELS[kind]} <span>{summary.kinds[kind]} atoms</span>
                </label>
                <StyleSelect
                  label={`Style for ${KIND_LABELS[kind]}`}
                  value={value.kindStyles[kind]}
                  protein={kind === "protein"}
                  onChange={(style) => {
                    const kindStyles = { ...value.kindStyles };
                    if (style) kindStyles[kind] = style;
                    else delete kindStyles[kind];
                    onChange({ ...value, kindStyles });
                  }}
                />
              </div>
            ),
          )}
        </div>
      </details>
      <details className="structure-group">
        <summary>Chains ({structure.chains.length})</summary>
        <p className="structure-note">
          Chain and component visibility filters combine. Focus is available for
          chains with visible atoms.
        </p>
        <input
          type="search"
          aria-label="Filter chains"
          placeholder="Filter chain or entity"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <p className="structure-note" role="status">
          Showing {Math.min(matches.length, LIST_LIMIT)} of {matches.length}{" "}
          matching chains ({structure.chains.length} total).
        </p>
        <div className="structure-chain-list">
          {matches.slice(0, LIST_LIMIT).map(({ chain, index }) => {
            const name = chainLabel(chain, index, structure),
              stats = summary.chains[index];
            return (
              <div className="structure-chain" key={index}>
                <label className="structure-check">
                  <input
                    type="checkbox"
                    aria-label={`Show chain ${name}`}
                    checked={
                      !value.hiddenChains.includes(index) &&
                      (value.isolatedChain === null ||
                        value.isolatedChain === index)
                    }
                    onChange={(event) =>
                      onChange({
                        ...value,
                        isolatedChain: null,
                        hiddenChains: event.target.checked
                          ? value.hiddenChains.filter(
                              (hidden) => hidden !== index,
                            )
                          : [...value.hiddenChains, index],
                      })
                    }
                  />
                  Chain {name}
                </label>
                <p className="structure-note">
                  {stats.residues} residues · {stats.atoms.length} atoms ·{" "}
                  {chain.entity_id
                    ? `entity ${chain.entity_id}`
                    : "unknown entity"}
                </p>
                <StyleSelect
                  label={`Style for chain ${name}`}
                  value={value.chainStyles[String(index)]}
                  protein={stats.protein}
                  onChange={(style) => updateStyle(String(index), style)}
                />
                <div className="structure-actions">
                  <button
                    type="button"
                    aria-pressed={value.isolatedChain === index}
                    aria-label={`Isolate chain ${name}`}
                    onClick={() =>
                      onChange({
                        ...value,
                        isolatedChain:
                          value.isolatedChain === index ? null : index,
                        hiddenChains: value.hiddenChains.filter(
                          (hidden) => hidden !== index,
                        ),
                        hiddenKinds: value.hiddenKinds.filter(
                          (kind) =>
                            !stats.atoms.some(
                              (atom) =>
                                structure.residues[
                                  structure.atom_residues[atom]
                                ].kind === kind,
                            ),
                        ),
                        residueSelection: null,
                      })
                    }
                  >
                    {value.isolatedChain === index
                      ? "Stop isolating"
                      : "Isolate"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Focus chain ${name}`}
                    disabled={
                      !stats.atoms.some((atom) =>
                        isAtomVisible(doc, value, atom),
                      )
                    }
                    onClick={() => focus(stats.atoms)}
                  >
                    Focus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {matches.length > LIST_LIMIT && (
          <p className="structure-note">
            Filter to narrow this list; at most {LIST_LIMIT} chain controls are
            displayed.
          </p>
        )}
      </details>
      <details className="structure-group">
        <summary>Residue range</summary>
        <label>
          Chain
          <select
            aria-label="Residue chain"
            value={selectedChain}
            onChange={(event) => {
              setRangeChain(Number(event.target.value));
              setRangeError("");
            }}
          >
            {!matches
              .slice(0, LIST_LIMIT)
              .some(({ index }) => index === selectedChain) &&
              structure.chains[selectedChain] && (
                <option value={selectedChain}>
                  {chainLabel(
                    structure.chains[selectedChain],
                    selectedChain,
                    structure,
                  )}
                </option>
              )}
            {matches.slice(0, LIST_LIMIT).map(({ chain, index }) => (
              <option key={index} value={index}>
                {chainLabel(chain, index, structure)}
              </option>
            ))}
          </select>
        </label>
        <div className="structure-range">
          <label>
            First residue
            <input
              aria-label="First residue"
              value={first}
              placeholder="THR 1 or 1"
              onChange={(event) => setFirst(event.target.value)}
            />
          </label>
          <label>
            Last residue
            <input
              aria-label="Last residue"
              value={last}
              placeholder="ARG 10 or 10"
              onChange={(event) => setLast(event.target.value)}
            />
          </label>
        </div>
        <p className="structure-note">
          Use author residue numbers and insertion codes when supplied. A
          residue name is optional.
        </p>
        <div className="structure-actions">
          <button
            type="button"
            disabled={!first.trim() || !last.trim()}
            onClick={() => {
              try {
                const residues = selectResidueRange(
                  structure,
                  selectedChain,
                  first,
                  last,
                );
                setRangeError("");
                const selectedKinds = new Set(
                  residues.map((index) => structure.residues[index].kind),
                );
                onChange({
                  ...value,
                  residueSelection: residues,
                  isolatedChain: null,
                  hiddenKinds: value.hiddenKinds.filter(
                    (kind) => !selectedKinds.has(kind),
                  ),
                  hiddenChains: value.hiddenChains.filter(
                    (index) => index !== selectedChain,
                  ),
                });
              } catch (error) {
                setRangeError(
                  String(error instanceof Error ? error.message : error),
                );
              }
            }}
          >
            Show residue range
          </button>
          <button
            type="button"
            disabled={value.residueSelection === null}
            onClick={() => {
              setRangeError("");
              onChange({ ...value, residueSelection: null });
            }}
          >
            Clear residue range
          </button>
        </div>
        {value.residueSelection !== null && (
          <p className="structure-note" role="status">
            Residue range: {value.residueSelection.length} selected residues.
          </p>
        )}
        {rangeError && (
          <p className="structure-error" role="alert">
            {rangeError}
          </p>
        )}
      </details>
    </section>
  );
}
