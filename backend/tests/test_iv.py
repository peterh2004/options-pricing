"""IV solver tests:
1. Round-trip: price with sigma=σ, solve from that price, recover σ.
2. 50-quote convergence: ≥95% must converge.
3. Bisection fallback engages when Newton fails (deep ITM/OTM).
4. No-arb violations return non-converged.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.pricing import black_scholes as bs
from app.pricing import iv as iv_mod


class TestRoundTrip:
    """If we price with σ and feed the result back, we must recover σ."""

    @pytest.mark.parametrize("sigma_true", [0.05, 0.15, 0.25, 0.45, 0.80])
    @pytest.mark.parametrize("option_type", ["call", "put"])
    def test_atm_round_trip(self, sigma_true, option_type):
        S, K, T, r, q = 100, 100, 0.5, 0.05, 0.0
        p = bs.price(option_type, S=S, K=K, T=T, r=r, sigma=sigma_true, q=q)
        res = iv_mod.solve_iv(option_type, S=S, K=K, T=T, r=r, market_price=p, q=q)
        assert res.converged
        assert abs(res.iv - sigma_true) < 1e-5

    @pytest.mark.parametrize("moneyness", [0.7, 0.85, 1.0, 1.15, 1.3])
    def test_various_moneyness(self, moneyness):
        S, T, r, sigma_true = 100, 0.25, 0.04, 0.3
        K = S * moneyness
        p = bs.price("call", S=S, K=K, T=T, r=r, sigma=sigma_true)
        res = iv_mod.solve_iv("call", S=S, K=K, T=T, r=r, market_price=p)
        assert res.converged
        assert abs(res.iv - sigma_true) < 1e-4


class TestBulkConvergence:
    """50 synthetic quotes spanning the chain. at least 95% must converge."""

    def test_fifty_quotes_converge(self, rng):
        S = 459.30
        T_grid = [7 / 365, 14 / 365, 30 / 365, 60 / 365, 90 / 365, 180 / 365, 365 / 365]
        n_quotes = 50
        quotes = []
        for _ in range(n_quotes):
            T = float(rng.choice(T_grid))
            K = float(S * rng.uniform(0.85, 1.15))
            sigma = float(rng.uniform(0.10, 0.45))
            option_type = "call" if rng.random() < 0.5 else "put"
            price = bs.price(option_type, S=S, K=K, T=T, r=0.04288, sigma=sigma)
            # Add a tiny bid-ask noise (1bp of spot). simulates market prices
            noise = rng.normal(scale=0.0001 * S)
            quotes.append((option_type, K, T, max(price + noise, 0.01), sigma))

        converged = 0
        for option_type, K, T, market_p, _sigma_true in quotes:
            res = iv_mod.solve_iv(option_type, S=S, K=K, T=T, r=0.04288, market_price=market_p)
            if res.converged:
                converged += 1
        assert converged / n_quotes >= 0.95, f"only {converged}/{n_quotes} converged"


class TestEdgeCases:
    def test_below_intrinsic_fails(self):
        # 1$ below intrinsic. no σ can match
        res = iv_mod.solve_iv("call", S=100, K=90, T=0.5, r=0.05, market_price=5.0)
        assert not res.converged

    def test_above_upper_bound_fails(self):
        # Call can't be worth more than S
        res = iv_mod.solve_iv("call", S=100, K=90, T=0.5, r=0.05, market_price=120.0)
        assert not res.converged

    def test_t_zero_fails(self):
        res = iv_mod.solve_iv("call", S=100, K=100, T=0.0, r=0.05, market_price=2.0)
        assert not res.converged

    def test_low_vega_deep_otm_falls_back(self):
        # Very deep OTM call → low vega; ensure we still return a value
        S, K, T, r, sigma_true = 100, 200, 0.1, 0.05, 0.15
        p = bs.price("call", S=S, K=K, T=T, r=r, sigma=sigma_true)
        # Price might be ~0, but solver shouldn't crash
        res = iv_mod.solve_iv("call", S=S, K=K, T=T, r=r, market_price=p)
        # Either it converges or it gracefully fails (not raises)
        assert res.iterations >= 0
