/** UUID creation also works in ordinary HTTP previews without randomUUID. */
export const inspectionId = (prefix: string): string => {
  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
  return `${prefix}-${id}`;
};
