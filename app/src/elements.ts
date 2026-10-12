/**
 * Per-element display data: the symbol and a van der Waals radius in angstroms.
 *
 * This is presentation data only. Bond perception keeps its own authoritative
 * covalent radii in `crates/eigenvista-core/src/bonds.rs`, and nothing here
 * feeds a scientific calculation. The radius is used solely for the space-fill
 * representation, where it is divided by the Bohr radius because the scene is
 * in bohr.
 *
 * Colour is deliberately absent. It lives in `atom-colors.json`, the single
 * source of truth for the default palette, and is resolved through
 * `atomColors.ts` so a session can override it. Keeping colour out of this
 * file is what stops the palette existing in two places.
 *
 * Radii (angstroms, van der Waals)
 *   Z 1, 6-9, 15-17  unchanged EigenVista values (Bondi, 1966).
 *   Alvarez, S. (2013) "A cartography of the van der Waals territories",
 *   Dalton Trans. 42, 8617 (doi:10.1039/c3dt50599e), read through
 *   `pdbtbx::Element::atomic_radius().van_der_waals`.
 *   Rahm, Hoffmann & Ashcroft (2016), Chem. Eur. J. 22, 14625
 *   (doi:10.1002/chem.201602949), through `atomic_radius().unbound`, for
 *   Pm(61) and Po(84)-Ra(88), where Alvarez has no value.
 *   Fm(100)-Og(118) have no published van der Waals radius. They use the
 *   Pyykko single-bond covalent radius scaled by 1.65, the mean
 *   unbound/cov1 ratio over Ac-Cm, which preserves the periodic trend instead
 *   of flattening it to a constant.
 *
 * `crates/eigenvista-core/tests/element_display.rs` re-derives every radius
 * below from the Rust tables, so this table cannot drift from its sources.
 */

export interface ElementDisplay {
  symbol: string;
  /** van der Waals radius in angstroms. */
  radius: number;
}

