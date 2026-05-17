"""API smoke tests. exercise every endpoint that doesn't require network."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealth:
    def test_health_returns_ok(self):
        r = client.get("/api/v1/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "version" in body


class TestPrice:
    def test_bs_call(self):
        r = client.post("/api/v1/price", json={
            "option_type": "call", "S": 100, "K": 100, "T": 0.5,
            "r": 0.05, "sigma": 0.20, "method": "black_scholes",
        })
        assert r.status_code == 200
        body = r.json()
        # Hull-ish reference: around $6.89
        assert 6.0 < body["price"] < 8.0
        assert body["method"] == "black_scholes"
        assert body["compute_ms"] > 0
        assert "greeks" in body and "delta" in body["greeks"]

    def test_binomial_american_put(self):
        r = client.post("/api/v1/price", json={
            "option_type": "put", "style": "american", "S": 100, "K": 100, "T": 1.0,
            "r": 0.05, "sigma": 0.25, "method": "binomial", "binomial_steps": 200,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["price"] > 0
        assert body["method"] == "binomial"

    def test_mc_european_call(self):
        r = client.post("/api/v1/price", json={
            "option_type": "call", "S": 100, "K": 100, "T": 0.5,
            "r": 0.05, "sigma": 0.20, "method": "monte_carlo",
            "mc_paths": 5000, "mc_seed": 42,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["stderr"] is not None and body["stderr"] > 0
        assert body["half_ci_95"] is not None


class TestIV:
    def test_iv_round_trip(self):
        # First get a price
        p = client.post("/api/v1/price", json={
            "option_type": "call", "S": 100, "K": 105, "T": 0.5,
            "r": 0.05, "sigma": 0.25, "method": "black_scholes",
        }).json()["price"]
        # Then solve IV. should recover 0.25
        r = client.post("/api/v1/iv", json={
            "option_type": "call", "S": 100, "K": 105, "T": 0.5,
            "r": 0.05, "market_price": p,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["converged"] is True
        assert abs(body["iv"] - 0.25) < 1e-4


class TestStrategy:
    def test_iron_condor_price(self):
        legs = [
            {"option_type": "put", "strike": 90, "expiry_years": 30/365, "quantity": 1, "sigma": 0.22},
            {"option_type": "put", "strike": 95, "expiry_years": 30/365, "quantity": -1, "sigma": 0.20},
            {"option_type": "call", "strike": 105, "expiry_years": 30/365, "quantity": -1, "sigma": 0.17},
            {"option_type": "call", "strike": 110, "expiry_years": 30/365, "quantity": 1, "sigma": 0.16},
        ]
        r = client.post("/api/v1/strategy/price", json={"legs": legs, "S": 100, "r": 0.04})
        assert r.status_code == 200
        body = r.json()
        assert body["net_price"] < 0  # credit
        assert len(body["breakevens"]) == 2
        assert body["max_profit"] > 0
        assert body["max_loss"] < 0

    def test_pnl_grid_shape(self):
        legs = [{"option_type": "call", "strike": 100, "expiry_years": 0.5, "quantity": 1, "sigma": 0.2}]
        r = client.post("/api/v1/strategy/pnl", json={
            "legs": legs, "S_min": 80, "S_max": 120, "n_S": 25,
            "t_max_years": 0.5, "n_t": 10, "r": 0.05,
        })
        assert r.status_code == 200
        body = r.json()
        assert len(body["grid"]) == 10
        assert len(body["grid"][0]) == 25


class TestValidation:
    def test_negative_strike_rejected(self):
        r = client.post("/api/v1/price", json={
            "option_type": "call", "S": 100, "K": -10, "T": 0.5,
            "r": 0.05, "sigma": 0.2, "method": "black_scholes",
        })
        assert r.status_code == 422

    def test_unknown_method_rejected(self):
        r = client.post("/api/v1/price", json={
            "option_type": "call", "S": 100, "K": 100, "T": 0.5,
            "r": 0.05, "sigma": 0.2, "method": "fancy_lattice",
        })
        assert r.status_code == 422
