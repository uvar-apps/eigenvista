import { useEffect, useState } from "react";
import type { WorkProgress } from "./science";

export type CalculationState = {
  label: string;
  stage: string;
  started: number;
  counts?: WorkProgress;
};

export function CalculationProgress({
  progress,
}: {
  progress: CalculationState;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () =>
      setElapsed(Math.floor((performance.now() - progress.started) / 1000));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [progress.started]);
  const phases: Record<string, string> = {
    preparing: "Preparing field",
    sampling: "Sampling field",
    meshing: "Extracting meshes",
    mapping: "Mapping electrostatic potential",
    transferring: "Preparing display",
    validating: "Checking saved geometry",
  };
  const phase = phases[progress.stage] ?? "Calculating";
  const counts = progress.counts;
  const percent = counts
    ? Math.floor((100 * counts.completed) / counts.total)
    : null;
  return (
    <div className="calculation-progress" aria-label="Calculation progress">
      <div className="calculation-label">{progress.label}</div>
      <div className="calculation-phase">
        <span>{phase}</span>
        <span>{percent === null ? "" : `${percent}%`}</span>
      </div>
      <progress
        aria-label={phase}
        max={counts?.total ?? 1}
        value={counts?.completed}
      />
      <div className="calculation-detail">
        <span>
          {counts
            ? `${counts.completed} / ${counts.total} ${progress.stage === "sampling" ? "slices" : progress.stage === "mapping" ? "vertices" : "signs"}`
            : ""}
        </span>
        <span aria-label="Elapsed calculation time">{elapsed} s elapsed</span>
      </div>
    </div>
  );
}
