# Vol Lab

> An options pricing and strategy analytics workbench.
> Black-Scholes, binomial trees, Monte Carlo with variance reduction, vol surfaces from real chain data, and a multi-leg strategy builder.
> Every pricing function is validated against QuantLib.

**Live demo:** _placeholder_ · **90 second walkthrough:** _placeholder_

---

## What this is

A portfolio project that implements the core math a quant uses (closed-form Black-Scholes, CRR binomial for American options, Monte Carlo with antithetic variates and control variates) and surfaces it through a dense Bloomberg-feeling UI. The math is validated to **1e-12** against QuantLib and covered by 77 unit tests. The frontend is type-safe end to end (Pydantic v2 on the backend, Zod on the client) and renders a live 3D vol surface from yfinance chain data.

## What this is not

This is **not a desk tool**. Things a production options system has that Vol Lab does not:

- Live tick data feed. yfinance is the only data source. Calls are slow (1 to 3 seconds first hit) and quotes can be stale or missing.
- SABR or SVI surface fits. We use scipy `griddata` linear interpolation. Real desks use arb-free parametric fits.
- Heston, local vol, or rough-vol models. BSM only.
- Exotic Greeks (vanna, volga, charm, color). We compute the standard five only.
- Discrete dividends. Only continuous yield `q`.
- Proper early-exercise boundary or PSOR for American options. Binomial only.
- Broadie-Glasserman-Kou correction for discretely-monitored barriers.
- Interest rate term structure. Flat `r` only.
- Risk aggregation, VaR, PnL attribution, model risk monitoring.
- Auth, rate limiting, observability (Sentry, OTel, structured logs).
- The live ticker tape in the top bar is simulated random walks, not a real feed.

Treat it as an engineering exercise that gets the math right and the UI tight.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript strict, Tailwind, Zustand, TanStack Query, Zod, Plotly, lucide-react |
| Backend  | FastAPI, Pydantic v2, NumPy, SciPy, pandas, yfinance, SQLAlchemy, pytest |
| Reference | QuantLib (validation only) |
| Container | Docker (multi-stage), docker compose |

---

## Validation snapshot

| Check | Result |
|---|---|
| Black-Scholes prices vs **QuantLib** (10 reference cases) | max rel err **1.35 × 10⁻¹²** |
| All five Greeks vs QuantLib (ATM 30d) | identical to **machine ε** |
| Put-call parity (20 random param sets) | residual **< 10⁻⁹** |
| Closed-form Greeks vs finite-difference | max err **< 10⁻⁴** |
| Binomial CRR vs BS at n=500 | matches **< 0.01** |
| MC 95% CI coverage (100 trials) | **≥ 95** |
| IV solver convergence (50 quotes) | **100%** |

Full table: [`docs/validation.md`](docs/validation.md) · Regenerate via `cd backend && python scripts/validate.py`

## Performance

| Workload | Time | Target |
|---|---|---|
| Single BS price + 5 Greeks | **0.42 ms** | < 1 ms |
| 30×30 vol surface (with IV inversion) | **121 ms** | < 200 ms |
| Monte Carlo, 10,000 antithetic paths | **0.3 ms** | < 100 ms |
| Binomial CRR, n=500 | **2.0 ms** | < 50 ms |

---

## Local setup (3 commands)

```bash
# 1. backend
cd backend && python -m venv .venv && .venv/Scripts/python -m pip install -e ".[dev,ref]"
.venv/Scripts/python -m uvicorn app.main:app --reload

# 2. frontend (new terminal)
cd frontend && npm install && cp .env.example .env.local && npm run dev

# 3. open
# Frontend: http://localhost:3000
# Backend Swagger: http://localhost:8000/api/v1/docs
```

Or everything in one shot:
```bash
docker compose up --build
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
                          └───────────────┘
```

Full diagram and file map: [`docs/architecture.md`](docs/architecture.md)

---

## Pages

| Route | What it does |
|---|---|
| `/` | Landing page. Feature cards, hero surface preview, perf numbers |
| `/app/guide` | Concept primer. 10 sections covering options basics through performance |
| `/app/pricer` | Single contract pricer. Form on the left, 6 cards (price + 5 Greeks with custom micro-vizes), payoff diagram, side-by-side method comparison |
| `/app/surface` | Hero 3D Plotly vol surface from real `yfinance` chain. ATM term structure and skew at selected expiry on the right rail. Export CSV |
| `/app/strategy` | Multi-leg editor backed by Zustand. Animated net Greeks, payoff diagram and P&L heatmap (spot × time), max profit/loss/breakevens. Save to JSON |
| `/app/iv-analysis` | 4-quadrant view: realized vs implied vol time series, term structure, smile, vol risk premium |
| `/app/validation` | Inline view of the validation table (QuantLib comparison, Greeks, cross-checks, perf benchmarks) |

---

## API contract

All endpoints under `/api/v1`. Full Swagger UI at `http://localhost:8000/api/v1/docs`.

```
POST /price            { type, style, S, K, T, r, sigma, q?, method? }
                       → { price, greeks, method, compute_ms, stderr? }
POST /iv               { type, S, K, T, r, market_price, q? }
                       → { iv, iterations, converged, method, residual }
GET  /chain/{ticker}   → { ticker, spot, contracts[] }
POST /surface          { ticker, option_type, moneyness/dte range, n_*}
                       → { iv_grid[][], moneyness_axis, dte_axis, atm_iv_30d, ... }
POST /strategy/price   { legs[], S, r, q? }
                       → { legs[], net_price, net_greeks, max_profit, max_loss, breakevens[] }
POST /strategy/pnl     { legs[], S_min/max, n_S, t_max_years, n_t, r, q? }
                       → { S_axis, t_axis, grid[][] }
GET  /iv_analysis/{ticker} → { atm_iv_30d, rv_30d/60d/1y, vrp, term_structure, skew_at_30d, ... }
GET  /health           → { status, version, uptime_seconds }
```

