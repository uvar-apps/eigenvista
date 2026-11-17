import { useEffect, useRef, useState } from "react";
import type { EigenVistaDocument } from "./types";
import type {
  AnalysisDefinition,
  AnalysisRequest,
  FieldAnalysisItem,
  FieldDescriptor,
  Vec3,
} from "./inspectionTypes";
import {
  fieldAnalysisRange,
  fieldColor,
  fieldDisplayFactor,
  fieldDisplayUnit,
  fieldRenderingIssue,
  fieldValuePosition,
} from "./fieldAnalysisRendering";
import "./structure-controls.css";
import { inspectionId } from "./inspectionId";

const BOHR = 0.529177210903;
type Command = (
  method: string,
  params?: Record<string, unknown>,
) => Promise<unknown>;
export interface FieldAnalysisControlsProps {
  doc: EigenVistaDocument;
  selectedAtoms: number[];
  orderedAtoms: number[];
  busy: boolean;
  error: string;
  onCommand: Command;
  onCancel?: () => void;
}
const UNITS: Record<string, string[]> = {
  unspecified: ["unspecified"],
  dimensionless: ["1"],
  orbital_amplitude: ["unspecified", "bohr^-3/2", "angstrom^-3/2"],
  electron_density: ["unspecified", "electron/bohr^3", "electron/angstrom^3"],
  spin_density: ["unspecified", "electron/bohr^3", "electron/angstrom^3"],
  difference_density: ["unspecified", "electron/bohr^3", "electron/angstrom^3"],
  transition_density: ["unspecified", "electron/bohr^3", "electron/angstrom^3"],
  electric_potential: ["unspecified", "hartree/e", "V"],
  potential_energy: ["unspecified", "hartree", "eV"],
};
const human = (text: string) => text.replaceAll("_", " ");
const numberText = (value: number | null | undefined): string =>
  value == null
    ? "—"
    : !Number.isFinite(value)
      ? "conversion overflow"
      : value === 0
        ? "0"
        : Math.abs(value) >= 1e6 || Math.abs(value) < 1e-4
          ? value.toExponential(6)
          : Number(value.toPrecision(8)).toString();
const finite = (value: string, name: string): number => {
  if (!value.trim() || !Number.isFinite(Number(value)))
    throw new Error(`${name} must be a finite number`);
  return Number(value);
};

