import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Expand,
  Maximize,
  Minimize,
  PanelLeftOpen,
  PanelRightOpen,
  X,
} from "lucide-react";
import { PanelStack } from "./PanelSidebar";
import { PanelSection } from "./PanelSection";
import { MolecularSurfaceProgress } from "./MolecularSurfaceProgress";
import type { InspectionProgress } from "./inspectionProgress";
import {
  useWorkspacePane,
  workspaceTabs,
  type ExtraPanel,
  type WorkspaceTab,
} from "./useWorkspacePane";
import "./workspace-pane.css";

interface WorkspaceProps {
  enabled: boolean;
  children: ReactNode;
  tools: Record<ExtraPanel, ReactNode>;
  context: string;
  unsaved: boolean;
  busy: string;
  cancellable: boolean;
  progress?: string;
  molecularProgress?: InspectionProgress | null;
  warnings: number;
  onCancel: () => void;
}
const extraTitles: Record<ExtraPanel, string> = {
  geometry: "Selections and measurements",
  analysis: "Quantitative field inspection",
  molecular: "Molecular surfaces",
};
const tabs = Object.keys(workspaceTabs) as WorkspaceTab[];
const existingPanels = (sidebar: ReactNode): Record<string, ReactNode> => {
  const result: Record<string, ReactNode> = {};
  if (!isValidElement<{ children?: ReactNode }>(sidebar)) return result;
  Children.forEach(sidebar.props.children, (child) => {
    if (isValidElement<{ id?: string }>(child))
      result[child.props.id ?? String(child.key ?? "")] = child;
  });
  return result;
};

/** Retain the explicit legacy comparison alongside the approved default pane. */
export function WorkspaceFrame(props: WorkspaceProps) {
  return props.enabled ? (
    <WorkspacePane {...props} />
  ) : (
    <main>{props.children}</main>
  );
}

