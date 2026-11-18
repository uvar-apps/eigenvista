import { useEffect, useMemo, useState } from "react";
import { ELEMENTS } from "./elements";
import { inspectionId } from "./inspectionId";
import type { EigenVistaDocument } from "./types";
import type {
  AnnotationLabel,
  MeasurementDefinition,
  MeasurementKind,
  MeasurementResult,
} from "./inspectionTypes";
import "./structure-controls.css";

type Command = (
  method: string,
  params?: Record<string, unknown>,
) => Promise<boolean>;
type Measured = MeasurementDefinition & { result: MeasurementResult };

export interface InspectionControlsProps {
  doc: EigenVistaDocument;
  selectedAtoms: number[];
  orderedAtoms: number[];
  measurements: Measured[];
  busy: boolean;
  error: string;
  pickEnabled: boolean;
  onPickEnabled: (value: boolean) => void;
  onCancel?: () => void;
  onCommand: (
    method: string,
    params?: Record<string, unknown>,
  ) => Promise<unknown>;
}

const measurementCounts: Record<MeasurementKind, number> = {
  distance: 2,
  angle: 3,
  torsion: 4,
};
const listStyle = {
  maxHeight: 240,
  overflow: "auto",
  padding: 0,
  listStyle: "none",
} as const;

/** Human-facing numbering is one based; persistent/API references stay original and zero based. */
function atomName(doc: EigenVistaDocument, atom: number) {
  const name =
    doc.structure?.atom_names[atom] ??
    ELEMENTS[doc.atoms.elements[atom]]?.symbol ??
    "Atom";
  return `${name} #${atom + 1}`;
}

function residueName(doc: EigenVistaDocument, index: number) {
  const residue = doc.structure!.residues[index];
  const chain = doc.structure!.chains[residue.chain];
  const chainName =
    chain.author_id ?? chain.label_id ?? `chain ${residue.chain + 1}`;
  const sequence = residue.author_seq_id ?? residue.label_seq_id ?? "?";
  return `${residue.name} · ${chainName}:${sequence}${residue.insertion_code ?? ""} · residue #${index + 1}`;
}

function identifier(prefix: string) {
  return inspectionId(prefix);
}

/** GUI commands go through the same application controller as external agents. */
export function InspectionControls(props: InspectionControlsProps) {
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState("");
  useEffect(() => setLocalError(""), [props.doc.atoms]);
  const command: Command = async (method, params) => {
    setPending(true);
    setLocalError("");
    try {
      await props.onCommand(method, params);
      return true;
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setPending(false);
    }
  };
  const disabled = props.busy || pending;
  return (
    <div
      className="structure-controls inspection-controls"
      aria-label="Geometry inspection"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <details className="structure-group">
        <summary>Selection, measurements and labels</summary>
        <p className="structure-note">
          Select source atoms in order, then measure or label them. Distances
          use Å; angles and signed torsions use degrees.
        </p>
        <label className="structure-check" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            checked={props.pickEnabled}
            onChange={(event) => props.onPickEnabled(event.target.checked)}
          />
          Pick atoms for inspection
        </label>
        {props.busy && props.onCancel && (
          <button onClick={props.onCancel}>Cancel inspection</button>
        )}
        {(localError || props.error) && (
          <p className="structure-error" role="alert">
            {localError || props.error}
          </p>
        )}
        <fieldset
          disabled={disabled}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <AtomSelection {...props} command={command} />
          <NamedSelections
            doc={props.doc}
            selectedAtoms={props.selectedAtoms}
            command={command}
          />
          <Measurements
            doc={props.doc}
            orderedAtoms={props.orderedAtoms}
            values={props.measurements}
            command={command}
          />
          <Labels
            doc={props.doc}
            orderedAtoms={props.orderedAtoms}
            command={command}
          />
          <Neighborhoods
            doc={props.doc}
            selectedAtoms={props.selectedAtoms}
            command={command}
          />
        </fieldset>
      </details>
    </div>
  );
}

