"""GET /chain/{ticker}. full options chain."""

import time
from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.data.chain import fetch_chain
from app.models.schemas import ChainResponse, ContractSchema

router = APIRouter(tags=["data"])


@router.get("/chain/{ticker}", response_model=ChainResponse)
async def chain(ticker: str) -> ChainResponse:
    t0 = time.perf_counter()
    try:
        snap = fetch_chain(ticker)
    except RuntimeError as e:
        raise HTTPException(404, str(e))
    compute_ms = (time.perf_counter() - t0) * 1000.0
    return ChainResponse(
        ticker=snap.ticker,
        spot=snap.spot,
        fetched_at=snap.fetched_at,
        contracts=[ContractSchema(**asdict(c)) for c in snap.contracts],
        compute_ms=compute_ms,
    )
