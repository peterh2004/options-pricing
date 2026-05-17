"""Options chain fetcher: yfinance + SQLite cache.

Returns a normalized list of contracts so the API contract is stable regardless
of upstream column changes. yfinance occasionally returns empty frames or null
spots. we propagate that as a clear error rather than failing silently.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from typing import Any, Literal

import pandas as pd
import yfinance as yf

from app.core.constants import CHAIN_CACHE_TTL_SECONDS, DAYS_PER_YEAR
from app.data.db import cache_get, cache_put_chain

OptionType = Literal["call", "put"]


@dataclass(frozen=True, slots=True)
class Contract:
    contract_symbol: str
    option_type: OptionType
    strike: float
    expiry: str           # ISO YYYY-MM-DD
    days_to_expiry: int
    bid: float | None
    ask: float | None
    last: float | None
    mid: float | None
    volume: int | None
    open_interest: int | None
    implied_volatility: float | None  # yfinance's IV (vendor-supplied, often unreliable)


@dataclass(frozen=True, slots=True)
class ChainSnapshot:
    ticker: str
    spot: float
    fetched_at: str       # ISO datetime UTC
    contracts: list[Contract]


def _mid(bid: float | None, ask: float | None, last: float | None) -> float | None:
    if bid is not None and ask is not None and bid > 0 and ask > bid:
        return (bid + ask) / 2.0
    return last


def _normalize_row(row: pd.Series, option_type: OptionType, expiry: str, today: date) -> Contract:
    expiry_date = datetime.strptime(expiry, "%Y-%m-%d").date()
    dte = max((expiry_date - today).days, 0)
    bid = float(row["bid"]) if pd.notna(row.get("bid")) and row["bid"] > 0 else None
    ask = float(row["ask"]) if pd.notna(row.get("ask")) and row["ask"] > 0 else None
    last = float(row["lastPrice"]) if pd.notna(row.get("lastPrice")) else None
    vol = int(row["volume"]) if pd.notna(row.get("volume")) else None
    oi = int(row["openInterest"]) if pd.notna(row.get("openInterest")) else None
    iv = float(row["impliedVolatility"]) if pd.notna(row.get("impliedVolatility")) else None
    return Contract(
        contract_symbol=str(row["contractSymbol"]),
        option_type=option_type,
        strike=float(row["strike"]),
        expiry=expiry,
        days_to_expiry=dte,
        bid=bid,
        ask=ask,
        last=last,
        mid=_mid(bid, ask, last),
        volume=vol,
        open_interest=oi,
        implied_volatility=iv,
    )


def fetch_chain(
    ticker: str,
    *,
    use_cache: bool = True,
    max_expiries: int = 12,
) -> ChainSnapshot:
    """Fetch the full option chain for a ticker. Cached for `CHAIN_CACHE_TTL_SECONDS`."""
    ticker_u = ticker.upper()

    if use_cache:
        hit = cache_get("chain_cache", ticker_u, CHAIN_CACHE_TTL_SECONDS)
        if hit is not None:
            data = json.loads(hit["chain_json"])
            return ChainSnapshot(
                ticker=ticker_u,
                spot=float(hit["spot"]),
                fetched_at=datetime.fromtimestamp(hit["fetched_at"], tz=timezone.utc).isoformat(),
                contracts=[Contract(**c) for c in data],
            )

    yt = yf.Ticker(ticker_u)

    # Spot. fast_info preferred for liveness; fall back to last close
    spot: float
    try:
        spot = float(yt.fast_info["last_price"])
    except (KeyError, AttributeError, TypeError):
        hist = yt.history(period="1d")
        if hist.empty:
            raise RuntimeError(f"no price data for {ticker_u}")
        spot = float(hist["Close"].iloc[-1])

    expiries = list(yt.options or [])[:max_expiries]
    if not expiries:
        raise RuntimeError(f"no option expiries available for {ticker_u}")

    today = datetime.now(tz=timezone.utc).date()
    contracts: list[Contract] = []

    for exp in expiries:
        try:
            chain = yt.option_chain(exp)
        except Exception:
            continue
        for _, row in chain.calls.iterrows():
            contracts.append(_normalize_row(row, "call", exp, today))
        for _, row in chain.puts.iterrows():
            contracts.append(_normalize_row(row, "put", exp, today))

    # Cache (store as dicts for JSON)
    cache_put_chain(
        ticker_u, spot, [asdict(c) for c in contracts],
    )

    return ChainSnapshot(
        ticker=ticker_u,
        spot=spot,
        fetched_at=datetime.now(tz=timezone.utc).isoformat(),
        contracts=contracts,
    )


def filter_by_moneyness_and_dte(
    snapshot: ChainSnapshot,
    *,
    option_type: OptionType | None = None,
    moneyness_min: float = 0.85,
    moneyness_max: float = 1.15,
    dte_min: int = 1,
    dte_max: int = 365,
) -> list[Contract]:
    """Return contracts within the requested moneyness × DTE window."""
    out: list[Contract] = []
    for c in snapshot.contracts:
        if option_type and c.option_type != option_type:
            continue
        m = c.strike / snapshot.spot
        if not (moneyness_min <= m <= moneyness_max):
            continue
        if not (dte_min <= c.days_to_expiry <= dte_max):
            continue
        out.append(c)
    return out


def dte_to_years(days: int) -> float:
    """Convert calendar days to ACT/365 year fraction."""
    return max(days, 0) / DAYS_PER_YEAR
