from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.core.models import (
    GeneratedReview,
    Language,
    Omission,
    OmissionType,
    ReviewInput,
    VenueCategory,
)
from app.core.verification import echoed_omissions, leaked_names


def _review(
    text: str,
    venue: str = "Some Place",
    omissions: list[Omission] | None = None,
) -> GeneratedReview:
    """Build a GeneratedReview with a given review text"""
    return GeneratedReview(
        id=uuid4(),
        created_at=datetime.now(UTC),
        venue_name=venue,
        category=VenueCategory.OTHER,
        review=text.ljust(40),
        headline=None,
        suggested_rating=3,
        omissions=omissions or [],
    )


def _note(text: str, type_: OmissionType = OmissionType.OFF_TOPIC) -> Omission:
    return Omission(type=type_, note=text)


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


def test_empty_venue_name_excludes_nothing() -> None:
    """With no venue name there is nothing to exempt, and nothing to crash on

    The exclusion set is what keeps a word like "Brandt" in "Dental office
    Dr. Brandt" from counting as a leak. Empty, it simply exempts nobody —
    the check gets stricter, never weaker.
    """
    request = ReviewInput(venue_name="", disliked="the waiter Marcus was unfriendly")
    result = _review("The service by Marcus felt unfriendly throughout.", venue="")

    assert leaked_names(request, result) == {"Marcus"}


def test_empty_venue_name_still_reports_no_false_leak() -> None:
    request = ReviewInput(venue_name="", disliked="the waiter Marcus was unfriendly")
    result = _review("The service felt unfriendly throughout the evening.", venue="")

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


# The observed failure: the review kept the espresso sentence, correctly,
# and an omission entry was invented that restates it almost word for word.
_ESPRESSO_REVIEW = (
    "The staff waived the cost of my espresso because it was my first visit."
)
_ESPRESSO_FALSE_NOTE = "staff took the cost because it was my first visit."


def test_flags_omission_still_present_in_review() -> None:
    """The entry claims a removal the review text contradicts"""
    request = ReviewInput(venue_name="Some Place", liked="the espresso was free")
    entry = _note(_ESPRESSO_FALSE_NOTE)
    result = _review(_ESPRESSO_REVIEW, omissions=[entry])

    assert echoed_omissions(request, result) == [entry]


def test_keeps_note_describing_a_real_removal() -> None:
    """A correct note describes the act of removal, not surviving content"""
    request = ReviewInput(venue_name="Some Place", disliked="Sarah was rude")
    result = _review(
        "The counter staff seemed unfriendly during the visit.",
        omissions=[_note("Removed the name of a staff member", OmissionType.INSULT)],
    )

    assert echoed_omissions(request, result) == []


def test_short_note_is_kept_even_when_fully_echoed() -> None:
    """Under four content words the ratio is noise, not evidence"""
    request = ReviewInput(venue_name="Some Place", liked="the sign was nice")
    result = _review(
        "The name was removed from the sign outside the shop entirely.",
        omissions=[_note("name removed")],
    )

    assert echoed_omissions(request, result) == []


def test_returns_only_the_false_entry_and_keeps_order() -> None:
    request = ReviewInput(venue_name="Some Place", liked="the espresso was free")
    good_first = _note("Removed speculation about the venue's finances")
    bad = _note(_ESPRESSO_FALSE_NOTE)
    good_last = _note("Removed a remark aimed at a member of staff")
    result = _review(_ESPRESSO_REVIEW, omissions=[good_first, bad, good_last])

    assert echoed_omissions(request, result) == [bad]


def test_no_omissions_is_not_a_failure() -> None:
    request = ReviewInput(venue_name="Some Place", liked="the espresso was free")

    assert echoed_omissions(request, _review(_ESPRESSO_REVIEW)) == []


def test_headline_counts_as_present() -> None:
    """Content echoed only in the headline still contradicts the entry"""
    request = ReviewInput(venue_name="Some Place", liked="quick and friendly")
    entry = _note("quick friendly service throughout the whole evening")
    result = _review(
        "Nothing much to report about this place at all.", omissions=[entry]
    )
    result = result.model_copy(
        update={"headline": "Quick friendly service throughout the evening"}
    )

    assert echoed_omissions(request, result) == [entry]


def test_german_notes_are_scored_too() -> None:
    request = ReviewInput(
        venue_name="Cafe Wien",
        liked="der Espresso war gratis",
        language=Language.DE,
    )
    entry = _note("Das Personal hat den Espresso beim ersten Besuch berechnet.")
    result = _review(
        "Das Personal hat den Espresso beim ersten Besuch nicht berechnet.",
        omissions=[entry],
    )

    assert echoed_omissions(request, result) == [entry]
