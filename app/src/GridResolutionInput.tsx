import { useEffect, useState } from "react";
import { isGridResolution } from "./resolution";

/** Keep edits local: a calculation starts only after a complete value is applied. */
export function GridResolutionInput({
  value,
  disabled,
  label,
  onApply,
}: {
  value: number;
  disabled?: boolean;
  label: string;
  onApply(value: number): void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const parsed = Number(draft);
  const valid = draft.trim() !== "" && isGridResolution(parsed);
  return (
    <input
      type="number"
      aria-label={label}
      min={2}
      step={1}
      value={draft}
      disabled={disabled}
      aria-invalid={!valid}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (valid && parsed !== value) onApply(parsed);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}