/** Symbol and van der Waals radius for atomic numbers 1 through 118. */
export const ELEMENTS: Record<number, ElementDisplay> = {
  1: { symbol: "H", radius: 1.2 },
  2: { symbol: "He", radius: 1.43 },
  3: { symbol: "Li", radius: 2.12 },
  4: { symbol: "Be", radius: 1.98 },
  5: { symbol: "B", radius: 1.91 },
  6: { symbol: "C", radius: 1.7 },
  7: { symbol: "N", radius: 1.55 },
  8: { symbol: "O", radius: 1.52 },
  9: { symbol: "F", radius: 1.47 },
  10: { symbol: "Ne", radius: 1.58 },
  11: { symbol: "Na", radius: 2.5 },
  12: { symbol: "Mg", radius: 2.51 },
  13: { symbol: "Al", radius: 2.25 },
  14: { symbol: "Si", radius: 2.19 },
  15: { symbol: "P", radius: 1.8 },
  16: { symbol: "S", radius: 1.8 },
  17: { symbol: "Cl", radius: 1.75 },
  18: { symbol: "Ar", radius: 1.83 },
  19: { symbol: "K", radius: 2.73 },
  20: { symbol: "Ca", radius: 2.62 },
  21: { symbol: "Sc", radius: 2.58 },
  22: { symbol: "Ti", radius: 2.46 },
  23: { symbol: "V", radius: 2.42 },
  24: { symbol: "Cr", radius: 2.45 },
  25: { symbol: "Mn", radius: 2.45 },
  26: { symbol: "Fe", radius: 2.44 },
  27: { symbol: "Co", radius: 2.4 },
  28: { symbol: "Ni", radius: 2.4 },
  29: { symbol: "Cu", radius: 2.38 },
  30: { symbol: "Zn", radius: 2.39 },
  31: { symbol: "Ga", radius: 2.32 },
  32: { symbol: "Ge", radius: 2.29 },
  33: { symbol: "As", radius: 1.88 },
  34: { symbol: "Se", radius: 1.82 },
  35: { symbol: "Br", radius: 1.86 },
  36: { symbol: "Kr", radius: 2.25 },
  37: { symbol: "Rb", radius: 3.21 },
  38: { symbol: "Sr", radius: 2.84 },
  39: { symbol: "Y", radius: 2.75 },
  40: { symbol: "Zr", radius: 2.52 },
  41: { symbol: "Nb", radius: 2.56 },
  42: { symbol: "Mo", radius: 2.45 },
  43: { symbol: "Tc", radius: 2.44 },
  44: { symbol: "Ru", radius: 2.46 },
  45: { symbol: "Rh", radius: 2.44 },
  46: { symbol: "Pd", radius: 2.15 },
  47: { symbol: "Ag", radius: 2.53 },
  48: { symbol: "Cd", radius: 2.49 },
  49: { symbol: "In", radius: 2.43 },
  50: { symbol: "Sn", radius: 2.42 },
  51: { symbol: "Sb", radius: 2.47 },
  52: { symbol: "Te", radius: 1.99 },
  53: { symbol: "I", radius: 2.04 },
  54: { symbol: "Xe", radius: 2.06 },
  55: { symbol: "Cs", radius: 3.48 },
  56: { symbol: "Ba", radius: 3.03 },
  57: { symbol: "La", radius: 2.98 },
  58: { symbol: "Ce", radius: 2.88 },
  59: { symbol: "Pr", radius: 2.92 },
  60: { symbol: "Nd", radius: 2.95 },
  61: { symbol: "Pm", radius: 2.83 },
  62: { symbol: "Sm", radius: 2.9 },
  63: { symbol: "Eu", radius: 2.87 },
  64: { symbol: "Gd", radius: 2.83 },
  65: { symbol: "Tb", radius: 2.79 },
  66: { symbol: "Dy", radius: 2.87 },
  67: { symbol: "Ho", radius: 2.81 },
  68: { symbol: "Er", radius: 2.83 },
  69: { symbol: "Tm", radius: 2.79 },
  70: { symbol: "Yb", radius: 2.8 },
  71: { symbol: "Lu", radius: 2.74 },
  72: { symbol: "Hf", radius: 2.63 },
  73: { symbol: "Ta", radius: 2.53 },
  74: { symbol: "W", radius: 2.57 },
  75: { symbol: "Re", radius: 2.49 },
  76: { symbol: "Os", radius: 2.48 },
  77: { symbol: "Ir", radius: 2.41 },
  78: { symbol: "Pt", radius: 2.29 },
  79: { symbol: "Au", radius: 2.32 },
  80: { symbol: "Hg", radius: 2.45 },
  81: { symbol: "Tl", radius: 2.47 },
  82: { symbol: "Pb", radius: 2.6 },
  83: { symbol: "Bi", radius: 2.54 },
  84: { symbol: "Po", radius: 2.5 },
  85: { symbol: "At", radius: 2.47 },
  86: { symbol: "Rn", radius: 2.43 },
  87: { symbol: "Fr", radius: 2.58 },
  88: { symbol: "Ra", radius: 2.92 },
  89: { symbol: "Ac", radius: 2.8 },
  90: { symbol: "Th", radius: 2.93 },
  91: { symbol: "Pa", radius: 2.88 },
  92: { symbol: "U", radius: 2.71 },
  93: { symbol: "Np", radius: 2.82 },
  94: { symbol: "Pu", radius: 2.81 },
  95: { symbol: "Am", radius: 2.83 },
  96: { symbol: "Cm", radius: 3.05 },
  97: { symbol: "Bk", radius: 3.4 },
  98: { symbol: "Cf", radius: 3.05 },
  99: { symbol: "Es", radius: 2.7 },
  100: { symbol: "Fm", radius: 2.76 },
  101: { symbol: "Md", radius: 2.85 },
  102: { symbol: "No", radius: 2.9 },
  103: { symbol: "Lr", radius: 2.66 },
  104: { symbol: "Rf", radius: 2.59 },
  105: { symbol: "Db", radius: 2.46 },
  106: { symbol: "Sg", radius: 2.36 },
  107: { symbol: "Bh", radius: 2.33 },
  108: { symbol: "Hs", radius: 2.21 },
  109: { symbol: "Mt", radius: 2.13 },
  110: { symbol: "Ds", radius: 2.11 },
  111: { symbol: "Rg", radius: 2 },
  112: { symbol: "Cn", radius: 2.01 },
  113: { symbol: "Nh", radius: 2.24 },
  114: { symbol: "Fl", radius: 2.36 },
  115: { symbol: "Mc", radius: 2.67 },
  116: { symbol: "Lv", radius: 2.89 },
  117: { symbol: "Ts", radius: 2.72 },
  118: { symbol: "Og", radius: 2.59 },
};

const UNKNOWN_RADIUS = 1.8;

/**
 * Symbol and radius for an atomic number. Document validation admits 1-118, so
 * the fallback only guards against a caller passing something out of range.
 * Colour is resolved separately by `resolveAtomColor` in `atomColors.ts`.
 */
export function elementDisplay(z: number): ElementDisplay {
  return ELEMENTS[z] ?? { symbol: `Z${z}`, radius: UNKNOWN_RADIUS };
}
