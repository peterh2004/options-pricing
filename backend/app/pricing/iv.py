"""Implied volatility solver.

Newton-Raphson primary method with bisection fallback for low-vega regions
(deep ITM/OTM where the price function is flat in sigma).

Returns: implied_vol, iterations, converged (bool), method ("newton"|"bisection"|"hybrid")
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

from app.core.constants import (
    BISECTION_MAX_ITER,
    IV_BISECTION_HIGH,
    IV_BISECTION_LOW,
    IV_INITIAL_GUESS,
    IV_MAX_ITER,
    IV_TOLERANCE,
    VEGA_FLOOR,
)
from app.pricing.black_scholes import price as bs_price
from app.pricing.black_scholes import vega_raw

OptionType = Literal["call", "put"]
SolverMethod = Literal["newton", "bisection", "hybrid", "failed"]


@dataclass(frozen=True, slots=True)
class IVResult:
    iv: float
    iterations: int
    converged: bool
    method: SolverMethod
    residual: float


def _intrinsic(option_type: OptionType, S: float, K: float, r: float, T: float, q: float) -> float:
    """Lower no-arbitrage bound on the option price."""
    forward = S * np.exp(-q * T) - K * np.exp(-r * T)
    if option_type == "call":
        return max(forward, 0.0)
    return max(-forward, 0.0)


def _upper_bound(option_type: OptionType, S: float, K: float, r: float, T: float, q: float) -> float:
    """Upper no-arbitrage bound."""
    if option_type == "call":
        return S * np.exp(-q * T)
    return K * np.exp(-r * T)


def solve_iv(
    option_type: OptionType,
    S: float,
    K: float,
    T: float,
    r: float,
    market_price: float,
    q: float = 0.0,
    initial_guess: float = IV_INITIAL_GUESS,
    tol: float = IV_TOLERANCE,
    max_iter: int = IV_MAX_ITER,
) -> IVResult:
    """Newton-Raphson with bisection fallback.

    The solver:
      1. Checks no-arbitrage bounds. If price is outside, returns non-converged.
      2. Tries Newton-Raphson; if vega ever drops below VEGA_FLOOR mid-iteration,
         switches to bisection (the result.method becomes "hybrid").
      3. Pure bisection takes over if Newton fails entirely.
    """
    # No-arb sanity
    lower = _intrinsic(option_type, S, K, r, T, q)
    upper = _upper_bound(option_type, S, K, r, T, q)
    if market_price < lower - 1e-10 or market_price > upper + 1e-10:
        return IVResult(iv=float("nan"), iterations=0, converged=False, method="failed",
                        residual=float("inf"))
    if T <= 0.0:
        return IVResult(iv=float("nan"), iterations=0, converged=False, method="failed",
                        residual=float("inf"))

    # ---- Newton-Raphson ----
    sigma = max(initial_guess, 1e-3)
    used_bisection = False
    for k in range(1, max_iter + 1):
        p = bs_price(option_type, S, K, T, r, sigma, q)
        diff = p - market_price
        if abs(diff) < tol * max(market_price, 1e-6):
            return IVResult(iv=sigma, iterations=k, converged=True,
                            method="hybrid" if used_bisection else "newton",
                            residual=abs(diff))
        v = vega_raw(S, K, T, r, sigma, q)
        if v < VEGA_FLOOR:
            used_bisection = True
            break
        sigma -= diff / v
        # Keep sigma in a sensible range; bisection will handle pathological cases
        if not (1e-6 < sigma < 10.0):
            used_bisection = True
            break

    # ---- Bisection fallback ----
    if used_bisection or True:  # only entered if Newton didn't converge
        lo, hi = IV_BISECTION_LOW, IV_BISECTION_HIGH
        p_lo = bs_price(option_type, S, K, T, r, lo, q)
        p_hi = bs_price(option_type, S, K, T, r, hi, q)
        # Price is monotone increasing in sigma, so:
        if not (p_lo - tol <= market_price <= p_hi + tol):
            return IVResult(iv=float("nan"), iterations=max_iter, converged=False, method="failed",
                            residual=abs(market_price - (p_lo if abs(market_price - p_lo) < abs(market_price - p_hi) else p_hi)))

        for k in range(1, BISECTION_MAX_ITER + 1):
            mid = 0.5 * (lo + hi)
            p_mid = bs_price(option_type, S, K, T, r, mid, q)
            if abs(p_mid - market_price) < tol * max(market_price, 1e-6):
                return IVResult(iv=mid, iterations=k + (k if used_bisection else 0),
                                converged=True,
                                method="hybrid" if used_bisection else "bisection",
                                residual=abs(p_mid - market_price))
            if p_mid < market_price:
                lo = mid
            else:
                hi = mid

        # Best-effort
        mid = 0.5 * (lo + hi)
        return IVResult(iv=mid, iterations=BISECTION_MAX_ITER, converged=False,
                        method="hybrid" if used_bisection else "bisection",
                        residual=abs(bs_price(option_type, S, K, T, r, mid, q) - market_price))

    # Unreachable
    return IVResult(iv=float("nan"), iterations=0, converged=False, method="failed",
                    residual=float("inf"))