/** Numerical operations use the same controller and Rust worker as external agents. */
export function FieldAnalysisControls(props: FieldAnalysisControlsProps) {
  const fields = [
    ...props.doc.orbitals,
    ...props.doc.densities,
    ...props.doc.grids,
  ];
  const [field, setField] = useState(
    props.doc.view.field ?? fields[0]?.id ?? "",
  );
  const [descriptor, setDescriptor] = useState<FieldDescriptor | null>(null);
  const [activated, setActivated] = useState(false);
  const [localError, setLocalError] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldKey, setFieldKey] = useState(
    props.doc.field_analysis?.show_field_key ?? false,
  );
  const [editing, setEditing] = useState<FieldAnalysisItem | null>(null);
  const commandRef = useRef(props.onCommand);
  commandRef.current = props.onCommand;
  useEffect(() => {
    if (!fields.some((entry) => entry.id === field))
      setField(props.doc.view.field ?? fields[0]?.id ?? "");
  }, [
    props.doc.atoms,
    props.doc.orbitals,
    props.doc.densities,
    props.doc.grids,
    field,
  ]);
  useEffect(() => {
    setEditing(null);
    setLocalError("");
  }, [props.doc.atoms]);
  useEffect(
    () => setFieldKey(props.doc.field_analysis?.show_field_key ?? false),
    [props.doc.atoms, props.doc.field_analysis?.show_field_key],
  );
  useEffect(() => {
    let current = true;
    setDescriptor(null);
    if (activated && field && fields.some((entry) => entry.id === field))
      void commandRef
        .current("fields.describe", { fieldId: field })
        .then((value) => {
          if (current) setDescriptor(value as FieldDescriptor);
        })
        .catch((error) => {
          if (current) setLocalError(String(error));
        });
    return () => {
      current = false;
    };
  }, [
    activated,
    field,
    props.doc.atoms,
    props.doc.basis,
    props.doc.orbitals,
    props.doc.densities,
    props.doc.grids,
    props.doc.field_analysis?.descriptors,
  ]);
  const run: Command = async (method, params) => {
    const locksControls = method !== "analysis.samples";
    if (locksControls) setPending(true);
    setLocalError("");
    try {
      return await commandRef.current(method, params);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      if (locksControls) setPending(false);
    }
  };
  const perform = (method: string, params?: Record<string, unknown>) => {
    void run(method, params).catch(() => {});
  };
  const disabled = props.busy || pending;
  const items = props.doc.field_analysis?.items ?? [];
  return (
    <div
      className="structure-controls field-analysis-controls"
      aria-label="Quantitative field inspection"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <details
        className="structure-group"
        onToggle={(event) => {
          if (event.target === event.currentTarget && event.currentTarget.open)
            setActivated(true);
        }}
      >
        <summary>Quantitative field inspection</summary>
        {!fields.length ? (
          <p className="structure-note">
            Load a Molden wavefunction or a cube scalar field to probe values,
            inspect slices and plot line profiles.
          </p>
        ) : (
          <>
            <p className="structure-note">
              Probe authoritative values and sample true 2D slices or lines.
              Preview resolution does not change these numerical results.
            </p>
            {props.busy && props.onCancel && (
              <button onClick={props.onCancel}>Cancel field analysis</button>
            )}
            {(localError || props.error) && (
              <p role="alert" className="structure-error">
                {localError || props.error}
              </p>
            )}
            <fieldset
              disabled={disabled}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            >
              <label>
                Analysis field
                <select
                  aria-label="Analysis field"
                  value={field}
                  onChange={(event) => {
                    setField(event.target.value);
                    setEditing(null);
                  }}
                >
                  {fields.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label} ({entry.id})
                    </option>
                  ))}
                </select>
              </label>
              <div className="structure-actions">
                <button onClick={() => perform("scene.set", { mode: "mesh" })}>
                  View meshes and analyses
                </button>
              </div>
              <p className="structure-note">
                Use this view to inspect a slice without a sampled volume or
                raycast field. It switches the viewing mode immediately.
              </p>
              <label className="structure-check">
                <input
                  type="checkbox"
                  aria-label="Show current field rendering key"
                  checked={fieldKey}
                  onChange={(event) => {
                    const visible = event.target.checked;
                    setFieldKey(visible);
                    void run("fields.set_key", { visible }).catch(() =>
                      setFieldKey(
                        props.doc.field_analysis?.show_field_key ?? false,
                      ),
                    );
                  }}
                />
                Show current field rendering key
              </label>
              <p className="structure-note">
                Mesh and raycast keys identify signed isovalues. Volume keys
                describe its actual color/opacity transfer; continuous colorbars
                belong to quantitative slices.
              </p>
              {descriptor && (
                <FieldMeaning
                  descriptor={descriptor}
                  onSave={(value) =>
                    perform("fields.set_metadata", { descriptor: value })
                  }
                />
              )}
              <AnalysisForm
                key={`${props.doc.id}:${editing?.id ?? "new"}`}
                {...props}
                field={field}
                editing={editing}
                command={run}
                onDone={() => setEditing(null)}
                onError={setLocalError}
              />
            </fieldset>
          </>
        )}
        {!!items.length && (
          <>
            <h3>Saved quantitative results ({items.length})</h3>
            {items.map((item) => (
              <AnalysisCard
                key={item.id}
                item={item}
                disabled={disabled}
                command={run}
                onError={setLocalError}
                onEdit={() => {
                  setField(item.field);
                  setEditing(item);
                }}
              />
            ))}
          </>
        )}
      </details>
    </div>
  );
}

