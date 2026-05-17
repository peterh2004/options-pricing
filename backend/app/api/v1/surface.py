"""POST /surface. volatility surface for a ticker.

Pipeline:
  1. Fetch chain (cached).
  2. Filter to the requested option type + moneyness/DTE window.
  3. Solve implied vol per contract (Newton-Raphson with bisection fallback).
  4. Interpolate to a regular (moneyness × DTE) grid via radial-basis function smoothing
     (scipy.interpolate.griddata with linear method, NaN-filled for the convex hull).
  5. Return the grid + stats.
"""

from __future__ import annotations

import time

import numpy as np
from fastapi import APIRouter, HTTPException
from scipy.interpolate import griddata

from app.core.constants import DEFAULT_RISK_FREE_RATE
from app.data.chain import dte_to_years, fetch_chain, filter_by_moneyness_and_dte
from app.models.schemas import SurfaceRequest, SurfaceResponse
from app.pricing.iv import solve_iv

router = APIRouter(tags=["data"])


@router.post("/surface", response_model=SurfaceResponse)
async def surface(req: SurfaceRequest) -> SurfaceResponse:
    t0 = time.perf_counter()
    try:
        snap = fetch_chain(req.ticker)
    except RuntimeError as e:
        raise HTTPException(404, str(e))

    r = req.r if req.r is not None else DEFAULT_RISK_FREE_RATE
    filtered = filter_by_moneyness_and_dte(
        snap,
        option_type=req.option_type,
        moneyness_min=req.moneyness_min,
        moneyness_max=req.moneyness_max,
        dte_min=req.dte_min,
        dte_max=req.dte_max,
    )

    if not filtered:
        raise HTTPException(404, "no contracts in the requested window")

    # Solve IV for each contract (use mid price)
    points: list[tuple[float, float, float]] = []  # (moneyness, dte, iv)
    converged = 0
    attempted = 0
    iv_values: list[float] = []
    for c in filtered:
        if c.mid is None or c.mid <= 0:
            continue
        attempted += 1
        T = dte_to_years(c.days_to_expiry)
        if T <= 0:
            continue
        res = solve_iv(c.option_type, S=snap.spot, K=c.strike, T=T, r=r, market_price=c.mid)
        if res.converged and 0.01 < res.iv < 5.0:
            converged += 1
            iv_values.append(res.iv)
            points.append((c.strike / snap.spot, float(c.days_to_expiry), res.iv))

    if len(points) < 8:
        raise HTTPException(422, f"too few converged IV points ({len(points)}) to build a surface")

    # Interpolate to grid
    money_axis = np.linspace(req.moneyness_min, req.moneyness_max, req.n_moneyness)
    dte_axis = np.linspace(req.dte_min, req.dte_max, req.n_dte)
    MM, DD = np.meshgrid(money_axis, dte_axis)
    pts = np.array([(p[0], p[1]) for p in points])
    vals = np.array([p[2] for p in points])
    grid = griddata(pts, vals, (MM, DD), method="linear")

    # ATM 30d IV. point estimate
    atm_iv_30d = _atm_iv_at(grid, money_axis, dte_axis, 30)

    iv_grid: list[list[float | None]] = [
        [None if (v != v) else float(v) for v in row]
        for row in grid
    ]
    iv_min = float(min(iv_values))
    iv_max = float(max(iv_values))
    conv_rate = converged / max(attempted, 1)
    compute_ms = (time.perf_counter() - t0) * 1000.0

    return SurfaceResponse(
        ticker=snap.ticker,
        spot=snap.spot,
        option_type=req.option_type,
        moneyness_axis=[float(x) for x in money_axis],
        dte_axis=[int(round(x)) for x in dte_axis],
        iv_grid=iv_grid,
        atm_iv_30d=atm_iv_30d,
        iv_min=iv_min,
        iv_max=iv_max,
        contracts_used=converged,
        convergence_rate=conv_rate,
        compute_ms=compute_ms,
    )


def _atm_iv_at(grid: np.ndarray, money_axis: np.ndarray, dte_axis: np.ndarray, target_dte: int) -> float | None:
    """Bilinear-ish pick at moneyness ≈ 1.0, DTE ≈ target."""
    m_idx = int(np.argmin(np.abs(money_axis - 1.0)))
    d_idx = int(np.argmin(np.abs(dte_axis - target_dte)))
    v = grid[d_idx, m_idx]
    if v != v:  # NaN
        return None
    return float(v)
