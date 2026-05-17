# Vol Lab Numerical Validation
Output of `backend/scripts/validate.py`. Re-run after any pricing change.
_Generated: 2026-05-16 21:14:09_

---

## 1. Black-Scholes vs QuantLib reference engine
| # | Case | Type | Vol Lab | QuantLib | abs err | rel err |
|---|------|------|---------|----------|---------|---------|
| 1 | Hull Ex 15.6 adapted (call) | call | `4.753175` | `4.753175` | `8.88e-16` | `1.87e-16` |
| 2 | Hull Ex 15.6 adapted (put) | put | `0.807565` | `0.807565` | `4.44e-15` | `5.50e-15` |
| 3 | ATM 30d index | call | `9.299856` | `9.299856` | `1.78e-14` | `1.91e-15` |
| 4 | ATM 30d index put | put | `8.890845` | `8.890845` | `3.55e-14` | `4.00e-15` |
| 5 | Deep ITM call | call | `51.232492` | `51.232492` | `0.00e+00` | `0.00e+00` |
| 6 | Deep OTM call | call | `0.006455` | `0.006455` | `1.72e-15` | `2.66e-13` |
| 7 | Long-dated ATM | call | `23.571745` | `23.571745` | `7.11e-15` | `3.01e-16` |
| 8 | Short-dated OTM put | put | `0.006660` | `0.006660` | `9.02e-15` | `1.35e-12` |
| 9 | With dividends (high q) | call | `7.075532` | `7.075532` | `3.55e-15` | `5.02e-16` |
| 10 | High-vol earnings | call | `1.391082` | `1.391082` | `4.00e-15` | `2.87e-15` |

**Max relative error vs QuantLib: `1.35e-12`** (PASS <= 1e-10)

## 2. Greeks vs QuantLib (ATM 30d case)
_Case: ATM 30d index - S=459.3, K=460, T=30/365y, r=4.288%, sigma=17.34%, q=1.35%_

| Greek | Vol Lab | QuantLib | abs err |
|-------|---------|----------|---------|
| Δ delta | `0.516495` | `0.516495` | `0.00e+00` |
| Γ gamma | `0.017437` | `0.017437` | `6.94e-18` |
| ν vega  | `0.524253` | `0.524253` | `1.11e-16` |
| Θ theta | `-0.169512` | `-0.169512` | `1.33e-15` |
| ρ rho   | `0.187337` | `0.187337` | `5.55e-17` |

## 3. Internal cross-checks (from `pytest`)
- **Put-call parity**: residual < `1e-9` across 20 random parameter sets.
- **Closed-form Greeks vs finite difference**: max error `< 1e-4` (call & put).
- **Binomial CRR convergence**: European prices within `0.01` of BS at n=500.
- **American put > European put**: early-exercise premium > 0.
- **IV round-trip**: 50 synthetic chain quotes, 100% converge to true sigma <= `1e-5`.
- **Monte Carlo CI coverage**: 95% CI contains BS price in `≥88/100` trials at n=10k paths.
- **Asian < European call**: averaging reduces convexity, as expected.
- **Barrier in-out parity**: `KI + KO = vanilla` to MC tolerance.

## 4. Performance benchmarks
Measured on the dev box. Numbers in milliseconds.

| Workload | Time | Target | Status |
|----------|------|--------|--------|
| Single BS price + 5 Greeks | `0.966` ms | < 1ms | PASS |
| 30×30 vol surface (IV invert 900 cells) | `257` ms | < 200ms | soft cap |
| Monte Carlo, 10,000 antithetic paths | `0.7` ms | < 100ms | PASS |
| Binomial CRR, n=500 | `5.1` ms | < 50ms | PASS |
| Binomial CRR, n=1000 | `12.2` ms | n/a | informational |

## 5. Methodology notes
- All times measured with `time.perf_counter`, warm-up loop excluded from the timed window.
- Volatility surface includes IV inversion via Newton-Raphson + bisection fallback.
- MC uses antithetic variates (paired ±Z samples); Asian uses a geometric-mean control variate.
- Greek units (practitioner conventions): vega per 1% σ, rho per 1% r, theta per calendar day.
