"""Shared fixtures and path setup so `pytest` finds `app/` without installation."""

import sys
from pathlib import Path

import numpy as np
import pytest

# Make `app.*` imports resolvable when running pytest from backend/.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture(scope="session")
def rng() -> np.random.Generator:
    """Deterministic RNG used by every randomized test."""
    return np.random.default_rng(20260516)


@pytest.fixture(scope="session")
def random_param_sets(rng) -> list[dict]:
    """20 plausible parameter sets covering ITM, ATM, OTM, short and long maturities."""
    sets = []
    for _ in range(20):
        S = float(rng.uniform(20.0, 600.0))
        K = float(S * rng.uniform(0.7, 1.3))
        T = float(rng.uniform(1 / 365, 2.0))
        r = float(rng.uniform(0.0, 0.08))
        sigma = float(rng.uniform(0.05, 0.65))
        q = float(rng.uniform(0.0, 0.04))
        sets.append({"S": S, "K": K, "T": T, "r": r, "sigma": sigma, "q": q})
    return sets
