"""Runtime configuration via pydantic-settings. Env vars override defaults."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Vol Lab API"
    version: str = "0.1.0"

    # CORS. comma-separated origins
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Database. SQLite by default, Postgres-ready via DATABASE_URL
    database_url: str = "sqlite:///./vollab.db"

    # yfinance cache root
    cache_dir: Path = Path(".vollab_cache")

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
