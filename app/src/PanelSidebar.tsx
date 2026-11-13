import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

const paneIds = {
  left: ["document", "quantum-fields", "provenance"],
  right: [
    "field-rendering",
    "appearance",
    "atom-colours",
    "surface-shader",
    "saved-surfaces",
  ],
} as const;
export const panelIds = [...paneIds.left, ...paneIds.right] as const;
export type PanelId = (typeof panelIds)[number];
type Pane = keyof typeof paneIds;
type Order = Record<Pane, PanelId[]>;
const storageKey = "eigenvista:panel-order:v1";
const dragType = "application/x-eigenvista-panel";

function readOrder(): Order {
  const order: Order = { left: [...paneIds.left], right: [...paneIds.right] };
  try {
    const text = localStorage.getItem(storageKey);
    if (!text || text.length > 1024) return order;
    const stored: unknown = JSON.parse(text);
    if (!stored || typeof stored !== "object" || Array.isArray(stored))
      return order;
    for (const pane of ["left", "right"] as const) {
      const candidate: unknown = (stored as Record<string, unknown>)[pane];
      if (
        Array.isArray(candidate) &&
        candidate.length === paneIds[pane].length &&
        new Set(candidate).size === candidate.length &&
        candidate.every((id) => typeof id === "string" && panelInPane(pane, id))
      ) {
        order[pane] = candidate as PanelId[];
      }
    }
  } catch {
    // Profile storage is optional; keep a usable layout if denied or corrupt.
  }
  return order;
}

function panelInPane(pane: Pane, id: string): id is PanelId {
  return (paneIds[pane] as readonly string[]).includes(id);
}

/** This preference is separate from documents, workers and disclosure state. */
export function usePanelOrder() {
  const [order, setOrder] = useState(readOrder);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(order));
    } catch {
      // Restricted/full storage must not disable in-memory ordering.
    }
  }, [order]);
  function move(pane: Pane, id: PanelId, destination: number) {
    setOrder((current) => {
      if (!panelInPane(pane, id)) return current;
      const source = current[pane].indexOf(id);
      const target = Math.max(
        0,
        Math.min(current[pane].length - 1, destination),
      );
      if (source < 0 || source === target) return current;
      const next = [...current[pane]];
      next.splice(source, 1);
      next.splice(target, 0, id);
      return { ...current, [pane]: next };
    });
  }
  return { order, move };
}

interface SidebarOrder {
  pane: Pane;
  order: PanelId[];
  move: (id: PanelId, destination: number, title: string) => void;
  startDrag: (event: DragEvent<HTMLButtonElement>, id: PanelId) => void;
  endDrag: () => void;
}
const SidebarContext = createContext<SidebarOrder | null>(null);

