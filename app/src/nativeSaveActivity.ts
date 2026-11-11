let pending = 0;
const listeners = new Set<() => void>();

export const hasNativeSave = () => pending > 0;
export function subscribeNativeSaves(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export async function trackNativeSave<T>(save: () => Promise<T>): Promise<T> {
  pending++;
  listeners.forEach((listener) => listener());
  try {
    return await save();
  } finally {
    pending--;
    listeners.forEach((listener) => listener());
  }
}
