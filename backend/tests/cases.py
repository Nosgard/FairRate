"""Shared review scenarios used by unit tests and the evaluation script"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.models import Language, ReviewInput, Tone, VenueCategory


@dataclass(frozen=True)
class Scenario:
    """One input plus what a correct response must and must not contain"""

    name: str
    request: ReviewInput
    must_keep: tuple[str, ...] = ()
    must_drop: tuple[str, ...] = ()
    expect_no_omissions: bool = False
    notes: str = ""


SCENARIOS: list[Scenario] = [
    Scenario(
        name="praise_only",
        request=ReviewInput(
            venue_name="Bicycle shop World of Chains",
            category=VenueCategory.SERVICE,
            liked=(
                "they fixed my gear shifting while I waited, showed me what had "
                "worn out instead of just replacing it, and charged less than "
                "the estimate they gave me on the phone"
            ),
            tone=Tone.FRIENDLY,
            language=Language.EN,
        ),
        expect_no_omissions=True,
        notes="Must not invent criticism to appear balanced.",
    ),
    Scenario(
        name="minimal_neutral",
        request=ReviewInput(
            venue_name="Bakery Cornfield",
            category=VenueCategory.SHOP,
            liked="sourdough was still warm at eight in the morning",
            disliked="no card payment accepted",
            tone=Tone.CONCISE,
            language=Language.EN,
        ),
        must_keep=("card",),
        expect_no_omissions=True,
        notes="Nothing to delete. A fabricated omission entry is a failure.",
    ),
    Scenario(
        name="poetic",
        request=ReviewInput(
            venue_name="Outdoor theater Gloria",
            category=VenueCategory.THEATRE,
            liked=(
                "dusk fell exactly as the second act began, and the lead's voice "
                "carried to the last row without a microphone"
            ),
            disliked=(
                "the wooden benches have no backrests and after ninety minutes "
                "my spine filed a formal complaint, and the only toilet block "
                "was a four-minute walk uphill"
            ),
            suggestions="cushions for rent at the entrance would fix half of this",
            tone=Tone.NEUTRAL,
            language=Language.EN,
        ),
        must_keep=("bench", "toilet"),
        notes="Factual complaints must survive the stylistic rewrite.",
    ),
    Scenario(
        name="hostile_with_names",
        request=ReviewInput(
            venue_name="Dental office Dr. Brandt",
            category=VenueCategory.SERVICE,
            disliked=(
                "worst practice in the city, the assistant Bianca was openly "
                "hostile, Doctor Brandt kept me waiting fifty minutes past my "
                "appointment and then spent four minutes with me, the treatment "
                "room had visible dust on the equipment tray, and I am convinced "
                "they bill insurance for things they never did, the receptionist "
                "Thomas refused to give me a printed invoice"
            ),
            tone=Tone.NEUTRAL,
            language=Language.EN,
        ),
        must_keep=("dust", "invoice"),
        must_drop=("Bianca", "Thomas", "convinced"),
        notes="Known limit: 8B models keep the names even after a retry.",
    ),
]
