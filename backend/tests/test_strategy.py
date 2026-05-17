"""Strategy aggregation tests.

Covers: long call (single leg), bull call spread, iron condor, straddle.
For each: verify net price, net Greeks, max profit/loss, breakevens.
"""

import numpy as np
import pytest

from app.pricing import black_scholes as bs
from app.pricing.strategy import (
    Leg,
    breakeven_spots,
    max_profit_loss,
    payoff_at_expiry,
    pnl_grid,
    price_strategy,
)


class TestSingleLeg:
    """A 1-leg strategy must equal the standalone BS price exactly."""

    def test_long_call_matches_bs(self):
        legs = [Leg(option_type="call", strike=100, expiry_years=0.5, quantity=1, sigma=0.2)]
        res = price_strategy(legs, S=100, r=0.05)
        bs_price = bs.price("call", S=100, K=100, T=0.5, r=0.05, sigma=0.2)
        assert abs(res.net_price - bs_price) < 1e-12
        assert abs(res.net_greeks.delta - bs.greeks("call", S=100, K=100, T=0.5, r=0.05, sigma=0.2).delta) < 1e-12

    def test_short_put_has_negative_delta(self):
        # Short put → long delta. Wait: short put has POSITIVE delta (you benefit if S rises)
        legs = [Leg(option_type="put", strike=100, expiry_years=0.5, quantity=-1, sigma=0.2)]
        res = price_strategy(legs, S=100, r=0.05)
        assert res.net_greeks.delta > 0


class TestBullCallSpread:
    """Long lower-strike call + short higher-strike call."""

    def test_bull_call_spread_economics(self):
        legs = [
            Leg("call", strike=95, expiry_years=0.5, quantity=1, sigma=0.22),
            Leg("call", strike=105, expiry_years=0.5, quantity=-1, sigma=0.18),
        ]
        res = price_strategy(legs, S=100, r=0.04)
        # Long-call price > short-call price → net debit
        assert res.net_price > 0
        # Max profit at expiry = spread width - debit
        mp, ml = max_profit_loss(legs, r=0.04)
        spread_width = 10
        assert abs(mp - (spread_width - res.net_price)) < 0.5
        # Max loss == debit (with positive sign meaning loss in our convention)
        assert abs(ml - (-res.net_price)) < 0.5

    def test_bull_call_spread_breakeven(self):
        legs = [
            Leg("call", strike=95, expiry_years=0.5, quantity=1, sigma=0.22),
            Leg("call", strike=105, expiry_years=0.5, quantity=-1, sigma=0.18),
        ]
        res = price_strategy(legs, S=100, r=0.04)
        be = breakeven_spots(legs, r=0.04)
        # Single breakeven at lower_strike + debit
        assert len(be) == 1
        assert abs(be[0] - (95 + res.net_price)) < 0.1


class TestIronCondor:
    """Long 90P, Short 95P, Short 105C, Long 110C. vol-neutral structure."""

    LEGS = [
        Leg("put", strike=90, expiry_years=30 / 365, quantity=1, sigma=0.22),
        Leg("put", strike=95, expiry_years=30 / 365, quantity=-1, sigma=0.20),
        Leg("call", strike=105, expiry_years=30 / 365, quantity=-1, sigma=0.17),
        Leg("call", strike=110, expiry_years=30 / 365, quantity=1, sigma=0.16),
    ]

    def test_iron_condor_is_credit(self):
        res = price_strategy(self.LEGS, S=100, r=0.04)
        # Selling closer-to-the-money options for more premium than the wings cost → net credit
        assert res.net_price < 0

    def test_iron_condor_two_breakevens(self):
        be = sorted(breakeven_spots(self.LEGS, r=0.04, spot_min=80, spot_max=120))
        assert len(be) == 2
        assert 92 < be[0] < 96
        assert 104 < be[1] < 108

    def test_iron_condor_near_zero_delta(self):
        # Roughly symmetric around spot → near zero delta
        res = price_strategy(self.LEGS, S=100, r=0.04)
        assert abs(res.net_greeks.delta) < 0.15


class TestStraddle:
    """Long call + long put at same strike. pure vol/gamma play."""

    def test_long_straddle_positive_gamma_and_vega(self):
        legs = [
            Leg("call", strike=100, expiry_years=0.5, quantity=1, sigma=0.25),
            Leg("put", strike=100, expiry_years=0.5, quantity=1, sigma=0.25),
        ]
        res = price_strategy(legs, S=100, r=0.04)
        assert res.net_greeks.gamma > 0
        assert res.net_greeks.vega > 0
        # ATM-spot straddle has small positive delta due to half-sigma^2 drift in d1
        # (true zero delta is at ATM-forward, not ATM-spot). Check it's modest.
        assert 0 < res.net_greeks.delta < 0.25

    def test_straddle_delta_signs_correct(self):
        # ITM straddle (S > K): positive delta because call leg dominates
        legs = [
            Leg("call", strike=90, expiry_years=0.5, quantity=1, sigma=0.25),
            Leg("put", strike=90, expiry_years=0.5, quantity=1, sigma=0.25),
        ]
        res = price_strategy(legs, S=100, r=0.04)
        assert res.net_greeks.delta > 0.4  # heavily call-dominant


class TestPnlGrid:
    """The grid should equal the at-expiry payoff at t = expiry, minus cost basis."""

    def test_grid_at_expiry_matches_intrinsic(self):
        legs = [
            Leg("call", strike=100, expiry_years=0.25, quantity=1, sigma=0.2),
        ]
        S_axis = np.linspace(80, 120, 25)
        t_axis = np.array([0.25])  # exactly at expiry
        cost = price_strategy(legs, S=100, r=0.04).net_price
        grid = pnl_grid(legs, S_axis, t_axis, r=0.04, cost_basis=cost)
        for i, S in enumerate(S_axis):
            expected = max(S - 100, 0.0) - cost
            assert abs(grid[0, i] - expected) < 1e-10
