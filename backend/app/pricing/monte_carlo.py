"""Monte Carlo pricing for path-dependent options.

Vanilla European pricing is exposed for unit-testing convergence; the production-facing
entry points are `price_asian` and `price_barrier`. All MC functions return a standard
error so the API can report a confidence band.

Variance reduction: antithetic variates (mandatory). Optional control variate against
the geometric-mean Asian (which has a closed form) for arithmetic Asian pricing.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from scipy.stats import norm

from app.core.constants import DEFAULT_MC_PATHS, DEFAULT_MC_STEPS

OptionType = Literal["call", "put"]
BarrierType = Literal["up-and-out", "down-and-out", "up-and-in", "down-and-in"]


@dataclass(frozen=True, slots=True)
class MCResult:
    price: float
    stderr: float
    paths: int
    half_ci_95: float  # 1.96 * stderr


def _gbm_paths(
    S: float,
    r: float,
    q: float,
    sigma: float,
    T: float,
    n_paths: int,
    n_steps: int,
    rng: np.random.Generator,
    antithetic: bool = True,
) -> np.ndarray:
    """Generate GBM paths under the risk-neutral measure with antithetic variates.

    Returns array of shape (n_paths, n_steps + 1). When antithetic=True, the first
    half are paired with their reflection in the second half. guarantees that the
    sample mean of dW is exactly zero.
    """
    if antithetic:
        half = n_paths // 2
        Z_half = rng.standard_normal(size=(half, n_steps))
        Z = np.concatenate([Z_half, -Z_half], axis=0)
        actual_paths = 2 * half
    else:
        Z = rng.standard_normal(size=(n_paths, n_steps))
        actual_paths = n_paths

    dt = T / n_steps
    drift = (r - q - 0.5 * sigma * sigma) * dt
    diff = sigma * np.sqrt(dt)
    log_returns = drift + diff * Z
    log_paths = np.cumsum(log_returns, axis=1)
    S_paths = S * np.exp(log_paths)
    out = np.empty((actual_paths, n_steps + 1), dtype=np.float64)
    out[:, 0] = S
    out[:, 1:] = S_paths
    return out


def _summarize(disc_payoffs: np.ndarray) -> MCResult:
    n = len(disc_payoffs)
    mean = float(disc_payoffs.mean())
    se = float(disc_payoffs.std(ddof=1) / np.sqrt(n))
    return MCResult(price=mean, stderr=se, paths=n, half_ci_95=1.96 * se)


# ---------- Vanilla European (used for convergence tests) ----------
def price_european(
    option_type: OptionType,
    S: float, K: float, T: float, r: float, sigma: float, q: float = 0.0,
    n_paths: int = DEFAULT_MC_PATHS,
    seed: int | None = None,
) -> MCResult:
    rng = np.random.default_rng(seed)
    # Single-step terminal sampling. closed-form path
    half = n_paths // 2
    Z = rng.standard_normal(size=half)
    Z_all = np.concatenate([Z, -Z])
    drift = (r - q - 0.5 * sigma * sigma) * T
    diff = sigma * np.sqrt(T)
    ST = S * np.exp(drift + diff * Z_all)
    if option_type == "call":
        payoff = np.maximum(ST - K, 0.0)
    else:
        payoff = np.maximum(K - ST, 0.0)
    disc_payoff = np.exp(-r * T) * payoff
    return _summarize(disc_payoff)


# ---------- Asian (arithmetic average) ----------
def price_asian(
    option_type: OptionType,
    S: float, K: float, T: float, r: float, sigma: float, q: float = 0.0,
    n_paths: int = DEFAULT_MC_PATHS,
    n_steps: int = DEFAULT_MC_STEPS,
    seed: int | None = None,
    use_control_variate: bool = True,
) -> MCResult:
    """Arithmetic average-price Asian option.

    When `use_control_variate=True`, uses the geometric-mean Asian as a control
    (closed-form via Kemna-Vorst). This typically cuts std error by 10 to 100x.
    """
    rng = np.random.default_rng(seed)
    paths = _gbm_paths(S, r, q, sigma, T, n_paths, n_steps, rng, antithetic=True)
    # Exclude t=0 from the average (typical convention for monitoring dates)
    arith_avg = paths[:, 1:].mean(axis=1)
    geo_avg = np.exp(np.log(paths[:, 1:]).mean(axis=1))

    if option_type == "call":
        arith_payoff = np.maximum(arith_avg - K, 0.0)
        geo_payoff = np.maximum(geo_avg - K, 0.0)
    else:
        arith_payoff = np.maximum(K - arith_avg, 0.0)
        geo_payoff = np.maximum(K - geo_avg, 0.0)

    disc = np.exp(-r * T)
    arith_disc = disc * arith_payoff

    if use_control_variate:
        geo_disc = disc * geo_payoff
        geo_closed = _geometric_asian_closed_form(option_type, S, K, T, r, sigma, q, n_steps)
        cov = float(np.cov(arith_disc, geo_disc, ddof=1)[0, 1])
        var_geo = float(np.var(geo_disc, ddof=1))
        beta = cov / var_geo if var_geo > 0 else 0.0
        controlled = arith_disc - beta * (geo_disc - geo_closed)
        return _summarize(controlled)

    return _summarize(arith_disc)


def _geometric_asian_closed_form(
    option_type: OptionType,
    S: float, K: float, T: float, r: float, sigma: float, q: float, n_steps: int,
) -> float:
    """Closed-form geometric-mean Asian (Kemna-Vorst 1990, discrete monitoring)."""
    n = n_steps
    sigma_g_sq = sigma * sigma * (n + 1) * (2 * n + 1) / (6.0 * n * n)
    mu_g = (r - q - 0.5 * sigma * sigma) * (n + 1) / (2.0 * n) + 0.5 * sigma_g_sq
    sigma_g = float(np.sqrt(sigma_g_sq))
    # Re-cast as Black-Scholes on a synthetic underlying
    d1 = (np.log(S / K) + (mu_g + 0.5 * sigma_g_sq) * T) / (sigma_g * np.sqrt(T))
    d2 = d1 - sigma_g * np.sqrt(T)
    if option_type == "call":
        return float(np.exp(-r * T) * (S * np.exp(mu_g * T) * norm.cdf(d1) - K * norm.cdf(d2)))
    return float(np.exp(-r * T) * (K * norm.cdf(-d2) - S * np.exp(mu_g * T) * norm.cdf(-d1)))


# ---------- Barrier options ----------
def price_barrier(
    option_type: OptionType,
    barrier_type: BarrierType,
    S: float, K: float, H: float, T: float, r: float, sigma: float, q: float = 0.0,
    n_paths: int = DEFAULT_MC_PATHS,
    n_steps: int = DEFAULT_MC_STEPS,
    rebate: float = 0.0,
    seed: int | None = None,
) -> MCResult:
    """Single-barrier European-style knock-in/knock-out.

    H is the barrier level. For discrete-monitoring MC this slightly over-prices
    knock-outs vs the continuous-monitoring closed form (Broadie-Glasserman-Kou
    correction not applied here. leave that to v2).
    """
    rng = np.random.default_rng(seed)
    paths = _gbm_paths(S, r, q, sigma, T, n_paths, n_steps, rng, antithetic=True)
    ST = paths[:, -1]

    path_max = paths.max(axis=1)
    path_min = paths.min(axis=1)

    if barrier_type in ("up-and-out", "up-and-in"):
        touched = path_max >= H
    else:
        touched = path_min <= H

    if option_type == "call":
        terminal = np.maximum(ST - K, 0.0)
    else:
        terminal = np.maximum(K - ST, 0.0)

    if barrier_type.endswith("-in"):
        payoff = np.where(touched, terminal, rebate)
    else:  # knock-out
        payoff = np.where(touched, rebate, terminal)

    disc_payoff = np.exp(-r * T) * payoff
    return _summarize(disc_payoff)
