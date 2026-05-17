"""SQLite-backed cache layer. Tiny schema, no ORM models. raw tables."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

DB_PATH = Path("vollab.db")

_lock = threading.Lock()


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create cache tables if they don't exist. Idempotent."""
    with _lock, _get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS chain_cache (
                ticker TEXT PRIMARY KEY,
                spot REAL NOT NULL,
                chain_json TEXT NOT NULL,
                fetched_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS history_cache (
                ticker TEXT PRIMARY KEY,
                history_json TEXT NOT NULL,
                fetched_at INTEGER NOT NULL
            );
        """)


def cache_get(table: str, ticker: str, ttl_seconds: int) -> dict[str, Any] | None:
    """Read from cache. Returns None if missing or expired."""
    init_db()
    now = int(time.time())
    with _lock, _get_conn() as conn:
        row = conn.execute(
            f"SELECT * FROM {table} WHERE ticker = ?",
            (ticker.upper(),),
        ).fetchone()
    if row is None:
        return None
    if now - row["fetched_at"] > ttl_seconds:
        return None
    return dict(row)


def cache_put_chain(ticker: str, spot: float, chain: list[dict[str, Any]]) -> None:
    init_db()
    with _lock, _get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO chain_cache (ticker, spot, chain_json, fetched_at) VALUES (?, ?, ?, ?)",
            (ticker.upper(), float(spot), json.dumps(chain), int(time.time())),
        )
        conn.commit()


def cache_put_history(ticker: str, history: list[dict[str, Any]]) -> None:
    init_db()
    with _lock, _get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO history_cache (ticker, history_json, fetched_at) VALUES (?, ?, ?)",
            (ticker.upper(), json.dumps(history), int(time.time())),
        )
        conn.commit()
