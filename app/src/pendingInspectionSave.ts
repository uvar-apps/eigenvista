/** Synchronous admission prevents Save/quit from overtaking an intended edit. */
export function createPendingInspectionSave() {
  let count = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    getSnapshot: () => count !== 0,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    begin() {
      if (++count === 1) notify();
      let finished = false;
      return () => {
        if (finished) return;
        finished = true;
        if (--count === 0) notify();
      };
    },
  };
}

export type PendingInspectionSave = ReturnType<
  typeof createPendingInspectionSave
>;
