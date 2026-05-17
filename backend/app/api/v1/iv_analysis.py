"""GET /iv_analysis/{ticker}. IV vs RV, term structure, skew, vol risk premium."""

from __future__ import annotations

import time
from collections import defaultdict

import numpy as np
from fastapi import APIRouter, HTTPException

from app.core.constants import DEFAULT_RISK_FREE_RATE
from app.data.chain import dte_to_years, fetch_chain
from app.data.historical import compute_rv_stats, fetch_history, realized_vol_series
from app.models.schemas import (
    IVAnalysisResponse,
    SkewPoint,
    TermPoint,
    TimeSeriesPoint,
)
from app.pricing.iv import solve_iv

router = APIRouter(tags=["data"])


@router.get("/iv_analysis/{ticker}", response_model=IVAnalysisResponse)
async def iv_analysis(ticker: str) -> IVAnalysisResponse:
    t0 = time.perf_counter()
    try:
        snap = fetch_chain(ticker)
        history = fetch_history(ticker)
    except RuntimeError as e:
        raise HTTPException(404, str(e))

    rv_stats = compute_rv_stats(history)
    closes = np.array([p.close for p in history])
    dates = [p.date for p in history]

    # ATM IV per expiry. solve for nearest-the-money call & put, average
    by_expiry: dict[str, list[tuple[float, float, str]]] = defaultdict(list)  # strike, mid, type
    for c in snap.contracts:
        if c.mid is None or c.mid <= 0:
            continue
        by_expiry[c.expiry].append((c.strike, c.mid, c.option_type))

    term: list[TermPoint] = []
    atm_iv_30d: float | None = None
    target_dte_30 = 30
    target_diff = float("inf")

    for expiry, contracts in sorted(by_expiry.items()):
        dte_match = [c for c in snap.contracts if c.expiry == expiry]
        if not dte_match:
            continue
        dte = dte_match[0].days_to_expiry
        if dte <= 0:
            continue
        T = dte_to_years(dte)
        # Pick the strike nearest spot, for call & put each
        contracts_sorted = sorted(contracts, key=lambda c: abs(c[0] - snap.spot))
        # Average IV across the 2 nearest contracts (one call + one put if both available)
        ivs: list[float] = []
        for strike, mid, otype in contracts_sorted[:4]:
            res = solve_iv(otype, S=snap.spot, K=strike, T=T, r=DEFAULT_RISK_FREE_RATE,
                           market_price=mid)
            if res.converged and 0.02 < res.iv < 3.0:
                ivs.append(res.iv)
        if ivs:
            atm = float(np.mean(ivs))
            term.append(TermPoint(dte=dte, atm_iv=atm))
            if abs(dte - target_dte_30) < target_diff:
                target_diff = abs(dte - target_dte_30)
                atm_iv_30d = atm

    # Skew at the closest-to-30d expiry
    skew: list[SkewPoint] = []
    if term:
        target_expiry_dte = min((t.dte for t in term), key=lambda d: abs(d - 30))
        for c in snap.contracts:
            if c.days_to_expiry != target_expiry_dte:
                continue
            if c.mid is None or c.mid <= 0:
                continue
            T = dte_to_years(c.days_to_expiry)
            res = solve_iv(c.option_type, S=snap.spot, K=c.strike, T=T, r=DEFAULT_RISK_FREE_RATE,
                           market_price=c.mid)
            if res.converged and 0.02 < res.iv < 3.0:
                skew.append(SkewPoint(
                    strike=c.strike,
                    moneyness=c.strike / snap.spot,
                    iv=res.iv,
                    option_type=c.option_type,
                ))

    # RV series
    rv_dates, rv_vals = realized_vol_series(closes, dates, window=30)
    rv_series = [TimeSeriesPoint(date=d, value=v) for d, v in zip(rv_dates, rv_vals)]
    # IV series: we only have a point-in-time snapshot today. Synthesize a single point.
    iv_series: list[TimeSeriesPoint] = []
    if atm_iv_30d is not None and dates:
        iv_series = [TimeSeriesPoint(date=dates[-1], value=atm_iv_30d)]

    vrp: float | None = None
    if atm_iv_30d is not None and rv_stats.rv_30d is not None:
        vrp = atm_iv_30d - rv_stats.rv_30d

    compute_ms = (time.perf_counter() - t0) * 1000.0
    return IVAnalysisResponse(
        ticker=snap.ticker,
        spot=snap.spot,
        atm_iv_30d=atm_iv_30d,
        rv_30d=rv_stats.rv_30d,
        rv_60d=rv_stats.rv_60d,
        rv_1y=rv_stats.rv_1y,
        vrp=vrp,
        term_structure=term,
        skew_at_30d=skew,
        iv_series=iv_series,
        rv_series=rv_series,
        compute_ms=compute_ms,
    )
