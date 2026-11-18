import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type PointerEventHandler,
} from "react";

export const workspaceTabs = {
  molecule: {
    label: "Molecule",
    panels: ["document", "geometry", "provenance"],
  },
  fields: {
    label: "Fields",
    panels: ["quantum-fields", "field-rendering", "analysis"],
  },
  surfaces: { label: "Surfaces", panels: ["molecular", "saved-surfaces"] },
  appearance: {
    label: "Appearance",
    panels: ["appearance", "atom-colours", "surface-shader"],
  },
} as const;
export type WorkspaceTab = keyof typeof workspaceTabs;
export type ExtraPanel = "geometry" | "analysis" | "molecular";
type Side = "left" | "right";
type Preferences = {
  version: 1;
  side: Side;
  tab: WorkspaceTab;
  open: boolean;
  width: number;
  order: Record<WorkspaceTab, string[]>;
  expanded: Record<ExtraPanel, boolean>;
};
const storageKey = "eigenvista:workspace-pane:v1";
const tabs = Object.keys(workspaceTabs) as WorkspaceTab[];
const defaults = (): Preferences => ({
  version: 1,
  side: "right",
  tab: "molecule",
  open: true,
  width: 480,
  order: Object.fromEntries(
    tabs.map((tab) => [tab, [...workspaceTabs[tab].panels]]),
  ) as Preferences["order"],
  expanded: { geometry: false, analysis: false, molecular: true },
});
const readPreferences = (): Preferences => {
  const result = defaults();
  try {
    const text = localStorage.getItem(storageKey);
    if (!text) return result;
    const value = JSON.parse(text);
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      value.version !== 1
    )
      return result;
    if (value.side === "left" || value.side === "right")
      result.side = value.side;
    if (tabs.includes(value.tab)) result.tab = value.tab;
    if (typeof value.open === "boolean") result.open = value.open;
    if (
      typeof value.width === "number" &&
      Number.isFinite(value.width) &&
      value.width >= 0 &&
      value.width <= 16384
    )
      result.width = value.width;
    for (const tab of tabs) {
      const order = value.order?.[tab],
        members = workspaceTabs[tab].panels as readonly string[];
      if (
        Array.isArray(order) &&
        order.length === members.length &&
        new Set(order).size === members.length &&
        order.every((id) => typeof id === "string" && members.includes(id))
      )
        result.order[tab] = order;
    }
    for (const panel of Object.keys(result.expanded) as ExtraPanel[])
      if (typeof value.expanded?.[panel] === "boolean")
        result.expanded[panel] = value.expanded[panel];
  } catch {
    /* Presentation storage is optional. */
  }
  return result;
};
const editable = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest(
    "input,textarea,select,[contenteditable]:not([contenteditable='false'])",
  );
const modalOpen = () =>
  [
    ...document.querySelectorAll(
      "dialog[open],[role='dialog'][aria-modal='true']",
    ),
  ].some((element) => {
    if (!element.getClientRects().length) return false;
    if (element.tagName !== "DIALOG") return true;
    try {
      return element.matches(":modal");
    } catch {
      return true;
    }
  });

