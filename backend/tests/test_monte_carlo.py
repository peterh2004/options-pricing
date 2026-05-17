"""Monte Carlo tests:
1. European vanilla CI contains BS closed-form in ≥95/100 trials.
2. Antithetic variates reduce variance vs naive sampling.
3. Asian < European call price (Jensen on averaging dampens convexity).
4. Down-and-out + down-and-in == vanilla (in-out parity).
5. Barrier knock-out with H ≪ S → vanilla price (barrier never touched).
"""

from __future__ import annotations

import numpy as np
import pytest

from app.pricing import black_scholes as bs
from app.pricing import monte_carlo as mc


# ---------- 1. CI coverage ----------
class TestConfidenceIntervals:
    """The 95% CI of the MC estimator should contain the true price in ≥95/100 trials."""

    def test_european_ci_coverage_95(self):
        S, K, T, r, sigma = 100.0, 105.0, 0.5, 0.05, 0.25
        true_price = bs.price("call", S=S, K=K, T=T, r=r, sigma=sigma)
        hits = 0
        n_trials = 100
        for i in range(n_trials):
            res = mc.price_european("call", S=S, K=K, T=T, r=r, sigma=sigma,
                                    n_paths=10_000, seed=i)
            lo, hi = res.price - res.half_ci_95, res.price + res.half_ci_95
            if lo <= true_price <= hi:
                hits += 1
        # Loose check (Wilson CI for 95% with n=100): we should land between 88 and 99.
        assert hits >= 88, f"CI coverage too low: {hits}/100"


# ---------- 2. Antithetic variance reduction ----------
class TestAntithetic:
    """Antithetic sampling forces sum of dW to zero. should beat naive MC."""

    def test_antithetic_lower_variance(self):
        # Run several trials, compare std of the price estimate
        S, K, T, r, sigma = 100.0, 100.0, 0.5, 0.05, 0.20
        naive_prices = []
        anti_prices = []
        for i in range(40):
            rng = np.random.default_rng(i)
            # Naive (single half antithetic OFF essentially)
            half_size = 4000
            Z = rng.standard_normal(size=2 * half_size)
            ST = S * np.exp((r - 0.5 * sigma * sigma) * T + sigma * np.sqrt(T) * Z)
            naive_prices.append(np.exp(-r * T) * np.maximum(ST - K, 0).mean())
            # Antithetic
            res = mc.price_european("call", S=S, K=K, T=T, r=r, sigma=sigma,
                                    n_paths=2 * half_size, seed=i)
            anti_prices.append(res.price)
        assert np.std(anti_prices) < np.std(naive_prices), \
            f"antithetic std {np.std(anti_prices):.4f} not lower than naive {np.std(naive_prices):.4f}"


# ---------- 3. Asian vs European ----------
class TestAsian:
    def test_asian_call_below_european(self):
        # Averaging dampens convexity, so arithmetic-mean Asian call < vanilla call
        european = bs.price("call", S=100, K=100, T=1.0, r=0.05, sigma=0.30)
        asian = mc.price_asian("call", S=100, K=100, T=1.0, r=0.05, sigma=0.30,
                               n_paths=20_000, n_steps=120, seed=1)
        assert asian.price < european

    def test_geometric_asian_control_variate_lowers_stderr(self):
        kwargs = dict(option_type="call", S=100, K=100, T=1.0, r=0.05, sigma=0.30,
                      n_paths=10_000, n_steps=60, seed=2)
        with_cv = mc.price_asian(**kwargs, use_control_variate=True)
        without = mc.price_asian(**kwargs, use_control_variate=False)
        assert with_cv.stderr < without.stderr * 0.5, \
            f"control variate should cut stderr ≥ 50%: {with_cv.stderr} vs {without.stderr}"


# ---------- 4. Barrier in-out parity ----------
class TestBarrier:
    """For a single barrier: vanilla = knock-in + knock-out."""

    def test_in_out_parity_down(self):
        S, K, H, T, r, sigma = 100, 100, 90, 0.5, 0.05, 0.25
        vanilla = bs.price("call", S=S, K=K, T=T, r=r, sigma=sigma)
        # Same RNG seed to share Brownian paths
        ko = mc.price_barrier("call", "down-and-out", S=S, K=K, H=H, T=T, r=r, sigma=sigma,
                              n_paths=20_000, n_steps=120, seed=7)
        ki = mc.price_barrier("call", "down-and-in", S=S, K=K, H=H, T=T, r=r, sigma=sigma,
                              n_paths=20_000, n_steps=120, seed=7)
        # Combined estimator's stderr is approximately the sum of the individual stderrs;
        # use a generous tolerance
        assert abs((ki.price + ko.price) - vanilla) < 0.20

    def test_unreachable_barrier_equals_vanilla(self):
        # Barrier far below spot. should never knock out
        S, K, H, T, r, sigma = 100, 100, 30, 0.5, 0.05, 0.20
        vanilla = bs.price("call", S=S, K=K, T=T, r=r, sigma=sigma)
        ko = mc.price_barrier("call", "down-and-out", S=S, K=K, H=H, T=T, r=r, sigma=sigma,
                              n_paths=10_000, n_steps=60, seed=11)
        assert abs(ko.price - vanilla) < 0.15
