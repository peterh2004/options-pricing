# Vol Lab Design System

Source of truth for Phase 3 implementation. Every token here maps 1:1 to `frontend/tailwind.config.ts`.

---

## 1. Foundations

### Voice
Dense, precise, technical, earned. Numbers are first-class citizens. The UI is a tool, not a marketing site. Negative numbers render in semantic red, not just with a minus sign. Every reading needs context: a number alone is rarely enough; pair it with units, deltas, or a micro-visualization.

### Density
- Table rows: **32 to 36px**
- Inputs / buttons / select triggers: **36px** (`h-9`)
- Top bar: **48px** (`h-12`)
- Status footer: **28px** (`h-7`)
- Section padding: **20px** (`p-5`). Never balloon to 32px+ inside data panels
- Card internal padding: **20px** (`p-5`); micro-viz can extend edge-to-edge inside

### Borders
1px hairlines. Two flavors only.
- `hairline` → `#1a1a1f`. Default panel/card border
- `hairline-strong` → `#26262d`. Emphasized boundary (table headers, active state)

No drop shadows. Elevation is conveyed by background lift, not blur.

---

## 2. Color tokens

### Neutral (ink scale)
The single neutral base. No purples, no warm greys, no slate. Wired to CSS variables so the entire ink palette flips when the `.dark` class is removed from `<html>`. Light-mode values invert the scale automatically.

| Token         | Hex (dark) | Usage                                           |
| ------------- | ---------- | ----------------------------------------------- |
| `ink-950`     | `#070708`  | App background (deepest)                        |
| `ink-900`     | `#0a0a0b`  | Surface / canvas                                |
| `ink-850`     | `#0f0f11`  | Input background, secondary surface             |
| `ink-800`     | `#131316`  | Hover, divider strips                           |
| `ink-700`     | `#1a1a1f`  | Hairline border (default)                       |
| `ink-600`     | `#26262d`  | Hairline border (strong), grid lines            |
| `ink-500`     | `#3a3a44`  | Disabled text, deep-muted icon                  |
| `ink-400`     | `#5a5a66`  | Label / caption                                 |
| `ink-300`     | `#8a8a96`  | Secondary text                                  |
| `ink-200`     | `#b8b8c2`  | Body text (lower emphasis)                      |
| `ink-100`     | `#e6e6eb`  | Body text (default)                             |
| `ink-50`      | `#f5f5f7`  | Headings / primary text                         |

### Semantic (meaning is bound to color)
Reserved for direction, gains/losses, and state. Never used decoratively.

| Token       | Hex      | Use                                                     |
| ----------- | -------- | ------------------------------------------------------- |
| `up-500`    | `#10b981` | Up / Call / Long / Profit / Healthy / Confirmed         |
| `up-400`    | `#34d399` | Up secondary (chip text, sparkline)                     |
| `up-600`    | `#059669` | Up pressed state                                        |
| `up-950`    | `#04231b` | Up tinted background (chip, fill area)                  |
| `down-500`  | `#ef4444` | Down / Put / Short / Loss / Error                       |
| `down-400`  | `#f87171` | Down secondary                                          |
| `down-600`  | `#dc2626` | Down pressed state                                      |
| `down-950`  | `#2a0a0c` | Down tinted background                                  |
| `warn-500`  | `#f59e0b` | Warning, stale data, event marker (FOMC/CPI)            |
| `warn-400`  | `#fbbf24` | Warning secondary                                       |

### Accent (interactive focus only)
The accent is a single muted electric-blue. It signals interactivity, focus, and "this is the current selection." It is never used decoratively.

| Token         | Hex     | Use                                                  |
| ------------- | ------- | ---------------------------------------------------- |
| `accent-500`  | `#3b82f6` | Focus ring, active selection marker, primary CTA   |
| `accent-400`  | `#60a5fa` | Active link, sparkline default, today markers      |
| `accent-600`  | `#2563eb` | Pressed CTA                                        |

### Chart colorscale (vol surface only)
Reserved for the 3D surface and heatmaps. Cool-to-warm so low IV reads "calm" and high IV reads "stressed."

