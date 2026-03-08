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

const FONT_PAIRS = [
  { display: 'Playfair Display',   body: 'DM Sans' },
  { display: 'Cormorant Garamond', body: 'Jost' },
  { display: 'Libre Baskerville',  body: 'Source Sans 3' },
  { display: 'DM Serif Display',   body: 'DM Sans' },
  { display: 'Fraunces',           body: 'Nunito Sans' },
  { display: 'Bodoni Moda',        body: 'Mulish' },
  { display: 'Abril Fatface',      body: 'Lato' },
  { display: 'Spectral',           body: 'Work Sans' },
  { display: 'Lora',               body: 'Open Sans' },
  { display: 'Rozha One',          body: 'Rubik' },
  { display: 'Crimson Pro',        body: 'IBM Plex Sans' },
  { display: 'Josefin Slab',       body: 'Josefin Sans' },
  { display: 'Yeseva One',         body: 'Josefin Sans' },
  { display: 'Bebas Neue',         body: 'Source Sans 3' },
  { display: 'Philosopher',        body: 'PT Sans' },
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
   3. PALETTE GENERATOR
───────────────────────────────────────── */

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
  // colorModes[i] cycles: 'hex' → 'rgb' → 'hsl'
  colorModes:    ['hex', 'hex', 'hex', 'hex', 'hex'],
  isDark:        false,
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

  // Respect locks — only overwrite unlocked slots
  state.colors = state.colors.map((old, i) =>
    state.lockedColors[i] ? old : newColors[i]
  );

  // Same for font pair
  const newPair = FONT_PAIRS[Math.floor(Math.random() * FONT_PAIRS.length)];
  if (!state.lockedDisplay) state.fontPair = { ...state.fontPair, display: newPair.display };
  if (!state.lockedBody)    state.fontPair = { ...state.fontPair, body:    newPair.body    };

  loadFont(state.fontPair.display);
  loadFont(state.fontPair.body);

  // Reset save button state (new aesthetic, not saved yet)
  document.getElementById('btn-save-fav').classList.remove('saved');

  renderAll();
  encodeURL(); // update address bar with new readable hash
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
  schemeEl.textContent = state.scheme.charAt(0).toUpperCase() + state.scheme.slice(1);
}

