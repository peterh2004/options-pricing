"""Data layer tests. pure-math parts only (no network)."""

import numpy as np

from app.data.historical import (
    HistoryPoint,
    compute_rv_stats,
    realized_vol,
    realized_vol_series,
)


class TestRealizedVol:
    def test_constant_series_zero_vol(self):
        closes = np.full(100, 100.0)
        assert realized_vol(closes, 30) == 0.0

    def test_known_vol_matches_expected(self):
        rng = np.random.default_rng(42)
        # Generate 1000 daily log returns with σ = 0.015 (about 24% annualized)
        rets = rng.normal(0, 0.015, size=1000)
        closes = 100 * np.exp(np.cumsum(rets))
        rv = realized_vol(closes, 252)
        expected = 0.015 * np.sqrt(252)  # ≈ 0.238
        assert abs(rv - expected) < 0.03  # 3 vol points tolerance for 252-sample MC

    def test_insufficient_samples_returns_none(self):
        closes = np.array([100.0, 101.0, 99.5])
        assert realized_vol(closes, 30) is None

    def test_rv_series_length(self):
        rng = np.random.default_rng(0)
        closes = 100 * np.exp(np.cumsum(rng.normal(0, 0.01, size=100)))
        dates = [f"2026-01-{i+1:02d}" for i in range(100)]
        dts, vals = realized_vol_series(closes, dates, window=30)
        # We have 99 returns; with window=30 we get 99-30+1 = 70 windows
        assert len(dts) == len(vals) == 70


class TestComputeStats:
    def test_full_pipeline(self):
        rng = np.random.default_rng(1)
        # Make 400 days so we have enough for the 1y series
        closes = 100 * np.exp(np.cumsum(rng.normal(0.0002, 0.012, size=400)))
        history = [
            HistoryPoint(date=f"2025-{(i//30)+1:02d}-{(i%30)+1:02d}", close=float(c))
            for i, c in enumerate(closes)
        ]
        stats = compute_rv_stats(history)
        assert stats.rv_30d is not None
        assert stats.rv_60d is not None
        assert stats.rv_1y is not None
        # rv should be positive and in a sane range
        for v in (stats.rv_30d, stats.rv_60d, stats.rv_1y):
            assert 0 < v < 2.0  # < 200% annual vol is sane
