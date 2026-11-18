import { useRef } from "react";

/** Keep numeric drafts local to the editor until a step or Enter commits them. */
export function PlaneNumberInput({
  label,
  value,
  step = 0.1,
  min,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  step?: number;
  min?: number;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  const intent = useRef<"text" | "step">("text");
  return (
    <input
      type="number"
      aria-label={label}
      value={value}
      step={step}
      min={min}
      onPointerDown={() => {
        intent.current = "step";
      }}
      onBeforeInput={(event) => {
        // Native steppers may also emit beforeinput. Actual inserted text (IME
        // included) is a draft; keyboard deletion and paste are tracked below.
        if ((event.nativeEvent as InputEvent).data != null)
          intent.current = "text";
      }}
      onPaste={() => {
        intent.current = "text";
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
        } else {
          intent.current =
            event.key === "ArrowUp" || event.key === "ArrowDown"
              ? "step"
              : "text";
        }
      }}
      onChange={(event) => {
        onChange(event.target.value);
        if (intent.current === "step") onCommit();
      }}
    />
  );
}
