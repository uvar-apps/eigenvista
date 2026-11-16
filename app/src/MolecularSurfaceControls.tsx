import { useEffect, useRef, useState } from "react";
import { ELEMENTS } from "./elements";
import { inspectionId } from "./inspectionId";
import type { EigenVistaDocument } from "./types";
import type {
  MolecularSurface,
  MolecularSurfaceRequest,
} from "./inspectionTypes";
import "./structure-controls.css";

export interface MolecularSurfaceControlsProps {
  doc: EigenVistaDocument;
  selectedAtoms: number[];
  busy: boolean;
  error: string;
  onCommand: (
    method: string,
    params?: Record<string, unknown>,
  ) => Promise<unknown>;
  onCancel?: () => void;
}

type Source = "all" | "current" | "named" | "saved";
type Override = { element: number; radius: string };
type Command = (
  method: string,
  params?: Record<string, unknown>,
) => Promise<boolean>;
const fieldsetStyle = { border: 0, padding: 0, margin: 0, minWidth: 0 };

const asRequest = (surface: MolecularSurface): MolecularSurfaceRequest => ({
  id: surface.id,
  label: surface.label,
  kind: surface.kind,
  atom_indices: surface.atom_indices,
  radii_set: surface.radii_set,
  radii_overrides: surface.radii_overrides,
  probe_radius: surface.probe_radius,
  spacing: surface.spacing,
  color: surface.color,
  opacity: surface.opacity,
});

type AppearancePatch = Partial<Pick<MolecularSurface, "color" | "opacity">>;
type AppearanceCommand = (
  id: string,
  patch: AppearancePatch,
) => Promise<boolean>;

/** Serialize validated edits, merging newer input instead of queuing every picker event. */
function useLiveAppearance(
  props: MolecularSurfaceControlsProps,
  onError: (error: string) => void,
) {
  const latest = useRef(props);
  latest.current = props;
  const queue = useRef(
    new Map<
      string,
      {
        atoms: EigenVistaDocument["atoms"];
        patch: AppearancePatch;
        resolve: Array<(saved: boolean) => void>;
      }
    >(),
  );
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const apply: AppearanceCommand = (id, patch) =>
    new Promise((resolve) => {
      const previous = queue.current.get(id);
      if (previous && previous.atoms === props.doc.atoms) {
        Object.assign(previous.patch, patch);
        previous.resolve.push(resolve);
      } else {
        previous?.resolve.forEach((finish) => finish(false));
        queue.current.set(id, {
          atoms: props.doc.atoms,
          patch,
          resolve: [resolve],
        });
      }
      if (running.current) return;
      running.current = true;
      setPending(true);
      onError("");
      void (async () => {
        while (queue.current.size) {
          const [key, edit] = queue.current.entries().next().value!;
          queue.current.delete(key);
          let saved = false;
          if (edit.atoms === latest.current.doc.atoms) {
            try {
              await latest.current.onCommand("molecularSurfaces.set", {
                id: key,
                ...edit.patch,
              });
              saved = true;
            } catch (error) {
              onError(error instanceof Error ? error.message : String(error));
            }
          }
          edit.resolve.forEach((finish) => finish(saved));
        }
        running.current = false;
        setPending(false);
      })();
    });
  return { apply, pending };
}

/** Keep in-progress input intact when an earlier validated edit reaches React. */
function useLiveValue(value: string, source: EigenVistaDocument["atoms"]) {
  const [draft, setDraft] = useState(value);
  const current = useRef(value);
  current.current = value;
  const sequence = useRef(0);
  const waiting = useRef(false);
  const invalid = useRef(false);
  const currentSource = useRef(source);
  currentSource.current = source;
  useEffect(() => {
    sequence.current++;
    waiting.current = false;
    invalid.current = false;
    setDraft(value);
  }, [source]);
  useEffect(() => {
    if (!waiting.current) setDraft(value);
  }, [value]);
  const change = async (next: string, save?: () => Promise<boolean>) => {
    setDraft(next);
    const edit = ++sequence.current;
    waiting.current = true;
    invalid.current = !save;
    if (!save) return;
    const saved = await save();
    if (sequence.current !== edit || currentSource.current !== source) return;
    waiting.current = false;
    setDraft(saved ? next : current.current);
  };
  const restore = () => {
    // Empty/out-of-range number input is a draft, never a zero-opacity command.
    if (invalid.current) void change(current.current, async () => true);
  };
  return { draft, change, restore };
}

