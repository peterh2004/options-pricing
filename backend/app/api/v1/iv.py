"""POST /iv. implied volatility solver."""

import time

from fastapi import APIRouter

from app.models.schemas import IVRequest, IVResponse
from app.pricing.iv import solve_iv

router = APIRouter(tags=["pricing"])


@router.post("/iv", response_model=IVResponse)
async def implied_vol(req: IVRequest) -> IVResponse:
    t0 = time.perf_counter()
    res = solve_iv(
        req.option_type, S=req.S, K=req.K, T=req.T, r=req.r,
        market_price=req.market_price, q=req.q, initial_guess=req.initial_guess,
    )
    compute_ms = (time.perf_counter() - t0) * 1000.0
    return IVResponse(
        iv=None if (res.iv != res.iv) else res.iv,  # NaN check
        iterations=res.iterations,
        converged=res.converged,
        method=res.method,
        residual=None if (res.residual != res.residual) else res.residual,
        compute_ms=compute_ms,
    )
