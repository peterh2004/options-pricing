"""API request/response schemas. Single source of truth; the frontend mirrors via Zod."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

OptionType = Literal["call", "put"]
ExerciseStyle = Literal["european", "american"]
PricingMethod = Literal["black_scholes", "binomial", "monte_carlo"]


class GreeksSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    delta: float
    gamma: float
    vega: float = Field(..., description="Per 1 vol pt (0.01 sigma)")
    theta: float = Field(..., description="Per calendar day")
    rho: float = Field(..., description="Per 1% rate change")


# ---------- /price ----------
class PriceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    option_type: OptionType
    style: ExerciseStyle = "european"
    S: float = Field(..., gt=0, description="Spot")
    K: float = Field(..., gt=0, description="Strike")
    T: float = Field(..., ge=0, description="Time to expiry in years")
    r: float = Field(..., description="Annualized risk-free rate (decimal, e.g. 0.04)")
    sigma: float = Field(..., gt=0, description="Volatility (decimal, e.g. 0.20)")
    q: float = 0.0
    method: PricingMethod = "black_scholes"
    binomial_steps: int = Field(500, ge=10, le=5000)
    mc_paths: int = Field(10_000, ge=1_000, le=1_000_000)
    mc_seed: int | None = None


class PriceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    price: float
    greeks: GreeksSchema
    method: PricingMethod
    compute_ms: float
    stderr: float | None = None
    half_ci_95: float | None = None


# ---------- /iv ----------
class IVRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    option_type: OptionType
    S: float = Field(..., gt=0)
    K: float = Field(..., gt=0)
    T: float = Field(..., gt=0)
    r: float
    market_price: float = Field(..., gt=0)
    q: float = 0.0
    initial_guess: float = 0.2


class IVResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    iv: float | None
    iterations: int
    converged: bool
    method: Literal["newton", "bisection", "hybrid", "failed"]
    residual: float | None
    compute_ms: float


# ---------- /chain ----------
class ContractSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    contract_symbol: str
    option_type: OptionType
    strike: float
    expiry: str
    days_to_expiry: int
    bid: float | None
    ask: float | None
    last: float | None
    mid: float | None
    volume: int | None
    open_interest: int | None
    implied_volatility: float | None


class ChainResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ticker: str
    spot: float
    fetched_at: str
    contracts: list[ContractSchema]
    compute_ms: float


# ---------- /surface ----------
class SurfaceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ticker: str
    option_type: OptionType = "call"
    moneyness_min: float = 0.85
    moneyness_max: float = 1.15
    dte_min: int = 7
    dte_max: int = 365
    n_moneyness: int = Field(30, ge=5, le=100)
    n_dte: int = Field(30, ge=5, le=100)
    r: float | None = None  # default from constants if omitted


class SurfaceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ticker: str
    spot: float
    option_type: OptionType
    moneyness_axis: list[float]
    dte_axis: list[int]
    iv_grid: list[list[float | None]]  # rows = dte, cols = moneyness
    atm_iv_30d: float | None
    iv_min: float | None
    iv_max: float | None
    contracts_used: int
    convergence_rate: float
    compute_ms: float


# ---------- /strategy ----------
class LegSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    option_type: OptionType
    strike: float = Field(..., gt=0)
    expiry_years: float = Field(..., gt=0)
    quantity: float  # signed
    sigma: float = Field(..., gt=0)


class LegPricedSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")
    leg: LegSchema
    price: float
    greeks: GreeksSchema


class StrategyPriceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    legs: list[LegSchema] = Field(..., min_length=1, max_length=12)
    S: float = Field(..., gt=0)
    r: float
    q: float = 0.0


class StrategyPriceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    legs: list[LegPricedSchema]
    net_price: float
    net_greeks: GreeksSchema
    cost_basis: float
    max_profit: float
    max_loss: float
    breakevens: list[float]
    compute_ms: float


class StrategyPnlRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    legs: list[LegSchema] = Field(..., min_length=1, max_length=12)
    S_min: float = Field(..., gt=0)
    S_max: float = Field(..., gt=0)
    n_S: int = Field(40, ge=5, le=200)
    t_max_years: float = Field(..., gt=0)
    n_t: int = Field(20, ge=2, le=100)
    r: float
    q: float = 0.0
    cost_basis: float | None = None


class StrategyPnlResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    S_axis: list[float]
    t_axis: list[float]
    grid: list[list[float]]
    compute_ms: float


# ---------- /iv_analysis ----------
class TermPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dte: int
    atm_iv: float


class SkewPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    strike: float
    moneyness: float
    iv: float
    option_type: OptionType


class TimeSeriesPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: str
    value: float


class IVAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ticker: str
    spot: float
    atm_iv_30d: float | None
    rv_30d: float | None
    rv_60d: float | None
    rv_1y: float | None
    vrp: float | None  # IV - RV (30d)
    term_structure: list[TermPoint]
    skew_at_30d: list[SkewPoint]
    iv_series: list[TimeSeriesPoint]
    rv_series: list[TimeSeriesPoint]
    compute_ms: float


# ---------- /health ----------
class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["ok"]
    version: str
    uptime_seconds: float