```
#1e3a8a → #1d4ed8 → #3b82f6 → #22d3ee → #facc15 → #f97316 → #ef4444
```

### Heatmap (diverging P&L)
```
loss #7f1d1d → #451a03 → #0a0a0b → #064e3b → gain #10b981
```

---

## 3. Typography

### Families
- **UI sans**: `Inter` with `system-ui` fallback. Used for everything that is not a number.
- **Mono / numerics**: `JetBrains Mono` with `ui-monospace` fallback. **Every number, ticker symbol, price, Greek value, time, percentage, and hex string uses mono.** Activate `font-variant-numeric: tabular-nums`.

### Scale

| Token  | Size | Line  | Use                                                          |
| ------ | ---- | ----- | ------------------------------------------------------------ |
| `2xs`  | 10px | 14px  | Labels (uppercase, letter-spacing `.08em`)                   |
| `xs`   | 11px | 16px  | Captions, table headers, ticker tape, chip text              |
| `sm`   | 12px | 18px  | Default body text in data-dense panels, nav items, sub-bar   |
| `base` | 13px | 20px  | Form inputs, primary body                                    |
| `md`   | 14px | 20px  | Section titles                                               |
| `lg`   | 15px | 22px  | KPI value in toolbar                                         |
| `xl`   | 16px | 24px  | Tab label                                                    |
| `2xl`  | 18px | 26px  | Card subtitle value                                          |
| `3xl`  | 20px | 28px  | Footer KPI value (max P/L etc.)                              |
| `4xl`  | 22px | 30px  | Net Greek value (strategy)                                   |
| `5xl`  | 34px | 36px  | Greek card hero value (pricer)                               |

### Weights
- 400 body
- 500 labels, table headers, nav, KPIs
- 600 emphasis numbers, headings, ticker focus
- 700 reserved (not used in current pages)

### The label primitive
```css
.label {
  font-size: 10px;
  line-height: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5a5a66;       /* ink-400 */
  font-weight: 500;
}
```

### Negative numbers
Render negative numerics in `down-400` or `down-500`. Use the proper minus glyph `−` (U+2212) in text, not the hyphen-minus `-`.

---

## 4. Spacing scale

Tailwind defaults are used with the dense aliases below applied consistently.

| Token | px  | Use                                                  |
| ----- | --- | ---------------------------------------------------- |
| 0.5   | 2   | Hairline gap inside chip                             |
| 1     | 4   | Compact gap inside KPI block                         |
| 1.5   | 6   | Icon ↔ label gap                                     |
| 2     | 8   | Inter-row in inputs / button group                   |
| 2.5   | 10  | Sidebar nav vertical breathing                       |
| 3     | 12  | Card internal vertical gap                           |
| 4     | 16  | Panel internal gap                                   |
| 5     | 20  | Default panel padding                                |
| 6     | 24  | Hero card padding                                    |
| 8     | 32  | Page-level horizontal padding (rare)                 |

**Rule**: dense by default, only loosen for chart sections so data breathes.

---

## 5. Component patterns

### Segmented control
```
+--------+--------+-------+
| Calls* | Puts   | Both  |
+--------+--------+-------+
```
- Container: `bg-ink-850 border hairline rounded-sm overflow-hidden`
- Each button: `font-size:11px; padding:6px 10px; color:ink-300`
- Active: `bg-ink-700 color-ink-50`
- Hover: `color-ink-100`
- No transition delay over 150ms.

### Pill (used for action/type tags inside leg table)
```css
.pill {
  display:inline-flex; align-items:center;
  height:22px; padding:0 8px;
  border-radius:3px; font-size:11px; font-weight:500;
}
```
Examples:
- LONG → `bg-up-950/60 text-up-400 border border-up-500/20`
- SHORT → `bg-down-950/60 text-down-400 border border-down-500/20`
- CALL → `bg-up-950/60 text-up-400`
- PUT  → `bg-down-950/60 text-down-400`

