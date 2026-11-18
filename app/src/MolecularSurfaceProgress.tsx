import { useEffect, useState } from "react";
import {
  molecularSurfacePhase,
  type InspectionProgress,
} from "./inspectionProgress";
import "./molecular-surface-progress.css";

/** Stage-local completion comes from the engine; elapsed time is not an ETA. */
export function MolecularSurfaceProgress({
  progress,
  compact = false,
}: {
  progress: InspectionProgress;
  compact?: boolean;
}) {
  const molecular = progress.operation === "molecularSurfaces.generate";
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!molecular) return;
    const update = () => setNow(performance.now());
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [molecular, progress.started]);

  if (!molecular) return null;
  const phase = molecularSurfacePhase(progress.stage);
  // The other engine phases report only start/end (0/1), not measured work.
  const counts =
    progress.stage === "mesh" &&
    progress.completed !== undefined &&
    progress.total !== undefined &&
    progress.total > 0
      ? { completed: progress.completed, total: progress.total }
      : null;
  const percent = counts
    ? Math.floor((counts.completed / counts.total) * 100)
    : null;
  const elapsed = Math.max(0, Math.floor((now - progress.started) / 1000));

  return (
    <div
      className={`molecular-surface-progress${compact ? " is-compact" : ""}`}
      role="region"
      aria-label={
        compact ? "Molecular surface activity" : "Molecular surface progress"
      }
    >
      <div className="surface-progress-title" title={progress.label}>
        {progress.label}
      </div>
      <div className="surface-progress-phase">
        <span>{phase}</span>
        <span className="surface-progress-completion">
          {percent === null ? "Working…" : `Current stage · ${percent}%`}
        </span>
      </div>
      <progress
        aria-label="Current molecular surface stage"
        aria-valuetext={
          counts
            ? `Current stage: ${percent}% (${counts.completed} of ${counts.total} blocks)`
            : `${phase}: working`
        }
        max={counts?.total ?? 1}
        value={counts?.completed}
      />
      <div className="surface-progress-detail">
        <span>
          {counts ? `${counts.completed} / ${counts.total} blocks` : ""}
        </span>
        <span aria-label="Elapsed surface time" aria-live="off">
          {elapsed} s elapsed
        </span>
      </div>
    </div>
  );
}