---

## Testing

```bash
cd backend && pytest -v        # 77 tests, ~5s
```

Test breakdown:
- `test_black_scholes.py` parity, FD Greeks, reference, boundaries, vectorized (20 tests)
- `test_binomial.py` convergence, American premium, deep-ITM put exercise (7)
- `test_monte_carlo.py` CI coverage, antithetic variance reduction, in-out parity, control variate (6)
- `test_iv.py` round-trip, bulk convergence, edge cases (20)
- `test_strategy.py` single leg, bull spread, iron condor, straddle, P&L grid (10)
- `test_data.py` realized vol math (5)
- `test_api.py` FastAPI smoke tests for every endpoint (9)

---

## Design

The visual language is documented in [`docs/design-system.md`](docs/design-system.md). Quick principles:

- **Dark mode primary**, no purples, no gradient blobs, no glass
- **Inter** for UI, **JetBrains Mono** for every number (always `tabular-nums`)
- **Semantic color**: green up/calls/long, red down/puts/short, amber warnings
- **Negative numbers in red**, with the proper minus glyph `−` (U+2212)
- **Dense**: 32 to 36px rows, 36px inputs, 1px hairlines, no heavy shadows
- **Generous whitespace around charts only**. Tables and KPIs stay tight
- The accent color (muted electric-blue) is reserved for **focus and selection** only

The static HTML mockups that established this language live in [`docs/mockups/`](docs/mockups/).

---

## Known limitations and future work

- **Surface uses linear interpolation** on IV. SVI or SSVI fits would be more robust at the smile wings. Straightforward future addition.
- **MC barrier pricer uses discrete monitoring** without Broadie-Glasserman-Kou continuity correction. Over-prices knock-outs by a few bps for short expiries.
- **No realized-vol time series for IV**. We only have a current-day IV snapshot from `/chain`. To produce a full IV vs RV chart, persist daily ATM IV to the cache table. Out of scope for v0.1.
- **Greeks for American options** are tree-derived (delta and gamma from the second time-step). Vega and rho fall back to BS. For high-precision American Greeks, replace with PSOR or LSM.
- **No auth, no rate limiting, no observability**. Add Sentry + OpenTelemetry + a per-IP limiter before any public deployment.
- **Frontend pages are responsive down to 1024px but degrade below**. This is a desktop tool.

---

## Deploy (free)

Easiest path: **Vercel for the frontend, Render for the backend**. Both have generous free tiers. ~5 minutes once the repo is on GitHub.

**0. Push to GitHub (one time):**
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create vollab --public --source=. --remote=origin --push
# Or create the repo via the GitHub UI and add the remote manually.
```

**1. Deploy the backend on Render:**
- Sign in at [render.com](https://render.com).
- New + → Blueprint → connect your GitHub repo.
- Render reads [`render.yaml`](render.yaml) at the repo root and provisions a free Python web service. Build takes ~3 minutes (scipy compiles).
- Copy the live URL it gives you, e.g. `https://vollab-backend.onrender.com`.

**2. Deploy the frontend on Vercel:**
- Sign in at [vercel.com](https://vercel.com).
- Add New + → Project → import your repo.
- In the import screen, set **Root Directory** to `frontend`. Framework auto-detects as Next.js.
- Add the env var `NEXT_PUBLIC_API_URL` = your Render URL from step 1.
- Deploy. ~2 minutes.

**3. Wire CORS:**
- Copy the live Vercel URL Vercel gives you, e.g. `https://vollab.vercel.app`.
- Back on Render → service → Environment → set `CORS_ORIGINS` to your Vercel URL.
- Render auto-redeploys.

Done.

### Gotchas

- **Render free tier sleeps after 15 minutes of no traffic.** First request after sleep takes 30 to 60 seconds (cold start). Acceptable for a demo; not for production.
- **SQLite cache is ephemeral** on free tier (no persistent disk). Chains re-fetch from yfinance on first request after a restart. No data loss because the cache is just an optimization.
- **yfinance from cloud IPs** gets rate-limited or briefly blocked sometimes. Yahoo throttles shared IP ranges. The Surface page falls back to demo data when the backend errors so the UI still renders. If you see this frequently, pay for a real data feed (Polygon, IEX) and swap in `data/chain.py`.
- **QuantLib is not installed in production.** It's only needed by `backend/scripts/validate.py` for regenerating the validation report locally.

### Alternatives

- **Railway** is similar to Render but with no cold starts. Free trial then ~$5/month minimum.
- **Fly.io** has a generous free tier with no cold starts but more setup. Use the included `backend/Dockerfile`.
- **Self-host with Docker Compose** on any VPS (DigitalOcean droplet, Hetzner CX11). `docker compose up --build`. Most control, most work.
- **Single Vercel deploy** (frontend + Python serverless function for backend) is technically possible but the heavy ML deps (numpy, scipy) exceed Vercel's 50 MB serverless bundle limit on free tier.

---

## License

MIT. Built with Next.js, FastAPI, NumPy, SciPy, Plotly, Zod, Zustand, TanStack Query, lucide-react, and QuantLib (validation).
