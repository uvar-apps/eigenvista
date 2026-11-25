import type { Surface } from "./types";

export type PotentialAppearance = { enabled?: boolean; range?: number };

export function SurfacePotentialControls({
  surface,
  disabled,
  onChange,
}: {
  surface: Surface;
  disabled: boolean;
  onChange: (patch: PotentialAppearance) => void;
}) {
  const map = surface.electrostatic_potential!;
  return (
    <div className="surface-potential-controls">
      <label className="check">
        <input
          type="checkbox"
          checked={map.enabled}
          disabled={disabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
        />
        Show electrostatic potential
      </label>
      <label>
        Color range ± (hartree/e)
        <input
          key={map.range}
          type="number"
          aria-label={`Potential range for ${surface.label}`}
          defaultValue={map.range}
          step="any"
          disabled={disabled}
          onBlur={(event) => {
            const range = event.target.valueAsNumber;
            if (Number.isFinite(range) && range > 0) onChange({ range });
            else event.target.value = String(map.range);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>
    </div>
  );
}
