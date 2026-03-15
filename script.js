/* ═══════════════════════════════════════════════════════════
   Æsthetic — script.js  v3
   
   Architecture:
   ┌─ DATA         Font pairs, mood names, curated presets
   ├─ COLOR MATH   HSL↔HEX, WCAG contrast, readable text
   ├─ GENERATOR    Color theory schemes → 5-color palette
   ├─ FONT LOADER  Dynamic Google Fonts injection
   ├─ STATE        Single source of truth object
   ├─ DARK MODE    Persisted to localStorage
   ├─ FAVORITES    Save/load/delete via localStorage
   ├─ RENDER       Idempotent — reads state, writes DOM
   └─ EVENTS       All listeners in one bindEvents() call
   
   DESIGN PRINCIPLE: The shell (header, cards) NEVER touches
   generated colors. Only .preview-bg and .palette-bar elements
   receive generated color values, always via inline style.
═══════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────
   1. DATA — Font pairs & mood names
───────────────────────────────────────── */

/*
  96 curated font pairs — every entry follows the core rule of
  typographic contrast: a distinctive display face paired with a
  neutral, highly-legible body font. Organised into 8 mood categories
  of 12 pairs each so the generator covers the full emotional spectrum.

  Categories:
  A — Editorial / Literary      (classic serifs, refined bodies)
  B — Luxury / High Fashion     (didone & refined display + clean sans)
  C — Warm & Humanist           (friendly serifs + humanist sans)
  D — Bold & Expressive         (heavy display + grounded body)
  E — Geometric / Modernist     (structured, Bauhaus-influenced)
  F — Tech & Functional         (monospace display or clean UI fonts)
  G — Soft & Organic            (rounded, gentle, approachable)
  H — Condensed & Editorial     (tall, tight display + open body)

  All fonts are available on Google Fonts (free, no API key needed).
  The font loader injects each face on first use, so unused pairs
  never incur a network request.
*/
const FONT_PAIRS = [

  // ── A: EDITORIAL / LITERARY ──────────────────────────────
  { display: 'Playfair Display',    body: 'DM Sans'          },
  { display: 'Cormorant Garamond',  body: 'Jost'             },
  { display: 'Libre Baskerville',   body: 'Source Sans 3'    },
  { display: 'DM Serif Display',    body: 'DM Sans'          },
  { display: 'Spectral',            body: 'Work Sans'        },
  { display: 'Lora',                body: 'Open Sans'        },
  { display: 'Crimson Pro',         body: 'IBM Plex Sans'    },
  { display: 'Philosopher',         body: 'PT Sans'          },
  { display: 'EB Garamond',         body: 'Lato'             },
  { display: 'Playfair Display SC', body: 'Raleway'          },
  { display: 'Cardo',               body: 'Karla'            },
  { display: 'Sorts Mill Goudy',    body: 'Source Sans 3'    },

  // ── B: LUXURY / HIGH FASHION ─────────────────────────────
  { display: 'Bodoni Moda',         body: 'Mulish'           },
  { display: 'Cormorant',           body: 'Montserrat'       },
  { display: 'Yeseva One',          body: 'Josefin Sans'     },
  { display: 'GFS Didot',           body: 'Open Sans'        },
  { display: 'Playfair Display',    body: 'Montserrat'       },
  { display: 'Cormorant Garamond',  body: 'Raleway'          },
  { display: 'Cormorant Infant',    body: 'Nunito Sans'      },
  { display: 'Bodoni Moda',         body: 'IBM Plex Sans'    },
  { display: 'Oranienbaum',         body: 'Mulish'           },
  { display: 'Rufina',              body: 'Work Sans'        },
  { display: 'Forum',               body: 'Source Sans 3'    },
  { display: 'Unna',                body: 'DM Sans'          },

  // ── C: WARM & HUMANIST ───────────────────────────────────
  { display: 'Fraunces',            body: 'Nunito Sans'      },
  { display: 'Lora',                body: 'Nunito'           },
  { display: 'Bitter',              body: 'Nunito'           },
  { display: 'Vollkorn',            body: 'Lato'             },
  { display: 'Arvo',                body: 'Open Sans'        },
  { display: 'Merriweather',        body: 'Source Sans 3'    },
  { display: 'Zilla Slab',          body: 'Rubik'            },
  { display: 'Crete Round',         body: 'Open Sans'        },
  { display: 'Tinos',               body: 'Nunito Sans'      },
  { display: 'Noticia Text',        body: 'Lato'             },
  { display: 'Cambo',               body: 'PT Sans'          },
  { display: 'Gilda Display',       body: 'Raleway'          },

  // ── D: BOLD & EXPRESSIVE ─────────────────────────────────
  { display: 'Abril Fatface',       body: 'Lato'             },
  { display: 'Rozha One',           body: 'Rubik'            },
  { display: 'Bebas Neue',          body: 'Source Sans 3'    },
  { display: 'Anton',               body: 'Open Sans'        },
  { display: 'Black Han Sans',      body: 'DM Sans'          },
  { display: 'Passion One',         body: 'Lato'             },
  { display: 'Alfa Slab One',       body: 'Work Sans'        },
  { display: 'Righteous',           body: 'Nunito Sans'      },
  { display: 'Titan One',           body: 'Source Sans 3'    },
  { display: 'Fugaz One',           body: 'Open Sans'        },
  { display: 'Lilita One',          body: 'Mulish'           },
  { display: 'Bangers',             body: 'IBM Plex Sans'    },

  // ── E: GEOMETRIC / MODERNIST ─────────────────────────────
  { display: 'Josefin Slab',        body: 'Josefin Sans'     },
  { display: 'Josefin Sans',        body: 'Source Sans 3'    },
  { display: 'Poiret One',          body: 'Raleway'          },
  { display: 'Quantico',            body: 'DM Sans'          },
  { display: 'Michroma',            body: 'Open Sans'        },
  { display: 'Orbitron',            body: 'Source Sans 3'    },
  { display: 'Exo 2',               body: 'Nunito Sans'      },
  { display: 'Rajdhani',            body: 'Lato'             },
  { display: 'Audiowide',           body: 'IBM Plex Sans'    },
  { display: 'Unica One',           body: 'Karla'            },
  { display: 'Archivo Black',       body: 'Archivo'          },
  { display: 'Barlow Semi Condensed',body:'Barlow'           },

  // ── F: TECH & FUNCTIONAL ─────────────────────────────────
  { display: 'IBM Plex Serif',      body: 'IBM Plex Sans'    },
  { display: 'Space Grotesk',       body: 'Space Mono'       },
  { display: 'Space Mono',          body: 'DM Sans'          },
  { display: 'Fira Code',           body: 'Fira Sans'        },
  { display: 'JetBrains Mono',      body: 'Source Sans 3'    },
  { display: 'Roboto Slab',         body: 'Roboto'           },
  { display: 'Roboto Mono',         body: 'Roboto'           },
  { display: 'Source Code Pro',     body: 'Source Sans 3'    },
  { display: 'Share Tech Mono',     body: 'Share Tech'       },
  { display: 'Courier Prime',       body: 'Open Sans'        },
  { display: 'Cutive Mono',         body: 'Nunito Sans'      },
  { display: 'PT Mono',             body: 'PT Sans'          },

  // ── G: SOFT & ORGANIC ────────────────────────────────────
  { display: 'Pacifico',            body: 'Nunito'           },
  { display: 'Lobster',             body: 'Lato'             },
  { display: 'Satisfy',             body: 'Open Sans'        },
  { display: 'Dancing Script',      body: 'Nunito Sans'      },
  { display: 'Sacramento',          body: 'Source Sans 3'    },
  { display: 'Great Vibes',         body: 'Raleway'          },
  { display: 'Kaushan Script',      body: 'Lato'             },
  { display: 'Courgette',           body: 'Open Sans'        },
  { display: 'Damion',              body: 'DM Sans'          },
  { display: 'Caveat',              body: 'Nunito Sans'      },
  { display: 'Indie Flower',        body: 'PT Sans'          },
  { display: 'Shadows Into Light',  body: 'Open Sans'        },

  // ── H: CONDENSED & EDITORIAL ─────────────────────────────
  { display: 'Oswald',              body: 'Source Sans 3'    },
  { display: 'Barlow Condensed',    body: 'Barlow'           },
  { display: 'Yanone Kaffeesatz',   body: 'Open Sans'        },
  { display: 'Ubuntu Condensed',    body: 'Ubuntu'           },
  { display: 'Encode Sans Condensed',body:'Encode Sans'      },
  { display: 'Fjalla One',          body: 'Cantarell'        },
  { display: 'Squada One',          body: 'DM Sans'          },
  { display: 'Big Shoulders Display',body:'Big Shoulders Text'},
  { display: 'Saira Condensed',     body: 'Saira'            },
  { display: 'Stint Ultra Condensed',body:'Source Sans 3'    },
  { display: 'Roboto Condensed',    body: 'Roboto'           },
  { display: 'News Cycle',          body: 'Open Sans'        },

];

const MOOD_NAMES = {
  complementary: ['Stark Contrast', 'Bold Duet', 'Vivid Opposition', 'Electric Tension'],
  triadic:       ['Chromatic Triad', 'Saturated Trio', 'Vivid Triangle', 'Prism Study'],
  analogous:     ['Tonal Harmony', 'Gradient Mood', 'Adjacent Calm', 'Color Flow'],
  split:         ['Split Vision', 'Divided Harmony', 'Asymmetric Palette', 'Open Chord'],
  monochromatic: ['Monochrome Study', 'Tonal Depth', 'Single Source', 'Shade Scale'],
  tetradic:      ['Four-Point Balance', 'Quad Harmony', 'Full Spectrum', 'Complex Chord'],
};

