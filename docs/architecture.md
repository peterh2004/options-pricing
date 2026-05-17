# Vol Lab · Architecture

## System overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                 │
│                                                                       │
│   Next.js 14 App Router · React 18 · TS strict · Tailwind            │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │  Pages: /, /app/pricer, /app/surface, /app/strategy,          │  │
│   │         /app/iv-analysis                                       │  │
│   │  State: TanStack Query (server cache) · Zustand (legs)         │  │
│   │  Charts: plotly.js (3D surface, payoff, heatmap)               │  │
│   │  Validation: Zod parses every API response                     │  │
│   └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTPS / JSON
                                   │ (NEXT_PUBLIC_API_URL)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND                             │
│                                                                       │
│   /api/v1/health           /api/v1/strategy/price                    │
│   /api/v1/price            /api/v1/strategy/pnl                      │
│   /api/v1/iv               /api/v1/iv_analysis/{ticker}              │
│   /api/v1/chain/{ticker}   /api/v1/surface                           │
│                                                                       │
│   ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│   │   pricing/              │  │   data/                          │  │
│   │   • black_scholes       │  │   • chain  (yfinance + cache)    │  │
│   │   • binomial (CRR)      │  │   • historical (RV stats)        │  │
│   │   • monte_carlo         │  │   • db  (SQLite cache)           │  │
│   │   • iv (NR + bisect)    │  └──────────┬───────────────────────┘  │
│   │   • strategy            │             │                           │
│   └─────────────────────────┘             │                           │
└────────────────────┬───────────────────────┼──────────────────────────┘
                     │                       │
                     ▼                       ▼
              ┌─────────────┐         ┌─────────────┐
              │  numpy      │         │  SQLite     │
              │  scipy      │         │  vollab.db  │
              │  pandas     │         │  (chain +   │
              │  QuantLib*  │         │   history   │
              │  (* tests)  │         │   cache)    │
              └─────────────┘         └──────┬──────┘
                                             │
                                             ▼
                                       ┌─────────────┐
                                       │  yfinance   │
                                       │  (network)  │
                                       └─────────────┘
```

## Request paths

### Single-contract pricing (Pricer page)
```
UI input change
  → useDebounce (150ms)
  → TanStack Query usePrice(req)
  → fetch POST /api/v1/price  (Zod-validated response)
  → API: dispatch on method
    • black_scholes → app/pricing/black_scholes.price_and_greeks
    • binomial      → app/pricing/binomial.price_crr
    • monte_carlo   → app/pricing/monte_carlo.price_european
  → returns { price, greeks, method, compute_ms, stderr? }
  → useAnimatedNumber tweens display over 300ms
```

### Vol surface (Surface page)
```
POST /api/v1/surface { ticker, option_type, moneyness/dte range }
  1. data/chain.fetch_chain(ticker)  · yfinance + SQLite cache
  2. filter contracts by moneyness/dte
  3. for each contract: pricing/iv.solve_iv(...)  · Newton-Raphson + bisection
  4. scipy.interpolate.griddata → (n_moneyness × n_dte) grid
  5. compute ATM IV @ 30d, iv min/max, convergence rate
  → 30×30 grid renders as Plotly mesh3d (hero)
```

### Strategy (Strategy Builder page)
```
Legs (Zustand store)
  → useDebounce(180ms)
  → POST /api/v1/strategy/price  → net price, net Greeks, breakevens, max P/L
  → POST /api/v1/strategy/pnl    → grid for spot × DTE heatmap
  → AnimatedGreek tweens each net Greek to new target
