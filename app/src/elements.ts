/**
 * Per-element display data: a CPK colour and a van der Waals radius in angstroms.
 *
 * This is presentation data only. Bond perception keeps its own authoritative
 * covalent radii in `crates/eigenvista-core/src/bonds.rs`, and nothing here
 * feeds a scientific calculation. The radius is used solely for the space-fill
 * representation, where it is divided by the Bohr radius because the scene is
 * in bohr.
 *
 * Colours
 *   Z 1-109     Jmol CPK (`org.jmol.c.PAL.argbsCpk`), cross-checked against
 *               <https://jmol.sourceforge.net/jscolors/> and ASE's `jmol_colors`
 *               (all three agree on every element in this range).
 *   Z 110-118   OpenBabel's continuation of the same CPK gradient
 *               (`data/element.txt`). No CPK colour is published past
 *               meitnerium: Jmol, ASE and PeriodicTableJSON all stop at 109.
 *   Z 1, 6-9, 15-17 keep the colours EigenVista already shipped, so existing
 *               documents render exactly as before.
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
  color: string;
  /** van der Waals radius in angstroms. */
  radius: number;
}

/** Colour and van der Waals radius for atomic numbers 1 through 118. */
export const ELEMENTS: Record<number, ElementDisplay> = {
  1: { symbol: "H", color: "#fafafa", radius: 1.2 },
  2: { symbol: "He", color: "#d9ffff", radius: 1.43 },
  3: { symbol: "Li", color: "#cc80ff", radius: 2.12 },
  4: { symbol: "Be", color: "#c2ff00", radius: 1.98 },
  5: { symbol: "B", color: "#ffb5b5", radius: 1.91 },
  6: { symbol: "C", color: "#535b64", radius: 1.7 },
  7: { symbol: "N", color: "#407bd2", radius: 1.55 },
  8: { symbol: "O", color: "#df5153", radius: 1.52 },
  9: { symbol: "F", color: "#69b45a", radius: 1.47 },
  10: { symbol: "Ne", color: "#b3e3f5", radius: 1.58 },
  11: { symbol: "Na", color: "#ab5cf2", radius: 2.5 },
  12: { symbol: "Mg", color: "#8aff00", radius: 2.51 },
  13: { symbol: "Al", color: "#bfa6a6", radius: 2.25 },
  14: { symbol: "Si", color: "#f0c8a0", radius: 2.19 },
  15: { symbol: "P", color: "#ba72ca", radius: 1.8 },
  16: { symbol: "S", color: "#dcc33d", radius: 1.8 },
  17: { symbol: "Cl", color: "#62bb6c", radius: 1.75 },
  18: { symbol: "Ar", color: "#80d1e3", radius: 1.83 },
  19: { symbol: "K", color: "#8f40d4", radius: 2.73 },
  20: { symbol: "Ca", color: "#3dff00", radius: 2.62 },
  21: { symbol: "Sc", color: "#e6e6e6", radius: 2.58 },
  22: { symbol: "Ti", color: "#bfc2c7", radius: 2.46 },
  23: { symbol: "V", color: "#a6a6ab", radius: 2.42 },
  24: { symbol: "Cr", color: "#8a99c7", radius: 2.45 },
  25: { symbol: "Mn", color: "#9c7ac7", radius: 2.45 },
  26: { symbol: "Fe", color: "#e06633", radius: 2.44 },
  27: { symbol: "Co", color: "#f090a0", radius: 2.4 },
  28: { symbol: "Ni", color: "#50d050", radius: 2.4 },
  29: { symbol: "Cu", color: "#c88033", radius: 2.38 },
  30: { symbol: "Zn", color: "#7d80b0", radius: 2.39 },
  31: { symbol: "Ga", color: "#c28f8f", radius: 2.32 },
  32: { symbol: "Ge", color: "#668f8f", radius: 2.29 },
  33: { symbol: "As", color: "#bd80e3", radius: 1.88 },
  34: { symbol: "Se", color: "#ffa100", radius: 1.82 },
  35: { symbol: "Br", color: "#a62929", radius: 1.86 },
  36: { symbol: "Kr", color: "#5cb8d1", radius: 2.25 },
  37: { symbol: "Rb", color: "#702eb0", radius: 3.21 },
  38: { symbol: "Sr", color: "#00ff00", radius: 2.84 },
  39: { symbol: "Y", color: "#94ffff", radius: 2.75 },
  40: { symbol: "Zr", color: "#94e0e0", radius: 2.52 },
  41: { symbol: "Nb", color: "#73c2c9", radius: 2.56 },
  42: { symbol: "Mo", color: "#54b5b5", radius: 2.45 },
  43: { symbol: "Tc", color: "#3b9e9e", radius: 2.44 },
  44: { symbol: "Ru", color: "#248f8f", radius: 2.46 },
  45: { symbol: "Rh", color: "#0a7d8c", radius: 2.44 },
  46: { symbol: "Pd", color: "#006985", radius: 2.15 },
  47: { symbol: "Ag", color: "#c0c0c0", radius: 2.53 },
  48: { symbol: "Cd", color: "#ffd98f", radius: 2.49 },
  49: { symbol: "In", color: "#a67573", radius: 2.43 },
  50: { symbol: "Sn", color: "#668080", radius: 2.42 },
  51: { symbol: "Sb", color: "#9e63b5", radius: 2.47 },
  52: { symbol: "Te", color: "#d47a00", radius: 1.99 },
  53: { symbol: "I", color: "#940094", radius: 2.04 },
  54: { symbol: "Xe", color: "#429eb0", radius: 2.06 },
  55: { symbol: "Cs", color: "#57178f", radius: 3.48 },
  56: { symbol: "Ba", color: "#00c900", radius: 3.03 },
  57: { symbol: "La", color: "#70d4ff", radius: 2.98 },
  58: { symbol: "Ce", color: "#ffffc7", radius: 2.88 },
  59: { symbol: "Pr", color: "#d9ffc7", radius: 2.92 },
  60: { symbol: "Nd", color: "#c7ffc7", radius: 2.95 },
  61: { symbol: "Pm", color: "#a3ffc7", radius: 2.83 },
  62: { symbol: "Sm", color: "#8fffc7", radius: 2.9 },
  63: { symbol: "Eu", color: "#61ffc7", radius: 2.87 },
  64: { symbol: "Gd", color: "#45ffc7", radius: 2.83 },
  65: { symbol: "Tb", color: "#30ffc7", radius: 2.79 },
  66: { symbol: "Dy", color: "#1fffc7", radius: 2.87 },
  67: { symbol: "Ho", color: "#00ff9c", radius: 2.81 },
  68: { symbol: "Er", color: "#00e675", radius: 2.83 },
  69: { symbol: "Tm", color: "#00d452", radius: 2.79 },
  70: { symbol: "Yb", color: "#00bf38", radius: 2.8 },
  71: { symbol: "Lu", color: "#00ab24", radius: 2.74 },
  72: { symbol: "Hf", color: "#4dc2ff", radius: 2.63 },
  73: { symbol: "Ta", color: "#4da6ff", radius: 2.53 },
  74: { symbol: "W", color: "#2194d6", radius: 2.57 },
  75: { symbol: "Re", color: "#267dab", radius: 2.49 },
  76: { symbol: "Os", color: "#266696", radius: 2.48 },
  77: { symbol: "Ir", color: "#175487", radius: 2.41 },
  78: { symbol: "Pt", color: "#d0d0e0", radius: 2.29 },
  79: { symbol: "Au", color: "#ffd123", radius: 2.32 },
  80: { symbol: "Hg", color: "#b8b8d0", radius: 2.45 },
  81: { symbol: "Tl", color: "#a6544d", radius: 2.47 },
  82: { symbol: "Pb", color: "#575961", radius: 2.6 },
  83: { symbol: "Bi", color: "#9e4fb5", radius: 2.54 },
  84: { symbol: "Po", color: "#ab5c00", radius: 2.5 },
  85: { symbol: "At", color: "#754f45", radius: 2.47 },
  86: { symbol: "Rn", color: "#428296", radius: 2.43 },
  87: { symbol: "Fr", color: "#420066", radius: 2.58 },
  88: { symbol: "Ra", color: "#007d00", radius: 2.92 },
  89: { symbol: "Ac", color: "#70abfa", radius: 2.8 },
  90: { symbol: "Th", color: "#00baff", radius: 2.93 },
  91: { symbol: "Pa", color: "#00a1ff", radius: 2.88 },
  92: { symbol: "U", color: "#008fff", radius: 2.71 },
  93: { symbol: "Np", color: "#0080ff", radius: 2.82 },
  94: { symbol: "Pu", color: "#006bff", radius: 2.81 },
  95: { symbol: "Am", color: "#545cf2", radius: 2.83 },
  96: { symbol: "Cm", color: "#785ce3", radius: 3.05 },
  97: { symbol: "Bk", color: "#8a4fe3", radius: 3.4 },
  98: { symbol: "Cf", color: "#a136d4", radius: 3.05 },
  99: { symbol: "Es", color: "#b31fd4", radius: 2.7 },
  100: { symbol: "Fm", color: "#b31fba", radius: 2.76 },
  101: { symbol: "Md", color: "#b30da6", radius: 2.85 },
  102: { symbol: "No", color: "#bd0d87", radius: 2.9 },
  103: { symbol: "Lr", color: "#c70066", radius: 2.66 },
  104: { symbol: "Rf", color: "#cc0059", radius: 2.59 },
  105: { symbol: "Db", color: "#d1004f", radius: 2.46 },
  106: { symbol: "Sg", color: "#d90045", radius: 2.36 },
  107: { symbol: "Bh", color: "#e00038", radius: 2.33 },
  108: { symbol: "Hs", color: "#e6002e", radius: 2.21 },
  109: { symbol: "Mt", color: "#eb0026", radius: 2.13 },
  110: { symbol: "Ds", color: "#ed0024", radius: 2.11 },
  111: { symbol: "Rg", color: "#f00021", radius: 2 },
  112: { symbol: "Cn", color: "#f2001f", radius: 2.01 },
  113: { symbol: "Nh", color: "#f5001c", radius: 2.24 },
  114: { symbol: "Fl", color: "#f7001a", radius: 2.36 },
  115: { symbol: "Mc", color: "#fa0017", radius: 2.67 },
  116: { symbol: "Lv", color: "#fc0014", radius: 2.89 },
  117: { symbol: "Ts", color: "#fc0012", radius: 2.72 },
  118: { symbol: "Og", color: "#fc000f", radius: 2.59 },
};

const UNKNOWN_COLOR = "#b294b9";
const UNKNOWN_RADIUS = 1.8;

/**
 * Display data for an atomic number. Document validation admits 1-118, so the
 * fallback only guards against a caller passing something out of range.
 */
export function elementDisplay(z: number): ElementDisplay {
  const element = ELEMENTS[z];
  if (element) return element;
  return { symbol: `Z${z}`, color: UNKNOWN_COLOR, radius: UNKNOWN_RADIUS };
}