function AtomSelection({
  doc,
  selectedAtoms,
  orderedAtoms,
  command,
}: InspectionControlsProps & { command: Command }) {
  const [numbers, setNumbers] = useState("");
  const [inputError, setInputError] = useState("");
  useEffect(() => {
    setNumbers(orderedAtoms.map((atom) => atom + 1).join(", "));
    setInputError("");
  }, [orderedAtoms]);
  const apply = () => {
    const entries = numbers.trim() ? numbers.trim().split(/[\s,;]+/) : [];
    const atoms = entries.map((entry) => Number(entry) - 1);
    if (
      atoms.some(
        (atom) =>
          !Number.isInteger(atom) ||
          atom < 0 ||
          atom >= doc.atoms.positions.length,
      )
    ) {
      setInputError(
        `Enter atom numbers from 1 to ${doc.atoms.positions.length}.`,
      );
      return;
    }
    setInputError("");
    void command("selection.set", { atoms });
  };
  const reorder = (index: number, direction: number) => {
    const atoms = [...orderedAtoms];
    [atoms[index], atoms[index + direction]] = [
      atoms[index + direction],
      atoms[index],
    ];
    void command("selection.set", { atoms });
  };
  return (
    <div className="structure-component">
      <h3>Selected atoms · {selectedAtoms.length}</h3>
      <label>
        Atom numbers, in measurement order
        <input
          aria-label="Inspection atom numbers"
          value={numbers}
          onChange={(event) => setNumbers(event.target.value)}
          placeholder="For example: 1, 4, 8"
        />
      </label>
      {inputError && (
        <p className="structure-error" role="alert">
          {inputError}
        </p>
      )}
      <div className="structure-actions">
        <button onClick={apply}>Select atom numbers</button>
        <button onClick={() => void command("selection.clear")}>
          Clear selection
        </button>
        <button
          disabled={!selectedAtoms.length}
          onClick={() =>
            void command("selection.set", { atoms: orderedAtoms, focus: true })
          }
        >
          Focus selection
        </button>
        <button
          disabled={!selectedAtoms.length}
          onClick={() =>
            void command("selection.set", {
              atoms: orderedAtoms,
              showOnly: true,
              resetFilters: true,
            })
          }
        >
          Show only selection
        </button>
        <button
          onClick={() =>
            void command("selection.set", {
              atoms: orderedAtoms,
              showOnly: false,
              resetFilters: true,
            })
          }
        >
          Show full structure
        </button>
      </div>
      {!!orderedAtoms.length && (
        <ol
          aria-label="Measurement pick order"
          style={{ ...listStyle, listStyle: "decimal", paddingLeft: 20 }}
        >
          {orderedAtoms.slice(0, 32).map((atom, index) => (
            <li key={`${atom}-${index}`} style={{ marginTop: 5 }}>
              {atomName(doc, atom)}
              <div className="structure-actions">
                <button
                  aria-label={`Move picked atom ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => reorder(index, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label={`Move picked atom ${index + 1} later`}
                  disabled={index === orderedAtoms.length - 1}
                  onClick={() => reorder(index, 1)}
                >
                  ↓
                </button>
                <button
                  aria-label={`Remove picked atom ${index + 1}`}
                  onClick={() =>
                    void command("selection.set", {
                      atoms: orderedAtoms.filter((_, at) => at !== index),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {orderedAtoms.length > 32 && (
        <p className="structure-note">
          Showing the first 32 picks of {orderedAtoms.length}. Use a named
          selection for large sets.
        </p>
      )}
    </div>
  );
}

function NamedSelections({
  doc,
  selectedAtoms,
  command,
}: {
  doc: EigenVistaDocument;
  selectedAtoms: number[];
  command: Command;
}) {
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    setEditing(null);
    setLabel("");
  }, [doc.atoms]);
  const save = async () => {
    if (
      await command("selection.save", {
        id: editing ?? identifier("selection"),
        label: label.trim(),
        atoms: selectedAtoms,
      })
    ) {
      setEditing(null);
      setLabel("");
    }
  };
  return (
    <details className="structure-group">
      <summary>
        Named selections · {doc.annotations?.selections.length ?? 0}
      </summary>
      <label>
        Selection name
        <input
          aria-label="Named selection name"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <div className="structure-actions">
        <button
          disabled={!label.trim() || !selectedAtoms.length}
          onClick={() => void save()}
        >
          {editing ? "Update named selection" : "Save named selection"}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(null);
              setLabel("");
            }}
          >
            Cancel selection edit
          </button>
        )}
      </div>
      <ul style={listStyle} aria-label="Named selections">
        {doc.annotations?.selections.map((selection) => (
          <li key={selection.id} className="structure-component">
            <strong>{selection.label}</strong> · {selection.atoms.length} atoms
            <div className="structure-actions">
              <button
                aria-label={`Select ${selection.label}`}
                onClick={() =>
                  void command("selection.set", { selectionId: selection.id })
                }
              >
                Select
              </button>
              <button
                aria-label={`Focus ${selection.label}`}
                onClick={() =>
                  void command("selection.set", {
                    selectionId: selection.id,
                    focus: true,
                  })
                }
              >
                Focus
              </button>
              <button
                aria-label={`Isolate ${selection.label}`}
                onClick={() =>
                  void command("selection.set", {
                    selectionId: selection.id,
                    showOnly: true,
                    resetFilters: true,
                  })
                }
              >
                Isolate
              </button>
              <button
                aria-label={`Edit ${selection.label}`}
                onClick={async () => {
                  if (
                    await command("selection.set", {
                      selectionId: selection.id,
                    })
                  ) {
                    setEditing(selection.id);
                    setLabel(selection.label);
                  }
                }}
              >
                Edit
              </button>
              <button
                aria-label={`Delete selection ${selection.label}`}
                onClick={() =>
                  void command("selection.remove", { id: selection.id })
                }
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Measurements({
  doc,
  orderedAtoms,
  values,
  command,
}: {
  doc: EigenVistaDocument;
  orderedAtoms: number[];
  values: Measured[];
  command: Command;
}) {
  const [kind, setKind] = useState<MeasurementKind>("distance");
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [color, setColor] = useState("#26373b");
  const [always, setAlways] = useState(false);
  useEffect(() => {
    setEditing(null);
    setLabel("");
  }, [doc.atoms]);
  const count = measurementCounts[kind];
  const save = async () => {
    const measurement: MeasurementDefinition = {
      id: editing ?? identifier("measurement"),
      label:
        label.trim() ||
        `${kind[0].toUpperCase()}${kind.slice(1)} ${orderedAtoms.map((atom) => atom + 1).join("–")}`,
      kind,
      atoms: orderedAtoms,
      color,
      visible: values.find((value) => value.id === editing)?.visible ?? true,
      always_visible: always,
    };
    if (await command("measure.upsert", { measurement })) {
      setEditing(null);
      setLabel("");
    }
  };
  const edit = async (measurement: MeasurementDefinition) => {
    if (await command("selection.set", { atoms: measurement.atoms })) {
      setEditing(measurement.id);
      setKind(measurement.kind);
      setLabel(measurement.label);
      setColor(measurement.color);
      setAlways(measurement.always_visible);
    }
  };
  return (
    <details className="structure-group">
      <summary>Geometry measurements · {values.length}</summary>
      <label>
        Measurement type
        <select
          aria-label="Measurement type"
          value={kind}
          onChange={(event) => setKind(event.target.value as MeasurementKind)}
        >
          <option value="distance">Distance · 2 atoms</option>
          <option value="angle">Angle · 3 atoms</option>
          <option value="torsion">Signed torsion · 4 atoms</option>
        </select>
      </label>
      <p className="structure-note">
        Pick exactly {count} distinct atoms in order. An angle uses the middle
        atom; torsions range from −180° to below +180°.
      </p>
      <label>
        Measurement name
        <input
          aria-label="Measurement name"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Optional descriptive name"
        />
      </label>
      <label className="structure-check">
        Monitor color
        <input
          aria-label="Measurement color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </label>
      <label className="structure-check">
        <input
          type="checkbox"
          checked={always}
          onChange={(event) => setAlways(event.target.checked)}
        />
        Always show measurement label
      </label>
      <div className="structure-actions">
        <button
          disabled={
            orderedAtoms.length !== count ||
            new Set(orderedAtoms).size !== count
          }
          onClick={() => void save()}
        >
          {editing ? "Update measurement" : "Add measurement"}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(null);
              setLabel("");
            }}
          >
            Cancel measurement edit
          </button>
        )}
        <button
          disabled={!values.length}
          onClick={() => void command("table.export", { kind: "measurements" })}
        >
          Export measurement CSV
        </button>
      </div>
      <div style={{ maxHeight: 320, overflow: "auto" }}>
        <table
          aria-label="Geometry measurements"
          style={{ width: "100%", fontSize: 11 }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Measurement</th>
              <th style={{ textAlign: "right" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {values.map((measurement) => (
              <tr key={measurement.id}>
                <td
                  colSpan={2}
                  style={{
                    borderBottom: "1px solid #e1e7e5",
                    padding: "8px 0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <strong>{measurement.label}</strong>
                    <output aria-label={`Value of ${measurement.label}`}>
                      {measurement.result.value === null
                        ? "Undefined"
                        : `${measurement.result.value.toPrecision(8)} ${measurement.result.unit === "degree" ? "°" : "Å"}`}
                    </output>
                  </div>
                  <p className="structure-note">
                    {measurement.atoms
                      .map((atom) => atomName(doc, atom))
                      .join(" → ")}
                    {measurement.result.reason
                      ? ` · ${measurement.result.reason}`
                      : ""}
                  </p>
                  <label className="structure-check">
                    <input
                      aria-label={`Show measurement ${measurement.label}`}
                      type="checkbox"
                      checked={measurement.visible}
                      onChange={(event) =>
                        void command("measure.upsert", {
                          measurement: {
                            ...measurementDefinition(measurement),
                            visible: event.target.checked,
                          },
                        })
                      }
                    />
                    Show monitor
                  </label>
                  <div className="structure-actions">
                    <button
                      aria-label={`Edit measurement ${measurement.label}`}
                      onClick={() => void edit(measurement)}
                    >
                      Edit
                    </button>
                    <button
                      aria-label={`Delete measurement ${measurement.label}`}
                      onClick={() =>
                        void command("measure.remove", { id: measurement.id })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function measurementDefinition(value: Measured): MeasurementDefinition {
  const { result: _result, ...definition } = value;
  return definition;
}

function Labels({
  doc,
  orderedAtoms,
  command,
}: {
  doc: EigenVistaDocument;
  orderedAtoms: number[];
  command: Command;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [target, setTarget] = useState<"atom" | "residue">("atom");
  const [number, setNumber] = useState("1");
  const [color, setColor] = useState("#26373b");
  const [always, setAlways] = useState(false);
  useEffect(() => {
    setEditing(null);
    setText("");
    setTarget("atom");
  }, [doc.atoms]);
  useEffect(() => {
    if (!editing && orderedAtoms.length) setNumber(String(orderedAtoms[0] + 1));
  }, [orderedAtoms, editing]);
  const targetIndex = Number(number) - 1;
  const targetCount =
    target === "atom"
      ? doc.atoms.positions.length
      : (doc.structure?.residues.length ?? 0);
  const valid =
    Number.isInteger(targetIndex) &&
    targetIndex >= 0 &&
    targetIndex < targetCount;
  const save = async () => {
    const label: AnnotationLabel = {
      id: editing ?? identifier("label"),
      text: text.trim(),
      [target]: targetIndex,
      color,
      visible:
        doc.annotations?.labels.find((label) => label.id === editing)
          ?.visible ?? true,
      always_visible: always,
    };
    if (await command("labels.upsert", { label })) {
      setEditing(null);
      setText("");
    }
  };
  const edit = (label: AnnotationLabel) => {
    setEditing(label.id);
    setText(label.text);
    setColor(label.color);
    setAlways(label.always_visible);
    setTarget(label.atom !== undefined ? "atom" : "residue");
    setNumber(String((label.atom ?? label.residue ?? 0) + 1));
  };
  return (
    <details className="structure-group">
      <summary>
        Atom and residue labels · {doc.annotations?.labels.length ?? 0}
      </summary>
      <label>
        Label text
        <input
          aria-label="Annotation text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="structure-range">
        <label>
          Target
          <select
            aria-label="Annotation target type"
            value={target}
            onChange={(event) => {
              const value = event.target.value as "atom" | "residue";
              setTarget(value);
              setNumber(
                String(
                  value === "residue" && orderedAtoms.length && doc.structure
                    ? doc.structure.atom_residues[orderedAtoms[0]] + 1
                    : (orderedAtoms[0] ?? 0) + 1,
                ),
              );
            }}
          >
            <option value="atom">Atom</option>
            <option value="residue" disabled={!doc.structure}>
              Residue
            </option>
          </select>
        </label>
        <label>
          Number
          <input
            aria-label="Annotation target number"
            type="number"
            min={1}
            max={targetCount}
            step={1}
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
        </label>
      </div>
      {valid && (
        <p className="structure-note">
          {target === "atom"
            ? atomName(doc, targetIndex)
            : residueName(doc, targetIndex)}
        </p>
      )}
      <label className="structure-check">
        Label color
        <input
          aria-label="Annotation color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </label>
      <label className="structure-check">
        <input
          type="checkbox"
          checked={always}
          onChange={(event) => setAlways(event.target.checked)}
        />
        Always show label
      </label>
      <div className="structure-actions">
        <button disabled={!text.trim() || !valid} onClick={() => void save()}>
          {editing ? "Update annotation label" : "Add annotation label"}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(null);
              setText("");
            }}
          >
            Cancel label edit
          </button>
        )}
      </div>
      <ul style={listStyle} aria-label="Annotation labels">
        {doc.annotations?.labels.map((label) => (
          <li key={label.id} className="structure-component">
            <strong>{label.text}</strong>
            <p className="structure-note">
              {label.atom !== undefined
                ? atomName(doc, label.atom)
                : residueName(doc, label.residue!)}
            </p>
            <label className="structure-check">
              <input
                aria-label={`Show label ${label.text}`}
                type="checkbox"
                checked={label.visible}
                onChange={(event) =>
                  void command("labels.upsert", {
                    label: { ...label, visible: event.target.checked },
                  })
                }
              />
              Show label
            </label>
            <div className="structure-actions">
              <button
                aria-label={`Edit label ${label.text}`}
                onClick={() => edit(label)}
              >
                Edit
              </button>
              <button
                aria-label={`Delete label ${label.text}`}
                onClick={() => void command("labels.remove", { id: label.id })}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Neighborhoods({
  doc,
  selectedAtoms,
  command,
}: {
  doc: EigenVistaDocument;
  selectedAtoms: number[];
  command: Command;
}) {
  const [radius, setRadius] = useState("4");
  const [whole, setWhole] = useState(Boolean(doc.structure));
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    setWhole(Boolean(doc.structure));
    setOffset(0);
    setSearch("");
  }, [doc.atoms, doc.structure]);
  const ligands = useMemo(
    () =>
      doc.structure?.residues.flatMap((residue, index) =>
        residue.kind === "ligand" &&
        residueName(doc, index).toLowerCase().includes(search.toLowerCase())
          ? [index]
          : [],
      ) ?? [],
    [doc.structure, search],
  );
  const generate = () => {
    const saved = name.trim()
      ? { id: identifier("neighborhood"), label: name.trim() }
      : {};
    void command("selection.neighborhood", {
      seeds: selectedAtoms,
      radiusAngstrom: Number(radius),
      wholeResidues: whole,
      showOnly: true,
      resetFilters: true,
      focus: true,
      ...saved,
    });
  };
  return (
    <details className="structure-group">
      <summary>Ligands and neighborhoods</summary>
      <p className="structure-note">
        Find atoms within the chosen center-to-center distance of the selection.
        Seeds are included; hidden atoms are searched too. This shows proximity,
        not assigned chemical interactions.
      </p>
      {doc.structure && (
        <>
          <label>
            Find ligand copy
            <input
              aria-label="Find ligand copy"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder="Ligand, chain or residue number"
            />
          </label>
          <ul style={listStyle} aria-label="Ligand copies">
            {ligands.slice(offset, offset + 50).map((index) => (
              <li key={index} className="structure-component">
                {residueName(doc, index)}
                <div className="structure-actions">
                  <button
                    aria-label={`Select ${residueName(doc, index)}`}
                    onClick={() =>
                      void command("selection.set", {
                        residueIndices: [index],
                        focus: true,
                      })
                    }
                  >
                    Select this ligand
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="structure-actions">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              Previous ligands
            </button>
            <button
              disabled={offset + 50 >= ligands.length}
              onClick={() => setOffset(offset + 50)}
            >
              Next ligands
            </button>
            <span>{ligands.length} matching copies</span>
          </div>
        </>
      )}
      <label>
        Neighborhood radius (Å)
        <input
          aria-label="Neighborhood radius (Å)"
          type="number"
          min={0}
          max={1000}
          step="any"
          value={radius}
          onChange={(event) => setRadius(event.target.value)}
        />
      </label>
      <label className="structure-check">
        <input
          type="checkbox"
          checked={whole}
          disabled={!doc.structure}
          onChange={(event) => setWhole(event.target.checked)}
        />
        Include complete residues
      </label>
      <label>
        Save neighborhood as
        <input
          aria-label="Neighborhood selection name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Optional named selection"
        />
      </label>
      <div className="structure-actions">
        <button
          disabled={
            !selectedAtoms.length ||
            !Number.isFinite(Number(radius)) ||
            Number(radius) < 0 ||
            Number(radius) > 1000 ||
            radius.trim() === ""
          }
          onClick={generate}
        >
          Show neighborhood
        </button>
      </div>
    </details>
  );
}
