from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.core.models import GeneratedReview, ReviewInput, VenueCategory
from app.core.verification import leaked_names


def _review(text: str, venue: str = "Some Place") -> GeneratedReview:
    """Build a GeneratedReview with a given review text"""
    return GeneratedReview(
        id=uuid4(),
        created_at=datetime.now(UTC),
        venue_name=venue,
        category=VenueCategory.OTHER,
        review=text.ljust(40),
        headline=None,
        suggested_rating=3,
        omissions=[],
    )


def test_detects_leaked_name() -> None:
    request = ReviewInput(
        venue_name="Some Place",
        disliked="the waiter Marcus was unfriendly",
    )
    result = _review("The service by Marcus felt unfriendly throughout.")

    assert leaked_names(request, result) == {"Marcus"}


def test_ignores_removed_name() -> None:
    request = ReviewInput(
        venue_name="Some Place",
        disliked="the waiter Marcus was unfriendly",
    )
    result = _review("The service felt unfriendly throughout the evening.")

    assert leaked_names(request, result) == set()


def test_venue_name_is_not_a_leak() -> None:
    """A name that is part of the venue name may legitimately appear"""
    request = ReviewInput(
        venue_name="Dental office Dr. Brandt",
        disliked="Doctor Brandt kept me waiting for an hour",
    )
    result = _review("The wait at Brandt was long.", venue="Zahnarztpraxis Dr. Brandt")

    assert leaked_names(request, result) == set()


def test_sentence_start_is_not_a_candidate() -> None:
    """A capitalised word starting a sentence is usually not a name"""
    request = ReviewInput(
        venue_name="Some Place",
        disliked="The food was cold. Service was slow too.",
    )
    result = _review("The food arrived cold and the service was slow.")

    assert leaked_names(request, result) == set()


def test_detects_multiple_leaks() -> None:
    request = ReviewInput(
        venue_name="Some Place",
        disliked="the assistant Bianca and the receptionist Thomas were rude",
    )
    result = _review("Both Bianca and Thomas were unhelpful during the visit.")

    assert leaked_names(request, result) == {"Bianca", "Thomas"}


def test_headline_is_checked_too() -> None:
    request = ReviewInput(
        venue_name="Some Place",
        disliked="the manager Kevin refused to help",
    )
    result = _review("The management was unhelpful during our visit.")
    result = result.model_copy(update={"headline": "Kevin was no help"})

    assert leaked_names(request, result) == {"Kevin"}
