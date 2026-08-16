"""Application entry point. Assembles routes and error handlers"""

from __future__ import annotations

from fastapi import FastAPI

from app.api.errors import register_exception_handlers
from app.api.routes.reviews import router as reviews_router

app = FastAPI(
    title="FairRate",
    description="Turns structured input into a fair, publishable review",
    version="0.1.0",
)

register_exception_handlers(app)
app.include_router(reviews_router)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness check. No dependencies, no side effects"""
    return {"status": "ok"}
