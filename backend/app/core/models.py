"""Domain models. This module must not import any infrastructure"""

from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class VenueCategory(StrEnum):
    """Type of venue being reviewed. Influences wording in the prompt"""

    RESTAURANT = "restaurant"
    CAFE = "cafe"
    BAR = "bar"
    HOTEL = "hotel"
    CINEMA = "cinema"
    THEATRE = "theatre"
    MUSEUM = "museum"
    SHOP = "shop"
    SERVICE = "service"
    OTHER = "other"


class Tone(StrEnum):
    """Requested tone of the generated review"""

    NEUTRAL = "neutral"
    FRIENDLY = "friendly"
    CONCISE = "concise"


class Language(StrEnum):
    DE = "de"
    EN = "en"


class OmissionType(StrEnum):
    """Reason why part of the user input was not carried over"""

    INSULT = "insult"
    PERSONAL_ATTACK = "personal_attack"
    UNVERIFIABLE_CLAIM = "unverifiable_claim"
    OFF_TOPIC = "off_topic"
    INSTRUCTION_ATTEMPT = "instruction_attempt"


class ReviewInput(BaseModel):
    """Validated form input. The only entry point for user data"""

    venue_name: Annotated[str, Field(min_length=2, max_length=120)]
    category: VenueCategory = VenueCategory.OTHER

    liked: Annotated[str, Field(default="", max_length=2000)]
    disliked: Annotated[str, Field(default="", max_length=2000)]
    suggestions: Annotated[str, Field(default="", max_length=1000)]

    tone: Tone = Tone.NEUTRAL
    language: Language = Language.EN
    visit_date: date | None = None

    @field_validator("venue_name", "liked", "disliked", "suggestions")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def require_content(self) -> ReviewInput:
        if not (self.liked or self.disliked):
            raise ValueError("Please tell at least what you liked or what you didn't")
        return self

    @model_validator(mode="after")
    def reject_future_date(self) -> ReviewInput:
        if self.visit_date and self.visit_date > date.today():
            raise ValueError("The visit date cannot be in the future")
        return self


class Omission(BaseModel):
    """A part of the input that was deliberately left out"""

    type: OmissionType
    note: Annotated[str, Field(max_length=200)]


class GeneratedReview(BaseModel):
    """The core result. Enriched with metadata at the API layer"""

    id: UUID
    created_at: datetime
    venue_name: str
    category: VenueCategory
    review: Annotated[str, Field(min_length=40, max_length=3000)]
    headline: Annotated[str, Field(max_length=80)] | None = None
    suggested_rating: Annotated[int, Field(ge=1, le=5)]
    omissions: list[Omission] = []