/** One bounded pane preference; documents, calculations and tool drafts stay with their existing owners. */
export function useWorkspacePane() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [prefs, setPrefs] = useState(readPreferences);
  const [zen, setZen] = useState(false);
  const [hostWidth, setHostWidth] = useState(1320);
  const current = useRef({ prefs, zen, hostWidth });
  current.current = { prefs, zen, hostWidth };
  const drag = useRef<(() => void) | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const limits = (width: number) => ({
    min: Math.min(320, width),
    max: Math.max(
      Math.min(320, width),
      width >= 900 ? width - 480 : width - 16,
    ),
  });
  const clamp = (width: number, host: number) => {
    const range = limits(host);
    return Math.max(range.min, Math.min(range.max, width));
  };
  const update = (change: (old: Preferences) => Preferences) =>
    setPrefs((old) => {
      const next = change(old);
      return { ...next, width: clamp(next.width, current.current.hostWidth) };
    });
  const stopDrag = () => drag.current?.();

  useLayoutEffect(() => {
    const host = rootRef.current;
    if (!host) return;
    const measure = () => {
      const width = host.getBoundingClientRect().width;
      if (!(width > 0 && Number.isFinite(width))) return;
      current.current.hostWidth = width;
      setHostWidth(width);
      setPrefs((old) => ({ ...old, width: clamp(old.width, width) }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => {
      observer.disconnect();
      stopDrag();
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    } catch {
      /* Keep in-memory preferences. */
    }
  }, [prefs]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        editable(event.target) ||
        modalOpen()
      )
        return;
      if (
        event.key === "Escape" &&
        current.current.zen &&
        !document.fullscreenElement
      ) {
        event.preventDefault();
        setZen(false);
      } else if (event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        stopDrag();
        setZen((old) => !old);
      } else if (event.shiftKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        stopDrag();
        if (current.current.zen) {
          setZen(false);
          update((old) => ({ ...old, open: true }));
        } else update((old) => ({ ...old, open: !old.open }));
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      stopDrag();
    };
  }, []);
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const resize: PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    stopDrag();
    event.preventDefault();
    const element = event.currentTarget,
      pointer = event.pointerId,
      startX = event.clientX;
    const start = current.current.prefs.width,
      direction = current.current.prefs.side === "left" ? 1 : -1;
    const doc = element.ownerDocument,
      oldSelection = doc.body.style.userSelect;
    doc.body.style.userSelect = "none";
    element.focus({ preventScroll: true });
    try {
      element.setPointerCapture(pointer);
    } catch {
      /* Document listeners still own completion. */
    }
    const move = (next: PointerEvent) => {
      if (next.pointerId !== pointer) return;
      next.preventDefault();
      update((old) => ({
        ...old,
        width: start + direction * (next.clientX - startX),
      }));
    };
    const finish = (next?: PointerEvent) => {
      if (next && next.pointerId !== pointer) return;
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", finish);
      doc.removeEventListener("pointercancel", finish);
      element.removeEventListener("lostpointercapture", finish);
      doc.defaultView?.removeEventListener("blur", blur);
      doc.body.style.userSelect = oldSelection;
      drag.current = null;
      try {
        if (element.hasPointerCapture(pointer))
          element.releasePointerCapture(pointer);
      } catch {
        /* Already detached. */
      }
    };
    const blur = () => finish();
    drag.current = finish;
    doc.addEventListener("pointermove", move, { passive: false });
    doc.addEventListener("pointerup", finish);
    doc.addEventListener("pointercancel", finish);
    element.addEventListener("lostpointercapture", finish);
    doc.defaultView?.addEventListener("blur", blur);
  };
  const resizeKeys: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    )
      return;
    event.preventDefault();
    const range = limits(current.current.hostWidth),
      direction = current.current.prefs.side === "left" ? 1 : -1,
      step = event.shiftKey ? 40 : 10;
    update((old) => ({
      ...old,
      width:
        event.key === "Home"
          ? range.min
          : event.key === "End"
            ? range.max
            : old.width +
              direction * (event.key === "ArrowLeft" ? -step : step),
    }));
  };
  const toggleFullscreen = async () => {
    stopDrag();
    setFullscreenError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        const element = rootRef.current?.closest<HTMLElement>(".application");
        if (!document.fullscreenEnabled || !element?.requestFullscreen)
          throw new Error("Fullscreen is unavailable in this browser.");
        await element.requestFullscreen();
      }
    } catch (error) {
      setFullscreenError(
        error instanceof Error ? error.message : String(error),
      );
    }
    setFullscreen(Boolean(document.fullscreenElement));
  };
  return {
    rootRef,
    ...prefs,
    toolsOpen: prefs.open && !zen,
    zen,
    fullscreen,
    fullscreenError,
    range: limits(hostWidth),
    resize,
    resizeKeys,
    toggleFullscreen,
    setSide: (side: Side) => {
      stopDrag();
      if (side === "left" || side === "right")
        update((old) => ({ ...old, side }));
    },
    setTab: (tab: WorkspaceTab) => {
      if (tabs.includes(tab)) update((old) => ({ ...old, tab }));
    },
    showTools: () => {
      stopDrag();
      setZen(false);
      update((old) => ({ ...old, open: true }));
    },
    hideTools: () => {
      stopDrag();
      update((old) => ({ ...old, open: false }));
    },
    toggleZen: () => {
      stopDrag();
      setZen((old) => !old);
    },
    exitZen: () => setZen(false),
    toggleExtra: (panel: ExtraPanel) =>
      update((old) => ({
        ...old,
        expanded: { ...old.expanded, [panel]: !old.expanded[panel] },
      })),
    moveWidget: (tab: WorkspaceTab, id: string, destination: number) =>
      update((old) => {
        const order = old.order[tab],
          index = order.indexOf(id),
          target = Math.max(0, Math.min(order.length - 1, destination));
        if (index < 0 || index === target) return old;
        const next = [...order];
        next.splice(index, 1);
        next.splice(target, 0, id);
        return { ...old, order: { ...old.order, [tab]: next } };
      }),
  };
}
