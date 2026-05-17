"""POST /price. single-contract pricing via BS / Binomial / MC."""

import time
from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.models.schemas import GreeksSchema, PriceRequest, PriceResponse
from app.pricing import binomial as bn
from app.pricing import black_scholes as bs
from app.pricing import monte_carlo as mc

router = APIRouter(tags=["pricing"])


@router.post("/price", response_model=PriceResponse)
async def price(req: PriceRequest) -> PriceResponse:
    t0 = time.perf_counter()

    if req.method == "black_scholes":
        result = bs.price_and_greeks(
            req.option_type, S=req.S, K=req.K, T=req.T, r=req.r, sigma=req.sigma, q=req.q
        )
        compute_ms = (time.perf_counter() - t0) * 1000.0
        return PriceResponse(
            price=result.price,
            greeks=GreeksSchema(**asdict(result.greeks)),
            method="black_scholes",
            compute_ms=compute_ms,
            stderr=None,
            half_ci_95=None,
        )

    if req.method == "binomial":
        res = bn.price_crr(
            req.option_type, req.style,
            S=req.S, K=req.K, T=req.T, r=req.r, sigma=req.sigma, q=req.q,
            steps=req.binomial_steps,
        )
        # Binomial doesn't yield vega/rho directly. fall back to BS for them
        bs_greeks = bs.greeks(req.option_type, S=req.S, K=req.K, T=req.T, r=req.r, sigma=req.sigma, q=req.q)
        compute_ms = (time.perf_counter() - t0) * 1000.0
        return PriceResponse(
            price=res.price,
            greeks=GreeksSchema(
                delta=res.delta, gamma=res.gamma,
                vega=bs_greeks.vega, theta=res.theta, rho=bs_greeks.rho,
            ),
            method="binomial",
            compute_ms=compute_ms,
            stderr=None,
            half_ci_95=None,
        )

    if req.method == "monte_carlo":
        if req.style != "european":
            raise HTTPException(400, "MC vanilla pricing exposed for European only here; "
                                     "use /price?method=binomial for American.")
        res = mc.price_european(
            req.option_type, S=req.S, K=req.K, T=req.T, r=req.r, sigma=req.sigma, q=req.q,
            n_paths=req.mc_paths, seed=req.mc_seed,
        )
        # Greeks from closed-form (MC for Greeks is its own can of worms)
        bs_greeks = bs.greeks(req.option_type, S=req.S, K=req.K, T=req.T, r=req.r, sigma=req.sigma, q=req.q)
        compute_ms = (time.perf_counter() - t0) * 1000.0
        return PriceResponse(
            price=res.price,
            greeks=GreeksSchema(**asdict(bs_greeks)),
            method="monte_carlo",
            compute_ms=compute_ms,
            stderr=res.stderr,
            half_ci_95=res.half_ci_95,
        )

    raise HTTPException(400, f"unknown method {req.method}")
