import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { panelIds, PanelReorderHandle, type PanelId } from "./PanelSidebar";
type Expansion = Record<PanelId, boolean>;
const storageKey = "eigenvista:panel-expansion:v1";

function readExpansion(): Expansion {
  const expanded = Object.fromEntries(
    panelIds.map((id) => [id, true]),
  ) as Expansion;
  try {
    const text = localStorage.getItem(storageKey);
    // This preference contains eight booleans; do not parse an unbounded value.
    if (!text || text.length > 1024) return expanded;
    const stored: unknown = JSON.parse(text);
    if (!stored || typeof stored !== "object" || Array.isArray(stored))
      return expanded;
    for (const id of panelIds) {
      const value = (stored as Record<string, unknown>)[id];
      if (typeof value === "boolean") expanded[id] = value;
    }
  } catch {
    // Restricted or corrupt browser storage must not prevent using the app.
  }
  return expanded;
}

export function usePanelExpansion() {
  const [expanded, setExpanded] = useState(readExpansion);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(expanded));
    } catch {
      // Keep the in-memory preference when profile storage is unavailable/full.
    }
  }, [expanded]);
  return {
    expanded,
    toggle: (id: PanelId) =>
      setExpanded((current) => ({ ...current, [id]: !current[id] })),
  };
}

export function PanelSection({
  id,
  title,
  expanded,
  onToggle,
  forceOpen = false,
  count,
  headerAction,
  className = "",
  children,
}: {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  forceOpen?: boolean;
  count?: number;
  headerAction?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const open = expanded || forceOpen;
  const contentId = `panel-${id}-content`;
  return (
    <section className={`panel-section ${className}`} data-panel-id={id}>
      <div className="section-title">
        <h2 aria-label={count === undefined ? undefined : `${title} ${count}`}>
          <button
            type="button"
            className="panel-disclosure"
            aria-label={title}
            aria-expanded={open}
            aria-controls={contentId}
            disabled={forceOpen}
            title={
              forceOpen
                ? "Calculation controls stay open while busy"
                : undefined
            }
            onClick={onToggle}
          >
            {title}
            {count !== undefined && (
              <span className="panel-count">{count}</span>
            )}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </h2>
        {headerAction}
        <PanelReorderHandle id={id} title={title} />
      </div>
      <div className="panel-body" id={contentId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
