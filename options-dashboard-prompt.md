# Options Pricing & Strategy Analytics Dashboard — Build Spec

You are helping me build a full-stack web application for options pricing and strategy analytics. This is a portfolio project targeting quant-dev, capital markets, and SWE recruiters. **Visual quality and engineering rigor matter equally.** Build it like you're shipping to production at a quant firm.

Work in phases. **Do not skip ahead.** At the end of each phase, stop and wait for my approval before continuing. If you hit ambiguity, ask before assuming. If you make a non-obvious tradeoff, note it briefly in your response.

---

## Product overview

A web dashboard that:
- Prices European and American options via Black-Scholes and binomial trees
- Prices exotics (Asian, barrier) via Monte Carlo with variance reduction
- Solves implied volatility from market prices (Newton-Raphson with bisection fallback)
- Renders live 3D volatility surfaces from real option chain data
- Supports a multi-leg strategy builder with combined Greeks and P&L heatmaps
- Analyzes implied vs. realized volatility, term structure, and skew

Target users: traders, quants, finance-engineering students. The aesthetic and density should reflect that.

---

## Aesthetic direction (read carefully, this is the #1 thing to get right)

**Anchors:** TradingView, Linear, Stripe Dashboard, Vercel, Bloomberg Terminal.

**Vibe:** dense, precise, technical, earned. The kind of UI that signals "the people who built this know derivatives."

**Hard no's:**
- Generic SaaS purple, gradient blobs, glassmorphism
- Oversized hero illustrations, marketing fluff inside the app
- "Welcome to your dashboard!" greetings
- Emoji in the UI
- Rounded-everything cards with heavy drop shadows
- Default untouched shadcn theme
- Centered hero text on tool pages
- "Powered by AI" badges, chatbot bubbles
- Onboarding tutorials, tooltips on every element

**Hard yes's:**
- Dark mode primary, light mode supported but secondary
- One sans (Inter or Geist) for UI, one mono (JetBrains Mono or Geist Mono) for **all numbers, prices, table values, code**. Tabular-nums everywhere.
- Semantic color: green for up/calls/gains, red for down/puts/losses, amber for warnings. Use these consistently.
- Negative numbers in semantic red, not just with a minus sign
- Compact spacing by default: 32-36px table rows, 36px inputs. This is a tool, not a marketing site.
- Generous whitespace around chart sections so data breathes
- Skeleton loaders matching actual layout, not spinners
- Subtle 1px borders, slight bg elevation, no heavy shadows
- Micro-interactions ≤200ms, smooth focus rings, accessible

---

## Tech stack (use exactly this, no substitutions without asking)

**Monorepo structure:**
```
/
├── frontend/          Next.js 14+ App Router, TypeScript strict, Tailwind, shadcn/ui
├── backend/           FastAPI, Python 3.11+, Pydantic v2
├── docs/              Architecture notes, validation tables
└── README.md
```

**Frontend:**
- Next.js 14+ App Router (server components where possible, client where needed for interactivity)
- TypeScript, strict mode, no `any`
- Tailwind CSS + shadcn/ui (customize the theme, do not use defaults)
- `react-plotly.js` + `plotly.js` for all charts
- TanStack Query for API state, caching, loading states
- Zod for runtime validation of API responses
- Zustand for client state (strategy legs, etc.)
- `lucide-react` for icons, no other icon libraries

**Backend:**
- FastAPI with Pydantic v2 models
- `numpy`, `scipy.stats` for math
- `pandas` for chain data
- `yfinance` for option chains and historical prices
- `sqlalchemy` + SQLite locally, Postgres-ready
- `pytest` for tests

