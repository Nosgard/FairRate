"""Central mapping from domain exceptions to HTTP responses."""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.api.schemas import ErrorResponseSchema
from app.core.exceptions import (
    ContentRejectedError,
    InvalidLlmOutputError,
    LlmUnavailableError,
)


def _error(status_code: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponseSchema(code=code, message=message)
    return JSONResponse(status_code=status_code, content=body.model_dump())


def register_exception_handlers(app: FastAPI) -> None:
    """Attach domain error handlers to the application.

    Centralised here rather than per-route: routes never write try/except
    for these — raising a domain exception is enough, and the mapping to
    HTTP status and message lives in exactly one place."""

    @app.exception_handler(LlmUnavailableError)
    async def _handle_unavailable(
        request: Request, exc: LlmUnavailableError
    ) -> JSONResponse:
        # exc is intentionally not included in the response body. It may
        # contain provider details (status codes, hostnames) that belong
        # in logs, not in what a client of this API can see.
        return _error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "llm_unavailable",
            "The service is temporarily unreachable. Please try again shortly",
        )

    @app.exception_handler(InvalidLlmOutputError)
    async def _handle_invalid_output(
        request: Request, exc: InvalidLlmOutputError
    ) -> JSONResponse:
        return _error(
            status.HTTP_502_BAD_GATEWAY,
            "llm_invalid_output",
            "The review could not be generated. Please try again",
        )

    @app.exception_handler(ContentRejectedError)
    async def _handle_rejected(
        request: Request, exc: ContentRejectedError
    ) -> JSONResponse:
        # No adapter raises this yet — see exceptions.py. The handler
        # exists so the mapping is ready when a rule needs it.
        return _error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "content_rejected",
            "This input could not be turned into a review",
        )
