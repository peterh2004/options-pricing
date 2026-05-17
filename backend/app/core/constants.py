"""Named constants used across the pricing engine. No magic numbers anywhere else."""

from typing import Final

# ---------- Numerical tolerances ----------
PRICE_FLOOR: Final[float] = 1e-12
"""Smallest meaningful price; values below this are treated as zero."""

IV_TOLERANCE: Final[float] = 1e-6
"""Newton-Raphson stopping criterion on |f(sigma) - market| / market."""

IV_MAX_ITER: Final[int] = 64
"""Maximum Newton iterations before falling back to bisection."""

BISECTION_MAX_ITER: Final[int] = 100
"""Maximum bisection iterations for IV fallback."""

VEGA_FLOOR: Final[float] = 1e-7
"""If |vega| falls below this during Newton step, switch to bisection (low-vega regime)."""

GREEK_FD_BUMP_S: Final[float] = 1e-3
"""Relative bump for finite-difference delta/gamma checks (test-only)."""

GREEK_FD_BUMP_SIGMA: Final[float] = 1e-4
"""Absolute bump for finite-difference vega checks (test-only)."""

# ---------- Defaults ----------
DEFAULT_RISK_FREE_RATE: Final[float] = 0.04288
"""3-month T-bill yield used as risk-free default when caller omits r."""

DEFAULT_DIVIDEND_YIELD: Final[float] = 0.0
"""Continuous dividend yield default (overridable per request)."""

DEFAULT_BINOMIAL_STEPS: Final[int] = 500
"""Steps for CRR binomial tree. 500 gives <1bp error vs closed-form for European."""

DEFAULT_MC_PATHS: Final[int] = 10_000
"""Default Monte Carlo path count. 10k antithetic gives ~0.03 std error at typical vols."""

DEFAULT_MC_STEPS: Final[int] = 252
"""Daily time stepping for path-dependent payoffs."""

# ---------- IV solver initial guess ----------
IV_INITIAL_GUESS: Final[float] = 0.2
"""Brenner-Subrahmanyam-style starting volatility for Newton iteration."""

IV_BISECTION_LOW: Final[float] = 1e-4
IV_BISECTION_HIGH: Final[float] = 5.0
"""Bisection bracket [0.01bp vol, 500% vol]. wide enough to encompass any sane market quote."""

# ---------- Time conventions ----------
DAYS_PER_YEAR: Final[int] = 365
"""Calendar-day year. Used for converting DTE → year fraction in API contracts."""

TRADING_DAYS_PER_YEAR: Final[int] = 252
"""Trading-day year. Used in realized-volatility annualization only."""

# ---------- Cache ----------
CHAIN_CACHE_TTL_SECONDS: Final[int] = 60 * 5
"""Option chain cache TTL. 5 minutes for live trading hours."""

HISTORICAL_CACHE_TTL_SECONDS: Final[int] = 60 * 60 * 24
"""Historical price cache TTL. 24h, refreshed nightly."""
