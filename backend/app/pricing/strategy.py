"""Multi-leg strategy pricing, aggregated Greeks, and P&L grid generation.

A strategy is a list of legs; each leg references a strike, expiry (years), option_type,
quantity (positive=long, negative=short), and per-leg implied vol. Greeks are quantity-
weighted sums of per-leg Greeks. The P&L grid evaluates the strategy across a 2D mesh
of (spot, time-to-expiry-of-front-leg) for the strategy-builder heatmap.

Conventions
-----------
- Quantity is signed (+1 long, -1 short). Premium paid is positive, received is negative.
- "Cost basis" = sum over legs of (qty * leg_price). net cash outlay at trade.
- "P&L at evaluation" = (current value at spot, T_eval) - cost_basis.
- The grid value is per-contract; the frontend multiplies by 100 for SPY-style equity options.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import numpy as np

from app.pricing import black_scholes as bs
from app.pricing.black_scholes import Greeks

OptionType = Literal["call", "put"]


@dataclass(frozen=True, slots=True)
class Leg:
    """A single option leg.

    expiry_years is years-to-expiry as of pricing time. quantity is signed.
    """

    option_type: OptionType
    strike: float
    expiry_years: float
    quantity: float
    sigma: float  # leg-specific implied vol


@dataclass(frozen=True, slots=True)
class LegPriced:
    leg: Leg
    price: float
    greeks: Greeks


@dataclass(frozen=True, slots=True)
class StrategyResult:
    legs: list[LegPriced]
    net_price: float        # signed: positive = debit, negative = credit
    net_greeks: Greeks
    cost_basis: float       # alias of net_price kept explicit for clarity


def price_strategy(
    legs: list[Leg], S: float, r: float, q: float = 0.0
) -> StrategyResult:
    """Price every leg and return net Greeks (quantity-weighted sums)."""
    priced: list[LegPriced] = []
    net_delta = 0.0
    net_gamma = 0.0
    net_vega = 0.0
    net_theta = 0.0
    net_rho = 0.0
    net_price = 0.0

    for leg in legs:
        pr = bs.price_and_greeks(
            leg.option_type, S=S, K=leg.strike, T=leg.expiry_years,
            r=r, sigma=leg.sigma, q=q,
        )
        priced.append(LegPriced(leg=leg, price=pr.price, greeks=pr.greeks))
        net_delta += leg.quantity * pr.greeks.delta
        net_gamma += leg.quantity * pr.greeks.gamma
        net_vega += leg.quantity * pr.greeks.vega
        net_theta += leg.quantity * pr.greeks.theta
        net_rho += leg.quantity * pr.greeks.rho
        net_price += leg.quantity * pr.price

    return StrategyResult(
        legs=priced,
        net_price=net_price,
        cost_basis=net_price,
        net_greeks=Greeks(
            delta=net_delta, gamma=net_gamma, vega=net_vega,
            theta=net_theta, rho=net_rho,
        ),
    )


def payoff_at_expiry(legs: list[Leg], S: float) -> float:
    """Intrinsic payoff at the strategy's effective expiry (per leg).

    For a multi-expiry strategy this returns each leg's intrinsic at its own expiry;
    use `pnl_grid` for the full time-aware evaluation.
    """
    total = 0.0
    for leg in legs:
        if leg.option_type == "call":
            payoff = max(S - leg.strike, 0.0)
        else:
            payoff = max(leg.strike - S, 0.0)
        total += leg.quantity * payoff
    return total


def pnl_grid(
    legs: list[Leg],
    S_axis: np.ndarray,
    t_axis: np.ndarray,
    r: float,
    q: float = 0.0,
    *,
    cost_basis: float | None = None,
) -> np.ndarray:
    """Compute P&L over a (spot × time-from-now) grid.

    t_axis is forward time in years from now (0 = today). The remaining time-to-expiry
    for each leg becomes `max(leg.expiry_years - t, 0)`.

    Returns array shape (len(t_axis), len(S_axis)). rows = time, columns = spot.
    """
    S = np.asarray(S_axis, dtype=np.float64)
    t = np.asarray(t_axis, dtype=np.float64)

    if cost_basis is None:
        # Use today's value as the cost basis (must be priced at a reference spot)
        ref_spot = float(S[len(S) // 2])
        cost_basis = price_strategy(legs, S=ref_spot, r=r, q=q).net_price

    grid = np.zeros((t.size, S.size), dtype=np.float64)

    for leg in legs:
        # For each time slice, leg's remaining TTE is reduced; if t > leg expiry → intrinsic at S
        for i, t_now in enumerate(t):
            remaining = leg.expiry_years - t_now
            if remaining <= 0:
                if leg.option_type == "call":
                    leg_vals = np.maximum(S - leg.strike, 0.0)
                else:
                    leg_vals = np.maximum(leg.strike - S, 0.0)
            else:
                sigma_arr = np.full_like(S, leg.sigma)
                leg_vals = bs.price_vec(
                    leg.option_type, S, np.full_like(S, leg.strike),
                    np.full_like(S, remaining), r, sigma_arr, q,
                )
            grid[i, :] += leg.quantity * leg_vals

    return grid - cost_basis


def breakeven_spots(
    legs: list[Leg], r: float, q: float = 0.0, *,
    spot_min: float | None = None, spot_max: float | None = None,
    n_points: int = 2000,
) -> list[float]:
    """Find spots at expiry where the strategy P&L crosses zero.

    Uses sign changes on a dense expiry-payoff grid centered on average strike.
    """
    strikes = [leg.strike for leg in legs]
    center = float(np.mean(strikes))
    if spot_min is None:
        spot_min = 0.5 * center
    if spot_max is None:
        spot_max = 1.5 * center

    # Compute cost basis at center spot, using each leg's initial price
    cost = sum(
        leg.quantity * bs.price(
            leg.option_type, S=center, K=leg.strike, T=leg.expiry_years,
            r=r, sigma=leg.sigma, q=q,
        )
        for leg in legs
    )

    S = np.linspace(spot_min, spot_max, n_points)
    payoff = np.array([payoff_at_expiry(legs, float(s)) for s in S]) - cost
    crossings: list[float] = []
    for i in range(1, len(S)):
        if payoff[i - 1] == 0:
            crossings.append(float(S[i - 1]))
        elif payoff[i - 1] * payoff[i] < 0:
            # Linear interpolate
            x0, x1 = S[i - 1], S[i]
            y0, y1 = payoff[i - 1], payoff[i]
            crossings.append(float(x0 - y0 * (x1 - x0) / (y1 - y0)))
    return crossings


def max_profit_loss(
    legs: list[Leg], r: float, q: float = 0.0, *,
    spot_min: float | None = None, spot_max: float | None = None,
    n_points: int = 5000,
) -> tuple[float, float]:
    """Best/worst case P&L at expiry across a dense spot grid.

    For unbounded strategies (e.g., naked short call) this returns the worst observed
    value over the grid. callers should interpret accordingly.
    """
    strikes = [leg.strike for leg in legs]
    center = float(np.mean(strikes))
    if spot_min is None:
        spot_min = 0.5 * center
    if spot_max is None:
        spot_max = 1.5 * center
    cost = sum(
        leg.quantity * bs.price(
            leg.option_type, S=center, K=leg.strike, T=leg.expiry_years,
            r=r, sigma=leg.sigma, q=q,
        )
        for leg in legs
    )
    S = np.linspace(spot_min, spot_max, n_points)
    payoff = np.array([payoff_at_expiry(legs, float(s)) for s in S]) - cost
    return float(payoff.max()), float(payoff.min())
