"""Cox-Ross-Rubinstein binomial tree for American & European options.

Backward induction with early-exercise comparison at every node.
Delta and gamma are extracted from the second time-step nodes (standard practice).
Theta from t=0 → t=2*dt finite difference within the tree.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

from app.core.constants import DAYS_PER_YEAR, DEFAULT_BINOMIAL_STEPS

OptionType = Literal["call", "put"]
ExerciseStyle = Literal["european", "american"]


@dataclass(frozen=True, slots=True)
class BinomialResult:
    price: float
    delta: float
    gamma: float
    theta: float  # per calendar day


def price_crr(
    option_type: OptionType,
    style: ExerciseStyle,
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    q: float = 0.0,
    steps: int = DEFAULT_BINOMIAL_STEPS,
) -> BinomialResult:
    """CRR binomial pricer with early-exercise handling for American options.

    Tree node count: O(n²). For n=500 this is ~125k cells. runs in <20ms on CPython.
    Greeks computed in-tree (no extra evaluations needed).
    """
    if T <= 0.0:
        intrinsic = max(S - K, 0.0) if option_type == "call" else max(K - S, 0.0)
        return BinomialResult(price=intrinsic, delta=0.0, gamma=0.0, theta=0.0)

    dt = T / steps
    u = np.exp(sigma * np.sqrt(dt))
    d = 1.0 / u
    a = np.exp((r - q) * dt)
    p = (a - d) / (u - d)
    # Probability sanity: when sigma is tiny relative to drift, p can drift outside [0,1].
    # Caller's job to avoid; we clamp defensively.
    p = float(np.clip(p, 0.0, 1.0))
    disc = np.exp(-r * dt)

    # Terminal asset prices
    j = np.arange(steps + 1)
    ST = S * (u ** (steps - j)) * (d ** j)

    # Terminal payoff
    if option_type == "call":
        V = np.maximum(ST - K, 0.0)
    else:
        V = np.maximum(K - ST, 0.0)

    # Backward induction with optional early-exercise
    # Track values at steps 2 and 1 (and 0) to derive Greeks
    V_step2: np.ndarray | None = None
    V_step1: np.ndarray | None = None
    S_step2: np.ndarray | None = None

    for i in range(steps - 1, -1, -1):
        V = disc * (p * V[:-1] + (1.0 - p) * V[1:])
        if style == "american":
            j = np.arange(i + 1)
            S_i = S * (u ** (i - j)) * (d ** j)
            if option_type == "call":
                V = np.maximum(V, S_i - K)
            else:
                V = np.maximum(V, K - S_i)
        if i == 2:
            V_step2 = V.copy()
            S_step2 = S * (u ** np.arange(2, -1, -1)) * (d ** np.arange(0, 3))
        elif i == 1:
            V_step1 = V.copy()

    price = float(V[0])

    # ---- Greeks from internal nodes (Hull, ch. 21) ----
    if V_step1 is not None and len(V_step1) == 2:
        Su, Sd = S * u, S * d
        delta = (V_step1[0] - V_step1[1]) / (Su - Sd)
    else:
        delta = 0.0

    if V_step2 is not None and S_step2 is not None and len(V_step2) == 3:
        Suu, Sud, Sdd = float(S_step2[0]), float(S_step2[1]), float(S_step2[2])
        h_up = (V_step2[0] - V_step2[1]) / (Suu - Sud)
        h_dn = (V_step2[1] - V_step2[2]) / (Sud - Sdd)
        gamma = (h_up - h_dn) / (0.5 * (Suu - Sdd))
        # Theta from V(0,0) vs V(2*dt, central node)
        theta_per_year = (float(V_step2[1]) - price) / (2.0 * dt)
        theta = theta_per_year / DAYS_PER_YEAR
    else:
        gamma = 0.0
        theta = 0.0

    return BinomialResult(
        price=price,
        delta=float(delta),
        gamma=float(gamma),
        theta=float(theta),
    )
