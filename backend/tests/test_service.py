"""Unit tests for ReviewService. No network, no API key, no cost"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.adapters.fake_generator import (
    TRIGGER_INVALID_OUTPUT,
    TRIGGER_UNAVAILABLE,
    FakeGenerator,
)
from app.core.exceptions import InvalidLlmOutputError, LlmUnavailableError
from app.core.models import (
    GeneratedReview,
    Omission,
    OmissionType,
    ReviewInput,
    VenueCategory,
)
from app.core.service import ReviewService


@pytest.fixture
def service() -> ReviewService:
    return ReviewService(FakeGenerator())


async def test_creates_review_from_liked_only(service: ReviewService) -> None:
    request = ReviewInput(venue_name="Trattoria Bella", liked="homemade pasta")

    result = await service.create_review(request)

    assert result.venue_name == "Trattoria Bella"
    assert "homemade pasta" in result.review
    assert 1 <= result.suggested_rating <= 5


async def test_keeps_category(service: ReviewService) -> None:
    request = ReviewInput(
        venue_name="Odeon",
        category=VenueCategory.CINEMA,
        disliked="uncomfortable seats",
    )

    result = await service.create_review(request)

    assert result.category is VenueCategory.CINEMA


async def test_requires_liked_or_disliked() -> None:
    with pytest.raises(ValueError):
        ReviewInput(venue_name="Empty Place")


async def test_propagates_unavailable_error(service: ReviewService) -> None:
    request = ReviewInput(venue_name=TRIGGER_UNAVAILABLE, liked="something")

    with pytest.raises(LlmUnavailableError):
        await service.create_review(request)


async def test_propagates_invalid_output_error(service: ReviewService) -> None:
    request = ReviewInput(venue_name=TRIGGER_INVALID_OUTPUT, liked="something")

    with pytest.raises(InvalidLlmOutputError):
        await service.create_review(request)


class _EchoingGenerator:
    """Returns a review plus an omission entry restating what it kept."""

    def __init__(self, review: str, notes: list[str]) -> None:
        self._review = review
        self._notes = notes

    async def generate(self, request: ReviewInput) -> GeneratedReview:
        return GeneratedReview(
            id=uuid4(),
            created_at=datetime.now(UTC),
            venue_name=request.venue_name,
            category=request.category,
            review=self._review,
            headline=None,
            suggested_rating=4,
            omissions=[
                Omission(type=OmissionType.UNVERIFIABLE_CLAIM, note=note)
                for note in self._notes
            ],
        )


async def test_drops_omissions_the_review_contradicts() -> None:
    review = "The staff waived the cost of my espresso because it was my first visit."
    generator = _EchoingGenerator(
        review,
        [
            "staff took the cost because it was my first visit.",
            "Removed speculation about the venue's finances",
        ],
    )
    request = ReviewInput(venue_name="Cafe Central", liked="the espresso was free")

    result = await ReviewService(generator).create_review(request)

    assert [entry.note for entry in result.omissions] == [
        "Removed speculation about the venue's finances"
    ]
    # The text itself must come back untouched — only the list is filtered.
    assert result.review == review
    assert result.suggested_rating == 4
