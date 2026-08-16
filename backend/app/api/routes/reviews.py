"""HTTP route for review generation. Thin by design: validate, delegate, map"""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.dependencies import ReviewServiceDep
from app.api.schemas import ReviewRequestSchema, ReviewResponseSchema
from app.core.models import Language, ReviewInput, Tone

router = APIRouter(prefix="/api", tags=["reviews"])


def _to_domain(payload: ReviewRequestSchema) -> ReviewInput:
    """Translate the HTTP shape into the domain shape"""
    return ReviewInput(
        venue_name=payload.venue_name,
        category=payload.category,
        liked=payload.liked,
        disliked=payload.disliked,
        suggestions=payload.suggestions,
        tone=Tone(payload.tone.value),
        language=Language(payload.language.value),
        visit_date=payload.visit_date,
    )


@router.post(
    "/reviews",
    response_model=ReviewResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a fair review from structured input",
)
async def create_review(
    payload: ReviewRequestSchema,
    service: ReviewServiceDep,
) -> ReviewResponseSchema:
    result = await service.create_review(_to_domain(payload))

    return ReviewResponseSchema(
        id=result.id,
        venue_name=result.venue_name,
        category=result.category,
        review=result.review,
        headline=result.headline,
        suggested_rating=result.suggested_rating,
        omissions=result.omissions,
    )
