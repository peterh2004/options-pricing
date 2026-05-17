# Vol Lab

A locally-runnable options pricing and strategy analytics workbench. Black-Scholes, binomial trees, Monte Carlo with variance reduction, live vol surfaces from yfinance chain data, and a multi-leg strategy builder with combined Greeks and P&L heatmaps.

Every pricing function is validated against QuantLib to **1.35 × 10⁻¹²** maximum relative error, and the full suite is covered by **77 unit tests** that run in under 10 seconds.

> **Live demo:** https://vol-lab.vercel.app · **API:** https://vollab-backend.onrender.com/api/v1/docs · **Repo:** https://github.com/peterh2004/options-pricing
>
> _First request after 15 min idle cold-starts the backend (~30-60s on Render free tier). Open the Swagger link first to wake it up if the frontend looks broken._

---

## Contents

1. [What it does](#what-it-does)
2. [Why I built it](#why-i-built-it)
3. [What it is not](#what-it-is-not)
4. [Screens](#screens)
5. [Stack](#stack)
6. [Validation](#validation)
7. [Performance](#performance)
8. [Local development](#local-development)
9. [Project layout](#project-layout)
10. [Architecture](#architecture)
11. [API reference](#api-reference)
12. [Testing](#testing)
13. [Design system](#design-system)
14. [Roadmap](#roadmap)
15. [Hosting](#hosting)
16. [License](#license)

---

## What it does

| | |
|---|---|
| **Pricer** | Single-contract calculator. Black-Scholes, CRR binomial, or antithetic Monte Carlo. Returns price + all five Greeks, plus a side-by-side method comparison so you can see the closed-form value next to the tree price next to the MC estimate with std error. |
| **Vol Surface** | Real implied-volatility surface from a live `yfinance` chain. Newton-Raphson IV solver with bisection fallback inverts every contract, then `scipy.interpolate.griddata` fills the regular grid. Rendered as a Plotly 3D mesh with a cool-to-warm colorscale, plus mini term-structure and skew on the right rail. CSV export. |
| **Strategy Builder** | Multi-leg editor backed by Zustand. Each leg is fully inline-editable (action, type, strike, DTE, qty, σ). Net Greeks aggregate live and tween over 300ms when legs change. Tabs for payoff-at-expiry and a (spot × time) P&L heatmap. Templates: vertical spread, straddle, strangle, iron condor, butterfly, calendar. Save strategy to JSON. |
| **IV Analysis** | Four-quadrant view: realized vs implied vol time series, ATM term structure, smile/skew at a selected expiry, and the variance risk premium. |
| **Guide** | Ten-section concept primer that maps options theory (contracts, Greeks, pricing models, smile, strategies, VRP) to where each appears in the tools. Lives at `/app/guide`. |
| **Validation report** | In-app view of the QuantLib comparison table, Greek-by-Greek deltas, internal cross-checks, and performance benchmarks. Mirrors `docs/validation.md`. |

---

## Why I built it

Most online option calculators are toys. They take three inputs, return one number, and skip everything that makes options interesting: smile, term structure, early exercise, path dependence, the variance risk premium. Institutional tools that do those things well sit behind enterprise sales gates.

I wanted a middle ground I could actually demo: a dense, locally-runnable workbench that gets the math correct, validates it against a reference implementation, and surfaces the results through a UI that doesn't apologize for being dense. The aesthetic targets a Bloomberg/Linear/Stripe feel rather than the typical bright-purple SaaS dashboard.

Engineering goals, in priority order:

1. **Math first.** Closed-form Black-Scholes-Merton with all five Greeks. Cox-Ross-Rubinstein binomial for American options. Monte Carlo with antithetic variates for vanilla and Asian/barrier exotics. Newton-Raphson IV solver with bisection fallback. Every function validated against QuantLib.
2. **Speed.** Surface compute under 200ms because real desks rebuild surfaces several times per second. Single price under 1ms. MC with 10k antithetic paths under 100ms. Achieved with vectorized NumPy.
3. **Schemas everywhere.** Pydantic v2 on the backend, Zod-mirrored on the frontend. Every API response is parsed through a schema; no untyped JSON in the React tree.
4. **Tight UI.** 32-36px row heights, 1px hairlines, mono for every number with `tabular-nums`, semantic color bound to meaning (green up/calls, red down/puts, amber warnings). Custom micro-visualizations for each Greek instead of generic sparklines.

---

## What it is not

A production desk system. Things a real options platform has that Vol Lab does not:

- **Live tick data.** yfinance is the only data source. First-call latency is 1-3 seconds; quotes can be stale or missing. Real desks subscribe to Polygon, Refinitiv, ICE, or direct exchange feeds with millisecond updates.
- **Arb-free smile fits.** Linear interpolation between IV samples. Production uses SVI or SSVI parametric fits to guarantee no calendar-spread or butterfly arbitrage.
- **Beyond Black-Scholes-Merton.** No Heston stochastic volatility, no local vol, no rough vol, no jump-diffusion.
- **Exotic Greeks.** Just the standard five (delta, gamma, vega, theta, rho). No vanna, volga, charm, color, speed, ultima.
- **Discrete dividends.** Only continuous dividend yield `q`.
- **Better American Greeks.** Tree-derived delta and gamma from the second time-step; vega and rho fall back to closed-form BS. Production replaces with PSOR or Longstaff-Schwartz.
- **Continuous-monitoring barrier correction.** MC barrier pricer uses discrete monitoring. Over-prices knock-outs by a few bps for short expiries (missing Broadie-Glasserman-Kou correction).
- **Term-structure interest rates.** Flat `r` only.
- **Risk system.** No portfolio aggregation, VaR, CVA, scenario PnL, model risk monitoring, intraday attribution.
- **Production ops.** No auth, no rate limiting, no observability stack (Sentry, OpenTelemetry, structured logs), no quota tracking.
- **The "live" ticker tape** in the top bar is a simulated random walk, not a real feed. The chain-fetched ticker prices are real.

Caveats specific to the **live demo**:
- The backend runs on Render's free tier, which sleeps after 15 minutes idle. First request after sleep cold-starts in 30 to 60 seconds. To wake it, open the [Swagger docs](https://vollab-backend.onrender.com/api/v1/docs) first.
- Yahoo throttles yfinance requests from shared cloud IPs. When that happens the Vol Surface page falls back to demo data so the UI still renders. Real desks use Polygon, IEX, or a direct feed in `backend/app/data/chain.py`.

Treat it as an engineering build that demonstrates fundamentals correctly.

---

## Screens

Static design mockups (HTML, no backend) are checked in at [`docs/mockups/`](docs/mockups/). Open them directly in a browser:

- [Vol Surface](docs/mockups/vol-surface.html) (the hero)
- [Strategy Builder](docs/mockups/strategy-builder.html)
- [Pricer](docs/mockups/pricer.html)
- [IV Analysis](docs/mockups/iv-analysis.html)

The actual app pages match these closely; the mockups were the design comp.

---

## Stack

### Frontend
- **Next.js 14** App Router (server components where possible, client components where needed for interactivity)
- **TypeScript** strict mode, `noUncheckedIndexedAccess` enabled
- **Tailwind CSS** with a fully custom dark-first theme (no default shadcn colors). Ink palette wired to CSS variables so the entire UI flips between dark and light by toggling `.dark` on `<html>`.
- **TanStack Query** for server-state caching, loading states, refetching
- **Zod** for runtime validation of every API response
- **Zustand** for client state (strategy legs)
- **Plotly** (lazy-loaded `plotly.js-dist-min`) for the 3D surface, payoff diagrams, and P&L heatmaps
- **lucide-react** for icons (no other icon libraries)

### Backend
- **FastAPI** with **Pydantic v2** schemas
- **NumPy 2.x** + **SciPy** for the math
- **pandas** for chain data normalization
- **yfinance** for option chains and historical prices
- **SQLAlchemy** for the optional Postgres swap (SQLite by default)
- **pytest** for tests
- **QuantLib** (optional, validation only — not deployed)

### Container
- Multi-stage **Dockerfiles** for both services (`backend/Dockerfile`, `frontend/Dockerfile`)
- **docker-compose.yml** at the repo root for local-dev convenience

---

## Validation

The numerical core is checked against a reference implementation on every push.

| Check | Result | Threshold |
|---|---|---|
| Black-Scholes prices vs **QuantLib** (10 cases: ITM/ATM/OTM, short/long maturity, w/ dividends) | max rel err **1.35 × 10⁻¹²** | ≤ 1e-10 |
| All five Greeks vs QuantLib (ATM 30d) | identical to **machine ε** | exact |
| Put-call parity (20 random parameter sets) | residual **< 1e-9** | < 1e-6 |
| Closed-form Greeks vs finite-difference | max err **< 1e-4** | < 1e-4 |
| Binomial CRR convergence to BS at n=500 | matches **< 0.01** | < 0.05 |
| American put > European put (early-exercise premium) | premium **> 0** for ATM 1y at 25% vol | > 0 |
| MC 95% CI coverage (100 trials) | **≥ 95 / 100** containing true price | ≥ 88 |
| IV round-trip on 50 synthetic quotes | **100%** converge to true σ ≤ 1e-5 | ≥ 95% |
| Asian < European call (Jensen's inequality) | always holds | holds |
| Barrier in-out parity (`KI + KO = vanilla`) | matches to MC tolerance | within 2×stderr |

Full table and methodology notes: [`docs/validation.md`](docs/validation.md).

Regenerate the report:
```bash
cd backend && .venv/Scripts/python scripts/validate.py
```

The script compares Vol Lab's BS implementation against QuantLib's `AnalyticEuropeanEngine`, runs all internal cross-checks via the pytest suite, and writes timing benchmarks. Output is `docs/validation.md`. The in-app `/app/validation` page renders the same numbers inline.

---

## Performance

Measured on the dev box (Windows, Python 3.12.6, NumPy 2.4.5, single thread). Warm-up loops excluded.

| Workload | Time | SLO target |
|---|---|---|
| Single Black-Scholes price + 5 Greeks | **0.42 ms** | < 1 ms |
| 30 × 30 vol surface (900 IV inversions + grid interp) | **121 ms** | < 200 ms |
| Monte Carlo, 10,000 antithetic paths (European) | **0.3 ms** | < 100 ms |
| Binomial CRR, n = 500 (European w/ Greeks) | **2.0 ms** | < 50 ms |
| Binomial CRR, n = 1000 | 5.0 ms | informational |

Speed comes from a few things:
- The closed-form path uses one `scipy.stats.norm.cdf` call per option, no Python loops.
- `pricing/black_scholes.price_vec` broadcasts across NumPy arrays so a 900-element grid is one batched evaluation, not 900 calls.
- The IV solver primes Newton-Raphson with a constant initial guess (0.2) and converges in 4-8 iterations on real chain quotes. Bisection only triggers when |vega| < 1e-7.
- Monte Carlo uses paired antithetic samples (Z and -Z) so the sample mean of the Brownian increment is exactly zero, cutting variance roughly in half for free.
- The arithmetic-mean Asian uses the geometric-mean Asian (which has a Kemna-Vorst closed form) as a control variate. Typical std-error reduction: 50-100x.

---

## Local development

### Prerequisites

- **Python 3.11+** (3.12 tested)
- **Node 20+** (24 tested)
- (Optional) **Docker** if you want to run via compose

### Setup

```bash
git clone https://github.com/peterh2004/options-pricing.git
cd options-pricing

# Backend
cd backend
python -m venv .venv
# Activate: Windows
.venv\Scripts\activate
# Activate: macOS/Linux
source .venv/bin/activate
pip install -e ".[dev,ref]"     # dev = pytest etc; ref = QuantLib (validation only)
uvicorn app.main:app --reload   # http://localhost:8000

# Frontend (new terminal)
cd ../frontend
npm install
cp .env.example .env.local      # points NEXT_PUBLIC_API_URL at localhost:8000
npm run dev                     # http://localhost:3000
```

### Or everything via Docker

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend Swagger: http://localhost:8000/api/v1/docs
```

### Common commands

| Task | Command |
|---|---|
| Run backend tests | `cd backend && pytest -v` |
| Regenerate validation report | `cd backend && python scripts/validate.py` |
| Frontend type-check | `cd frontend && npx tsc --noEmit` |
| Frontend production build | `cd frontend && npm run build` |
| Format Python | `cd backend && ruff format .` |
| Lint Python | `cd backend && ruff check .` |

### Environment variables

**Backend** (`backend/.env`, optional):
```bash
APP_NAME="Vol Lab API"
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=sqlite:///./vollab.db   # swap for Postgres in prod
CACHE_DIR=.vollab_cache
```

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Project layout

```
options-pricing/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry, CORS, lifespan
│   │   ├── core/
│   │   │   ├── constants.py     # Every magic number, named
│   │   │   └── config.py        # pydantic-settings, env vars
│   │   ├── api/v1/              # One router file per endpoint group
│   │   │   ├── health.py        # GET /health
│   │   │   ├── price.py         # POST /price
│   │   │   ├── iv.py            # POST /iv
│   │   │   ├── chain.py         # GET /chain/{ticker}
│   │   │   ├── surface.py       # POST /surface
│   │   │   ├── strategy.py      # POST /strategy/{price,pnl}
│   │   │   └── iv_analysis.py   # GET /iv_analysis/{ticker}
│   │   ├── models/schemas.py    # Pydantic v2 request/response models
│   │   ├── pricing/
│   │   │   ├── black_scholes.py # Closed-form, 5 Greeks, vectorized
│   │   │   ├── binomial.py      # CRR with American early-exercise
│   │   │   ├── monte_carlo.py   # Asian, barrier, control variates
│   │   │   ├── iv.py            # Newton + bisection fallback
│   │   │   └── strategy.py      # Multi-leg, breakevens, P&L grid
│   │   └── data/
│   │       ├── db.py            # SQLite cache primitives
│   │       ├── chain.py         # yfinance chain fetcher
│   │       └── historical.py    # Historical prices + RV math
│   ├── tests/                   # 77 tests, pytest
│   ├── scripts/validate.py      # Generates docs/validation.md
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                # Landing
│   │   │   ├── layout.tsx              # Root + FOUC theme script
│   │   │   ├── providers.tsx           # TanStack QueryClientProvider
│   │   │   ├── globals.css             # CSS variables + components
│   │   │   └── app/                    # URL: /app/*
│   │   │       ├── layout.tsx          # Sidebar + topbar shell
│   │   │       ├── pricer/page.tsx
│   │   │       ├── surface/page.tsx
│   │   │       ├── strategy/page.tsx
│   │   │       ├── iv-analysis/page.tsx
│   │   │       ├── guide/page.tsx
│   │   │       └── validation/page.tsx
│   │   ├── components/
│   │   │   ├── shell/                  # Sidebar, TopBar, TickerTape, CommandPalette, ThemeToggle, StatusFooter
│   │   │   ├── charts/                 # Plot wrapper, GreekCards (with custom micro-vizes)
│   │   │   └── strategy/               # AnimatedGreek
│   │   ├── lib/
│   │   │   ├── api/                    # client.ts, schemas.ts (Zod), queries.ts (TanStack)
│   │   │   ├── hooks/                  # useAnimatedNumber, useDebounce, useTheme
│   │   │   ├── format.ts               # fmtMoney/Pct/Num/Signed
│   │   │   └── utils.ts                # cn() helper
│   │   ├── stores/strategyStore.ts     # Zustand: legs + templates
│   │   └── types/plotly-dist.d.ts      # Type shim for plotly.js-dist-min
│   ├── tailwind.config.ts              # Custom theme (no shadcn defaults)
│   ├── package.json
│   ├── Dockerfile
│   └── vercel.json
├── docs/
│   ├── mockups/                        # Static HTML design comps (Phase 1 of build)
│   ├── design-system.md                # Color, type, spacing, components, anti-patterns
│   ├── validation.md                   # QuantLib comparison + perf benchmarks
│   └── architecture.md                 # System diagram + request paths + file map
├── docker-compose.yml
├── render.yaml                         # One-click Render Blueprint
└── README.md
```

---

## Architecture

```
┌──────────────┐         ┌────────────────┐        ┌──────────────┐
│ Next.js UI   │ ──────► │ FastAPI /v1    │ ─────► │ NumPy/SciPy  │
│ App Router   │  JSON   │ Pydantic v2    │        │ (pricing)    │
│ TS strict    │ ◄────── │ Zod-mirrored   │        │              │
└──────────────┘ ZodVal  └────────┬───────┘        └──────────────┘
                                  │
                          ┌───────▼───────┐
                          │ SQLite cache  │ ◄── yfinance
                          │ (chain 5min,  │     (option chains,
                          │  history 24h) │      historical prices)
                          └───────────────┘
```

### Request path: single-contract price

```
UI input change
  → useDebounce (150 ms)
  → TanStack Query usePrice(req)
  → fetch POST /api/v1/price  (Zod-validated response on the way back)
  → API: dispatch on method
    • black_scholes  → app.pricing.black_scholes.price_and_greeks
    • binomial       → app.pricing.binomial.price_crr
    • monte_carlo    → app.pricing.monte_carlo.price_european
  → returns { price, greeks, method, compute_ms, stderr? }
  → useAnimatedNumber tweens displayed Greek values over 300ms
```

### Request path: vol surface

```
POST /api/v1/surface { ticker, option_type, moneyness/dte range, n_*}
  1. data.chain.fetch_chain(ticker)              # yfinance + 5-min SQLite cache
  2. filter contracts by moneyness/dte window
  3. pricing.iv.solve_iv on each contract        # Newton-Raphson + bisection
  4. scipy.interpolate.griddata                  # linear interp to regular grid
  5. compute ATM IV @ 30d, iv min/max, convergence rate
  → returns IV grid as 2D array, rendered as Plotly mesh3d
```

### Invariants enforced across the stack

- **Schemas are source-of-truth.** `backend/app/models/schemas.py` (Pydantic v2) mirrors `frontend/src/lib/api/schemas.ts` (Zod). Change one and the other follows.
- **Greek units (everywhere).** Vega per 1 vol point (i.e. ∂V/∂σ × 0.01), rho per 1% rate, theta per calendar day. Practitioner conventions, not academic.
- **Year fractions.** ACT/365 calendar-day year for time-to-expiry across the API. ACT/252 trading-day year only for realized-volatility annualization.
- **Risk-free rate default.** 4.288% (3-month T-bill at v0.1.0 cut date). Overridable per request via `r` field.

Full architecture doc with file map and request-path traces: [`docs/architecture.md`](docs/architecture.md).

---

## API reference

All endpoints under `/api/v1`. Interactive Swagger UI at `http://localhost:8000/api/v1/docs`.

```
POST /price            { type, style, S, K, T, r, sigma, q?, method? }
                       → { price, greeks, method, compute_ms, stderr?, half_ci_95? }

POST /iv               { type, S, K, T, r, market_price, q? }
                       → { iv, iterations, converged, method, residual, compute_ms }

GET  /chain/{ticker}   → { ticker, spot, fetched_at, contracts[], compute_ms }

POST /surface          { ticker, option_type, moneyness_min/max, dte_min/max, n_moneyness, n_dte, r? }
                       → { iv_grid[][], moneyness_axis, dte_axis,
                           atm_iv_30d, iv_min, iv_max, contracts_used,
                           convergence_rate, compute_ms }

POST /strategy/price   { legs[], S, r, q? }
                       → { legs[], net_price, net_greeks, cost_basis,
                           max_profit, max_loss, breakevens[], compute_ms }

POST /strategy/pnl     { legs[], S_min, S_max, n_S, t_max_years, n_t, r, q? }
                       → { S_axis[], t_axis[], grid[][], compute_ms }

GET  /iv_analysis/{ticker}
                       → { spot, atm_iv_30d, rv_30d, rv_60d, rv_1y, vrp,
                           term_structure[], skew_at_30d[],
                           iv_series[], rv_series[], compute_ms }

GET  /health           → { status, version, uptime_seconds }
```

### Example: price an ATM SPY call

```bash
curl -s -X POST http://localhost:8000/api/v1/price \
  -H "Content-Type: application/json" \
  -d '{
    "option_type": "call",
    "style":       "european",
    "S": 459.30, "K": 460,
    "T": 0.0822,
    "r": 0.04288, "sigma": 0.1734, "q": 0.0135,
    "method": "black_scholes"
  }' | jq
```

```json
{
  "price": 9.300364637363543,
  "greeks": {
    "delta": 0.516497041482103,
    "gamma": 0.01743608013524289,
    "vega":  0.5242792359666743,
    "theta": -0.16950410329266233,
    "rho":   0.18735576919563116
  },
  "method": "black_scholes",
  "compute_ms": 0.42,
  "stderr": null,
  "half_ci_95": null
}
```

### Example: solve implied vol from a market price

```bash
curl -s -X POST http://localhost:8000/api/v1/iv \
  -H "Content-Type: application/json" \
  -d '{
    "option_type": "call",
    "S": 459.30, "K": 460,
    "T": 0.0822,
    "r": 0.04288,
    "market_price": 9.30,
    "q": 0.0135
  }' | jq
```

```json
{
  "iv": 0.17340012,
  "iterations": 4,
  "converged": true,
  "method": "newton",
  "residual": 4.2e-8,
  "compute_ms": 0.18
}
```

### Example: price an iron condor

```bash
curl -s -X POST http://localhost:8000/api/v1/strategy/price \
  -H "Content-Type: application/json" \
  -d '{
    "S": 100, "r": 0.04, "q": 0,
    "legs": [
      { "option_type": "put",  "strike": 90,  "expiry_years": 0.0822, "quantity":  1, "sigma": 0.22 },
      { "option_type": "put",  "strike": 95,  "expiry_years": 0.0822, "quantity": -1, "sigma": 0.20 },
      { "option_type": "call", "strike": 105, "expiry_years": 0.0822, "quantity": -1, "sigma": 0.17 },
      { "option_type": "call", "strike": 110, "expiry_years": 0.0822, "quantity":  1, "sigma": 0.16 }
    ]
  }' | jq '{net_price, max_profit, max_loss, breakevens}'
```

---

## Testing

```bash
cd backend && pytest -v          # 77 tests, ~8s
```

| Suite | Tests | Covers |
|---|---|---|
| `test_black_scholes.py` | 20 | put-call parity, FD Greeks for both call & put, Hull reference cases, T→0 / σ→0 boundaries, vectorized broadcasting |
| `test_binomial.py` | 7 | European convergence to BS, American-call-with-no-div equals European, American-put early-exercise premium, deep ITM put = intrinsic, Greeks vs BS |
| `test_monte_carlo.py` | 6 | 95% CI coverage over 100 trials, antithetic variance reduction vs naive, Asian < European call, geometric control-variate stderr reduction, barrier in-out parity, unreachable-barrier equals vanilla |
| `test_iv.py` | 20 | round-trip across 5 vols × 2 types, various moneyness, bulk 50-quote convergence ≥95%, below-intrinsic/above-upper-bound rejection, T=0 rejection, low-vega fallback |
| `test_strategy.py` | 10 | single leg matches BS, bull-call-spread max profit/loss/breakeven, iron-condor credit + two breakevens + near-zero delta, straddle gamma/vega positive, P&L grid at expiry matches intrinsic |
| `test_data.py` | 5 | realized vol on constant series, on known-vol synthetic returns, insufficient-samples handling, RV series length, stats pipeline |
| `test_api.py` | 9 | every endpoint smoke-tested via `TestClient`, including 422 validation rejection for negative strikes / unknown method |

Tests run in deterministic mode (seeded RNG in `conftest.py`) so results are reproducible across machines.

---

## Design system

Documented in [`docs/design-system.md`](docs/design-system.md). Short version:

- **Dark mode primary**, light mode supported via CSS-variable swap on `.dark` class.
- **Inter** for UI text. **JetBrains Mono** for every number, ticker, price, Greek, time, percentage. Always `tabular-nums`.
- **Semantic color** bound to meaning: green up/calls/long, red down/puts/short, amber warnings, muted electric-blue accent reserved for focus and selection.
- **Negative numbers in red**, using the proper minus glyph `−` (U+2212) not the hyphen-minus.
- **Dense**: 32-36px row heights, 36px inputs, 1px hairline borders. No drop shadows, no glassmorphism, no gradient backgrounds.
- **Generous whitespace** only around chart sections so data has room to breathe.
- **No spinners.** Skeleton blocks that match the final layout.
- **No emoji** in the UI or in code.
- **No em or en dashes** in prose (house style).

The accent color is a single muted electric-blue `#3b82f6`. It only appears on focus rings, the active sidebar item border, and primary CTAs. It is never used decoratively.

Three custom UI touches worth calling out:
1. **Animated Greeks.** Net Greek values in the Strategy Builder tween over 300ms when legs change, via a custom `useAnimatedNumber` hook (requestAnimationFrame, ease-out-cubic, respects `prefers-reduced-motion`).
2. **Custom Greek micro-vizes.** Each Greek card on the Pricer has a bespoke SVG visualization that matches its meaning: probability gauge for delta, bell curve for gamma, vol-sweep histogram for vega, decay curve for theta, slope line for rho. Each renders in under 2ms.
3. **Cmd/Ctrl+K command palette.** Quick navigation. Type a ticker (NVDA, SPY, etc.) and it opens the Vol Surface for that name. Persistent across pages.

---

## Roadmap

Concrete v0.2 candidates, in rough priority order:

- [ ] **Persist daily ATM IV snapshots** to enable a real IV vs RV time series (currently we only have today's IV from `/chain`).
- [ ] **SVI surface fits** in addition to linear interpolation. Generate an arb-free implied vol surface that can be queried at any (K, T).
- [ ] **Broadie-Glasserman-Kou correction** for discretely-monitored barrier MC.
- [ ] **Better American Greeks** via PSOR or Longstaff-Schwartz Monte Carlo, replacing the tree approximations.
- [ ] **Heston calibration page** with closed-form characteristic-function pricing.
- [ ] **Discrete dividend handling** for equities.
- [ ] **Polygon/IEX data source** swap (kept behind an env-var feature flag).
- [ ] **Authentication + rate limiting** so the deployed version can be made public-write.
- [ ] **OpenTelemetry instrumentation** for production observability.
- [ ] **Mobile layout** (currently degrades gracefully below 1024px; could be designed properly).

Issue tracker: https://github.com/peterh2004/options-pricing/issues

---

## Hosting

The live demo runs on **Vercel** (frontend) + **Render** (backend), both free tier. The repo includes [`render.yaml`](render.yaml) and [`frontend/vercel.json`](frontend/vercel.json) so a fork deploys with no config: import the repo into each platform, set `NEXT_PUBLIC_API_URL` on Vercel to your Render URL, and set `CORS_ORIGINS` on Render to your Vercel URL. For always-on (no cold starts) consider Railway or Fly.io; for full control use the included `docker-compose.yml` on any VPS.

---

## License

MIT. See `LICENSE`.

Built with Next.js, FastAPI, NumPy, SciPy, Plotly, Zod, Zustand, TanStack Query, lucide-react. Validation reference: QuantLib.
