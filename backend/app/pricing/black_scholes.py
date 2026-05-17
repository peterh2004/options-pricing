"""Black-Scholes-Merton closed-form pricer and Greeks.

All functions accept scalar or numpy-array inputs and broadcast naturally.
The Merton extension supports a continuous dividend yield q.

Sign conventions
----------------
- Theta: returned as per-day decay (∂V/∂t with t in days), typically negative for long options.
- Vega: returned per 1% (1 percentage point) change in volatility. i.e. ∂V/∂σ * 0.01.
- Rho: returned per 1% (1 percentage point) change in rate.

These match practitioner conventions used on the frontend cards.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from scipy.stats import norm

from app.core.constants import DAYS_PER_YEAR, PRICE_FLOOR

OptionType = Literal["call", "put"]


@dataclass(frozen=True, slots=True)
class Greeks:
    """All five standard Greeks in practitioner units."""

    delta: float
    gamma: float
    vega: float   # per 1 vol point (0.01 sigma)
    theta: float  # per calendar day
    rho: float    # per 1% rate change


@dataclass(frozen=True, slots=True)
class PriceResult:
    price: float
    greeks: Greeks


def _d1(S: float, K: float, T: float, r: float, sigma: float, q: float) -> float:
    return (np.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * np.sqrt(T))


def _d2(d1: float, sigma: float, T: float) -> float:
    return d1 - sigma * np.sqrt(T)


def price(
    option_type: OptionType,
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    q: float = 0.0,
) -> float:
    """Black-Scholes-Merton price for a European option.

    Handles the T → 0 limit (returns intrinsic) and sigma → 0 limit (returns discounted intrinsic).
    """
    if T <= 0.0:
        if option_type == "call":
            return max(S - K, 0.0)
        return max(K - S, 0.0)
    if sigma <= 0.0:
        forward = S * np.exp(-q * T) - K * np.exp(-r * T)
        return max(forward, 0.0) if option_type == "call" else max(-forward, 0.0)

    d1 = _d1(S, K, T, r, sigma, q)
    d2 = _d2(d1, sigma, T)
    disc_q = np.exp(-q * T)
    disc_r = np.exp(-r * T)
    if option_type == "call":
        return float(S * disc_q * norm.cdf(d1) - K * disc_r * norm.cdf(d2))
    return float(K * disc_r * norm.cdf(-d2) - S * disc_q * norm.cdf(-d1))


def greeks(
    option_type: OptionType,
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    q: float = 0.0,
) -> Greeks:
    """All five Greeks. See module docstring for unit conventions."""
    if T <= 0.0 or sigma <= 0.0:
        return Greeks(delta=0.0, gamma=0.0, vega=0.0, theta=0.0, rho=0.0)

    d1 = _d1(S, K, T, r, sigma, q)
    d2 = _d2(d1, sigma, T)
    disc_q = np.exp(-q * T)
    disc_r = np.exp(-r * T)
    pdf_d1 = norm.pdf(d1)
    sqrtT = np.sqrt(T)

    # Delta
    if option_type == "call":
        delta = disc_q * norm.cdf(d1)
    else:
        delta = disc_q * (norm.cdf(d1) - 1.0)

    # Gamma. independent of option type
    gamma = disc_q * pdf_d1 / (S * sigma * sqrtT)

    # Vega per 1 vol point (= ∂V/∂σ * 0.01)
    vega = S * disc_q * pdf_d1 * sqrtT * 0.01

    # Theta per calendar day (= ∂V/∂t / 365)
    if option_type == "call":
        theta_ann = (
            -(S * disc_q * pdf_d1 * sigma) / (2.0 * sqrtT)
            + q * S * disc_q * norm.cdf(d1)
            - r * K * disc_r * norm.cdf(d2)
        )
    else:
        theta_ann = (
            -(S * disc_q * pdf_d1 * sigma) / (2.0 * sqrtT)
            - q * S * disc_q * norm.cdf(-d1)
            + r * K * disc_r * norm.cdf(-d2)
        )
    theta = theta_ann / DAYS_PER_YEAR

    # Rho per 1% rate change (= ∂V/∂r * 0.01)
    if option_type == "call":
        rho = K * T * disc_r * norm.cdf(d2) * 0.01
    else:
        rho = -K * T * disc_r * norm.cdf(-d2) * 0.01

    return Greeks(
        delta=float(delta),
        gamma=float(gamma),
        vega=float(vega),
        theta=float(theta),
        rho=float(rho),
    )


def price_and_greeks(
    option_type: OptionType,
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    q: float = 0.0,
) -> PriceResult:
    """Returns price + Greeks in a single call. Used by API and strategy aggregation."""
    return PriceResult(
        price=price(option_type, S, K, T, r, sigma, q),
        greeks=greeks(option_type, S, K, T, r, sigma, q),
    )


def vega_raw(S: float, K: float, T: float, r: float, sigma: float, q: float = 0.0) -> float:
    """Vega as ∂V/∂σ (not scaled to 1%). Used by IV solver."""
    if T <= 0.0 or sigma <= 0.0:
        return 0.0
    d1 = _d1(S, K, T, r, sigma, q)
    return float(S * np.exp(-q * T) * norm.pdf(d1) * np.sqrt(T))


def price_vec(
    option_type: OptionType,
    S: np.ndarray,
    K: np.ndarray,
    T: np.ndarray,
    r: float,
    sigma: np.ndarray,
    q: float = 0.0,
) -> np.ndarray:
    """Vectorized price across arrays. broadcasts naturally. Used by the surface endpoint
    to compute a 30x30 grid in <200ms."""
    S = np.asarray(S, dtype=np.float64)
    K = np.asarray(K, dtype=np.float64)
    T = np.asarray(T, dtype=np.float64)
    sigma = np.asarray(sigma, dtype=np.float64)

    with np.errstate(divide="ignore", invalid="ignore"):
        d1 = (np.log(S / K) + (r - q + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        disc_q = np.exp(-q * T)
        disc_r = np.exp(-r * T)
        if option_type == "call":
            out = S * disc_q * norm.cdf(d1) - K * disc_r * norm.cdf(d2)
        else:
            out = K * disc_r * norm.cdf(-d2) - S * disc_q * norm.cdf(-d1)

    # T=0 → intrinsic; sigma=0 → discounted intrinsic
    expired = T <= 0
    if expired.any():
        intrinsic = np.where(option_type == "call",
                             np.maximum(S - K, 0.0),
                             np.maximum(K - S, 0.0))
        out = np.where(expired, intrinsic, out)

    return np.where(out < PRICE_FLOOR, 0.0, out)