/*
  CURATED PRESETS — loaded on demand via the preset bar.
  Hard-coded to guarantee they look great on first load.
  Each is a full state snapshot (no generation needed).
*/
const PRESETS = {
  minimal: {
    colors:   ['#1C1C1C', '#3D3D3D', '#888888', '#C8C8C8', '#F5F5F5'],
    scheme:   'monochromatic',
    moodName: 'Monochrome Study',
    fontPair: { display: 'Cormorant Garamond', body: 'Source Sans 3' },
  },
  playful: {
    colors:   ['#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#FF9FF3'],
    scheme:   'tetradic',
    moodName: 'Full Spectrum',
    fontPair: { display: 'Abril Fatface', body: 'Nunito Sans' },
  },
  bold: {
    colors:   ['#0D0221', '#190B28', '#560BAD', '#7B2FBE', '#E040FB'],
    scheme:   'analogous',
    moodName: 'Adjacent Calm',
    fontPair: { display: 'Bebas Neue', body: 'IBM Plex Sans' },
  },
};

/* ─────────────────────────────────────────
   2. COLOR MATH UTILITIES
───────────────────────────────────────── */

const clamp   = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrapHue = h => ((h % 360) + 360) % 360;

/** Convert HSL (0-360, 0-100, 0-100) to hex string */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Decompose a hex string into {r, g, b} integers */
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Convert hex to {h, s, l} */
function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const fmtRgb = hex => { const {r,g,b} = hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const fmtHsl = hex => { const {h,s,l} = hexToHsl(hex); return `hsl(${h}, ${s}%, ${l}%)`; };

/**
 * WCAG 2.1 relative luminance
 * Used as the basis for all contrast ratio calculations.
 */
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two hex colors (always ≥ 1) */
function contrastRatio(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** WCAG level string: 'AAA', 'AA', or 'FAIL' */
function wcagLevel(a, b) {
  const r = contrastRatio(a, b);
  return r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : 'FAIL';
}

/**
 * Pick the best readable text color (near-black or near-white)
 * to place on a given background hex. Checks contrast against
 * both options and returns the one with higher ratio.
 * 
 * Trade-off: We use fixed dark/light rather than exact theme
 * tokens because the bar BG is a generated color, not a theme color.
 */
function readableColor(bgHex) {
  const dark  = '#141413';
  const light = '#F7F6F2';
  return contrastRatio(bgHex, dark) >= contrastRatio(bgHex, light) ? dark : light;
}

/* ─────────────────────────────────────────
   2b. COLOR BLINDNESS SIMULATION

   SCIENCE: Each type of color vision deficiency is modelled as a
   3×3 linear RGB transformation matrix from Brettel, Viénot & Mollon
   (1997) and Machado et al. (2009) — the same academic basis used by
   Figma's accessibility plugin and Adobe's Proof Colors feature.

   HOW IT WORKS:
   1. Gamma-expand sRGB 0-255 to linear light values 0-1
   2. Multiply by the deficiency matrix
   3. Gamma-compress linear back to sRGB
   4. Clamp, convert back to hex

   WHY LINEARISE: The sRGB gamma curve makes channel mixing non-linear.
   Doing the matrix multiply in gamma-encoded space produces visibly
   wrong results — colors too dark, wrong hues. Not optional.

   SIMULATION IS READ-ONLY: state.colors is never modified.
   simColors() returns transformed copies for rendering only.
───────────────────────────────────────── */

/*
  Transformation matrices — row = [r_out, g_out, b_out] as linear
  combination of [r_in, g_in, b_in].
  Source: Machado et al. (2009) doi:10.1109/TVCG.2009.113
*/
const CVD_MATRICES = {
  deuteranopia: [   // red-green, green-weak (~6% of men, most common)
    [ 0.367322, 0.860646, -0.227968],
    [ 0.280085, 0.672501,  0.047413],
    [-0.011820, 0.042940,  0.968881],
  ],
  protanopia: [     // red-green, red-weak (~2% of men)
    [ 0.152286, 1.052583, -0.204868],
    [ 0.114503, 0.786281,  0.099216],
    [-0.003882,-0.048116,  1.051998],
  ],
  tritanopia: [     // blue-yellow weakness (~0.01%)
    [ 1.255528,-0.076749,-0.178779],
    [-0.078411, 0.930809, 0.147602],
    [ 0.004733, 0.691367, 0.303900],
  ],
  achromatopsia: [  // full grayscale (ITU-R BT.709 luminance weights)
    [ 0.212656, 0.715158, 0.072186],
    [ 0.212656, 0.715158, 0.072186],
    [ 0.212656, 0.715158, 0.072186],
  ],
};

/** sRGB gamma expand: encoded byte → linear light */
function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** sRGB gamma compress: linear light → encoded byte */
function linearToSrgb(c) {
  const clamped = Math.min(1, Math.max(0, c));
  return Math.round(
    clamped <= 0.0031308
      ? clamped * 12.92 * 255
      : (1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255
  );
}

/** Apply a CVD matrix to a single hex color. Returns new hex string. */
function applyMatrix(hex, matrix) {
  const { r, g, b } = hexToRgb(hex);
  const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b);
  const [m0, m1, m2] = matrix;
  const ro = m0[0]*rl + m0[1]*gl + m0[2]*bl;
  const go = m1[0]*rl + m1[1]*gl + m1[2]*bl;
  const bo = m2[0]*rl + m2[1]*gl + m2[2]*bl;
  const rs = linearToSrgb(ro), gs = linearToSrgb(go), bs = linearToSrgb(bo);
  return '#' + rs.toString(16).padStart(2,'0')
             + gs.toString(16).padStart(2,'0')
             + bs.toString(16).padStart(2,'0');
}

/**
 * Returns palette colors as perceived under the active simulation.
 * 'none' → returns state.colors as-is.
 * This is the single point of truth for "which colors do I render?"
 * Every render function calls this instead of state.colors directly.
 */
/**
 * Returns the active colors (sliced to swatchCount) with simulation applied.
 * This is the single source of truth for "what colors am I rendering?"
 */
function simColors() {
  const colors = state.swatchCount === 3
    ? [state.colors[0], state.colors[2], state.colors[4]] // pick spread of 3 from 5
    : state.colors;
  if (activeSimulation === 'none') return colors;
  const matrix = CVD_MATRICES[activeSimulation];
  return colors.map(hex => applyMatrix(hex, matrix));
}

/**
 * Semantic color role mapping — works for both 3 and 5 swatches.
 * 3-swatch: bg=0, accent=1, light=2, surface≈bg, muted≈accent
 * 5-swatch: bg=0, surface=1, accent=2, muted=3, light=4
 */
function colorRoles() {
  const sc = simColors();
  if (state.swatchCount === 3) {
    const [bg, accent, light] = sc;
    return {
      bg, surface: bg, accent, muted: accent, light,
      onBg:      readableColor(bg),
      onSurface: readableColor(bg),
      onAccent:  readableColor(accent),
      onLight:   readableColor(light),
    };
  }
  const [bg, surface, accent, muted, light] = sc;
  return {
    bg, surface, accent, muted, light,
    onBg:      readableColor(bg),
    onSurface: readableColor(surface),
    onAccent:  readableColor(accent),
    onLight:   readableColor(light),
  };
}

/**
 * Generate 5 harmonious colors using a random color theory scheme.
 * Returns { colors: string[], scheme: string }.
 *
 * Approach: pick a base hue, derive related hues per scheme,
 * then vary lightness + saturation per stop for visual depth.
 */
function generatePalette() {
  const schemes = ['complementary', 'triadic', 'analogous', 'split', 'monochromatic', 'tetradic'];
  const scheme  = schemes[Math.floor(Math.random() * schemes.length)];

  const baseH = Math.floor(Math.random() * 360);
  // Keep saturation moderate so we avoid muddy or neon extremes
  const baseS = clamp(Math.floor(Math.random() * 40) + 45, 30, 88);
  const baseL = clamp(Math.floor(Math.random() * 24) + 36, 26, 66);

  let hues;
  switch (scheme) {
    case 'complementary': hues = [baseH, baseH, wrapHue(baseH+180), wrapHue(baseH+180), baseH]; break;
    case 'triadic':       hues = [baseH, wrapHue(baseH+120), wrapHue(baseH+240), baseH, wrapHue(baseH+120)]; break;
    case 'analogous':     hues = [baseH, wrapHue(baseH+30), wrapHue(baseH+60), wrapHue(baseH-30), wrapHue(baseH-60)]; break;
    case 'split':         hues = [baseH, wrapHue(baseH+150), wrapHue(baseH+210), baseH, wrapHue(baseH+180)]; break;
    case 'monochromatic': hues = [baseH, baseH, baseH, baseH, baseH]; break;
    case 'tetradic':      hues = [baseH, wrapHue(baseH+90), wrapHue(baseH+180), wrapHue(baseH+270), baseH]; break;
    default:              hues = [baseH, baseH, baseH, baseH, baseH];
  }

  // For monochromatic, spread lightness across a wide range
  const lightnesses = scheme === 'monochromatic'
    ? [12, 28, 48, 65, 82]
    : hues.map((_, i) => clamp(baseL - 20 + i * 11, 10, 92));

  const saturations = hues.map((_, i) =>
    clamp(baseS - i * 4 + (Math.random() * 8 - 4), 12, 96)
  );

  return {
    colors: hues.map((h, i) => hslToHex(h, saturations[i], lightnesses[i])),
    scheme,
  };
}

function pickMood(scheme) {
  const pool = MOOD_NAMES[scheme] || MOOD_NAMES.analogous;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ─────────────────────────────────────────
   4. GOOGLE FONTS LOADER
   Injects a <link> only once per font name.
   Shell fonts (Inter, Source Sans 3, DM Mono) are pre-loaded via HTML.
───────────────────────────────────────── */
const _loadedFonts = new Set(['Inter', 'Source Sans 3', 'DM Mono', 'Playfair Display']);

function loadFont(name) {
  if (_loadedFonts.has(name)) return;
  _loadedFonts.add(name);
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  // Request both normal and italic weights for richness
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:ital,wght@0,400;0,700;1,400&display=swap`;
  document.head.appendChild(link);
}

/* ─────────────────────────────────────────
   5. APPLICATION STATE
   Single mutable object. All renders read from here.
───────────────────────────────────────── */
const state = {
  colors:        ['#222', '#555', '#888', '#bbb', '#eee'],
  scheme:        'analogous',
  moodName:      '—',
  fontPair:      { display: 'Playfair Display', body: 'Source Sans 3' },
  lockedColors:  [false, false, false, false, false],
  lockedDisplay: false,
  lockedBody:    false,
  colorModes:    ['hex', 'hex', 'hex', 'hex', 'hex'],
  isDark:        false,
  isEdited:      false,
  /*
    swatchCount: how many colors to show. 3 or 5.
    Generator always produces 5; we just display the first N.
    colorRoles() maps the first N into semantic slots.
  */
  swatchCount:   5,
  // Live font preview controls
  previewText:   '',    // empty = show default placeholder text
  previewSize:   100,   // slider value 60–160, maps to CSS multiplier /100
  previewWeight: 400,   // 100–900 in steps of 100
};

/* ─────────────────────────────────────────
   6. DARK MODE
───────────────────────────────────────── */

function setTheme(dark) {
  state.isDark = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('theme-checkbox').checked = dark;
  try { localStorage.setItem('ae-theme', dark ? 'dark' : 'light'); } catch (_) {}
}

function initTheme() {
  let saved = 'light';
  try { saved = localStorage.getItem('ae-theme') || 'light'; } catch (_) {}
  // Respect OS preference only if nothing saved
  if (saved === 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    saved = 'dark';
  }
  setTheme(saved === 'dark');
}

/* ─────────────────────────────────────────
   7. FAVORITES — localStorage persistence
   Key: 'ae-favorites' → JSON array of snapshots
───────────────────────────────────────── */

/** Load favorites array from localStorage (never throws) */
function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem('ae-favorites') || '[]');
  } catch (_) { return []; }
}

/** Persist favorites array to localStorage */
function saveFavorites(favs) {
  try { localStorage.setItem('ae-favorites', JSON.stringify(favs)); } catch (_) {}
}

/** Capture current state as a saveable snapshot */
function captureSnapshot() {
  return {
    id:       Date.now(),
    moodName: state.moodName,
    scheme:   state.scheme,
    colors:   [...state.colors],
    fontPair: { ...state.fontPair },
  };
}

/** Save current aesthetic — prevents exact duplicate by colors+fonts */
function saveCurrentFavorite() {
  const snapshot = captureSnapshot();
  const favs = loadFavorites();

  // Deduplicate: same first color AND same display font = same aesthetic
  const isDupe = favs.some(
    f => f.colors[0] === snapshot.colors[0] && f.fontPair.display === snapshot.fontPair.display
  );
  if (isDupe) {
    showToast('Already saved!');
    return;
  }

  favs.unshift(snapshot); // most recent first
  saveFavorites(favs);
  renderFavoritesPanel();
  updateFavBadge();
  // Animate the save button heart
  const btn = document.getElementById('btn-save-fav');
  btn.classList.add('just-saved');
  btn.classList.add('saved');
  setTimeout(() => btn.classList.remove('just-saved'), 500);
  showToast('Saved to favorites ♥');
}

/** Apply a saved snapshot back to active state */
function applyFavorite(snapshot) {
  state.colors   = [...snapshot.colors];
  state.scheme   = snapshot.scheme;
  state.moodName = snapshot.moodName;
  state.fontPair = { ...snapshot.fontPair };
  // Reset locks so user isn't confused
  state.lockedColors  = [false, false, false, false, false];
  state.lockedDisplay = false;
  state.lockedBody    = false;
  loadFont(state.fontPair.display);
  loadFont(state.fontPair.body);
  renderAll();
  closeFavoritesPanel();
  showToast('Aesthetic applied');
}

/** Delete a favorite by id */
function deleteFavorite(id) {
  const favs = loadFavorites().filter(f => f.id !== id);
  saveFavorites(favs);
  renderFavoritesPanel();
  updateFavBadge();
}

function updateFavBadge() {
  const count = loadFavorites().length;
  const badge = document.getElementById('fav-count-badge');
  badge.textContent = count;
  badge.setAttribute('data-count', count);
}

/* ─────────────────────────────────────────
   8. GENERATION
───────────────────────────────────────── */

function generate() {
  const { colors: newColors, scheme } = generatePalette();
  state.scheme   = scheme;
  state.moodName = pickMood(scheme);

  state.colors = state.colors.map((old, i) =>
    state.lockedColors[i] ? old : newColors[i]
  );

  const newPair = FONT_PAIRS[Math.floor(Math.random() * FONT_PAIRS.length)];
  if (!state.lockedDisplay) state.fontPair = { ...state.fontPair, display: newPair.display };
  if (!state.lockedBody)    state.fontPair = { ...state.fontPair, body:    newPair.body    };

  loadFont(state.fontPair.display);
  loadFont(state.fontPair.body);

  document.getElementById('btn-save-fav').classList.remove('saved');
  state.isEdited = false;
  closeColorPicker();
  editorialCopyIndex++;

  // renderPalette() updates bars in-place — the CSS background-color
  // transition (.35s ease) plays automatically. No pre-update needed.
  renderAll();
  encodeURL();
}

/** Load a named preset into state */
function loadPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  state.colors   = [...p.colors];
  state.scheme   = p.scheme;
  state.moodName = p.moodName;
  state.fontPair = { ...p.fontPair };
  state.lockedColors  = [false, false, false, false, false];
  state.lockedDisplay = false;
  state.lockedBody    = false;
  loadFont(p.fontPair.display);
  loadFont(p.fontPair.body);
  document.getElementById('btn-save-fav').classList.remove('saved');
  state.isEdited = false;
  // Highlight active preset button
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === name);
  });
  renderAll();
  encodeURL(); // keep URL in sync when preset loads
}

/* ─────────────────────────────────────────
   9. RENDER — idempotent, always reads state
───────────────────────────────────────── */

function renderAll() {
  renderMood();
  renderPalette();
  renderFonts();
  renderPreview();
  renderWcagGrid();
}

/** Render the mood label with a quick fade */
function renderMood() {
  const el = document.getElementById('mood-label');
  el.style.opacity = '0';
  requestAnimationFrame(() => {
    el.textContent = state.moodName;
    el.style.opacity = '1';
  });

  const schemeEl = document.getElementById('scheme-tag');
  const schemeName = state.scheme.charAt(0).toUpperCase() + state.scheme.slice(1);
  /*
    If the user has manually edited colors, append a small "edited" indicator.
    This is honest feedback — the palette is no longer a pure color-theory scheme.
    We keep it subtle: a dot + text, not a warning.
  */
  schemeEl.innerHTML = state.isEdited
    ? `${schemeName} <span class="tag-edited" aria-label="manually edited">· edited</span>`
    : schemeName;
}

/** Render palette bars — count determined by state.swatchCount (3 or 5).
 *
 *  SMOOTH TRANSITIONS: We never destroy existing bars. Instead we update
 *  their background-color and inner content in-place, so the CSS
 *  background-color transition (.35s ease) always plays — whether the
 *  change came from generate(), a preset, or the color picker.
 *
 *  We only create/remove bar elements when the swatch COUNT changes.
 */
function renderPalette() {
  const container = document.getElementById('palette-bars');
  const indices   = state.swatchCount === 3 ? [0, 2, 4] : [0, 1, 2, 3, 4];
  const simmed    = simColors();

  // ── Sync bar count ──────────────────────────────────────────────────
  // Add missing bars
  while (container.children.length < indices.length) {
    const bar = document.createElement('div');
    bar.className = 'palette-bar';
    bar.setAttribute('role', 'listitem');
    bar.innerHTML = `
      <div class="palette-bar__left">
        <button class="color-value-pill"
                title="Click to copy · cycles HEX → RGB → HSL"></button>
        <span class="bar-hint" aria-hidden="true">click to copy &amp; cycle</span>
      </div>
      <div class="palette-bar__right">
        <div class="btn-edit-wrapper" title="Edit this color">
          <button class="btn-edit-swatch" aria-label="Edit color">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
        <button class="btn-lock-swatch" aria-label="Lock color">○</button>
      </div>
    `;
    container.appendChild(bar);
  }
  // Remove extra bars
  while (container.children.length > indices.length) {
    container.lastElementChild.remove();
  }

  // ── Update each bar in-place ────────────────────────────────────────
  Array.from(container.children).forEach((bar, slotIdx) => {
    const colorIdx   = indices[slotIdx];
    const hex        = state.colors[colorIdx];
    const displayHex = simmed[slotIdx];
    const fg         = readableColor(displayHex);
    const isLight    = fg !== '#141413';
    const valStr     = fmtColorValue(hex, state.colorModes[colorIdx]);
    const locked     = state.lockedColors[colorIdx];

    // Background — CSS transition plays automatically since element persists
    bar.style.backgroundColor = displayHex;
    bar.setAttribute('aria-label', `Color ${colorIdx + 1}: ${hex}`);

    // Pill
    const pill = bar.querySelector('.color-value-pill');
    pill.textContent = valStr;
    pill.style.color = fg;
    pill.className   = `color-value-pill${isLight ? ' light-bg' : ''}`;
    pill.setAttribute('aria-label', `Copy ${valStr}`);

    // Hint
    const hint = bar.querySelector('.bar-hint');
    hint.style.color = fg;

    // Edit button
    const editBtn = bar.querySelector('.btn-edit-swatch');
    editBtn.className = `btn-edit-swatch${isLight ? ' light-btn' : ''}`;
    editBtn.setAttribute('aria-label', `Edit color ${colorIdx + 1}`);

    // Lock button
    const lockBtn = bar.querySelector('.btn-lock-swatch');
    lockBtn.className   = `btn-lock-swatch${isLight ? ' light-btn' : ''}${locked ? ' locked' : ''}`;
    lockBtn.style.color = fg;
    lockBtn.title       = `${locked ? 'Unlock' : 'Lock'} color`;
    lockBtn.setAttribute('aria-label', `${locked ? 'Unlock' : 'Lock'} color ${colorIdx + 1}`);
    lockBtn.setAttribute('aria-pressed', locked);
    lockBtn.textContent = locked ? '🔒' : '○';

    // Re-bind events only when the slot's colorIdx changes (data-color-idx tracks this)
    const prevIdx = parseInt(bar.dataset.colorIdx ?? '-1');
    if (prevIdx !== colorIdx) {
      bar.dataset.colorIdx = colorIdx;

      // Clone to strip old listeners, then re-append children
      const newPill = pill.cloneNode(true);
      pill.replaceWith(newPill);
      newPill.addEventListener('click', () => {
        const modes = ['hex', 'rgb', 'hsl'];
        state.colorModes[colorIdx] = modes[(modes.indexOf(state.colorModes[colorIdx]) + 1) % 3];
        copyText(fmtColorValue(state.colors[colorIdx], state.colorModes[colorIdx]));
        newPill.textContent = fmtColorValue(state.colors[colorIdx], state.colorModes[colorIdx]);
      });

      const newEdit = editBtn.cloneNode(true);
      editBtn.replaceWith(newEdit);
      newEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        e.currentTarget.blur();
        openColorPicker(bar, colorIdx);
      });

      const newLock = lockBtn.cloneNode(true);
      lockBtn.replaceWith(newLock);
      newLock.addEventListener('click', e => {
        state.lockedColors[colorIdx] = !state.lockedColors[colorIdx];
        e.currentTarget.blur();
        renderPalette();
      });
    }
  });
}

/* ─────────────────────────────────────────
   COLOR PICKER
───────────────────────────────────────── */

let _picker      = null;  // singleton DOM node
let _pickerIndex = -1;    // which palette slot is being edited
let _pickerH     = 0;     // hue   0–360
let _pickerS     = 100;   // sat   0–100
let _pickerL     = 50;    // light 0–100
let _rafPending  = false; // rAF throttle flag

function buildColorPicker() {
  if (_picker) return;
  _picker = document.createElement('div');
  _picker.className = 'cpk';
  _picker.setAttribute('role', 'dialog');
  _picker.setAttribute('aria-label', 'Color picker');
  _picker.innerHTML = `
    <div class="cpk__sl">
      <canvas class="cpk__sl-canvas" width="216" height="148"></canvas>
      <div class="cpk__sl-handle"></div>
    </div>
    <div class="cpk__hue">
      <canvas class="cpk__hue-canvas" width="216" height="12"></canvas>
      <div class="cpk__hue-handle"></div>
    </div>
    <div class="cpk__footer">
      <div class="cpk__preview"></div>
      <div class="cpk__hex-wrap">
        <span class="cpk__hash">#</span>
        <input class="cpk__hex-input" type="text" maxlength="6" spellcheck="false" aria-label="Hex value" />
      </div>
      <button class="cpk__close" aria-label="Close">✕</button>
    </div>
  `;
  document.body.appendChild(_picker);
  _bindPickerEvents();
}

function openColorPicker(bar, colorIndex) {
  buildColorPicker();
  document.querySelectorAll('.palette-bar.picker-open').forEach(b => b.classList.remove('picker-open'));
  bar.classList.add('picker-open');
  _pickerIndex = colorIndex;

  const { h, s, l } = hexToHsl(state.colors[colorIndex]);
  _pickerH = h; _pickerS = s; _pickerL = l;

  // Position anchored to the edit button, flipping if needed
  const btn   = bar.querySelector('.btn-edit-swatch');
  const bRect = btn.getBoundingClientRect();
  const PW = 236, PH = 248;
  const sy = window.scrollY, sx = window.scrollX;
  let top  = bRect.bottom + sy + 8;
  let left = bRect.right  + sx - PW;
  if (bRect.bottom + PH + 8 > window.innerHeight) top = bRect.top + sy - PH - 8;
  left = Math.max(8 + sx, Math.min(left, window.innerWidth - PW - 8 + sx));
  _picker.style.top  = top  + 'px';
  _picker.style.left = left + 'px';
  _picker.classList.add('open');

  // Draw after display:flex is applied — requestAnimationFrame ensures layout is done
  requestAnimationFrame(() => {
    _drawSL(); _drawHue(); _moveHandle(); _syncHex(); _syncPreview();
  });
}

function closeColorPicker() {
  if (_picker) _picker.classList.remove('open');
  document.querySelectorAll('.palette-bar.picker-open').forEach(b => b.classList.remove('picker-open'));
  _pickerIndex = -1;
}

function _drawSL() {
  const c = _picker.querySelector('.cpk__sl-canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  // Hue → white left-to-right
  const gh = ctx.createLinearGradient(0, 0, W, 0);
  gh.addColorStop(0, '#fff');
  gh.addColorStop(1, `hsl(${_pickerH},100%,50%)`);
  ctx.fillStyle = gh; ctx.fillRect(0, 0, W, H);
  // Black bottom-to-top overlay
  const gv = ctx.createLinearGradient(0, 0, 0, H);
  gv.addColorStop(0, 'rgba(0,0,0,0)');
  gv.addColorStop(1, '#000');
  ctx.fillStyle = gv; ctx.fillRect(0, 0, W, H);
}

function _drawHue() {
  const c = _picker.querySelector('.cpk__hue-canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  [0,60,120,180,240,300,360].forEach(d => g.addColorStop(d/360, `hsl(${d},100%,50%)`));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function _moveHandle() {
  const canvas  = _picker.querySelector('.cpk__sl-canvas');
  const handle  = _picker.querySelector('.cpk__sl-handle');
  const hCanvas = _picker.querySelector('.cpk__hue-canvas');
  const hHandle = _picker.querySelector('.cpk__hue-handle');

  const W = canvas.offsetWidth  || 216;
  const H = canvas.offsetHeight || 148;

  const px = (_pickerS / 100) * W;
  const py = (1 - _pickerL / Math.max(1, 100 - _pickerS / 2)) * H;

  const R  = 6;
  const cx = clamp(isNaN(px) ? 0 : px, 0, W);
  const cy = clamp(isNaN(py) ? 0 : py, 0, H);
  handle.style.left = (cx - R) + 'px';
  handle.style.top  = (cy - R) + 'px';

  const hW  = hCanvas.offsetWidth || 216;
  const hcx = clamp((_pickerH / 360) * hW, 0, hW);
  hHandle.style.left = (hcx - 6) + 'px';
}

function _syncHex() {
  _picker.querySelector('.cpk__hex-input').value =
    hslToHex(_pickerH, _pickerS, _pickerL).replace('#','').toUpperCase();
}

function _syncPreview() {
  _picker.querySelector('.cpk__preview').style.background =
    hslToHex(_pickerH, _pickerS, _pickerL);
}

// Apply current HSL to the palette. During drag: minimal DOM update via rAF.
// On release: full renderAll to sync WCAG, URL, etc.
function _applyColor(dragging) {
  if (_pickerIndex < 0) return;
  const hex = hslToHex(_pickerH, _pickerS, _pickerL);
  state.colors[_pickerIndex] = hex;
  state.isEdited = true;

  if (dragging) {
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(() => {
      _rafPending = false;
      const bars = document.querySelectorAll('.palette-bar');
      const bar  = bars[_pickerIndex];
      if (bar) {
        const simHex = activeSimulation === 'none' ? hex : applyMatrix(hex, CVD_MATRICES[activeSimulation]);
        bar.style.backgroundColor = simHex;
        const pill = bar.querySelector('.color-value-pill');
        if (pill) pill.textContent = fmtColorValue(hex, state.colorModes[_pickerIndex]);
      }
      renderPreview();
      _syncPreview();
    });
  } else {
    renderPalette(); renderPreview(); renderWcagGrid(); renderMood();
    encodeURL();
    document.getElementById('btn-save-fav').classList.remove('saved');
  }
}

function _bindPickerEvents() {
  const slCanvas  = _picker.querySelector('.cpk__sl-canvas');
  const hueCanvas = _picker.querySelector('.cpk__hue-canvas');
  const hexInput  = _picker.querySelector('.cpk__hex-input');

  let dragging = null;

  function slAt(e) {
    const r = slCanvas.getBoundingClientRect();
    // getBoundingClientRect gives CSS pixels — no scaling needed.
    // Clamp to [0, W] and [0, H] in CSS pixels.
    const W = r.width;
    const H = r.height;
    const x = clamp(e.clientX - r.left, 0, W);
    const y = clamp(e.clientY - r.top,  0, H);
    // Forward mapping (matches _moveHandle inverse):
    //   S = (x / W) * 100
    //   L = (1 - y/H) * (100 - S/2)
    _pickerS = Math.round((x / W) * 100);
    _pickerL = Math.round((1 - y / H) * (100 - _pickerS / 2));
    _pickerL = clamp(_pickerL, 0, 100);
  }

  function hueAt(e) {
    const r = hueCanvas.getBoundingClientRect();
    const x = clamp(e.clientX - r.left, 0, r.width);
    _pickerH = Math.round((x / r.width) * 360);
  }

  slCanvas.addEventListener('pointerdown', e => {
    dragging = 'sl'; slCanvas.setPointerCapture(e.pointerId);
    slAt(e); _moveHandle(); _syncHex(); _syncPreview(); _applyColor(false);
  });
  slCanvas.addEventListener('pointermove', e => {
    if (dragging !== 'sl') return;
    slAt(e); _moveHandle(); _syncHex(); _syncPreview(); _applyColor(true);
  });
  slCanvas.addEventListener('pointerup', e => {
    if (dragging !== 'sl') return;
    dragging = null; slAt(e); _moveHandle(); _syncHex(); _syncPreview(); _applyColor(false);
  });

  hueCanvas.addEventListener('pointerdown', e => {
    dragging = 'hue'; hueCanvas.setPointerCapture(e.pointerId);
    hueAt(e); _drawSL(); _moveHandle(); _syncHex(); _syncPreview(); _applyColor(false);
  });
  hueCanvas.addEventListener('pointermove', e => {
    if (dragging !== 'hue') return;
    hueAt(e); _drawSL(); _moveHandle(); _syncHex(); _syncPreview(); _applyColor(true);
  });
  hueCanvas.addEventListener('pointerup', e => {
    if (dragging !== 'hue') return;
    dragging = null; hueAt(e); _drawSL(); _moveHandle(); _syncHex(); _syncPreview(); _applyColor(false);
  });

  hexInput.addEventListener('input', e => {
    const v = e.target.value.replace(/[^0-9a-fA-F]/g, '');
    if (v.length === 6) {
      const { h, s, l } = hexToHsl('#' + v);
      _pickerH = h; _pickerS = s; _pickerL = l;
      _drawSL(); _moveHandle(); _syncPreview(); _applyColor(false);
    }
  });
  hexInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') closeColorPicker();
    e.stopPropagation();
  });

  _picker.querySelector('.cpk__close').addEventListener('click', closeColorPicker);

  document.addEventListener('pointerdown', e => {
    if (!_picker.classList.contains('open')) return;
    if (_picker.contains(e.target)) return;
    if (e.target.closest('.btn-edit-swatch')) return;
    closeColorPicker();
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeColorPicker();
  });
}

function fmtColorValue(hex, mode) {
  switch (mode) {
    case 'rgb': return fmtRgb(hex);
    case 'hsl': return fmtHsl(hex);
    default:    return hex.toUpperCase();
  }
}

/** Render font preview tiles */
function renderFonts() {
  const { display, body } = state.fontPair;

  document.getElementById('font-display-name').textContent = display;
  document.getElementById('preview-display').style.fontFamily = `'${display}', Georgia, serif`;

  document.getElementById('font-body-name').textContent = body;
  document.getElementById('preview-body').style.fontFamily = `'${body}', system-ui, sans-serif`;

  // Apply custom preview text (empty = restore default placeholder)
  const DEFAULTS = {
    display: 'The art of design',
    body: 'Good typography is invisible. It guides the reader through content effortlessly, never calling attention to itself — only to the meaning within.',
  };
  const custom = state.previewText.trim();
  document.getElementById('preview-display').textContent = custom || DEFAULTS.display;
  document.getElementById('preview-body').textContent    = custom || DEFAULTS.body;

  // Apply size + weight via CSS custom properties on each tile
  // --preview-size is a multiplier (value/100), --preview-weight is the raw weight
  document.querySelectorAll('.type-tile').forEach(tile => {
    tile.style.setProperty('--preview-size',   state.previewSize / 100);
    tile.style.setProperty('--preview-weight', state.previewWeight);
  });

  // Sync slider positions to state (in case renderFonts is called from
  // generate() or loadPreset() — sliders should not reset visually)
  const sizeEl   = document.getElementById('font-preview-size');
  const weightEl = document.getElementById('font-preview-weight');
  if (sizeEl)   sizeEl.value   = state.previewSize;
  if (weightEl) weightEl.value = state.previewWeight;

  // Update lock button states + ARIA
  document.querySelectorAll('.btn-lock-font').forEach(btn => {
    const target = btn.dataset.target;
    const locked = target === 'display' ? state.lockedDisplay : state.lockedBody;
    btn.setAttribute('aria-pressed', String(locked));
    btn.title = (locked ? 'Unlock' : 'Lock') + ' ' + target + ' font';
    btn.classList.toggle('active', locked);
  });
}

/**
 * Render the live preview card.
 * 
/* ─────────────────────────────────────────
   COLOR ROLE MAPPING
   Consistent semantic assignment used across ALL preview templates
   and export formats. This is the contract between generation and output.

   color[0] → bg        — primary/darkest background
   color[1] → surface   — secondary surface (cards, sidebar)
   color[2] → accent    — interactive / CTA (buttons, links, highlights)
   color[3] → muted     — supporting detail, borders, secondary text
   color[4] → light     — lightest surface, text on dark backgrounds
───────────────────────────────────────── */
function colorRoles() {
  /*
    IMPORTANT: reads from simColors(), not state.colors.
    This single change means every template (editorial, UI, dashboard)
    automatically shows the simulated palette without any other changes.
    The actual state.colors are never overwritten.
  */
  const [bg, surface, accent, muted, light] = simColors();
  return {
    bg, surface, accent, muted, light,
    onBg:      readableColor(bg),
    onSurface: readableColor(surface),
    onAccent:  readableColor(accent),
    onLight:   readableColor(light),
  };
}

/* ─────────────────────────────────────────
   9b. PREVIEW STATE
   Tracks which template is active. Persists across generates.
───────────────────────────────────────── */
let activeTemplate   = 'editorial'; // 'editorial' | 'ui' | 'dashboard'
/*
  activeSimulation: which CVD type is active, or 'none'.
  Read-only view mode — never modifies state.colors.
  Affects: palette bar rendering, all preview templates, WCAG grid.
*/
let activeSimulation = 'none'; // 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'achromatopsia'

/**
 * Master preview renderer — delegates to the active template.
 * Called by renderAll() every time state changes.
 */
function renderPreview() {
  const stage = document.getElementById('preview-stage');
  if (!stage) return;

  switch (activeTemplate) {
    case 'ui':        renderUIPreview(stage);        break;
    case 'dashboard': renderDashboardPreview(stage); break;
    default:          renderEditorialPreview(stage); break;
  }
}

/* ── TEMPLATE 1: EDITORIAL ───────────────
   The original layout: large headline, body copy, color chips.
   Context: landing pages, editorial sites, brand presentations.
───────────────────────────────────────── */

/*
  Placeholder copy rotates on each generate so the preview feels alive
  rather than being the same Lorem Ipsum every time.
  Content is intentionally design/brand adjacent — feels realistic,
  not generic placeholder text.
*/
const EDITORIAL_COPY = [
  {
    overline: 'Collection No. 01',
    headline: 'Visual harmony starts here',
    body: 'Every great design begins with a considered palette and a thoughtful type system. These are the silent foundations on which meaning is built.',
  },
  {
    overline: 'Studio Notes',
    headline: 'Color tells the story first',
    body: 'Before a single word is read, color has already set the emotional register. The palette is not decoration — it is the message itself.',
  },
  {
    overline: 'Design Principles',
    headline: 'Form follows feeling',
    body: 'The best interfaces feel inevitable. Every element earns its place through purpose, contrast, and the quiet confidence of a well-chosen palette.',
  },
  {
    overline: 'Brand Identity',
    headline: 'Distinctiveness is a decision',
    body: 'Memorable brands are not accidents. They are the result of deliberate choices — in color, in type, in the space between things.',
  },
  {
    overline: 'Creative Direction',
    headline: 'Restraint is a superpower',
    body: 'Five colors, two typefaces, and a clear hierarchy. Everything a designer needs to build something beautiful. Nothing more.',
  },
  {
    overline: 'Type & Color',
    headline: 'The grid holds everything together',
    body: 'Rhythm in typography. Harmony in color. A consistent system that lets creativity flourish within structure rather than despite it.',
  },
];

// Points to a different copy set each time generate() runs.
// Initialized at 0, updated before each render.
let editorialCopyIndex = 0;

function renderEditorialPreview(stage) {
  const r = colorRoles();
  const { display, body } = state.fontPair;
  const copy = EDITORIAL_COPY[editorialCopyIndex % EDITORIAL_COPY.length];

  stage.innerHTML = `
    <div class="prev-editorial" style="background:${r.bg}">
      <div class="prev-editorial__content">
        <p class="prev-overline" style="color:${r.accent};font-family:'${body}',sans-serif">
          ${copy.overline}
        </p>
        <h3 class="prev-headline" style="color:${r.onBg};font-family:'${display}',Georgia,serif">
          ${copy.headline}
        </h3>
        <p class="prev-body" style="color:${r.onBg};font-family:'${body}',sans-serif;opacity:.72">
          ${copy.body}
        </p>
        <div class="prev-chips">
          ${simColors().map(c => `<span class="prev-chip" style="background:${c}"></span>`).join('')}
        </div>
      </div>
      <div class="prev-strip" aria-hidden="true">
        ${simColors().map(c => `<div style="flex:1;background:${c}"></div>`).join('')}
      </div>
    </div>
  `;
}

/*
  UI & Dashboard placeholder copy — rotates with same index so all
  three templates feel like they belong to the same "project".
*/
const UI_PROJECTS = [
  { name: 'Brand Refresh 2025',     label: 'Design',     badge: 'In progress', progress: 68 },
  { name: 'Landing Page Redesign',  label: 'Marketing',  badge: 'In review',   progress: 91 },
  { name: 'Component Library v2',   label: 'System',     badge: 'In progress', progress: 44 },
  { name: 'Onboarding Flow',        label: 'Product',    badge: 'Planning',    progress: 22 },
  { name: 'Mobile App UI Kit',      label: 'Design',     badge: 'In progress', progress: 57 },
  { name: 'Dashboard Analytics',    label: 'Data',       badge: 'In review',   progress: 83 },
];

/* ── TEMPLATE 2: UI COMPONENTS ───────────
   Buttons, card, input, badge — the core building blocks of any
   web interface. Answers "does this palette work for a real UI?"
   Context: web apps, SaaS dashboards, mobile apps.
   
   NOTE: Buttons inside the preview are intentionally non-interactive —
   this is a design mockup, not a live app. A "mockup" label in the
   card header makes this clear to users.
───────────────────────────────────────── */
function renderUIPreview(stage) {
  const r = colorRoles();
  const { display, body } = state.fontPair;
  const fontStack    = `'${body}',system-ui,sans-serif`;
  const displayStack = `'${display}',Georgia,serif`;
  const project      = UI_PROJECTS[editorialCopyIndex % UI_PROJECTS.length];
  // Simulated colors for swatches (purely visual)
  const sc = simColors();

  stage.innerHTML = `
    <div class="prev-ui" style="background:${r.bg};font-family:${fontStack}">

      <!-- Top bar -->
      <div class="prev-ui__topbar" style="background:${r.surface};border-bottom:1px solid ${r.muted}22">
        <span class="prev-ui__logo" style="color:${r.onSurface};font-family:${displayStack}">Æsthetic</span>
        <nav class="prev-ui__nav">
          <span class="prev-ui__nav-item active" style="color:${r.accent}">Home</span>
          <span class="prev-ui__nav-item" style="color:${r.onSurface};opacity:.55">Explore</span>
          <span class="prev-ui__nav-item" style="color:${r.onSurface};opacity:.55">Saved</span>
        </nav>
        <button class="prev-btn prev-btn--primary prev-btn--mockup"
                style="background:${r.accent};color:${r.onAccent}"
                title="Mockup preview — not interactive"
                aria-hidden="true" tabindex="-1">Get started</button>
      </div>

      <!-- Content area -->
      <div class="prev-ui__body">

        <!-- Card -->
        <div class="prev-ui__card" style="background:${r.surface};border:1px solid ${r.muted}33">
          <div class="prev-ui__card-top">
            <div>
              <div class="prev-ui__card-label" style="color:${r.muted};font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.3rem">
                ${project.label} Project
              </div>
              <div class="prev-ui__card-title" style="color:${r.onSurface};font-family:${displayStack};font-size:1.1rem;font-weight:400;letter-spacing:-.02em">
                ${project.name}
              </div>
            </div>
            <span class="prev-badge" style="background:${r.accent}22;color:${r.accent};border:1px solid ${r.accent}44">
              ${project.badge}
            </span>
          </div>
          <div class="prev-ui__card-meta" style="color:${r.muted}">
            <span>Updated just now</span>
            <span>·</span>
            <span>4 collaborators</span>
          </div>
          <div class="prev-progress-track" style="background:${r.bg};margin-top:.85rem">
            <div class="prev-progress-fill" style="background:${r.accent};width:${project.progress}%"></div>
          </div>
        </div>

        <!-- Input + Button row -->
        <div class="prev-ui__actions">
          <div class="prev-input-wrap" style="border:1px solid ${r.muted}44;background:${r.surface}">
            <span style="color:${r.muted};font-size:.78rem">Search palettes…</span>
          </div>
          <button class="prev-btn prev-btn--primary prev-btn--mockup"
                  style="background:${r.accent};color:${r.onAccent}"
                  title="Mockup preview — not interactive"
                  aria-hidden="true" tabindex="-1">Search</button>
          <button class="prev-btn prev-btn--ghost prev-btn--mockup"
                  style="border:1px solid ${r.muted}55;color:${r.onBg};background:transparent"
                  title="Mockup preview — not interactive"
                  aria-hidden="true" tabindex="-1">Filter</button>
        </div>

        <!-- Color swatches — use simColors so simulation shows correctly -->
        <div class="prev-ui__swatches">
          ${sc.map(c => `
            <div class="prev-swatch-item">
              <div class="prev-swatch-block" style="background:${c}"></div>
              <span class="prev-swatch-label" style="color:${r.muted}">${c.toUpperCase()}</span>
            </div>`).join('')}
        </div>

      </div>
    </div>
  `;
}

/* ── TEMPLATE 3: DASHBOARD ───────────────
   Sidebar, stat cards, bar chart — the classic SaaS shell.
   Answers "does this palette work for a data-dense product UI?"
   Context: analytics dashboards, admin panels, product tools.
───────────────────────────────────────── */
function renderDashboardPreview(stage) {
  const r = colorRoles();
  const { display, body } = state.fontPair;
  const fontStack    = `'${body}',system-ui,sans-serif`;
  const displayStack = `'${display}',Georgia,serif`;
  const sc           = simColors(); // simulated colors for visual strips

  // Bar chart heights — decorative, not data-driven
  const bars    = [45, 72, 58, 88, 63, 79, 52];
  const barMax  = 88;

  stage.innerHTML = `
    <div class="prev-dash" style="background:${r.bg};font-family:${fontStack}">

      <!-- Sidebar -->
      <aside class="prev-dash__sidebar" style="background:${r.surface};border-right:1px solid ${r.muted}22">
        <div class="prev-dash__brand" style="color:${r.onSurface};font-family:${displayStack}">Æsthetic</div>
        <nav class="prev-dash__nav">
          ${['Overview','Palettes','Typography','Export'].map((label, i) => `
            <div class="prev-dash__nav-item ${i === 0 ? 'active' : ''}"
                 style="${i === 0
                   ? `background:${r.accent}18;color:${r.accent};`
                   : `color:${r.onSurface};opacity:.5;`}">
              <div class="prev-dash__nav-dot" style="background:${i === 0 ? r.accent : r.muted};opacity:${i === 0 ? 1 : .4}"></div>
              ${label}
            </div>`).join('')}
        </nav>
        <div class="prev-dash__palette-strip" style="margin-top:auto;padding-top:1rem;border-top:1px solid ${r.muted}22">
          ${sc.map(c => `<div style="height:6px;background:${c};flex:1"></div>`).join('')}
        </div>
      </aside>

      <!-- Main content -->
      <main class="prev-dash__main">
        <div class="prev-dash__stats">
          ${[
            { label: 'Palettes', value: '247', delta: '+12%' },
            { label: 'Exports',  value: '89',  delta: '+5%'  },
            { label: 'Saved',    value: '34',  delta: '+8%'  },
          ].map(stat => `
            <div class="prev-stat-card" style="background:${r.surface};border:1px solid ${r.muted}22">
              <div class="prev-stat-label" style="color:${r.muted}">${stat.label}</div>
              <div class="prev-stat-value" style="color:${r.onSurface};font-family:${displayStack}">${stat.value}</div>
              <div class="prev-stat-delta" style="color:${r.accent}">${stat.delta}</div>
            </div>`).join('')}
        </div>

        <div class="prev-dash__chart" style="background:${r.surface};border:1px solid ${r.muted}22">
          <div class="prev-chart-header">
            <span style="color:${r.onSurface};font-size:.72rem;font-weight:600">Generations this week</span>
            <span style="color:${r.muted};font-size:.62rem">last 7 days</span>
          </div>
          <div class="prev-chart-bars">
            ${bars.map((h, i) => `
              <div class="prev-chart-col">
                <div class="prev-bar-fill"
                     style="height:${Math.round((h/barMax)*100)}%;background:${i === 3 ? r.accent : r.accent + '55'}">
                </div>
                <span class="prev-bar-label" style="color:${r.muted}">${['M','T','W','T','F','S','S'][i]}</span>
              </div>`).join('')}
          </div>
        </div>
      </main>
    </div>
  `;
}

/* ─────────────────────────────────────────
   12. EXPORT FUNCTIONS
   
   Semantic color names used across all formats:
   bg / surface / accent / muted / light
   This makes exports immediately useful — not --color-1 through --color-5.
───────────────────────────────────────── */

/** Upgraded CSS export with semantic variable names */
function exportCSS() {
  const r = colorRoles();
  const lines = [
    `/* Æsthetic — "${state.moodName}" · ${state.scheme} */`,
    `/* ${state.fontPair.display} / ${state.fontPair.body} */`,
    `/* Generated at aesthetic.app */`,
    '',
    ':root {',
    `  /* Colors */`,
    `  --color-bg:      ${r.bg};`,
    `  --color-surface: ${r.surface};`,
    `  --color-accent:  ${r.accent};`,
    `  --color-muted:   ${r.muted};`,
    `  --color-light:   ${r.light};`,
    '',
    `  /* Typography */`,
    `  --font-display: '${state.fontPair.display}', serif;`,
    `  --font-body:    '${state.fontPair.body}', sans-serif;`,
    '}',
  ].join('\n');
  copyText(lines, 'CSS variables copied!');
}

/**
 * Tailwind config export.
 * Produces a colors block you paste into tailwind.config.js.
 * Uses a nested palette structure: aesthetic.bg, aesthetic.accent, etc.
 * This is the format most searched by frontend developers.
 */
function exportTailwind() {
  const r = colorRoles();
  const name = state.moodName.toLowerCase().replace(/\s+/g, '-');
  const lines = [
    `// tailwind.config.js — "${state.moodName}"`,
    `// Paste inside your theme.extend.colors block`,
    ``,
    `module.exports = {`,
    `  theme: {`,
    `    extend: {`,
    `      colors: {`,
    `        '${name}': {`,
    `          bg:      '${r.bg}',`,
    `          surface: '${r.surface}',`,
    `          accent:  '${r.accent}',`,
    `          muted:   '${r.muted}',`,
    `          light:   '${r.light}',`,
    `        },`,
    `      },`,
    `      fontFamily: {`,
    `        display: ["'${state.fontPair.display}'", 'serif'],`,
    `        body:    ["'${state.fontPair.body}'",    'sans-serif'],`,
    `      },`,
    `    },`,
    `  },`,
    `};`,
  ].join('\n');
  copyText(lines, 'Tailwind config copied!');
}

/**
 * Figma Variables JSON export.
 * Produces a JSON file that the "Import Variables" Figma plugin
 * (by Figma Community) can import directly as a color library.
 *
 * Format: { collections: [{ name, modes, variables }] }
 * Each variable has a name, type: "COLOR", and valuesByMode.
 *
 * Reference: https://www.figma.com/community/plugin/1253254026460019
 */
function exportFigma() {
  const r = colorRoles();

  /*
    Helper: convert hex to Figma's RGBA float format { r, g, b, a }
    Figma uses 0–1 floats, not 0–255 integers.
  */
  function hexToFigmaRgb(hex) {
    const { r, g, b } = hexToRgb(hex);
    return { r: +(r/255).toFixed(4), g: +(g/255).toFixed(4), b: +(b/255).toFixed(4), a: 1 };
  }

  const variables = [
    { name: 'color/bg',      value: hexToFigmaRgb(r.bg)      },
    { name: 'color/surface', value: hexToFigmaRgb(r.surface)  },
    { name: 'color/accent',  value: hexToFigmaRgb(r.accent)   },
    { name: 'color/muted',   value: hexToFigmaRgb(r.muted)    },
    { name: 'color/light',   value: hexToFigmaRgb(r.light)    },
  ];

  const payload = {
    version:     '1.0',
    metadata: {
      name:   state.moodName,
      scheme: state.scheme,
      source: 'aesthetic.app',
    },
    collections: [{
      name:  state.moodName,
      modes: [{ name: 'Default', modeId: 'mode-1' }],
      variables: variables.map((v, i) => ({
        id:   `var-${i + 1}`,
        name: v.name,
        type: 'COLOR',
        valuesByMode: { 'mode-1': v.value },
      })),
    }],
  };

  // Download as .json file
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `aesthetic-${state.moodName.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Figma JSON downloaded!');
}
function renderWcagGrid() {
  const container = document.getElementById('wcag-grid');
  container.innerHTML = '';

  /*
    When simulation is active, WCAG grid shows the simulated colors —
    this is the most useful mode: it tells you whether the palette is
    still accessible to people with that type of color blindness.
    The real hex is shown in parentheses so you know the original.
  */
  const colors = simColors();
  const isSimulating = activeSimulation !== 'none';

  colors.forEach((hex, i) => {
    const realHex   = state.colors[i];
    const vsWhite   = contrastRatio(hex, '#FFFFFF').toFixed(1);
    const vsBlack   = contrastRatio(hex, '#000000').toFixed(1);
    const lvlWhite  = wcagLevel(hex, '#FFFFFF');
    const lvlBlack  = wcagLevel(hex, '#000000');
    const classMap  = { 'AAA': 'ok-aaa', 'AA': 'ok-aa', 'FAIL': 'no-pass' };

    const row = document.createElement('div');
    row.className = 'wcag-row';
    row.innerHTML = `
      <div class="wcag-swatch" style="background:${hex}" aria-hidden="true"></div>
      <span class="wcag-hex">
        ${hex.toUpperCase()}
        ${isSimulating ? `<span class="wcag-real-hex" title="Original color">(${realHex.toUpperCase()})</span>` : ''}
      </span>
      <span class="wcag-desc">on white: ${vsWhite}:1</span>
      <span class="wcag-pill ${classMap[lvlWhite]}" title="WCAG on white background">${lvlWhite}</span>
      <span class="wcag-desc">on black: ${vsBlack}:1</span>
      <span class="wcag-pill ${classMap[lvlBlack]}" title="WCAG on black background">${lvlBlack}</span>
    `;
    container.appendChild(row);
  });

  // Summary badge always reflects current view (simulated or real)
  const summaryLevel = wcagLevel(colors[0], colors[4]);
  const ratio        = contrastRatio(colors[0], colors[4]).toFixed(1);
  const badge        = document.getElementById('wcag-badge');
  badge.textContent  = `${summaryLevel} · ${ratio}:1`;
  badge.className    = `wcag-badge lvl-${summaryLevel.toLowerCase()}`;
}

/** Render the favorites panel list */
function renderFavoritesPanel() {
  const list  = document.getElementById('favorites-list');
  const empty = document.getElementById('favorites-empty');
  const favs  = loadFavorites();

  list.innerHTML = '';

  if (favs.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  favs.forEach(fav => {
    const card = document.createElement('div');
    card.className = 'fav-card';

    card.innerHTML = `
      <div class="fav-card__palette">
        ${fav.colors.map(c => `<div class="fav-color-seg" style="background:${c}"></div>`).join('')}
      </div>
      <div class="fav-card__body">
        <div class="fav-card__name">${fav.moodName}</div>
        <div class="fav-card__fonts">${fav.fontPair.display} / ${fav.fontPair.body}</div>
        <div class="fav-card__actions">
          <button class="btn-fav-apply" data-id="${fav.id}" aria-label="Apply ${fav.moodName}">Apply</button>
          <button class="btn-fav-delete" data-id="${fav.id}" aria-label="Delete ${fav.moodName}">Delete</button>
        </div>
      </div>
    `;

    card.querySelector('.btn-fav-apply').addEventListener('click',  () => applyFavorite(fav));
    card.querySelector('.btn-fav-delete').addEventListener('click', () => deleteFavorite(fav.id));

    list.appendChild(card);
  });
}

/* ─────────────────────────────────────────
   10. FAVORITES PANEL OPEN/CLOSE
───────────────────────────────────────── */

function openFavoritesPanel() {
  const panel   = document.getElementById('favorites-panel');
  const overlay = document.getElementById('panel-overlay');
  const trigger = document.getElementById('btn-favorites-panel');

  renderFavoritesPanel();
  panel.classList.add('open');
  overlay.classList.add('visible');
  panel.setAttribute('aria-hidden', 'false');
  trigger.setAttribute('aria-expanded', 'true');

  // Trap focus inside panel
  document.getElementById('btn-close-panel').focus();
}

function closeFavoritesPanel() {
  const panel   = document.getElementById('favorites-panel');
  const overlay = document.getElementById('panel-overlay');
  const trigger = document.getElementById('btn-favorites-panel');

  panel.classList.remove('open');
  overlay.classList.remove('visible');
  panel.setAttribute('aria-hidden', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.focus();
}

/* ─────────────────────────────────────────
   11. URL — Option A: clean, no state encoded
   The app lives at a single clean URL. No hash, no parameters.
   Share copies the full URL including the readable hash.
   The hash encodes palette + fonts in a human-readable format.
   Format: #RRGGBB+RRGGBB+...|FontName|BodyFont|mood|scheme
───────────────────────────────────────── */

/**
 * URL ENCODING — human-readable hash format
 *
 * Format: #RRGGBB+RRGGBB+RRGGBB+RRGGBB+RRGGBB|Display+Font|Body+Font|mood-name|scheme
 *
 * Example: #1c2d3e+5a6b7c+9a8bd2+c1d4e5+f0f1f2|DM+Serif+Display|DM+Sans|Shade+Scale|monochromatic
 *
 * Why this format:
 *   - Hex colors are instantly recognizable to any developer
 *   - Font names separated by + mirrors how URLs already work (readable)
 *   - Pipe | cleanly separates the 5 sections without encoding issues
 *   - No base64, no JSON — the URL is self-documenting
 *   - Still under ~120 chars for typical cases (fits in most share previews)
 *
 * Trade-off: font names with special characters (accents, etc.) are
 * percent-encoded by the browser automatically — still decodeable.
 */
function encodeURL() {
  try {
    const colors  = state.colors.map(h => h.replace('#', '')).join('+');
    const display = encodeURIComponent(state.fontPair.display);
    const body    = encodeURIComponent(state.fontPair.body);
    const mood    = encodeURIComponent(state.moodName);
    const scheme  = encodeURIComponent(state.scheme);

    const hash = `${colors}|${display}|${body}|${mood}|${scheme}`;
    history.replaceState(null, '', '#' + hash);
  } catch (_) {}
}

/** Returns the full shareable URL (base + hash) */
function buildShareURL() {
  return window.location.href;
}

/**
 * Decode a human-readable hash back into state.
 * Returns true if successful, false if hash is absent or malformed.
 * Also handles legacy base64 hashes from older app versions gracefully.
 */
function decodeURL() {
  try {
    const raw = window.location.hash.slice(1);
    if (!raw) return false;

    // ── Legacy support: detect old base64 format (no pipe separator) ──
    // Old format was pure base64 JSON. If we see no '|' and the string
    // looks like base64, try to decode it the old way then migrate.
    if (!raw.includes('|')) {
      try {
        const p = JSON.parse(atob(raw));
        if (Array.isArray(p.c) && p.c.length === 5) {
          state.colors   = p.c.map(h => `#${h}`);
          state.fontPair = { display: p.d, body: p.b };
          state.moodName = p.m || '—';
          state.scheme   = p.s || 'analogous';
          loadFont(state.fontPair.display);
          loadFont(state.fontPair.body);
          encodeURL(); // immediately migrate URL to new readable format
          return true;
        }
      } catch (_) {}
      // Not a valid old hash either — clean up and return false
      history.replaceState(null, '', window.location.pathname);
      return false;
    }

    // ── New readable format: colors|display|body|mood|scheme ──
    const parts = raw.split('|');
    if (parts.length < 3) return false;

    const hexParts = parts[0].split('+');
    if (hexParts.length !== 5) return false;

    // Validate each hex segment is a 6-char hex string
    const validHex = /^[0-9a-fA-F]{6}$/;
    if (!hexParts.every(h => validHex.test(h))) return false;

    state.colors   = hexParts.map(h => `#${h}`);
    state.fontPair = {
      display: decodeURIComponent(parts[1] || 'Playfair Display'),
      body:    decodeURIComponent(parts[2] || 'DM Sans'),
    };
    state.moodName = parts[3] ? decodeURIComponent(parts[3]) : '—';
    state.scheme   = parts[4] ? decodeURIComponent(parts[4]) : 'analogous';

    loadFont(state.fontPair.display);
    loadFont(state.fontPair.body);
    return true;

  } catch (_) {
    // Any parse error → clean URL, fall through to default preset
    history.replaceState(null, '', window.location.pathname);
    return false;
  }
}
/* ─────────────────────────────────────────
   13. EXPORT PNG (Canvas API)
───────────────────────────────────────── */
function exportPNG() {
  const canvas = document.getElementById('export-canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2× for file size
  const W = 1200, H = 630;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = state.colors[0];
  ctx.fillRect(0, 0, W, H);

  // Right column: stacked color bars
  const barW = 220, barH = H / 5;
  state.colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(W - barW, i * barH, barW, barH);
    // Hex label inside each bar
    const fg = readableColor(c);
    ctx.fillStyle = fg;
    ctx.globalAlpha = .65;
    ctx.font = '500 11px monospace';
    ctx.fillText(c.toUpperCase(), W - barW + 14, i * barH + barH / 2 + 5);
    ctx.globalAlpha = 1;
  });

  // Mood name
  const fg = readableColor(state.colors[0]);
  ctx.fillStyle = fg;
  ctx.font = 'italic 400 62px Georgia, serif';
  ctx.fillText(state.moodName, 60, 130);

  // Scheme pill
  ctx.fillStyle = state.colors[3];
  ctx.font = '500 13px monospace';
  ctx.fillText(state.scheme.toUpperCase(), 60, 168);

  // Font labels
  ctx.fillStyle = fg;
  ctx.globalAlpha = .45;
  ctx.font = '400 12px monospace';
  ctx.fillText('DISPLAY  ' + state.fontPair.display, 60, H - 95);
  ctx.fillText('BODY     ' + state.fontPair.body,    60, H - 72);
  ctx.globalAlpha = 1;

  // Watermark
  ctx.fillStyle = fg;
  ctx.globalAlpha = .22;
  ctx.font = 'italic 400 16px Georgia, serif';
  ctx.fillText('Æsthetic', 60, H - 38);
  ctx.globalAlpha = 1;

  // Download
  const a = document.createElement('a');
  a.download = `aesthetic-${state.moodName.toLowerCase().replace(/\s+/g, '-')}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  showToast('PNG saved!');
}

/* ─────────────────────────────────────────
   14. CLIPBOARD + TOAST
───────────────────────────────────────── */
function copyText(text, msg = 'Copied!') {
  const done = () => showToast(msg);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  Object.assign(ta.style, { position: 'fixed', opacity: '0', top: '0', left: '0' });
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
  cb();
}

let _toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ─────────────────────────────────────────
   15. EVENT BINDINGS
───────────────────────────────────────── */
function bindEvents() {
  // Generate — blur after click so Space doesn't re-trigger this button
  document.getElementById('btn-generate').addEventListener('click', e => {
    generate();
    e.currentTarget.blur();
  });

  // Space = generate (if focus not on a text input)
  // We blur the active element first — this prevents the browser from
  // firing a click on the focused button when Space is pressed, which
  // would cause the button's active/stuck visual state.
  document.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      const tag = document.activeElement.tagName;
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return; // let Space work in text fields
      e.preventDefault();
      // Blur whatever is focused — removes the stuck button state
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      generate();
    }
    if (e.key === 'Escape') { closeFavoritesPanel(); closeExportPanel(); }
  });

  // Presets — blur after click
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', e => { loadPreset(btn.dataset.preset); e.currentTarget.blur(); });
  });

  // Font locks — blur after click
  document.querySelectorAll('.btn-lock-font').forEach(btn => {
    btn.addEventListener('click', e => {
      const t = btn.dataset.target;
      if (t === 'display') state.lockedDisplay = !state.lockedDisplay;
      if (t === 'body')    state.lockedBody    = !state.lockedBody;
      renderFonts();
      e.currentTarget.blur();
    });
  });

  // Preview template tabs
  document.querySelectorAll('.preview-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      activeTemplate = tab.dataset.template;
      document.querySelectorAll('.preview-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      renderPreview();
      e.currentTarget.blur();
    });
  });

  // Color blindness simulation buttons
  document.querySelectorAll('.sim-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      activeSimulation = btn.dataset.sim;

      document.querySelectorAll('.sim-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });

      const simBar = document.getElementById('sim-bar');
      simBar.classList.toggle('simulating', activeSimulation !== 'none');

      const badge = document.getElementById('sim-badge');
      if (activeSimulation === 'none') {
        badge.textContent = '';
        badge.classList.remove('visible');
      } else {
        const labels = {
          deuteranopia:  'Deuteranopia · red-green, green-weak',
          protanopia:    'Protanopia · red-green, red-weak',
          tritanopia:    'Tritanopia · blue-yellow',
          achromatopsia: 'Achromatopsia · full grayscale',
        };
        badge.textContent = labels[activeSimulation];
        badge.classList.add('visible');
      }

      renderAll();
      e.currentTarget.blur(); // e is now correctly in scope
    });
  });

  // Export buttons — blur after click so Space doesn't re-trigger
  ['btn-export-css','btn-export-tailwind','btn-export-figma','btn-export-png'].forEach(id => {
    const handlers = {
      'btn-export-css':      exportCSS,
      'btn-export-tailwind': exportTailwind,
      'btn-export-figma':    exportFigma,
      'btn-export-png':      exportPNG,
    };
    document.getElementById(id).addEventListener('click', e => {
      handlers[id]();
      e.currentTarget.blur();
    });
  });

  // Share
  document.getElementById('btn-share').addEventListener('click', e => {
    copyText(buildShareURL(), 'Link copied! ↗');
    e.currentTarget.blur();
  });

  // Save / favorites — blur after click
  document.getElementById('btn-save-fav').addEventListener('click', e => {
    saveCurrentFavorite();
    e.currentTarget.blur();
  });
  document.getElementById('btn-favorites-panel').addEventListener('click', e => {
    openFavoritesPanel();
    e.currentTarget.blur();
  });
  document.getElementById('btn-close-panel').addEventListener('click', e => {
    closeFavoritesPanel();
    e.currentTarget.blur();
  });
  document.getElementById('panel-overlay').addEventListener('click', closeFavoritesPanel);

  // Dark mode toggle
  document.getElementById('theme-checkbox').addEventListener('change', e => setTheme(e.target.checked));

  // Swatch count toggle (3 / 5)
  document.querySelectorAll('.swatch-count-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const count = parseInt(btn.dataset.count, 10);
      if (count === state.swatchCount) return;
      state.swatchCount = count;
      document.querySelectorAll('.swatch-count-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      renderPalette();
      renderPreview();
      renderWcagGrid();
      e.currentTarget.blur();
    });
  });

  // ── Live font preview controls ────────────────────────────────────
  // Text input — updates both tiles instantly, Space key still works
  // (input is a text field so the Space guard in keydown already skips it)
  const previewTextEl   = document.getElementById('font-preview-text');
  const previewSizeEl   = document.getElementById('font-preview-size');
  const previewWeightEl = document.getElementById('font-preview-weight');

  previewTextEl.addEventListener('input', () => {
    state.previewText = previewTextEl.value;
    const custom = state.previewText.trim();
    const DEFAULTS = {
      display: 'The art of design',
      body: 'Good typography is invisible. It guides the reader through content effortlessly, never calling attention to itself — only to the meaning within.',
    };
    document.getElementById('preview-display').textContent = custom || DEFAULTS.display;
    document.getElementById('preview-body').textContent    = custom || DEFAULTS.body;
  });

  // Prevent Space from triggering generate while typing in the text field
  previewTextEl.addEventListener('keydown', e => e.stopPropagation());

  previewSizeEl.addEventListener('input', () => {
    state.previewSize = parseInt(previewSizeEl.value, 10);
    document.querySelectorAll('.type-tile').forEach(tile => {
      tile.style.setProperty('--preview-size', state.previewSize / 100);
    });
  });

  previewWeightEl.addEventListener('input', () => {
    state.previewWeight = parseInt(previewWeightEl.value, 10);
    document.querySelectorAll('.type-tile').forEach(tile => {
      tile.style.setProperty('--preview-weight', state.previewWeight);
    });
  });
}

function closeExportPanel() {} // no-op — kept for Escape handler compatibility

/* ─────────────────────────────────────────
   16. INIT
───────────────────────────────────────── */
function init() {
  initTheme();
  bindEvents();
  updateFavBadge();

  // Load from URL hash → else load "Minimal" preset as the default first view
  if (!decodeURL()) {
    loadPreset('minimal'); // page never loads empty
  } else {
    renderAll();
  }
}

document.addEventListener('DOMContentLoaded', init);