/** Every GUI operation uses the same controller as the external AI connector. */
export function MolecularSurfaceControls(props: MolecularSurfaceControlsProps) {
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
  const appearance = useLiveAppearance(props, setLocalError);
  const disabled = props.busy || pending;
  return (
    <div
      className="structure-controls"
      aria-label="Molecular surfaces"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <details className="structure-group">
        <summary>Molecular surfaces (SES/SAS)</summary>
        <p className="structure-note">
          Show molecular shape from atom radii: SES is the solvent-excluded
          boundary; SAS follows solvent probe centres. These surfaces do not
          represent electron density.
        </p>
        <p className="structure-note">
          For a clear surface overlay, choose Ball and stick or Liquorice. Van
          der Waals spheres share the SES contact boundary and their overlapping
          triangles can produce patchy artifacts.
        </p>
        {props.busy && props.onCancel && (
          <button onClick={props.onCancel}>Cancel molecular surface</button>
        )}
        {(localError || props.error) && (
          <p className="structure-error" role="alert">
            {localError || props.error}
          </p>
        )}
        <SurfaceForm
          {...props}
          disabled={disabled || appearance.pending}
          command={command}
          onError={setLocalError}
        />
        <h3>Saved molecular surfaces</h3>
        {!props.doc.molecular_surfaces?.length && (
          <p className="structure-note">No molecular surfaces generated yet.</p>
        )}
        <div style={{ maxHeight: 360, overflow: "auto" }}>
          {(props.doc.molecular_surfaces ?? []).map((surface) => (
            <SavedSurface
              key={surface.id}
              surface={surface}
              source={props.doc.atoms}
              disabled={disabled}
              actionsDisabled={disabled || appearance.pending}
              appearance={appearance.apply}
              command={command}
            />
          ))}
        </div>
      </details>
    </div>
  );
}