function FieldMeaning({
  descriptor,
  onSave,
}: {
  descriptor: FieldDescriptor;
  onSave: (value: FieldDescriptor) => void;
}) {
  const [draft, setDraft] = useState(descriptor);
  useEffect(() => setDraft(descriptor), [descriptor]);
  const options = UNITS[draft.quantity] ?? ["unspecified"];
  const conversions = draft.value_unit.startsWith("electron/")
    ? ["electron/bohr^3", "electron/angstrom^3"]
    : ["bohr^-3/2", "angstrom^-3/2"].includes(draft.value_unit)
      ? ["bohr^-3/2", "angstrom^-3/2"]
      : [draft.value_unit];
  return (
    <details className="structure-group">
      <summary>
        Field meaning and units: {human(descriptor.quantity)} ·{" "}
        {fieldDisplayUnit(descriptor)}
      </summary>
      <p className="structure-note" aria-label="Field declaration provenance">
        {human(descriptor.origin)}: {descriptor.note}
      </p>
      <label>
        Scalar quantity
        <select
          aria-label="Scalar quantity"
          value={draft.quantity}
          onChange={(event) => {
            const quantity = event.target.value;
            const value_unit = UNITS[quantity].includes(draft.value_unit)
              ? draft.value_unit
              : UNITS[quantity][0];
            setDraft({
              ...draft,
              quantity,
              value_unit,
              display_unit: undefined,
            });
          }}
        >
          {Object.keys(UNITS).map((quantity) => (
            <option key={quantity} value={quantity}>
              {human(quantity)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Source value unit
        <select
          aria-label="Source value unit"
          value={draft.value_unit}
          onChange={(event) =>
            setDraft({
              ...draft,
              value_unit: event.target.value,
              display_unit: undefined,
            })
          }
        >
          {options.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </label>
      <label>
        Display and export unit
        <select
          aria-label="Display and export unit"
          value={draft.display_unit ?? draft.value_unit}
          onChange={(event) =>
            setDraft({
              ...draft,
              display_unit:
                event.target.value === draft.value_unit
                  ? undefined
                  : event.target.value,
            })
          }
        >
          {conversions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </label>
      <label>
        Interpretation note
        <input
          aria-label="Interpretation note"
          maxLength={2048}
          value={draft.note}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
        />
      </label>
      <p className="structure-note">
        Declaring source units labels the existing samples; it does not rescale
        them. Explicit display conversions affect readouts and exports only.
        Unknown cube meanings stay unspecified until declared.
      </p>
      <button onClick={() => onSave({ ...draft, origin: "user_declared" })}>
        Apply field meaning
      </button>
    </details>
  );
}

function VectorInputs({
  title,
  value,
  unit,
  onChange,
}: {
  title: string;
  value: string[];
  unit: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3,minmax(0,1fr))",
        gap: 5,
      }}
    >
      {value.map((entry, index) => (
        <label key={index}>
          {title} {"XYZ"[index]}
          <input
            type="number"
            step="any"
            aria-label={`${title} ${"XYZ"[index]} (${unit})`}
            value={entry}
            onChange={(event) =>
              onChange(
                value.map((old, i) => (i === index ? event.target.value : old)),
              )
            }
          />
        </label>
      ))}
    </div>
  );
}

interface FormProps extends FieldAnalysisControlsProps {
  field: string;
  editing: FieldAnalysisItem | null;
  command: Command;
  onDone: () => void;
  onError: (error: string) => void;
}
function AnalysisForm(props: FormProps) {
  const saved = props.editing?.definition;
  const [kind, setKind] = useState<AnalysisDefinition["kind"]>(
    saved?.kind ?? "probe",
  );
  const [label, setLabel] = useState(props.editing?.label ?? "");
  const [unit, setUnit] = useState("angstrom");
  const [source, setSource] = useState("coordinates");
  const [axis, setAxis] = useState(saved?.kind === "plane" ? "saved" : "xy");
  const asAngstrom = (point: number[]) =>
    point.map((v) => (v * BOHR).toString());
  const [point, setPoint] = useState(
    saved?.kind === "probe" ? asAngstrom(saved.point) : ["0", "0", "0"],
  );
  const [center, setCenter] = useState(
    saved?.kind === "plane"
      ? asAngstrom(
          saved.origin.map((v, i) => v + (saved.u[i] + saved.v[i]) / 2),
        )
      : ["0", "0", "0"],
  );
  const [start, setStart] = useState(
    saved?.kind === "profile" ? asAngstrom(saved.start) : ["-2", "0", "0"],
  );
  const [end, setEnd] = useState(
    saved?.kind === "profile" ? asAngstrom(saved.end) : ["2", "0", "0"],
  );
  const [extent, setExtent] = useState(
    saved?.kind === "plane"
      ? [Math.hypot(...saved.u) * BOHR, Math.hypot(...saved.v) * BOHR].map(
          String,
        )
      : ["8", "8"],
  );
  const [dims, setDims] = useState(
    saved?.kind === "plane" ? saved.dims.map(String) : ["96", "96"],
  );
  const [count, setCount] = useState(
    saved?.kind === "profile" ? String(saved.count) : "128",
  );
  const atoms = props.orderedAtoms.length
    ? props.orderedAtoms
    : props.selectedAtoms;
  const sourceFactor = unit === "angstrom" ? 1 / BOHR : 1;
  const coordinates = (value: string[], name: string): Vec3 =>
    value.map(
      (entry, i) => finite(entry, `${name} ${"XYZ"[i]}`) * sourceFactor,
    ) as Vec3;
  const changeUnit = (next: string) => {
    const factor = next === "bohr" ? 1 / BOHR : BOHR;
    const convert = (values: string[]) =>
      values.map((v) =>
        v.trim() && Number.isFinite(Number(v)) ? String(Number(v) * factor) : v,
      );
    setPoint(convert(point));
    setCenter(convert(center));
    setStart(convert(start));
    setEnd(convert(end));
    setExtent(convert(extent));
    setUnit(next);
  };
  const definition = async (): Promise<AnalysisDefinition> => {
    if (kind === "probe") {
      if (source === "atoms") {
        if (atoms.length !== 1)
          throw new Error("Select exactly one source atom for an atom probe");
        return {
          kind,
          point: [...props.doc.atoms.positions[atoms[0]]],
          atom: atoms[0],
        };
      }
      return { kind, point: coordinates(point, "Probe") };
    }
    if (kind === "profile") {
      const samples = finite(count, "Profile sample count");
      if (source === "atoms") {
        if (atoms.length !== 2)
          throw new Error("Select exactly two atoms in profile order");
        return {
          kind,
          start: [...props.doc.atoms.positions[atoms[0]]],
          end: [...props.doc.atoms.positions[atoms[1]]],
          count: samples,
          atoms: [atoms[0], atoms[1]],
        };
      }
      return {
        kind,
        start: coordinates(start, "Profile start"),
        end: coordinates(end, "Profile end"),
        count: samples,
      };
    }
    const samples = dims.map((v) => finite(v, "Plane sample count")) as [
      number,
      number,
    ];
    const widths = extent.map((v) => finite(v, "Plane extent"));
    if (widths.some((v) => v <= 0))
      throw new Error("Plane extents must be positive");
    if (axis === "atoms") {
      if (atoms.length !== 3)
        throw new Error("Select exactly three atoms in plane order");
      return (await props.command("analysis.plane_atoms", {
        atoms,
        extentAngstrom: widths.map((v) => (unit === "angstrom" ? v : v * BOHR)),
        dims: samples,
      })) as AnalysisDefinition;
    }
    const spans = widths.map((v) => v * sourceFactor);
    let u: Vec3, v: Vec3;
    if (axis === "saved" && saved?.kind === "plane") {
      u = saved.u.map(
        (value) => (value * spans[0]) / Math.hypot(...saved.u),
      ) as Vec3;
      v = saved.v.map(
        (value) => (value * spans[1]) / Math.hypot(...saved.v),
      ) as Vec3;
    } else {
      u = axis === "yz" ? [0, spans[0], 0] : [spans[0], 0, 0];
      v = axis === "xy" ? [0, spans[1], 0] : [0, 0, spans[1]];
    }
    const middle = coordinates(center, "Plane center");
    return {
      kind,
      origin: middle.map((value, i) => value - u[i] / 2 - v[i] / 2) as Vec3,
      u,
      v,
      dims: samples,
    };
  };
  const submit = async () => {
    try {
      const request: AnalysisRequest = {
        id: props.editing?.id ?? inspectionId("analysis"),
        label: label.trim() || `${human(kind)} · ${props.field}`,
        field: props.field,
        definition: await definition(),
      };
      await props.command("analysis.create", { request });
      props.onDone();
    } catch (error) {
      props.onError(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <section
      className="workspace-form-grid"
      aria-label="Create quantitative analysis"
    >
      <h3>
        {props.editing
          ? "Edit sampling definition"
          : "Create a numerical analysis"}
      </h3>
      {props.editing && (
        <p className="structure-note">
          Editing starts from saved world coordinates. Choose selected atoms to
          bind a new atom-based definition.
        </p>
      )}
      <label>
        Analysis type
        <select
          aria-label="Analysis type"
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as AnalysisDefinition["kind"])
          }
        >
          <option value="probe">Point probe</option>
          <option value="plane">Plane / contours</option>
          <option value="profile">Line profile</option>
        </select>
      </label>
      <label>
        Analysis label
        <input
          aria-label="Analysis label"
          maxLength={256}
          value={label}
          placeholder={`${human(kind)} · ${props.field}`}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <label>
        Coordinate units
        <select
          aria-label="Analysis coordinate units"
          value={unit}
          onChange={(event) => changeUnit(event.target.value)}
        >
          <option value="angstrom">Å</option>
          <option value="bohr">bohr</option>
        </select>
      </label>
      {kind !== "plane" && (
        <label>
          Positions from
          <select
            aria-label="Analysis position source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="coordinates">Entered coordinates</option>
            <option value="atoms">Selected source atoms</option>
          </select>
        </label>
      )}
      {kind === "probe" && source === "coordinates" && (
        <VectorInputs
          title="Probe"
          value={point}
          unit={unit === "angstrom" ? "Å" : "bohr"}
          onChange={setPoint}
        />
      )}
      {kind === "profile" && (
        <>
          {source === "coordinates" && (
            <>
              <VectorInputs
                title="Profile start"
                value={start}
                unit={unit === "angstrom" ? "Å" : "bohr"}
                onChange={setStart}
              />
              <VectorInputs
                title="Profile end"
                value={end}
                unit={unit === "angstrom" ? "Å" : "bohr"}
                onChange={setEnd}
              />
            </>
          )}
          <label>
            Profile samples
            <input
              type="number"
              aria-label="Profile samples"
              min={2}
              max={4096}
              step={1}
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </label>
        </>
      )}
      {kind === "plane" && (
        <>
          <label>
            Plane orientation
            <select
              aria-label="Plane orientation"
              value={axis}
              onChange={(event) => setAxis(event.target.value)}
            >
              <option value="xy">XY</option>
              <option value="xz">XZ</option>
              <option value="yz">YZ</option>
              <option value="atoms">Three selected atoms</option>
              {saved?.kind === "plane" && (
                <option value="saved">Saved world frame</option>
              )}
            </select>
          </label>
          {axis !== "atoms" && (
            <VectorInputs
              title="Plane center"
              value={center}
              unit={unit === "angstrom" ? "Å" : "bohr"}
              onChange={setCenter}
            />
          )}
          <div className="structure-range">
            {extent.map((value, i) => (
              <label key={i}>
                {i ? "Height" : "Width"} ({unit === "angstrom" ? "Å" : "bohr"})
                <input
                  type="number"
                  step="any"
                  min="0"
                  aria-label={`Plane ${i ? "height" : "width"}`}
                  value={value}
                  onChange={(event) =>
                    setExtent(
                      extent.map((old, index) =>
                        index === i ? event.target.value : old,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <div className="structure-range">
            {dims.map((value, i) => (
              <label key={i}>
                {i ? "Rows" : "Columns"}
                <input
                  type="number"
                  step={1}
                  min={2}
                  max={512}
                  aria-label={`Plane ${i ? "rows" : "columns"}`}
                  value={value}
                  onChange={(event) =>
                    setDims(
                      dims.map((old, index) =>
                        index === i ? event.target.value : old,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
        </>
      )}
      {((source === "atoms" && kind !== "plane") ||
        (axis === "atoms" && kind === "plane")) && (
        <p className="structure-note">
          Selected atom order:{" "}
          {atoms.length ? atoms.map((v) => v + 1).join(" → ") : "none"}. Source
          numbering is one based here.
        </p>
      )}
      <div className="structure-actions">
        <button onClick={() => void submit()} disabled={!props.field}>
          {props.editing ? "Recompute analysis" : `Create ${kind}`}
        </button>
        {props.editing && (
          <button onClick={props.onDone}>Cancel editing</button>
        )}
      </div>
    </section>
  );
}

interface SampleRow {
  index: number;
  value: number | null;
  status: string;
  position: Vec3;
  distanceAngstrom: number | null;
}
interface SamplePage {
  items: SampleRow[];
  total: number;
  offset: number;
  profileLengthAngstrom: number | null;
}
function AnalysisCard({
  item,
  disabled,
  command,
  onEdit,
  onError,
}: {
  item: FieldAnalysisItem;
  disabled: boolean;
  command: Command;
  onEdit: () => void;
  onError: (value: string) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [shown, setShown] = useState(item.appearance.visible);
  const [map, setMap] = useState(item.appearance.colormap);
  const [automatic, setAutomatic] = useState(!item.appearance.range);
  const factor = fieldDisplayFactor(item.descriptor),
    range = fieldAnalysisRange(item);
  const [limits, setLimits] = useState(
    range?.map((v) => String(v * factor)) ?? ["0", "1"],
  );
  const [levels, setLevels] = useState(
    item.appearance.contour_levels.map((v) => v * factor).join(", "),
  );
  const [key, setKey] = useState(item.appearance.show_key),
    [labels, setLabels] = useState(item.appearance.show_labels);
  const [offset, setOffset] = useState(0),
    [samples, setSamples] = useState<SamplePage | null>(null);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const commandRef = useRef(command);
  commandRef.current = command;
  useEffect(() => {
    setLabel(item.label);
    setShown(item.appearance.visible);
    setMap(item.appearance.colormap);
    setAutomatic(!item.appearance.range);
    setLimits(
      fieldAnalysisRange(item)?.map((v) =>
        String(v * fieldDisplayFactor(item.descriptor)),
      ) ?? ["0", "1"],
    );
    setLevels(
      item.appearance.contour_levels
        .map((v) => v * fieldDisplayFactor(item.descriptor))
        .join(", "),
    );
    setKey(item.appearance.show_key);
    setLabels(item.appearance.show_labels);
  }, [item]);
  useEffect(() => {
    if (!samplesOpen && item.definition.kind !== "profile") return;
    let current = true;
    void commandRef
      .current("analysis.samples", { id: item.id, offset, limit: 10 })
      .then((value) => {
        if (current) setSamples(value as SamplePage);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [item, offset, samplesOpen]);
  const act = (method: string, params?: Record<string, unknown>) => {
    void command(method, params).catch(() => {});
  };
  const apply = () => {
    try {
      const rawRange = automatic
        ? undefined
        : limits.map((v) => finite(v, "Scale limit") / factor);
      const contours = levels.trim()
        ? levels
            .trim()
            .split(/[,\s]+/)
            .map((v) => finite(v, "Contour level") / factor)
        : [];
      if (contours.length > 32)
        throw new Error("Use at most 32 contour levels");
      act("analysis.set", {
        id: item.id,
        label,
        automaticRange: automatic,
        appearance: {
          colormap: map,
          show_key: key,
          show_labels: labels,
          contour_levels: contours,
          ...(rawRange ? { range: rawRange } : {}),
        },
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <details
      className="structure-group"
      open
      aria-label={`Analysis result ${item.label}`}
    >
      <summary>
        {item.label} · {human(item.definition.kind)}
      </summary>
      <p className="structure-note">
        {human(item.descriptor.quantity)} · {fieldDisplayUnit(item.descriptor)}{" "}
        · {human(item.method)} · {item.values.length.toLocaleString()} samples
      </p>
      {fieldRenderingIssue(item) && (
        <p className="structure-note" role="status">
          {fieldRenderingIssue(item)}
        </p>
      )}
      {item.definition.kind === "probe" && (
        <output aria-label={`Probe value ${item.label}`}>
          {item.valid[0]
            ? `${numberText(item.values[0] * factor)} ${fieldDisplayUnit(item.descriptor)}`
            : "Outside field domain"}
        </output>
      )}
      {item.definition.kind === "profile" && (
        <ProfilePlot
          item={item}
          length={samples?.profileLengthAngstrom ?? null}
        />
      )}
      <fieldset
        disabled={disabled}
        style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
      >
        <label className="structure-check">
          <input
            type="checkbox"
            aria-label={`Show analysis ${item.label}`}
            checked={shown}
            onChange={(event) => {
              const visible = event.target.checked;
              setShown(visible);
              void command("analysis.set", {
                id: item.id,
                appearance: { visible },
              }).catch(() => setShown(item.appearance.visible));
            }}
          />
          Show in view
        </label>
        <label>
          Result label
          <input
            aria-label={`Result label ${item.label}`}
            maxLength={256}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <label>
          Colormap
          <select
            aria-label={`Colormap ${item.label}`}
            value={map}
            onChange={(event) => setMap(event.target.value)}
          >
            <option value="diverging">Blue / white / red</option>
            <option value="viridis">Viridis</option>
            <option value="grayscale">Grayscale</option>
          </select>
        </label>
        <label className="structure-check">
          <input
            type="checkbox"
            aria-label={`Automatic range ${item.label}`}
            checked={automatic}
            onChange={(event) => setAutomatic(event.target.checked)}
          />
          Automatic sampled range
        </label>
        {!automatic && (
          <div className="structure-range">
            {limits.map((value, i) => (
              <label key={i}>
                {i ? "Maximum" : "Minimum"} ({fieldDisplayUnit(item.descriptor)}
                )
                <input
                  type="number"
                  step="any"
                  aria-label={`Scale ${i ? "maximum" : "minimum"} ${item.label}`}
                  value={value}
                  onChange={(event) =>
                    setLimits(
                      limits.map((old, index) =>
                        index === i ? event.target.value : old,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
        )}
        {item.definition.kind === "plane" && (
          <label>
            Contour levels ({fieldDisplayUnit(item.descriptor)})
            <input
              aria-label={`Contour levels ${item.label}`}
              value={levels}
              placeholder="Comma-separated values"
              onChange={(event) => setLevels(event.target.value)}
            />
          </label>
        )}
        <label className="structure-check">
          <input
            type="checkbox"
            aria-label={`Show numeric key ${item.label}`}
            checked={key}
            onChange={(event) => setKey(event.target.checked)}
          />
          Show numeric key
        </label>
        <label className="structure-check">
          <input
            type="checkbox"
            aria-label={`Show result labels ${item.label}`}
            checked={labels}
            onChange={(event) => setLabels(event.target.checked)}
          />
          Show result labels
        </label>
        <div className="structure-actions">
          <button onClick={apply}>Apply result settings</button>
          <button onClick={onEdit}>Edit sampling</button>
          <button
            onClick={() =>
              act("analysis.create", {
                request: {
                  id: item.id,
                  label: item.label,
                  field: item.field,
                  definition: item.definition,
                  descriptor: item.descriptor,
                },
              })
            }
          >
            Recompute
          </button>
          <button
            onClick={() =>
              act("table.export", { kind: "analysis", id: item.id })
            }
          >
            Export analysis CSV
          </button>
          <button onClick={() => act("analysis.remove", { id: item.id })}>
            Remove analysis
          </button>
        </div>
      </fieldset>
      <details onToggle={(event) => setSamplesOpen(event.currentTarget.open)}>
        <summary>Numerical samples and provenance</summary>
        <p className="structure-note">
          Coordinates below are Å. {human(item.descriptor.origin)}:{" "}
          {item.descriptor.note}
        </p>
        <div style={{ overflowX: "auto", maxHeight: 240 }}>
          <table
            style={{
              fontSize: 10,
              borderCollapse: "collapse",
              width: "100%",
              minWidth: 420,
              whiteSpace: "nowrap",
            }}
            aria-label={`Samples ${item.label}`}
          >
            <thead>
              <tr>
                <th>Sample</th>
                <th>Position (Å)</th>
                {item.definition.kind === "profile" && <th>Distance (Å)</th>}
                <th>Value ({fieldDisplayUnit(item.descriptor)})</th>
              </tr>
            </thead>
            <tbody>
              {samples?.items.map((row) => (
                <tr key={row.index}>
                  <td>{row.index + 1}</td>
                  <td>
                    {row.position
                      ?.map((v) => numberText(v * BOHR))
                      .join(", ") ?? "—"}
                  </td>
                  {item.definition.kind === "profile" && (
                    <td>{numberText(row.distanceAngstrom)}</td>
                  )}
                  <td>
                    {row.value == null
                      ? "Outside field domain"
                      : numberText(row.value * factor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {item.values.length > 10 && (
          <div className="structure-actions">
            <button
              disabled={offset === 0 || disabled}
              onClick={() => setOffset(Math.max(0, offset - 10))}
            >
              Previous samples
            </button>
            <span>
              {offset + 1}–{Math.min(offset + 10, item.values.length)} /{" "}
              {item.values.length}
            </span>
            <button
              disabled={offset + 10 >= item.values.length || disabled}
              onClick={() => setOffset(offset + 10)}
            >
              Next samples
            </button>
          </div>
        )}
        <p className="structure-note">
          Source: <code>{item.source_hash}</code>
          <br />
          Sampler: {item.algorithm}
          <br />
          No values are read from GPU colors.
        </p>
      </details>
    </details>
  );
}

function ProfilePlot({
  item,
  length,
}: {
  item: FieldAnalysisItem;
  length: number | null;
}) {
  const range = fieldAnalysisRange(item);
  if (!range || !item.range)
    return (
      <p className="structure-note">
        The profile has no samples inside the field domain.
      </p>
    );
  const factor = fieldDisplayFactor(item.descriptor);
  let path = "";
  const point = (index: number, value: number) => {
    const x = 42 + (index / (item.values.length - 1)) * 222;
    const y = 125 - fieldValuePosition(value, range) * 105;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };
  for (let index = 0; index < item.values.length - 1; index++) {
    if (!item.valid[index] || !item.valid[index + 1]) continue;
    const a = item.values[index],
      b = item.values[index + 1];
    if (a === b) {
      if (a >= range[0] && a <= range[1])
        path += `M${point(index, a)} L${point(index + 1, b)} `;
      continue;
    }
    // Clip the actual linear segment, rather than moving out-of-range samples
    // onto the axis limits and thereby changing where it crosses the scale.
    const t0 = fieldValuePosition(range[0], [a, b]),
      t1 = fieldValuePosition(range[1], [a, b]);
    const start = Math.max(0, Math.min(t0, t1)),
      end = Math.min(1, Math.max(t0, t1));
    if (start > end) continue;
    const first = start === 0 ? a : a < b ? range[0] : range[1],
      last = end === 1 ? b : a < b ? range[1] : range[0];
    path += `M${point(index + start, first)} L${point(index + end, last)} `;
  }
  return (
    <figure
      style={{ margin: "10px 0", minWidth: 0 }}
      aria-label={`Profile plot ${item.label}`}
    >
      <svg
        viewBox="0 0 280 165"
        role="img"
        aria-label={`Line profile ${item.label}`}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          background: "#f7faf9",
        }}
      >
        <path d="M42 15 V125 H267" fill="none" stroke="#75868b" />
        <path
          d={path}
          fill="none"
          stroke={fieldColor(0.2, item.appearance.colormap).getStyle()}
          strokeWidth={1.7}
        />
        <g fill="#42565a" fontSize={9}>
          <text x={38} y={23} textAnchor="end">
            {numberText(range[1] * factor)}
          </text>
          <text x={38} y={127} textAnchor="end">
            {numberText(range[0] * factor)}
          </text>
          <text x={42} y={140}>
            0
          </text>
          <text x={264} y={140} textAnchor="end">
            {numberText(length)}
          </text>
          <text x={154} y={155} textAnchor="middle">
            Distance along line (Å)
          </text>
          <text x={45} y={11}>
            {fieldDisplayUnit(item.descriptor)}
          </text>
        </g>
      </svg>
      <figcaption className="structure-note">
        {human(item.method)}; gaps indicate points outside the source domain.
      </figcaption>
    </figure>
  );
}
