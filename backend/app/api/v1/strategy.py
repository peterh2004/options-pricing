"""POST /strategy/price and POST /strategy/pnl. multi-leg analytics."""

import time
from dataclasses import asdict

import numpy as np
from fastapi import APIRouter

from app.models.schemas import (
    GreeksSchema,
    LegPricedSchema,
    LegSchema,
    StrategyPnlRequest,
    StrategyPnlResponse,
    StrategyPriceRequest,
    StrategyPriceResponse,
)
from app.pricing import strategy as st

router = APIRouter(tags=["strategy"], prefix="/strategy")


def _to_leg(s: LegSchema) -> st.Leg:
    return st.Leg(
        option_type=s.option_type,
        strike=s.strike,
        expiry_years=s.expiry_years,
        quantity=s.quantity,
        sigma=s.sigma,
    )


@router.post("/price", response_model=StrategyPriceResponse)
async def strategy_price(req: StrategyPriceRequest) -> StrategyPriceResponse:
    t0 = time.perf_counter()
    legs = [_to_leg(l) for l in req.legs]
    res = st.price_strategy(legs, S=req.S, r=req.r, q=req.q)
    max_profit, max_loss = st.max_profit_loss(legs, r=req.r, q=req.q)
    be = st.breakeven_spots(legs, r=req.r, q=req.q)
    compute_ms = (time.perf_counter() - t0) * 1000.0
    return StrategyPriceResponse(
        legs=[
            LegPricedSchema(
                leg=req.legs[i],
                price=lp.price,
                greeks=GreeksSchema(**asdict(lp.greeks)),
            )
            for i, lp in enumerate(res.legs)
        ],
        net_price=res.net_price,
        net_greeks=GreeksSchema(**asdict(res.net_greeks)),
        cost_basis=res.cost_basis,
        max_profit=max_profit,
        max_loss=max_loss,
        breakevens=be,
        compute_ms=compute_ms,
    )


@router.post("/pnl", response_model=StrategyPnlResponse)
async def strategy_pnl(req: StrategyPnlRequest) -> StrategyPnlResponse:
    t0 = time.perf_counter()
    legs = [_to_leg(l) for l in req.legs]
    S_axis = np.linspace(req.S_min, req.S_max, req.n_S)
    t_axis = np.linspace(0.0, req.t_max_years, req.n_t)
    grid = st.pnl_grid(legs, S_axis, t_axis, r=req.r, q=req.q, cost_basis=req.cost_basis)
    compute_ms = (time.perf_counter() - t0) * 1000.0
    return StrategyPnlResponse(
        S_axis=[float(x) for x in S_axis],
        t_axis=[float(x) for x in t_axis],
        grid=grid.tolist(),
        compute_ms=compute_ms,
    )