function SurfaceForm({
  doc,
  selectedAtoms,
  disabled,
  command,
  onError,
}: MolecularSurfaceControlsProps & {
  disabled: boolean;
  command: Command;
  onError: (error: string) => void;
}) {
  const [source, setSource] = useState<Source>("all");
  const [namedId, setNamedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [label, setLabel] = useState("Molecular surface");
  const [kind, setKind] = useState<"ses" | "sas">("ses");
  const [radiiSet, setRadiiSet] = useState<"bondi" | "alvarez">("bondi");
  const [probe, setProbe] = useState("1.4");
  const [spacing, setSpacing] = useState("0.5");
  const [color, setColor] = useState("#8aa7bb");
  const [opacity, setOpacity] = useState("0.8");
  const [overrides, setOverrides] = useState<Override[]>([]);
  useEffect(() => {
    setSource("all");
    setNamedId("");
    setEditingId("");
    setOverrides([]);
  }, [doc.atoms]);
  const surfaces = doc.molecular_surfaces ?? [];
  const editing = surfaces.find((surface) => surface.id === editingId);
  const load = (id: string) => {
    const surface = surfaces.find((value) => value.id === id);
    setEditingId(id);
    if (!surface) {
      setSource("all");
      return;
    }
    setSource("saved");
    setLabel(surface.label);
    setKind(surface.kind);
    setRadiiSet(surface.radii_set);
    setProbe(String(surface.probe_radius));
    setSpacing(String(surface.spacing));
    setColor(surface.color);
    setOpacity(String(surface.opacity));
    setOverrides(
      surface.radii_overrides.map((value) => ({
        element: value.element,
        radius: String(value.radius_angstrom),
      })),
    );
  };
  const generate = async () => {
    onError("");
    const atoms =
      source === "all"
        ? []
        : source === "current"
          ? selectedAtoms
          : source === "saved"
            ? editing?.atom_indices
            : doc.annotations?.selections.find((value) => value.id === namedId)
                ?.atoms;
    if (source !== "all" && !atoms?.length) {
      onError(
        "Choose a nonempty current, named or saved selection before generating a surface.",
      );
      return;
    }
    if (!label.trim()) {
      onError("Enter a surface name.");
      return;
    }
    const radii = overrides.map((value) => ({
      element: value.element,
      radius_angstrom: Number(value.radius),
    }));
    if (
      radii.some(
        (value, index) =>
          !overrides[index].radius.trim() ||
          !Number.isFinite(value.radius_angstrom) ||
          value.radius_angstrom < 0.1 ||
          value.radius_angstrom > 10,
      ) ||
      new Set(radii.map((value) => value.element)).size !== radii.length
    ) {
      onError(
        "Radius overrides require distinct elements and values from 0.1 to 10 Å.",
      );
      return;
    }
    const request: MolecularSurfaceRequest = {
      id: editing?.id ?? inspectionId("molecular"),
      label: label.trim(),
      kind,
      atom_indices: atoms ?? [],
      radii_set: radiiSet,
      radii_overrides: radii,
      probe_radius: Number(probe),
      spacing: Number(spacing),
      color,
      opacity: Number(opacity),
    };
    await command("molecularSurfaces.generate", { request });
  };
  return (
    <fieldset disabled={disabled} style={fieldsetStyle}>
      <label>
        Edit or create
        <select
          aria-label="Molecular surface to edit"
          value={editing?.id ?? ""}
          onChange={(event) => load(event.target.value)}
        >
          <option value="">Create a new surface</option>
          {surfaces.map((surface) => (
            <option key={surface.id} value={surface.id}>
              {surface.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Surface name
        <input
          aria-label="Molecular surface name"
          value={label}
          maxLength={256}
          onChange={(event) => setLabel(event.target.value)}
          style={{ width: "100%" }}
        />
      </label>
      <label>
        Surface type
        <select
          aria-label="Molecular surface type"
          value={kind}
          onChange={(event) => setKind(event.target.value as "ses" | "sas")}
        >
          <option value="ses">Solvent excluded (SES)</option>
          <option value="sas">Solvent accessible (SAS)</option>
        </select>
      </label>
      <label>
        Source atoms
        <select
          aria-label="Molecular surface source"
          value={source}
          onChange={(event) => setSource(event.target.value as Source)}
        >
          <option value="all">
            All {doc.atoms.positions.length} source atoms
          </option>
          <option value="current">
            Current selection ({selectedAtoms.length} atoms)
          </option>
          <option value="named">Named selection</option>
          {editing && (
            <option value="saved">
              Saved surface atoms ({editing.atom_indices.length})
            </option>
          )}
        </select>
      </label>
      {source === "named" && (
        <label>
          Named selection
          <select
            aria-label="Molecular surface named selection"
            value={namedId}
            onChange={(event) => setNamedId(event.target.value)}
          >
            <option value="">Choose a named selection</option>
            {(doc.annotations?.selections ?? []).map((value) => (
              <option key={value.id} value={value.id}>
                {value.label} ({value.atoms.length})
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="structure-note">
        All atoms includes hidden atoms. A selected subset is treated as an
        isolated object, with omitted atoms excluded from the surface
        calculation.
      </p>
      <label>
        Atomic radii
        <select
          aria-label="Molecular surface radii"
          value={radiiSet}
          onChange={(event) =>
            setRadiiSet(event.target.value as "bondi" | "alvarez")
          }
        >
          <option value="bondi">Bondi / Mantina</option>
          <option value="alvarez">Alvarez</option>
        </select>
      </label>
      <label>
        Probe radius (Å)
        <input
          aria-label="Molecular surface probe radius"
          type="number"
          min={0.05}
          max={10}
          step={0.05}
          value={probe}
          onChange={(event) => setProbe(event.target.value)}
        />
      </label>
      <label>
        Grid spacing (Å)
        <input
          aria-label="Molecular surface grid spacing"
          type="number"
          min={0.05}
          max={3}
          step={0.05}
          value={spacing}
          onChange={(event) => setSpacing(event.target.value)}
        />
      </label>
      <p className="structure-note">
        Smaller spacing gives a finer mesh and needs more memory. Cavities are
        retained; spacing is never changed automatically.
      </p>
      <details>
        <summary>Explicit radius overrides</summary>
        <p className="structure-note">
          Missing radii cause an error. Choose another table or provide explicit
          element radii in Å. Supplied hydrogen atoms remain included.
        </p>
        {overrides.map((value, index) => (
          <div
            key={index}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <select
              aria-label={`Radius override element ${index + 1}`}
              value={value.element}
              onChange={(event) =>
                setOverrides(
                  overrides.map((row, i) =>
                    i === index
                      ? { ...row, element: Number(event.target.value) }
                      : row,
                  ),
                )
              }
            >
              {Array.from({ length: 118 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {ELEMENTS[i + 1].symbol} ({i + 1})
                </option>
              ))}
            </select>
            <input
              aria-label={`Radius override value ${index + 1}`}
              type="number"
              min={0.1}
              max={10}
              step={0.01}
              value={value.radius}
              placeholder="Å"
              onChange={(event) =>
                setOverrides(
                  overrides.map((row, i) =>
                    i === index ? { ...row, radius: event.target.value } : row,
                  ),
                )
              }
            />
            <button
              aria-label={`Remove radius override ${index + 1}`}
              onClick={() =>
                setOverrides(overrides.filter((_, i) => i !== index))
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          disabled={overrides.length >= 118}
          onClick={() =>
            setOverrides([...overrides, { element: 6, radius: "" }])
          }
        >
          Add radius override
        </button>
      </details>
      <label>
        Color on generation
        <input
          aria-label="New molecular surface color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </label>
      <label>
        Opacity on generation
        <input
          aria-label="New molecular surface opacity"
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(event) => setOpacity(event.target.value)}
        />
      </label>
      <button onClick={() => void generate()}>
        {editing
          ? "Regenerate molecular surface"
          : "Generate molecular surface"}
      </button>
      {editing && (
        <p className="structure-note">
          Regeneration replaces this cached mesh only after the new calculation
          succeeds.
        </p>
      )}
    </fieldset>
  );
}

function SavedSurface({
  surface,
  source,
  disabled,
  actionsDisabled,
  appearance,
  command,
}: {
  surface: MolecularSurface;
  source: EigenVistaDocument["atoms"];
  disabled: boolean;
  actionsDisabled: boolean;
  appearance: AppearanceCommand;
  command: Command;
}) {
  const [label, setLabel] = useState(surface.label);
  const color = useLiveValue(surface.color, source);
  const opacity = useLiveValue(String(surface.opacity), source);
  const [visible, setVisible] = useState(surface.visible);
  useEffect(() => {
    setLabel(surface.label);
  }, [surface.label, source]);
  useEffect(() => setVisible(surface.visible), [surface.visible, source]);
  return (
    <details className="structure-group">
      <summary>
        {surface.label} · {surface.kind.toUpperCase()} ·{" "}
        {surface.positions.length / 3} vertices
      </summary>
      <fieldset disabled={disabled} style={fieldsetStyle}>
        <label className="structure-check">
          <input
            type="checkbox"
            aria-label={`Show ${surface.label}`}
            checked={visible}
            disabled={actionsDisabled}
            onChange={async (event) => {
              const next = event.target.checked;
              setVisible(next);
              if (
                !(await command("molecularSurfaces.set", {
                  id: surface.id,
                  visible: next,
                }))
              )
                setVisible(surface.visible);
            }}
          />
          Visible
        </label>
        <label>
          Name
          <input
            aria-label={`Name for ${surface.label}`}
            value={label}
            maxLength={256}
            onChange={(event) => setLabel(event.target.value)}
            style={{ width: "100%" }}
          />
        </label>
        <label>
          Color
          <input
            type="color"
            aria-label={`Color for ${surface.label}`}
            value={color.draft}
            onChange={(event) => {
              const next = event.target.value;
              void color.change(next, () =>
                appearance(surface.id, { color: next }),
              );
            }}
          />
        </label>
        <label>
          Opacity
          <input
            type="number"
            aria-label={`Opacity for ${surface.label}`}
            value={opacity.draft}
            min={0}
            max={1}
            step={0.05}
            onChange={(event) => {
              const next = event.target.value;
              const number = Number(next);
              const valid =
                next.trim() !== "" &&
                Number.isFinite(number) &&
                number >= 0 &&
                number <= 1;
              void opacity.change(
                next,
                valid
                  ? () => appearance(surface.id, { opacity: number })
                  : undefined,
              );
            }}
            onBlur={opacity.restore}
          />
        </label>
        <p className="structure-note">
          Color and opacity update the surface immediately.
        </p>
        <button
          disabled={actionsDisabled || !label.trim()}
          onClick={() =>
            void command("molecularSurfaces.set", {
              id: surface.id,
              label: label.trim(),
            })
          }
        >
          Rename surface
        </button>
        <button
          disabled={actionsDisabled}
          onClick={() =>
            void command("molecularSurfaces.generate", {
              request: asRequest(surface),
            })
          }
        >
          Regenerate saved mesh
        </button>
        <button
          disabled={actionsDisabled}
          onClick={() =>
            void command("molecularSurfaces.remove", { id: surface.id })
          }
        >
          Remove molecular surface
        </button>
      </fieldset>
      <p className="structure-note">
        {surface.atom_indices.length} atoms ·{" "}
        {surface.radii_set === "bondi" ? "Bondi / Mantina" : "Alvarez"} radii ·
        probe {surface.probe_radius} Å · spacing {surface.spacing} Å · cavities
        kept
      </p>
      <p className="structure-note">
        Area {surface.stats.area_angstrom2.toFixed(2)} Å² · volume{" "}
        {surface.stats.volume_angstrom3.toFixed(2)} Å³ ·{" "}
        {surface.stats.components} components
      </p>
      <details>
        <summary>Scientific provenance</summary>
        <p className="structure-note">
          {surface.engine}
          <br />
          {surface.precision}
          <br />
          Source: {surface.source_hash}
        </p>
      </details>
      {surface.warnings.map((warning, index) => (
        <p key={index} className="structure-note">
          {warning}
        </p>
      ))}
    </details>
  );
}
