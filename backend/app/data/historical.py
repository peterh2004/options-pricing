"""Historical price fetcher + realized-volatility computation."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import yfinance as yf

from app.core.constants import HISTORICAL_CACHE_TTL_SECONDS, TRADING_DAYS_PER_YEAR
from app.data.db import cache_get, cache_put_history


@dataclass(frozen=True, slots=True)
class HistoryPoint:
    date: str  # YYYY-MM-DD
    close: float


@dataclass(frozen=True, slots=True)
class RealizedVolStats:
    rv_30d: float | None
    rv_60d: float | None
    rv_1y: float | None
    samples_30d: int
    samples_60d: int
    samples_1y: int


def fetch_history(ticker: str, *, period: str = "2y", use_cache: bool = True) -> list[HistoryPoint]:
    ticker_u = ticker.upper()
    if use_cache:
        hit = cache_get("history_cache", ticker_u, HISTORICAL_CACHE_TTL_SECONDS)
        if hit is not None:
            data = json.loads(hit["history_json"])
            return [HistoryPoint(**p) for p in data]

    yt = yf.Ticker(ticker_u)
    hist = yt.history(period=period, auto_adjust=True)
    if hist.empty:
        raise RuntimeError(f"no history for {ticker_u}")

    points = [
        HistoryPoint(date=idx.strftime("%Y-%m-%d"), close=float(row["Close"]))
        for idx, row in hist.iterrows()
    ]
    cache_put_history(ticker_u, [asdict(p) for p in points])
    return points


def realized_vol(closes: np.ndarray, window: int) -> float | None:
    """Close-to-close annualized realized volatility over the last `window` days.

    Uses log returns; annualized with sqrt(TRADING_DAYS_PER_YEAR). Returns None if
    we don't have enough samples.
    """
    if len(closes) < window + 1:
        return None
    recent = closes[-(window + 1):]
    log_rets = np.diff(np.log(recent))
    return float(log_rets.std(ddof=1) * np.sqrt(TRADING_DAYS_PER_YEAR))


def realized_vol_series(closes: np.ndarray, dates: list[str], window: int = 30) -> tuple[list[str], list[float]]:
    """Rolling realized-vol time series. one value per day after warm-up."""
    if len(closes) < window + 1:
        return [], []
    log_rets = np.diff(np.log(closes))
    out_dates: list[str] = []
    out_vals: list[float] = []
    annualizer = float(np.sqrt(TRADING_DAYS_PER_YEAR))
    for i in range(window, len(log_rets) + 1):
        window_rets = log_rets[i - window : i]
        out_dates.append(dates[i])  # date of the last close in the window
        out_vals.append(float(window_rets.std(ddof=1) * annualizer))
    return out_dates, out_vals


def compute_rv_stats(history: list[HistoryPoint]) -> RealizedVolStats:
    closes = np.array([p.close for p in history], dtype=np.float64)
    return RealizedVolStats(
        rv_30d=realized_vol(closes, 30),
        rv_60d=realized_vol(closes, 60),
        rv_1y=realized_vol(closes, 252),
        samples_30d=min(30, max(len(closes) - 1, 0)),
        samples_60d=min(60, max(len(closes) - 1, 0)),
        samples_1y=min(252, max(len(closes) - 1, 0)),
    )