/** Keyed siblings are sorted in the real DOM without remounting their bodies. */
export function PanelSidebar({
  pane,
  order,
  onMove,
  children,
}: {
  pane: Pane;
  order: PanelId[];
  onMove: ReturnType<typeof usePanelOrder>["move"];
  children: ReactNode;
}) {
  const sidebar = useRef<HTMLElement>(null);
  const focusAfterMove = useRef<PanelId | null>(null);
  const [dragging, setDragging] = useState<PanelId | null>(null);
  const [announcement, setAnnouncement] = useState({ text: "", sequence: 0 });
  const sections = new Map<PanelId, ReactNode>();
  Children.forEach(children, (child) => {
    if (
      isValidElement(child) &&
      typeof child.key === "string" &&
      panelInPane(pane, child.key)
    )
      sections.set(child.key, child);
  });

  function focusHandle(id: PanelId) {
    const handle = sidebar.current?.querySelector<HTMLButtonElement>(
      `[data-panel-reorder="${id}"]`,
    );
    handle?.focus({ preventScroll: true });
    handle?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  useLayoutEffect(() => {
    if (focusAfterMove.current) {
      focusHandle(focusAfterMove.current);
      focusAfterMove.current = null;
    }
  }, [order]);

  function move(id: PanelId, destination: number, title: string) {
    const index = order.indexOf(id);
    const target = Math.max(0, Math.min(order.length - 1, destination));
    if (index < 0) return;
    setAnnouncement((current) => ({
      text: `${title}, position ${target + 1} of ${order.length} in ${pane} sidebar`,
      sequence: current.sequence + 1,
    }));
    if (index === target) {
      focusHandle(id);
      return;
    }
    focusAfterMove.current = id;
    onMove(pane, id, target);
  }

  function dropTarget(event: DragEvent<HTMLElement>) {
    if (!dragging || !event.dataTransfer.types.includes(dragType)) return null;
    const section =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-panel-id]")
        : null;
    const id = section?.dataset.panelId;
    if (
      !section ||
      !event.currentTarget.contains(section) ||
      !id ||
      !panelInPane(pane, id)
    )
      return null;
    return { section, id };
  }

  function drop(event: DragEvent<HTMLElement>) {
    const target = dropTarget(event);
    if (!target) return;
    event.preventDefault();
    setDragging(null);
    try {
      const text = event.dataTransfer.getData(dragType);
      if (!text || text.length > 128) return;
      const payload: unknown = JSON.parse(text);
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        return;
      const data = payload as Record<string, unknown>;
      if (
        Object.keys(data).length !== 2 ||
        data.pane !== pane ||
        data.id !== dragging ||
        !dragging
      )
        return;
      if (dragging === target.id) return;
      event.stopPropagation();
      const remaining = order.filter((id) => id !== dragging);
      const rect = target.section.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      const destination = remaining.indexOf(target.id) + (after ? 1 : 0);
      const title = sidebar.current?.querySelector<HTMLButtonElement>(
        `[data-panel-reorder="${dragging}"]`,
      )?.dataset.panelTitle;
      move(dragging, destination, title ?? dragging);
    } catch {
      // Foreign or malformed drag payloads must never change the layout.
    }
  }

  return (
    <aside
      ref={sidebar}
      className={`${pane}-panel`}
      aria-label={`${pane === "left" ? "Left" : "Right"} sidebar`}
      onDragOver={(event) => {
        if (dropTarget(event)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={drop}
    >
      <span
        id={`panel-order-${pane}-instructions`}
        className="panel-order-accessible"
      >
        Use Arrow Up or Arrow Down to move this section. Home moves it first and
        End moves it last. Press Enter or Space for move buttons, or drag the
        handle within this sidebar.
      </span>
      <div
        className="panel-order-accessible"
        role="status"
        aria-label={`${pane === "left" ? "Left" : "Right"} sidebar order`}
        aria-live="polite"
        aria-atomic="true"
      >
        <span key={announcement.sequence}>{announcement.text}</span>
      </div>
      <SidebarContext.Provider
        value={{
          pane,
          order,
          move,
          startDrag: (event, id) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(dragType, JSON.stringify({ pane, id }));
            setDragging(id);
          },
          endDrag: () => setDragging(null),
        }}
      >
        {order.map((id) => sections.get(id))}
      </SidebarContext.Provider>
    </aside>
  );
}

export function PanelReorderHandle({
  id,
  title,
}: {
  id: PanelId;
  title: string;
}) {
  const sidebar = useContext(SidebarContext);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!sidebar) return null;
  const index = sidebar.order.indexOf(id);
  const menuId = `panel-${id}-move-controls`;
  return (
    <div
      className="panel-reorder"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen(false);
          event.currentTarget
            .querySelector<HTMLButtonElement>(".panel-reorder-handle")
            ?.focus({ preventScroll: true });
        }
      }}
    >
      <button
        type="button"
        draggable
        className="panel-reorder-handle"
        data-panel-reorder={id}
        data-panel-title={title}
        aria-label={`Reorder ${title}`}
        title={`Reorder ${title}`}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-describedby={`panel-order-${sidebar.pane}-instructions panel-${id}-position`}
        onDragStart={(event) => {
          setMenuOpen(false);
          sidebar.startDrag(event, id);
        }}
        onDragEnd={sidebar.endDrag}
        onClick={() => setMenuOpen((current) => !current)}
        onKeyDown={(event) => {
          const destination = {
            ArrowUp: index - 1,
            ArrowDown: index + 1,
            Home: 0,
            End: sidebar.order.length - 1,
          }[event.key];
          if (destination !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            sidebar.move(id, destination, title);
          }
        }}
      >
        <GripVertical size={15} aria-hidden="true" />
      </button>
      <span id={`panel-${id}-position`} className="panel-order-accessible">
        {title}, position {index + 1} of {sidebar.order.length} in{" "}
        {sidebar.pane} sidebar
      </span>
      <div id={menuId} className="panel-reorder-menu" hidden={!menuOpen}>
        <button
          type="button"
          aria-label={`Move ${title} up`}
          disabled={index === 0}
          onClick={() => sidebar.move(id, index - 1, title)}
        >
          <ArrowUp size={13} aria-hidden="true" /> Move up
        </button>
        <button
          type="button"
          aria-label={`Move ${title} down`}
          disabled={index === sidebar.order.length - 1}
          onClick={() => sidebar.move(id, index + 1, title)}
        >
          <ArrowDown size={13} aria-hidden="true" /> Move down
        </button>
      </div>
    </div>
  );
}
