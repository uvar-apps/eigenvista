/**
 * Atom colour palettes: the built-in default and session-scoped overrides.
 *
 * Colours live in `atom-colors.json`, which is the single source of truth for
 * the default palette. Symbols and radii stay in `elements.ts` because they are
 * scientific data pinned by `crates/eigenvista-core/tests/element_display.rs`;
 * only colour is treated as data. See
 * `docs/design/2026-10-12-atom-colors-from-file.md`.
 *
 * Resolution order is: session override, then bundled default, then the
 * unknown-element sentinel.
 */

import paletteJson from "./atom-colors.json";
import { elementDisplay } from "./elements";

export const ATOM_COLORS_FORMAT = "eigenvista-atom-colors";
export const ATOM_COLORS_VERSION = 1;

/** Rendered for an atomic number no palette covers. */
export const UNKNOWN_ATOM_COLOR = "#b294b9";

/** Atomic number to `#rrggbb`. */
export type AtomPalette = ReadonlyMap<number, string>;

const HEX_TRIPLET = /^#[0-9a-fA-F]{6}$/;

function checkEnvelope(document: unknown, source: string) {
  if (typeof document !== "object" || document === null)
    throw new Error(`${source}: not an atom-colour file`);
  const candidate = document as {
    format?: unknown;
    version?: unknown;
    colors?: unknown;
  };
  if (candidate.format !== ATOM_COLORS_FORMAT)
    throw new Error(
      `${source}: expected format "${ATOM_COLORS_FORMAT}", got ${JSON.stringify(candidate.format)}`,
    );
  if (candidate.version !== ATOM_COLORS_VERSION)
    throw new Error(
      `${source}: unsupported version ${JSON.stringify(candidate.version)}; this build reads version ${ATOM_COLORS_VERSION}`,
    );
  return candidate;
}

/**
 * Validate a `colors` array and turn it into a lookup map.
 *
 * Every problem is fatal for the whole file. A half-applied palette is harder to
 * diagnose than a loud failure, so nothing is silently skipped.
 */
function toPalette(colors: unknown, source: string): Map<number, string> {
  if (!Array.isArray(colors))
    throw new Error(`${source}: "colors" must be an array`);
  if (colors.length === 0) throw new Error(`${source}: "colors" is empty`);
  const palette = new Map<number, string>();
  for (const raw of colors as Array<Record<string, unknown>>) {
    if (typeof raw !== "object" || raw === null)
      throw new Error(`${source}: every colour entry must be an object`);
    const z = raw.z;
    if (typeof z !== "number" || !Number.isInteger(z))
      throw new Error(`${source}: every entry needs an integer "z"`);
    if (z < 1 || z > 118)
      throw new Error(`${source}: z ${z} is outside the supported range 1-118`);
    if (palette.has(z))
      throw new Error(`${source}: duplicate entry for z ${z}`);
    const color = raw.color;
    if (typeof color !== "string" || !HEX_TRIPLET.test(color))
      throw new Error(
        `${source}: z ${z} colour ${JSON.stringify(color)} is not a #rrggbb hex triplet`,
      );
    if (color !== color.toLowerCase())
      throw new Error(
        `${source}: z ${z} colour ${color} must be lowercase, as the native format requires`,
      );
    // `symbol` is a human label, never a lookup key. It is checked only so a
    // mistyped symbol is caught instead of quietly colouring the wrong element.
    const symbol = raw.symbol;
    if (symbol !== undefined) {
      const expected = elementDisplay(z).symbol;
      if (
        typeof symbol !== "string" ||
        symbol.toUpperCase() !== expected.toUpperCase()
      )
        throw new Error(
          `${source}: z ${z} is ${expected}, not ${JSON.stringify(symbol)}`,
        );
    }
    palette.set(z, color);
  }
  return palette;
}

/**
 * Parse a palette file.
 *
 * Partial files are valid: only the listed elements are overridden, and every
 * other element keeps its default. Throws with a message naming what is wrong.
 */
export function parseAtomColors(text: string, source = "palette"): AtomPalette {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source}: not valid JSON (${String(error)})`);
  }
  const envelope = checkEnvelope(parsed, source);
  return toPalette(envelope.colors, source);
}

/** The bundled default palette, read from `atom-colors.json`. */
export const DEFAULT_ATOM_COLORS: AtomPalette = toPalette(
  checkEnvelope(paletteJson, "atom-colors.json").colors,
  "atom-colors.json",
);

/** Colour for `z`: session override, then default, then the sentinel. */
export function resolveAtomColor(z: number, override?: AtomPalette): string {
  return override?.get(z) ?? DEFAULT_ATOM_COLORS.get(z) ?? UNKNOWN_ATOM_COLOR;
}
