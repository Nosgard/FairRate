"""Deterministic stand-in for the language model. No network, no cost"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.core.exceptions import InvalidLlmOutputError, LlmUnavailableError
from app.core.models import (
    GeneratedReview,
    Omission,
    OmissionType,
    ReviewInput,
)

# Venue names that make the fake fail on purpose, so error paths stay testable
TRIGGER_UNAVAILABLE = "__trigger_unavailable__"
TRIGGER_INVALID_OUTPUT = "__trigger_invalid_output__"


class FakeGenerator:
    """Implements ReviewGenerator without calling any external service"""

    async def generate(self, request: ReviewInput) -> GeneratedReview:
        if request.venue_name == TRIGGER_UNAVAILABLE:
            raise LlmUnavailableError("Fake generator: simulated outage")
        if request.venue_name == TRIGGER_INVALID_OUTPUT:
            raise InvalidLlmOutputError("Fake generator: simulated bad output")

        parts: list[str] = []
        if request.liked:
            parts.append(f"What stood out: {request.liked}")
        if request.disliked:
            parts.append(f"Less convincing: {request.disliked}")
        if request.suggestions:
            parts.append(f"One suggestion: {request.suggestions}")

        review = " ".join(parts).ljust(40)

        return GeneratedReview(
            id=uuid4(),
            created_at=datetime.now(UTC),
            venue_name=request.venue_name,
            category=request.category,
            review=review,
            headline=f"A visit to {request.venue_name}",
            suggested_rating=4 if request.liked else 2,
            omissions=[
                Omission(
                    type=OmissionType.INSULT,
                    note="Fake generator: sample omission entry.",
                )
            ],
        )
