"""API v1 routers."""

from fastapi import APIRouter

from app.api.v1 import chain, health, iv, iv_analysis, price, strategy, surface

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(price.router)
router.include_router(iv.router)
router.include_router(chain.router)
router.include_router(surface.router)
router.include_router(strategy.router)
router.include_router(iv_analysis.router)
