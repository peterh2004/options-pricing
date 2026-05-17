"""Binomial CRR tests:
1. European prices converge to Black-Scholes as n→∞.
2. American call (no dividend) equals European call.
3. American put (no dividend) ≥ European put (early-exercise premium).
4. Delta & gamma match BS to looser tolerance (tree-level convergence).
"""

import pytest

from app.pricing import binomial as bn
from app.pricing import black_scholes as bs


class TestEuropeanConvergence:
    """Hull example: S=42, K=40, r=0.10, sigma=0.20, T=0.5 → BS call 4.7594."""

    def test_european_call_converges_to_bs(self):
        bs_price = bs.price("call", S=42, K=40, T=0.5, r=0.10, sigma=0.20)
        for n in [50, 200, 500]:
            res = bn.price_crr("call", "european", S=42, K=40, T=0.5, r=0.10, sigma=0.20, steps=n)
            tol = 0.05 if n < 100 else 0.01
            assert abs(res.price - bs_price) < tol, f"n={n}: {res.price} vs {bs_price}"

    def test_european_put_converges_to_bs(self):
        bs_price = bs.price("put", S=42, K=40, T=0.5, r=0.10, sigma=0.20)
        res = bn.price_crr("put", "european", S=42, K=40, T=0.5, r=0.10, sigma=0.20, steps=500)
        assert abs(res.price - bs_price) < 0.01


class TestAmerican:
    """Classic results for American options."""

    def test_american_call_no_div_equals_european(self):
        # When q=0, never optimal to early-exercise an American call (Merton)
        eu = bn.price_crr("call", "european", S=100, K=100, T=1.0, r=0.05, sigma=0.25, steps=300)
        am = bn.price_crr("call", "american", S=100, K=100, T=1.0, r=0.05, sigma=0.25, steps=300)
        assert abs(am.price - eu.price) < 1e-6

    def test_american_put_has_early_exercise_premium(self):
        eu = bn.price_crr("put", "european", S=100, K=100, T=1.0, r=0.05, sigma=0.25, steps=300)
        am = bn.price_crr("put", "american", S=100, K=100, T=1.0, r=0.05, sigma=0.25, steps=300)
        assert am.price > eu.price, "American put must have positive early-exercise premium"
        # Premium isn't huge for ATM 1y at 25% vol. expect ~0.5 to 2 dollars
        assert am.price - eu.price < 3.0

    def test_deep_itm_american_put_equals_intrinsic(self):
        # At S << K, optimal to exercise immediately
        am = bn.price_crr("put", "american", S=50, K=100, T=0.5, r=0.10, sigma=0.20, steps=300)
        assert am.price == pytest.approx(50.0, abs=0.05)


class TestGreeks:
    """Tree-derived Greeks should approximate closed-form to ~3 decimals at n=500."""

    BASE = {"S": 100, "K": 100, "T": 0.5, "r": 0.05, "sigma": 0.20}

    def test_delta_matches_bs(self):
        bs_g = bs.greeks("call", **self.BASE, q=0.0)
        bn_r = bn.price_crr("call", "european", **self.BASE, steps=500)
        assert abs(bn_r.delta - bs_g.delta) < 1e-3

    def test_gamma_matches_bs(self):
        bs_g = bs.greeks("call", **self.BASE, q=0.0)
        bn_r = bn.price_crr("call", "european", **self.BASE, steps=500)
        assert abs(bn_r.gamma - bs_g.gamma) < 1e-3