### Chip (metadata)
```css
.chip {
  display:inline-flex; gap:4px;
  padding:2px 6px; border-radius:3px;
  font-size:10px; letter-spacing:.04em;
}
```
States: success (`bg-up-950/50 text-up-400`), danger (`bg-down-950/50 text-down-400`), neutral (`bg-ink-800 text-ink-300`), accent (`bg-accent-500/15 text-accent-400`).

### Card / panel
- Background: `bg-ink-950` or `bg-ink-900` for canvas inside main
- Border: `1px solid hairline`
- Padding: `p-5`
- Header pattern: `label` row at top, value below, micro-viz at bottom

### KPI block
Three lines: label (10px uppercase), value (mono, 18 to 34px depending on context), sublabel (10px mono, lower emphasis or with semantic color). Negative deltas always in red.

### Input
- Container: `focus-ring flex items-center bg-ink-850 border hairline h-9 px-3 rounded-sm`
- Input: `bg-transparent outline-none mono text-[13px]`
- Focus state: 1px `accent-500` outline, `outline-offset:-1px`

### Range slider
```css
.slider { height:2px; background:#26262d; }
.slider::-webkit-slider-thumb {
  width:12px; height:12px; border-radius:2px;
  background:#60a5fa; border:1px solid #0a0a0b;
  box-shadow:0 0 0 3px rgba(59,130,246,.18);
}
```

### Table
- Header: `text-[10px] uppercase tracking-wider text-ink-500 font-medium`, sticky inside its scroll container
- Row height: 32 to 36px
- Row divider: `border-bottom:1px solid ink-800` (lighter than `hairline`)
- Hover: `background:rgba(26,26,31,0.4)`
- Numeric cells right-aligned, label cells left-aligned

### Skeleton (Phase 3 only)
Match the layout, not a spinner. Rectangles in `ink-800`, animated `opacity` 0.4 to 0.7 at 1.6s linear loop. No shimmer gradient. No spinning loaders anywhere except the live-pulse dot in the status footer.

### Missing-value placeholder
Use `"…"` (ellipsis) for "data not yet loaded" cells. Use `"n/a"` for explicitly missing values. Do not use any kind of dash glyph.

---

## 6. Charts (Plotly conventions)

Every Plotly call gets the shared theme defaults:

```js
const plotlyTheme = {
  paper_bgcolor: '#0a0a0b',
  plot_bgcolor:  '#0a0a0b',
  font: { family: 'JetBrains Mono', color: '#8a8a96', size: 9 },
  margin: { l: 42, r: 14, t: 6, b: 30 },
  showlegend: false,           // custom HTML legends instead
  xaxis: { gridcolor:'#131316', zerolinecolor:'#26262d', linecolor:'#26262d' },
  yaxis: { gridcolor:'#131316', zerolinecolor:'#26262d', linecolor:'#26262d' },
};
```

In light mode, `Plot.tsx` swaps in light backgrounds and lighter gridlines. Surface 3D plots remain dark in both modes (intentional, to retain contrast on the hero element).

- **No legend inside Plotly**. Render legends in HTML above the chart for type-tight control.
- **No mode bar.** `displayModeBar: false`.
- **Spot marker**: dotted vertical line in `accent-500`, with text annotation at top.
- **Profit area**: `up-500` line, `rgba(16,185,129,0.15)` fill (`tozeroy`).
- **Loss area**: `down-500` line, `rgba(239,68,68,0.13)` fill (`tozeroy`).
- **Today marker** in time-series charts: `accent-400`, dashed.

---

## 7. The three "wow" details

### 7.1 Animated Greeks
- Trigger: any leg edit in Strategy Builder or input change in Pricer.
- Duration: **300ms**, ease-out-cubic.
- Custom hook `useAnimatedNumber(target, { duration: 300, decimals: 4 })` interpolates from current displayed value to `target` over `requestAnimationFrame`.
- Never restart mid-flight if `target` doesn't change.

### 7.2 Live ticker tape (top bar)
- 5 symbols: SPY, QQQ, NVDA, AAPL, TSLA. Optionally extended to VIX, ^TNX.
- Each entry: `<ticker> <last> <change>`, all mono, change green/red.
- Marquee animation: `transform: translateX(0 to -50%)` over 80s linear infinite (track contains content twice for seamless loop).
- Mask edges with linear-gradient to fade in/out.
- In v0.1 this is simulated (random walks). Wire to `/chain/{ticker}` for real updates in v0.2.