**Deployment targets (don't deploy yet, just keep compatible):**
- Frontend: Vercel
- Backend: Fly.io or Railway via Dockerfile
- DB: Neon or Supabase Postgres

---

## Phase 0: Confirm before starting

Before writing any code, respond with:

1. A 1-paragraph **design intent** statement: how you're interpreting the aesthetic anchors, what visual language you'll commit to, and what makes this project different from a generic dashboard.
2. The **monorepo file tree** you plan to create, with brief comments on each top-level folder/file.
3. Any **clarifying questions** about scope, ambiguity, or my preferences. Limit to 3 questions max. If you have none, say so.

**STOP here and wait for my approval.** Do not start Phase 1 until I confirm.

---

## Phase 1: Design exploration (visual mockup first)

Once Phase 0 is approved, create **static HTML mockups** of the 4 main pages, one at a time, in `/docs/mockups/`. These are throwaway: not connected to the backend, no real interactivity, no Next.js yet. Pure design comps so we can lock in the visual language before committing implementation.

Each mockup is a single self-contained HTML file with Tailwind via CDN and inline mock data. Use real-looking option data (SPY chain with 8 expiries, plausible IVs forming a real smile, plausible Greek values).

**Order, one at a time, stopping for feedback after each:**

1. **Vol Surface page** (`vol-surface.html`) — the hero screen, design this most carefully. 3D surface (mock with SVG or static Plotly via CDN), top bar with ticker/calls-puts/moneyness toggles, side panel with stats.

2. **Strategy Builder page** (`strategy-builder.html`) — multi-leg editor table, net Greeks panel, payoff diagram, P&L heatmap.

3. **Pricer page** (`pricer.html`) — input form, Greeks output cards (each with a micro-visualization, not just a number), payoff diagram, method comparison table.

4. **IV Analysis page** (`iv-analysis.html`) — 4-quadrant layout: IV vs. realized time series, term structure, skew, vol risk premium.

After page 1, **stop and ask for feedback.** Don't proceed to page 2 until I approve the visual direction.

Once all 4 mockups are approved, generate a `docs/design-system.md` documenting: color tokens (with hex), type scale, spacing scale, component patterns. This becomes the source of truth for Phase 3 implementation.

---

## Phase 2: Backend (pricing engine + API)

Build the backend in `/backend/`. Lead with math correctness and tests.

**Modules:**
- `pricing/black_scholes.py` — European call/put, all 5 Greeks (Δ, Γ, ν, Θ, ρ) closed-form, supports continuous dividend yield q, vectorized over arrays
- `pricing/binomial.py` — Cox-Ross-Rubinstein for American options, early-exercise handling
- `pricing/monte_carlo.py` — Asian (arithmetic average) and barrier (knock-in, knock-out), with antithetic variates for variance reduction, returns price + std error
- `pricing/iv.py` — Newton-Raphson IV solver with bisection fallback for low-vega regions, returns IV + iterations + convergence flag
- `pricing/strategy.py` — multi-leg pricing, combined Greeks, P&L grid computation
- `data/chain.py` — yfinance wrapper, SQLite caching with timestamps
- `data/historical.py` — historical underlying prices, realized vol computation (30d, 60d, 1y)

**API endpoints (FastAPI, all under `/api/v1`):**
```
POST /price           { type, style, S, K, T, r, sigma, q?, method? } → { price, greeks, method, compute_ms }
POST /iv              { type, S, K, T, r, market_price, q? } → { iv, iterations, converged }
GET  /chain/{ticker}  → { ticker, spot, chain: [...] }
POST /surface         { ticker, option_type, moneyness_range, dte_range } → { surface, strikes, expiries }
POST /strategy/price  { legs, S, r, sigma, eval_date? } → { net_price, net_greeks, legs }
POST /strategy/pnl    { legs, S_range, eval_dates, r, sigma } → { grid, S_axis, t_axis }
GET  /iv_analysis/{ticker} → { realized_30d, realized_60d, atm_iv, term_structure, skew }
GET  /health          → { status, version }
```

**Validation suite (mandatory, in `/backend/tests/`):**
- Put-call parity holds to 1e-6 across 20 random parameter sets
- Greeks via closed-form match finite-difference Greeks to 1e-4
- 10 reference prices compared against QuantLib (or a textbook table if QuantLib install is painful), error table written to `docs/validation.md`
- IV solver tested on 50 real chain quotes, must converge >95% of the time
- Monte Carlo confidence intervals contain the closed-form BS price for at least 95 of 100 trials

**Performance targets (note in README):**
- Single BS price < 1ms
- Full 30×30 vol surface compute < 200ms
- 10,000-path MC price < 100ms

**Stop after backend is done and tests pass.** Show me the test output and the validation table. Wait for approval before Phase 3.

---

## Phase 3: Frontend implementation

Build the Next.js app in `/frontend/` against the approved mockups and design system. Real API calls to the backend, real loading states, real error handling.

**Routing (App Router):**
- `/` — landing page (hero with vol surface screenshot, 4 feature cards, GitHub + demo CTAs)
- `/app/pricer`
- `/app/surface`
- `/app/strategy`
- `/app/iv-analysis`

**Shell components:**
- Persistent left sidebar (240px, collapsible to icons), 5 nav items
- Top bar with breadcrumb, Cmd+K command palette (ticker quick-search), connection status indicator showing live backend health, theme toggle (dark default)
- Page content: max-width 1600px, dense by default

**Per-page requirements:**

**Pricer page:**
- Left: input form using shadcn `Input`, `Select`, `Tabs`. Ticker autocomplete OR manual entry toggle.
- Right: 6 cards in a 3×2 grid (price + 5 Greeks). Each card has its value in mono + a tailored micro-visualization (delta as a probability gauge, gamma as a curvature mini-chart, vega as a sensitivity bar, theta as a decay curve, rho as a small line). NOT just numbers in boxes.
- Below: payoff diagram (Plotly) and method comparison table (BS vs. Binomial vs. MC: price + compute_ms for each).
- Debounced API calls on input change, skeleton loaders, error boundary.

**Vol Surface page:**
- Top toolbar: ticker autocomplete, calls/puts toggle, strike-vs-moneyness toggle, smile-vs-surface view toggle.
- Hero: large 3D Plotly surface (`mesh3d` or `surface`), dark-themed.
- Right panel: contract count, IV range, ATM IV, term structure mini-line, skew mini-line at the surface's selected expiry.
- Loading skeleton matches layout, not a spinner.

**Strategy Builder page:**
- Top: strategy template dropdown (Vertical, Straddle, Strangle, Iron Condor, Butterfly, Calendar, Custom).
- Left: leg editor table. Columns: Action (long/short pill), Type (call/put pill), Strike, Expiry, Quantity, Price (computed live), Greeks (computed live, mini-row). "Add Leg" row at bottom. Inline edit with debounce.
- Right top: net Greeks panel (5 large mono numbers with sparklines showing sensitivity to spot).
- Right bottom: tabs for "Payoff (at expiration)" and "P&L Heatmap (spot × date)". Heatmap is Plotly with a diverging red-green colormap.
- Footer strip: max profit, max loss, breakevens, breakeven probability (Black-Scholes risk-neutral approximation).
- Zustand store for legs.

**IV Analysis page:**
- Top: ticker selector.
- 4-quadrant CSS grid:
  - Top-left: realized vs. implied vol time series, range selector (1m, 3m, 6m, 1y).
  - Top-right: term structure, ATM IV by expiry.
  - Bottom-left: smile/skew at selectable expiry.
  - Bottom-right: vol risk premium (IV − realized) over time.
- Each quadrant has a discreet header with its own controls.

**Critical polish (do not skip):**
- All numeric values in mono with `tabular-nums`
- Loading: skeleton screens matching layout
- Empty states: single line + action button, no illustrations
- Error states: terse, actionable
- Keyboard: Cmd+K for command palette, Esc to close, Tab order correct
- Mobile responsive down to 1024px (gracefully degrade below; this is a desktop tool)
- Lighthouse: aim for 90+ on Performance and Accessibility

**Three "wow" details (build all three):**
1. **Animated Greeks.** When strategy legs change, Greek values roll/animate to new values over ~300ms with a brief number-tween, not a hard jump. Use a small custom hook.
2. **Live ticker tape in the top bar.** Subtle mono ticker tape showing spot prices for SPY, QQQ, NVDA, AAPL, TSLA, scrolling slowly. Updates every 30s from `/chain/{ticker}` cache.
3. **Greeks-as-shape micro-viz on each pricer card.** Not generic sparklines. Each Greek gets a custom mini-visualization that matches its meaning (described above in Pricer page).

**Stop after frontend is complete.** Show me screenshots or describe each page's state. Wait for approval before Phase 4.

---

## Phase 4: Integration, docs, deployment-ready

- Wire frontend env var `NEXT_PUBLIC_API_URL` to backend, CORS configured correctly
- `docker-compose.yml` for local dev (frontend, backend, sqlite volume)
- `Dockerfile` for backend (multi-stage, slim final image)
- `frontend/.env.example`, `backend/.env.example`
- README with:
  - Hero screenshot (Vol Surface)
  - Live demo link placeholder + 90-second Loom placeholder
  - 1-paragraph "what's interesting": validated vs. QuantLib, vectorized solver, P&L attribution, etc.
  - Architecture diagram (text or ASCII)
  - Tech stack
  - Local dev setup (3 commands max)
  - Link to `/docs/validation.md`, `/docs/design-system.md`
  - Performance numbers from Phase 2
  - Known limitations + future work
- `docs/architecture.md` with the system diagram and API contract reference
- Auto-generated FastAPI Swagger docs accessible at `/api/v1/docs`

Stop and confirm everything works end-to-end locally with `docker-compose up`.

---

## Working principles (apply throughout)

- **Stop at phase boundaries.** Do not skip ahead. Ask before assuming.
- **Test as you go.** Don't write the whole backend then test. Write the test, then the function.
- **Real data, real numbers.** No Lorem Ipsum, no placeholder `0.5` Greek values. Use plausible numbers everywhere, even in mockups.
- **Commit often.** After each meaningful unit, suggest a git commit message.
- **Validate against a reference.** Every pricing function gets compared to a known-good source.
- **Type everything.** TypeScript strict on frontend, Pydantic everywhere on backend. No `any`, no `dict[str, Any]` in API contracts.
- **No magic numbers.** Constants get names. Risk-free rate defaults, MC path counts, convergence tolerances all named.
- **Performance is a feature.** Time critical paths, log compute_ms in API responses, mention performance numbers in README.
- **README is the product.** A recruiter reads the README for 30 seconds. Optimize for that.

---

## What I do NOT want (re-stating because it matters)

- Generic SaaS aesthetic, gradient backgrounds, untouched shadcn theme
- Numbers in non-mono fonts
- Spinners instead of skeletons
- A backend that "works" but has no tests
- A frontend that calls the backend in `useEffect` without TanStack Query
- An app that depends on paid APIs (Polygon paid tier, Bloomberg). yfinance only.
- Untyped API responses on the frontend (use Zod)
- Markdown headers in chat responses to me explaining what you did, when a brief plain-language summary would do

---

## Start now

Begin with **Phase 0 only**. Respond with: design intent paragraph, planned file tree, and up to 3 clarifying questions. Then stop and wait.