/** Render all 5 palette bars */
function renderPalette() {
  const container = document.getElementById('palette-bars');
  container.innerHTML = '';

  state.colors.forEach((hex, i) => {
    const fg      = readableColor(hex);
    // Is the computed text color light? Used to pick pill variant
    const isLight = fg !== '#141413';
    const valStr  = fmtColorValue(hex, state.colorModes[i]);

    const bar = document.createElement('div');
    bar.className = 'palette-bar';
    bar.setAttribute('role', 'listitem');
    bar.style.backgroundColor = hex;
    bar.setAttribute('aria-label', `Color ${i + 1}: ${hex}`);

    bar.innerHTML = `
      <div class="palette-bar__left">
        <button class="color-value-pill ${isLight ? 'light-bg' : ''}"
                style="color:${fg}"
                data-i="${i}"
                title="Click to copy and cycle format"
                aria-label="Copy color value ${valStr}">${valStr}</button>
        <span class="bar-hint" style="color:${fg}" aria-hidden="true">click to copy &amp; cycle</span>
      </div>
      <div class="palette-bar__right">
        <button class="btn-lock-swatch ${isLight ? 'light-btn' : ''} ${state.lockedColors[i] ? 'locked' : ''}"
                style="color:${fg}"
                data-i="${i}"
                title="${state.lockedColors[i] ? 'Unlock' : 'Lock'} color"
                aria-label="${state.lockedColors[i] ? 'Unlock' : 'Lock'} color ${i + 1}"
                aria-pressed="${state.lockedColors[i]}">
          ${state.lockedColors[i] ? '🔒' : '○'}
        </button>
      </div>
    `;

    bar.querySelector('.color-value-pill').addEventListener('click', () => {
      const modes = ['hex', 'rgb', 'hsl'];
      state.colorModes[i] = modes[(modes.indexOf(state.colorModes[i]) + 1) % 3];
      copyText(fmtColorValue(hex, state.colorModes[i]));
      renderPalette(); // re-render to update pill text
    });

    bar.querySelector('.btn-lock-swatch').addEventListener('click', () => {
      state.lockedColors[i] = !state.lockedColors[i];
      renderPalette();
    });

    container.appendChild(bar);
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
  // Set generated font on the preview text only — not on the tile meta row
  document.getElementById('preview-display').style.fontFamily = `'${display}', Georgia, serif`;

  document.getElementById('font-body-name').textContent = body;
  document.getElementById('preview-body').style.fontFamily = `'${body}', system-ui, sans-serif`;

  // Update lock button states + ARIA
  document.querySelectorAll('.btn-lock-font').forEach(btn => {
    const target = btn.dataset.target;
    const locked = target === 'display' ? state.lockedDisplay : state.lockedBody;
    btn.setAttribute('aria-pressed', String(locked));
    btn.title = (locked ? 'Unlock' : 'Lock') + ' ' + target + ' font';
    btn.classList.toggle('active', locked); // CSS picks up :not([aria-pressed="false"])
  });
}

/**
 * Render the live preview card.
 * 
 * ISOLATION RULE: Only .preview-bg, .preview-headline,
 * .preview-copy, .preview-overline, .preview-strip-seg,
 * and .preview-chip receive generated colors.
 * Everything else is themed via CSS variables.
 */
function renderPreview() {
  const [c0, , , c3] = state.colors;
  const { display, body } = state.fontPair;
  const fg     = readableColor(c0);
  const accent = c3;

  // Background from darkest color
  document.getElementById('preview-bg').style.backgroundColor = c0;

  // Text elements — font and color both from generation
  const headline = document.getElementById('preview-headline');
  headline.style.fontFamily = `'${display}', Georgia, serif`;
  headline.style.color = fg;

  const overline = document.getElementById('preview-overline');
  overline.style.color = accent;

  const copy = document.getElementById('preview-copy');
  copy.style.fontFamily = `'${body}', system-ui, sans-serif`;
  copy.style.color = fg;

  // Dot chips
  document.getElementById('preview-chips').innerHTML =
    state.colors.map(c =>
      `<div class="preview-chip" style="background:${c};border:1.5px solid ${readableColor(c)}22"></div>`
    ).join('');

  // Right-edge strip: one segment per color
  document.getElementById('preview-strip').innerHTML =
    state.colors.map(c =>
      `<div class="preview-strip-seg" style="background:${c}"></div>`
    ).join('');
}

/**
 * Render WCAG contrast rows below the preview.
 * Each row shows a color vs. white and vs. black.
 * Rationale: designers need to know how usable each color is as a bg.
 */
function renderWcagGrid() {
  const container = document.getElementById('wcag-grid');
  container.innerHTML = '';

  state.colors.forEach((hex, i) => {
    const vsWhite = contrastRatio(hex, '#FFFFFF').toFixed(1);
    const vsBlack = contrastRatio(hex, '#000000').toFixed(1);
    const lvlWhite = wcagLevel(hex, '#FFFFFF');
    const lvlBlack = wcagLevel(hex, '#000000');

    const classMap = { 'AAA': 'ok-aaa', 'AA': 'ok-aa', 'FAIL': 'no-pass' };

    const row = document.createElement('div');
    row.className = 'wcag-row';
    row.innerHTML = `
      <div class="wcag-swatch" style="background:${hex}" aria-hidden="true"></div>
      <span class="wcag-hex">${hex.toUpperCase()}</span>
      <span class="wcag-desc">on white: ${vsWhite}:1</span>
      <span class="wcag-pill ${classMap[lvlWhite]}" title="WCAG on white background">${lvlWhite}</span>
      <span class="wcag-desc">on black: ${vsBlack}:1</span>
      <span class="wcag-pill ${classMap[lvlBlack]}" title="WCAG on black background">${lvlBlack}</span>
    `;
    container.appendChild(row);
  });

  // Update the summary badge in the palette section header
  // (compares color[0] vs color[4] as a quick overall signal)
  const summaryLevel = wcagLevel(state.colors[0], state.colors[4]);
  const ratio = contrastRatio(state.colors[0], state.colors[4]).toFixed(1);
  const badge = document.getElementById('wcag-badge');
  badge.textContent = `${summaryLevel} · ${ratio}:1`;
  badge.className = `wcag-badge lvl-${summaryLevel.toLowerCase()}`;
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
   12. EXPORT CSS
───────────────────────────────────────── */
function exportCSS() {
  const lines = [
    ':root {',
    `  /* Æsthetic — "${state.moodName}" · ${state.scheme} */`,
    ...state.colors.map((c, i) => `  --color-${i + 1}: ${c};`),
    `  --font-display: '${state.fontPair.display}', serif;`,
    `  --font-body:    '${state.fontPair.body}', sans-serif;`,
    '}',
  ].join('\n');
  copyText(lines, 'CSS variables copied!');
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
  // Generate
  document.getElementById('btn-generate').addEventListener('click', generate);

  // Space = generate (if focus not on a button/input)
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !['BUTTON','INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      generate();
    }
    // Escape closes panel
    if (e.key === 'Escape') closeFavoritesPanel();
  });

  // Presets
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
  });

  // Font locks
  document.querySelectorAll('.btn-lock-font').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.target;
      if (t === 'display') state.lockedDisplay = !state.lockedDisplay;
      if (t === 'body')    state.lockedBody    = !state.lockedBody;
      renderFonts();
    });
  });

  // Toolbar buttons
  document.getElementById('btn-export-css').addEventListener('click', exportCSS);
  document.getElementById('btn-export-png').addEventListener('click', exportPNG);
  document.getElementById('btn-share').addEventListener('click', () => {
    const url = buildShareURL();
    if (url) copyText(url, 'Link copied! ↗');
    else copyText(window.location.href, 'Link copied!');
  }
  );

  // Save / favorites
  document.getElementById('btn-save-fav').addEventListener('click', saveCurrentFavorite);
  document.getElementById('btn-favorites-panel').addEventListener('click', openFavoritesPanel);
  document.getElementById('btn-close-panel').addEventListener('click', closeFavoritesPanel);
  document.getElementById('panel-overlay').addEventListener('click', closeFavoritesPanel);

  // Dark mode toggle
  document.getElementById('theme-checkbox').addEventListener('change', e => setTheme(e.target.checked));
}

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