### 7.3 Greeks-as-shape micro-viz
Each Pricer Greek card gets a **bespoke** mini-visualization, never a generic sparkline:

| Greek   | Micro-viz                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Price** | Mini payoff curve (intrinsic dashed plus theoretical filled), accent-blue spot marker.                                                |
| **Delta** | Semi-circle probability gauge. Arc gradient red→amber→green, needle position = delta, axis labelled 0 / 0.5 / 1.0.                   |
| **Gamma** | Bell curve of gamma as a function of spot, with delta sigmoid behind it (deemphasized). Spot line dotted, peak marker.                |
| **Vega**  | 11-bar histogram showing option price across vol sweep (10% to 30%). Current vol bar in accent; others fade red→green by direction.   |
| **Theta** | Exponential decay curve: theoretical price vs DTE-remaining. "Now" marker plotted on the curve with accent dot.                       |
| **Rho**   | Single tilted line (price vs rate). Slope = sign(rho). Current-rate marker.                                                            |

All micro-viz use SVG (not Plotly), so they render in under 2ms and embed inline cleanly. Grid: very subtle 14px diagonal grid for texture (`.gridv` class).

---

## 8. Iconography
- Library: **`lucide-react`** only. No emoji, no FontAwesome, no Heroicons.
- Stroke width: **1.75** for nav/inline icons, **2** inside small chips.
- Size: **15px** for sidebar nav, **13px** for inline indicators, **11px** for chip-internal.

---

## 9. Status footer (every page)
Sticky 28px-tall mono-text strip at the bottom of `<main>`. Always shows:

```
session <id> · r <rate>% · q <div>% · model <BSM> ········· compute <ms> · API <path>
```

Color: `text-ink-400` baseline, key values `text-ink-200`, `compute_ms` green if under SLO target.

---

## 10. Accessibility & interaction

- All interactive elements meet `:focus-visible` with 1px `accent-500` outline.
- Keyboard: `⌘K` opens command palette; `Esc` closes any overlay; `Tab` order strictly LTR top-down.
- Color is never the sole indicator. Semantic state pairs color with a glyph or sign.
- Minimum touch target: 32×32 even in dense UI (input controls bump to 36px).
- Reduced motion: ticker tape and animated Greeks respect `prefers-reduced-motion`.

---

## 11. Anti-patterns (do not do)

- Drop shadows, glassmorphism, gradient backgrounds (the `from-accent-500 to-accent-600` on the logo is the only gradient allowed).
- Generic purple, the default shadcn theme, oversized rounded cards.
- Spinners, "loading…" text, full-screen overlays.
- Numbers in sans, prices without thousands separators, percentages without `%`.
- Bare hyphen for negatives. Use `−` (U+2212).
- "Welcome" greetings, marketing copy, emoji, chatbot bubbles, tooltips on every element.
- Em dashes and en dashes in prose. Use periods, commas, or colons. (House style established post v0.1.)

---

## 12. Tokens, machine-readable

Used to generate `tailwind.config.ts` in Phase 3.

```json
{
  "color": {
    "ink": { "950":"#070708","900":"#0a0a0b","850":"#0f0f11","800":"#131316",
             "700":"#1a1a1f","600":"#26262d","500":"#3a3a44","400":"#5a5a66",
             "300":"#8a8a96","200":"#b8b8c2","100":"#e6e6eb","50":"#f5f5f7" },
    "up":   { "500":"#10b981","400":"#34d399","600":"#059669","950":"#04231b" },
    "down": { "500":"#ef4444","400":"#f87171","600":"#dc2626","950":"#2a0a0c" },
    "warn": { "500":"#f59e0b","400":"#fbbf24" },
    "accent":{ "500":"#3b82f6","400":"#60a5fa","600":"#2563eb" }
  },
  "font": {
    "sans": ["Inter","system-ui","sans-serif"],
    "mono": ["JetBrains Mono","ui-monospace","monospace"]
  }
}
```
