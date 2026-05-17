"""Health check endpoint. used by the frontend status indicator."""

import time

from fastapi import APIRouter

from app import __version__
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])

_STARTED_AT = time.time()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        uptime_seconds=time.time() - _STARTED_AT,
    )
