"""Unit tests for ReviewService. No network, no API key, no cost"""

from __future__ import annotations

import pytest

from app.adapters.fake_generator import (
    TRIGGER_INVALID_OUTPUT,
    TRIGGER_UNAVAILABLE,
    FakeGenerator,
)
from app.core.exceptions import InvalidLlmOutputError, LlmUnavailableError
from app.core.models import ReviewInput, VenueCategory
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