function WorkspacePane(props: WorkspaceProps) {
  const w = useWorkspacePane();
  const pane = useRef<HTMLDivElement>(null),
    launcher = useRef<HTMLButtonElement>(null),
    zenExit = useRef<HTMLButtonElement>(null);
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null);
  const previous = useRef({ zen: w.zen, open: w.toolsOpen });
  const scrollPositions = useRef<Partial<Record<WorkspaceTab, number>>>({});
  useLayoutEffect(() => {
    if (!w.toolsOpen) return;
    // WebKit can reset an overflow element when its tab becomes display:none.
    const stack = pane.current?.querySelector<HTMLElement>(
      "#workspace-taskpanel-" + w.tab + " .workspace-widgets",
    );
    if (stack) stack.scrollTop = scrollPositions.current[w.tab] ?? 0;
  }, [w.tab, w.toolsOpen, w.side]);
  useLayoutEffect(() => {
    // Only the three stateless chrome buttons are portalled; every tool and the viewport retain their parent.
    setToolbar(
      w.rootRef.current
        ?.closest(".application")
        ?.querySelector<HTMLElement>(".file-actions") ?? null,
    );
  }, []);
  useLayoutEffect(() => {
    if (w.zen && !previous.current.zen) zenExit.current?.focus();
    else if (
      (!w.zen && previous.current.zen) ||
      (!w.toolsOpen && previous.current.open)
    )
      launcher.current?.focus();
    previous.current = { zen: w.zen, open: w.toolsOpen };
  }, [w.zen, w.toolsOpen]);
  useEffect(() => {
    if (!w.toolsOpen) return;
    for (const id of Object.keys(extraTitles) as ExtraPanel[]) {
      if (
        !(workspaceTabs[w.tab].panels as readonly string[]).includes(id) ||
        !w.expanded[id]
      )
        continue;
      const details = pane.current?.querySelector<HTMLDetailsElement>(
        '[data-panel-id="' + id + '"] details.structure-group',
      );
      if (details) details.open = true;
    }
  }, [w.tab, w.expanded, w.toolsOpen]);

  const columns = Children.toArray(props.children);
  const panels = {
    ...existingPanels(columns[0]),
    ...existingPanels(columns[2]),
  };
  for (const id of Object.keys(extraTitles) as ExtraPanel[])
    panels[id] = (
      <PanelSection
        key={id}
        id={id}
        title={extraTitles[id]}
        expanded={w.expanded[id]}
        onToggle={() => w.toggleExtra(id)}
        className="workspace-extra"
      >
        {props.tools[id]}
      </PanelSection>
    );
  const tabKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const index = tabs.indexOf(w.tab);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + tabs.length - 1) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    w.setTab(tabs[next]);
    document.getElementById("workspace-task-" + tabs[next])?.focus();
  };
  const fullscreenButton = (
    <button
      onClick={() => void w.toggleFullscreen()}
      aria-label={w.fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={w.fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {w.fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
    </button>
  );
  return (
    <main
      className="workspace-lab"
      data-side={w.side}
      data-tools-open={w.toolsOpen}
      data-zen={w.zen}
      style={{ "--workspace-width": w.width + "px" } as CSSProperties}
    >
      {toolbar &&
        createPortal(
          <div className="workspace-header-actions">
            <button
              ref={launcher}
              aria-label={w.toolsOpen ? "Hide tools" : "Show tools"}
              title="Show or hide tools (Shift+T)"
              onClick={w.toolsOpen ? w.hideTools : w.showTools}
            >
              {w.side === "left" ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelRightOpen size={17} />
              )}
            </button>
            <button
              onClick={w.toggleZen}
              aria-label="Zen mode"
              title="Zen mode (Shift+Z)"
            >
              <Expand size={17} />
            </button>
            {fullscreenButton}
          </div>,
          toolbar,
        )}
      <div className="workspace-stage" ref={w.rootRef}>
        {columns[1]}
        <div
          className="workspace-tools-host"
          role="region"
          aria-label="Workspace tools"
          hidden={!w.toolsOpen}
          ref={pane}
        >
          <div
            className="workspace-pane-grip"
            role="separator"
            tabIndex={0}
            aria-label="Resize tool dock"
            aria-orientation="vertical"
            aria-valuenow={Math.round(w.width)}
            aria-valuemin={w.range.min}
            aria-valuemax={w.range.max}
            aria-valuetext={Math.round(w.width) + " pixels"}
            onPointerDown={w.resize}
            onKeyDown={w.resizeKeys}
          />
          <div className="workspace-pane-heading">
            <h2>Tools</h2>
            <label>
              Position{" "}
              <select
                aria-label="Workspace pane side"
                value={w.side}
                onChange={(event) =>
                  w.setSide(event.target.value as "left" | "right")
                }
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
            <button
              aria-label="Close tools"
              title="Close tools"
              onClick={w.hideTools}
            >
              <X size={17} />
            </button>
          </div>
          <div
            className="workspace-pane-tabs"
            role="tablist"
            aria-label="Workspace tasks"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                id={"workspace-task-" + tab}
                aria-controls={"workspace-taskpanel-" + tab}
                aria-selected={w.tab === tab}
                tabIndex={w.tab === tab ? 0 : -1}
                onClick={() => w.setTab(tab)}
                onKeyDown={tabKeys}
              >
                {workspaceTabs[tab].label}
              </button>
            ))}
          </div>
          {tabs.map((tab) => (
            <div
              key={tab}
              className="workspace-tab-panel"
              role="tabpanel"
              id={"workspace-taskpanel-" + tab}
              aria-labelledby={"workspace-task-" + tab}
              hidden={w.tab !== tab}
              onScrollCapture={(event) => {
                const stack = event.target;
                if (
                  w.toolsOpen &&
                  w.tab === tab &&
                  stack instanceof HTMLElement &&
                  stack.classList.contains("workspace-widgets") &&
                  stack.clientHeight > 0
                )
                  scrollPositions.current[tab] = stack.scrollTop;
              }}
            >
              <PanelStack
                scope={"workspace-" + tab}
                order={w.order[tab]}
                onMove={(id, target) => w.moveWidget(tab, id, target)}
                className="workspace-widgets"
                label={workspaceTabs[tab].label + " widgets"}
              >
                {workspaceTabs[tab].panels.map((id) => panels[id])}
              </PanelStack>
            </div>
          ))}
        </div>
        {w.zen && (
          <div className="workspace-zen-controls" aria-label="Zen controls">
            <button
              ref={zenExit}
              onClick={w.exitZen}
              aria-label="Exit Zen mode"
            >
              <Expand size={16} />
              Exit Zen <kbd>Esc</kbd>
            </button>
            <button onClick={w.showTools} aria-label="Show tools">
              <PanelRightOpen size={16} />
              Tools
            </button>
            {fullscreenButton}
            <span title={props.context}>
              {props.context}
              {props.unsaved ? " · unsaved" : ""}
              {props.warnings ? " · " + props.warnings + " warnings" : ""}
            </span>
          </div>
        )}
        {(props.busy || props.progress) && (
          <div
            className="workspace-activity"
            role="status"
            aria-label="Workspace activity"
          >
            {props.molecularProgress ? (
              <MolecularSurfaceProgress
                progress={props.molecularProgress}
                compact
              />
            ) : (
              <span>{props.progress || props.busy}</span>
            )}
            {props.cancellable && (
              <button onClick={props.onCancel}>Cancel calculation</button>
            )}
          </div>
        )}
        {w.fullscreenError && (
          <div className="workspace-fullscreen-notice" role="alert">
            {w.fullscreenError}
          </div>
        )}
      </div>
    </main>
  );
}
