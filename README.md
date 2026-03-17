# Æsthetic — Color Palette & Type Generator

A browser-based design tool that generates harmonious color palettes and font pairings, checks WCAG accessibility contrast, simulates color blindness, and exports production-ready tokens for CSS, Tailwind, and Figma.

**[Live demo →](https://gustav-devhub.github.io/aesthetic-generator/)**

---

## What it does

Press Space (or click Generate) and the app produces a 5-color palette built on real color theory — complementary, triadic, analogous, split-complementary, monochromatic, or tetradic schemes — paired with a curated font combination chosen for typographic contrast. Everything updates live across three preview templates: Editorial, UI, and Dashboard.

You can then:

- Lock individual colors or fonts to keep them across the next generation
- Edit any color with the custom-built inline color picker
- Simulate how the palette looks under four types of color vision deficiency
- Check every color-pair combination against WCAG AA and AAA contrast standards
- Export the result as CSS custom properties, a Tailwind config snippet, a Figma Variables JSON, or a 1200×630 PNG card
- Share any palette via a human-readable URL hash
- Save favorites to localStorage

---

## Engineering decisions

### Why HSL instead of RGB for generation

RGB is how screens render color. HSL is how humans think about color — hue as a position on the color wheel, saturation as intensity, lightness as brightness. All six color theory schemes are computed as hue relationships in HSL space (e.g. complementary = hue + 180°, triadic = hue + 120° and hue + 240°) then converted to hex for output. Doing this in RGB would require trigonometric transforms with no intuitive basis.

### Why linearize before the CVD matrix multiply

Color vision deficiency simulation uses 3×3 transformation matrices from Machado et al. (2009) — the same academic source used by Coblis and Chrome DevTools. The matrices are defined for *linear* light values, not gamma-encoded sRGB. Skipping the gamma expansion step and multiplying directly in sRGB space produces visibly wrong results: desaturated colors shift incorrectly and some hues invert. The correct pipeline is: hex → gamma-expand to linear → matrix multiply → gamma-compress → hex. This adds two passes through a power function per channel but produces perceptually accurate output.

### Why simColors() is read-only

`state.colors` is never modified during simulation. Instead, `simColors()` returns a transformed copy that all render functions read. This means the real hex values are always preserved — you can copy a color pill and get the actual palette color, not the simulated one. The WCAG grid shows simulated contrast ratios with the real hex values in parentheses so you can see both simultaneously.

### Why semantic export names

The export functions use role-based names (`--color-bg`, `--color-surface`, `--color-accent`, `--color-muted`, `--color-light`) rather than positional ones (`--color-1` through `--color-5`). A developer pasting the output into a project can immediately understand what each variable is for. The mapping is deterministic: color[0] is always background (darkest), color[4] is always light surface, color[2] is always accent — so the names mean something regardless of which palette was generated.

### Why the color picker uses offsetWidth instead of canvas.width

The custom inline color picker positions a circle handle at the currently selected color. The handle's `left` and `top` values are CSS pixels, but `canvas.width` returns the drawing buffer size, which can be 2× larger on retina displays. Using buffer dimensions to position a CSS element places the handle at double the correct position on high-DPI screens, which is what caused the top-right corner bug where the handle appeared stuck. `offsetWidth` always returns the CSS layout size, so handle position and pointer position stay in sync at any pixel density.

### Why vanilla JS

No framework, no build step, no dependencies. The entire tool is three files: `index.html`, `style.css`, `script.js`. This was a deliberate choice to demonstrate that complex interactivity — live color math, custom drag interfaces, canvas rendering, URL encoding, localStorage persistence — doesn't require an abstraction layer. It also means the app loads instantly and works offline.

---

## Features

**Palette generation**
- 6 color theory schemes: complementary, triadic, analogous, split-complementary, monochromatic, tetradic
- 5-color or 3-color output (3-color mode picks a spread of dark/mid/light from the 5-color result)
- Lock individual colors to keep them on the next generate
- Custom inline color picker with saturation/lightness canvas and hue strip
- Smooth background-color transitions on every change — bars update in-place, never destroyed

**Typography**
- 96 curated font pairs across 8 mood categories: Editorial, Luxury, Warm, Bold, Geometric, Tech, Organic, Condensed
- All fonts loaded on-demand from Google Fonts — unused pairs never make a network request
- Live preview text input with font size (60–160%) and weight (100–900) sliders
- Lock display or body font independently

**Accessibility**
- WCAG 2.1 contrast ratios for every color combination
- AA (4.5:1) and AAA (7:1) threshold badges
- Color blindness simulation: Deuteranopia, Protanopia, Tritanopia, Achromatopsia
- CVD matrices from Machado et al. (2009), doi:10.1109/TVCG.2009.113
- Simulation affects palette bars, all preview templates, and the WCAG grid simultaneously

**Preview templates**
- Editorial: rotating headline and body copy, color chips, vertical strip
- UI: topbar, navigation, project card, search row, color swatches
- Dashboard: sidebar, stat cards, bar chart

**Export**
- CSS Variables — semantic custom properties (--color-bg, --color-surface, --color-accent, --color-muted, --color-light) + font variables
- Tailwind Config — drop-in `tailwind.config.js` color palette object
- Figma JSON — Figma Variables plugin format (RGBA floats, 0–1 range)
- PNG Card — 1200×630 Canvas API image for social sharing or documentation

**Other**
- Human-readable URL hash: `#RRGGBB+RRGGBB+...|DisplayFont|BodyFont|MoodName|scheme`
- Legacy base64 hash migration for older shared URLs
- Favorites saved to localStorage with apply and delete
- Dark / light mode, persisted to localStorage, respects OS preference
- Space bar to generate, Escape to close panels

---

## File structure

```
aesthetic-generator/
├── index.html      342 lines — markup, meta tags, card structure
├── style.css      ~1420 lines — design tokens, layout, components, animations
├── script.js      ~2050 lines — all logic, no dependencies
├── favicon.png
└── preview.png    — 1200×630 social preview image (export from app, save here)
```

The script is organized into 16 numbered sections:

```
1.  DATA           — Font pairs (96), mood names, presets, editorial copy
2.  COLOR MATH     — HSL↔HEX, WCAG luminance/contrast, readableColor()
2b. CVD SIMULATION — Machado matrices, sRGB linearization, applyMatrix()
3.  PALETTE GEN    — 6 color theory schemes in HSL space
4.  FONT LOADER    — Dynamic Google Fonts <link> injection
5.  STATE          — Single mutable object, all UI state lives here
6.  DARK MODE      — setTheme(), initTheme(), localStorage
7.  FAVORITES      — save, load, apply, delete, localStorage
8.  GENERATION     — generate(), loadPreset()
9.  RENDER         — renderAll() and individual render functions
9b. PREVIEW STATE  — activeTemplate, activeSimulation
10. COLOR ROLES    — Semantic slot mapping for exports and templates
11. PREVIEW        — renderEditorialPreview, renderUIPreview, renderDashboardPreview
12. EXPORT         — exportCSS, exportTailwind, exportFigma, exportPNG
13. WCAG GRID      — renderWcagGrid()
14. FAVORITES UI   — renderFavoritesPanel(), open/close
15. URL ENCODING   — encodeURL(), decodeURL(), legacy migration
16. EVENTS         — bindEvents() — all listeners in one place
17. INIT           — init()
```

---

## Running locally

No build step required.

```bash
git clone https://github.com/Gustav-DEVhub/aesthetic-generator.git
cd aesthetic-generator
```

Open `index.html` in any modern browser. For Google Fonts to load, serve over HTTP rather than the `file://` protocol:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080`.

---

## Design decisions I would revisit

**Color picker coordinate mapping.** The SL canvas maps saturation on the X axis and a combined saturation/lightness function on Y. This means equal steps on the canvas don't produce perceptually equal color changes — moving left-right near the top behaves differently than near the bottom. A proper implementation would use a perceptual color space (OKLab or OKLCH) for the canvas gradient, which would make the picker feel more predictable at the cost of more complex math.

**Font pair scoring.** The current generator picks a random pair from the 96 curated options with no relationship to the generated palette. A palette with high saturation and warm hues might be better served by a bold expressive pair than a delicate literary one. Connecting mood-to-palette and mood-to-font-category would make generations feel more coherent.

**No offline font fallback.** If Google Fonts fails to load (network issue, CORS, ad blocker), the preview silently falls back to Georgia/system-ui. A service worker caching strategy would make the tool fully offline-capable.

---

## Credits

Color vision deficiency matrices: Machado, G.M., Oliveira, M.M., Fernandes, L.A.F. (2009). *A Physiologically-based Model for Simulation of Color Vision Deficiency*. IEEE Transactions on Visualization and Computer Graphics. doi:10.1109/TVCG.2009.113

All fonts via [Google Fonts](https://fonts.google.com) (free, open source).

---

*Built with HTML, CSS, and JavaScript · Portfolio project*