"""Black-Scholes correctness tests.

Validation strategy:
1. Put-call parity to 1e-6 over 20 random parameter sets.
2. Closed-form Greeks vs finite-difference Greeks to 1e-4.
3. Reference prices vs Hull Table 15.1 (textbook). tight benchmark.
4. Sanity at boundary: T=0 → intrinsic, deep ITM call → S - K*exp(-rT).
"""

from __future__ import annotations

import numpy as np
import pytest

from app.core.constants import GREEK_FD_BUMP_S, GREEK_FD_BUMP_SIGMA
from app.pricing import black_scholes as bs


# ---------- 1. Put-Call Parity ----------
class TestPutCallParity:
    """Parity: C - P = S * exp(-qT) - K * exp(-rT)."""

    def test_parity_holds_across_random_param_sets(self, random_param_sets):
        max_residual = 0.0
        for p in random_param_sets:
            c = bs.price("call", **p)
            put = bs.price("put", **p)
            forward = p["S"] * np.exp(-p["q"] * p["T"]) - p["K"] * np.exp(-p["r"] * p["T"])
            residual = abs((c - put) - forward)
            max_residual = max(max_residual, residual)
            assert residual < 1e-9, f"parity violated by {residual:.2e} for {p}"
        # Report the max for visibility in test output
        assert max_residual < 1e-9


# ---------- 2. Greeks via Finite Difference ----------
class TestGreeksFiniteDifference:
    """Compare closed-form Greeks against central-difference numerics."""

    BASE = {"S": 100.0, "K": 100.0, "T": 0.5, "r": 0.05, "sigma": 0.20, "q": 0.0}

    @pytest.mark.parametrize("option_type", ["call", "put"])
    def test_delta(self, option_type):
        h = self.BASE["S"] * GREEK_FD_BUMP_S
        up = bs.price(option_type, **{**self.BASE, "S": self.BASE["S"] + h})
        dn = bs.price(option_type, **{**self.BASE, "S": self.BASE["S"] - h})
        fd_delta = (up - dn) / (2 * h)
        cf = bs.greeks(option_type, **self.BASE)
        assert abs(cf.delta - fd_delta) < 1e-4

    @pytest.mark.parametrize("option_type", ["call", "put"])
    def test_gamma(self, option_type):
        h = self.BASE["S"] * GREEK_FD_BUMP_S
        up = bs.price(option_type, **{**self.BASE, "S": self.BASE["S"] + h})
        mid = bs.price(option_type, **self.BASE)
        dn = bs.price(option_type, **{**self.BASE, "S": self.BASE["S"] - h})
        fd_gamma = (up - 2 * mid + dn) / (h * h)
        cf = bs.greeks(option_type, **self.BASE)
        assert abs(cf.gamma - fd_gamma) < 1e-4

    @pytest.mark.parametrize("option_type", ["call", "put"])
    def test_vega(self, option_type):
        h = GREEK_FD_BUMP_SIGMA
        up = bs.price(option_type, **{**self.BASE, "sigma": self.BASE["sigma"] + h})
        dn = bs.price(option_type, **{**self.BASE, "sigma": self.BASE["sigma"] - h})
        fd_vega = (up - dn) / (2 * h) * 0.01  # match per-1% scaling
        cf = bs.greeks(option_type, **self.BASE)
        assert abs(cf.vega - fd_vega) < 1e-4

    @pytest.mark.parametrize("option_type", ["call", "put"])
    def test_rho(self, option_type):
        h = 1e-5
        up = bs.price(option_type, **{**self.BASE, "r": self.BASE["r"] + h})
        dn = bs.price(option_type, **{**self.BASE, "r": self.BASE["r"] - h})
        fd_rho = (up - dn) / (2 * h) * 0.01
        cf = bs.greeks(option_type, **self.BASE)
        assert abs(cf.rho - fd_rho) < 1e-4

    @pytest.mark.parametrize("option_type", ["call", "put"])
    def test_theta(self, option_type):
        # Theta = -dV/dT (we report per day)
        h_years = 1 / 365 / 10
        up = bs.price(option_type, **{**self.BASE, "T": self.BASE["T"] + h_years})
        dn = bs.price(option_type, **{**self.BASE, "T": self.BASE["T"] - h_years})
        fd_theta_per_day = -(up - dn) / (2 * h_years) / 365
        cf = bs.greeks(option_type, **self.BASE)
        assert abs(cf.theta - fd_theta_per_day) < 1e-4


# ---------- 3. Reference prices (Hull, "Options, Futures, and Other Derivatives", 11e) ----------
class TestReferencePrices:
    """Hull's worked example, S=42, K=40, r=0.10, sigma=0.20, T=0.5, q=0:
        Call ≈ 4.7594, Put ≈ 0.8086 (Hull Example 15.6)."""

    def test_hull_call(self):
        p = bs.price("call", S=42, K=40, T=0.5, r=0.10, sigma=0.20, q=0.0)
        assert abs(p - 4.7594) < 1e-3

    def test_hull_put(self):
        p = bs.price("put", S=42, K=40, T=0.5, r=0.10, sigma=0.20, q=0.0)
        assert abs(p - 0.8086) < 1e-3


# ---------- 4. Boundary behavior ----------
class TestBoundaries:
    def test_t_zero_call(self):
        assert bs.price("call", S=110, K=100, T=0, r=0.05, sigma=0.2) == pytest.approx(10.0)

    def test_t_zero_put_otm(self):
        assert bs.price("put", S=110, K=100, T=0, r=0.05, sigma=0.2) == pytest.approx(0.0)

    def test_sigma_zero(self):
        # call: max(S*exp(-qT) - K*exp(-rT), 0)
        S, K, T, r, q = 100, 95, 1.0, 0.05, 0.02
        expected = max(S * np.exp(-q * T) - K * np.exp(-r * T), 0)
        assert bs.price("call", S=S, K=K, T=T, r=r, sigma=0, q=q) == pytest.approx(expected, abs=1e-10)

    def test_deep_otm_call_near_zero(self):
        assert bs.price("call", S=50, K=500, T=0.1, r=0.05, sigma=0.2) < 1e-10

    def test_deep_itm_call_intrinsic(self):
        # As sigma → 0 with deep ITM, price → S - K*exp(-rT)
        p = bs.price("call", S=500, K=50, T=0.5, r=0.05, sigma=0.05)
        intrinsic_discounted = 500 - 50 * np.exp(-0.05 * 0.5)
        assert abs(p - intrinsic_discounted) < 0.5  # close, not exact since sigma > 0


# ---------- 5. Vectorized version matches scalar ----------
class TestVectorized:
    def test_vec_matches_scalar(self, random_param_sets):
        for p in random_param_sets[:5]:
            scalar = bs.price("call", **p)
            vec = bs.price_vec("call",
                               np.array([p["S"]]), np.array([p["K"]]), np.array([p["T"]]),
                               p["r"], np.array([p["sigma"]]), p["q"])
            assert abs(vec[0] - scalar) < 1e-12

    def test_vec_handles_broadcast(self):
        # 30 strikes × 30 expiries grid. verifies the surface endpoint shape
        strikes = np.linspace(80, 120, 30)[None, :]    # 1×30
        expiries = np.linspace(0.05, 1.0, 30)[:, None]  # 30×1
        sigma = np.full_like(strikes, 0.20)
        prices = bs.price_vec("call", 100.0, strikes, expiries, 0.05, sigma, 0.0)
        assert prices.shape == (30, 30)
        # Monotone in T (more time → more expensive for ATM-ish call)
        assert (prices[1:, 15] - prices[:-1, 15] >= 0).all()