```

## Data flow (key invariants)

- **Single source of truth for schemas**: `backend/app/models/schemas.py` (Pydantic v2) mirrors
  `frontend/src/lib/api/schemas.ts` (Zod). When either changes, both must update.
- **Greek units (everywhere)**: vega per 1 vol pt (0.01σ), rho per 1% rate, theta per calendar day.
- **Year convention**: ACT/365 calendar-day year for time-to-expiry; ACT/252 trading-day year
  for realized-volatility annualization.
- **Risk-free rate default**: 4.288% (3-month T-bill at v0.1.0 cut date). Overridable per request.

## Caching

| Layer | TTL | Where |
|-------|-----|-------|
| Option chain (yfinance fetch) | 5 minutes | SQLite `chain_cache` table |
| Historical prices | 24 hours | SQLite `history_cache` table |
| TanStack Query (frontend) | 30s default, 1s for /price | client RAM |

## Validation discipline

- Every backend pricing fn has a pytest test asserting either a closed-form identity
  (put-call parity, FD Greeks) or a reference price (Hull/QuantLib).
- Every frontend API call is parsed through Zod. Schema mismatch throws an `ApiError`.
- The validation suite (`backend/scripts/validate.py`) regenerates `docs/validation.md`
  with QuantLib reference comparisons and performance benchmarks. Re-run after any
  pricing change.

## Deployment topology

Local: `docker-compose up` brings up both services + a SQLite volume.

Production-ready (not deployed):
- Frontend → Vercel (zero-config Next.js)
- Backend → Fly.io or Railway (Dockerfile provided)
- DB → Neon or Supabase Postgres (swap `DATABASE_URL`, leave the SQL untouched)

## File map

```
backend/
├── app/
│   ├── main.py                  # FastAPI entry, CORS, lifespan
│   ├── core/
│   │   ├── constants.py         # All magic numbers (named)
│   │   └── config.py            # pydantic-settings, env vars
│   ├── api/v1/
│   │   ├── __init__.py          # router mount
│   │   ├── health.py            # GET /health
│   │   ├── price.py             # POST /price
│   │   ├── iv.py                # POST /iv
│   │   ├── chain.py             # GET /chain/{ticker}
│   │   ├── surface.py           # POST /surface
│   │   ├── strategy.py          # POST /strategy/{price,pnl}
│   │   └── iv_analysis.py       # GET /iv_analysis/{ticker}
│   ├── models/schemas.py        # Pydantic request/response models
│   ├── pricing/
│   │   ├── black_scholes.py     # closed-form + 5 Greeks + vectorized
│   │   ├── binomial.py          # CRR with American early-exercise
│   │   ├── monte_carlo.py       # Asian/barrier, antithetic + control variate
│   │   ├── iv.py                # Newton + bisection fallback
│   │   └── strategy.py          # multi-leg aggregation, P&L grid, breakevens
│   └── data/
│       ├── db.py                # SQLite cache primitives
│       ├── chain.py             # yfinance chain fetcher
│       └── historical.py        # historical prices + RV
├── tests/                       # 77 tests, pytest
└── scripts/validate.py          # generates docs/validation.md

frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx             # landing
│   │   ├── layout.tsx           # root layout, fonts
│   │   ├── providers.tsx        # TanStack QueryClientProvider
│   │   ├── globals.css          # design tokens, primitives
│   │   └── app/                 # app shell pages (URL: /app/*)
│   │       ├── layout.tsx       # sidebar + topbar shell
│   │       ├── pricer/page.tsx
│   │       ├── surface/page.tsx
│   │       ├── strategy/page.tsx
│   │       └── iv-analysis/page.tsx
│   ├── components/
│   │   ├── shell/               # Sidebar, TopBar, TickerTape, CommandPalette, StatusFooter
│   │   ├── charts/              # Plot wrapper, GreekCards
│   │   └── strategy/            # AnimatedGreek
│   ├── lib/
│   │   ├── api/                 # client, schemas (Zod), queries (TanStack)
│   │   ├── hooks/               # useAnimatedNumber, useDebounce
│   │   ├── format.ts            # fmtMoney/Pct/Num/Signed
│   │   └── utils.ts             # cn()
│   └── stores/strategyStore.ts  # Zustand: legs
└── tailwind.config.ts           # design tokens (ink/up/down/warn/accent)

docs/
├── mockups/                     # original HTML design comps (Phase 1)
├── design-system.md             # color, type, spacing, components
├── validation.md                # QuantLib comparison + perf benchmarks
└── architecture.md              # this file
```
