"""HTTP-facing request and response shapes. Distinct from the core models
so that a change to the API contract never forces a change to the domain,
and vice versa."""

from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.models import Omission, VenueCategory


# Mirrors app.core.models.Tone by value, not by import. Currently
# identical, but the two are allowed to diverge — e.g. an internal
# tone state that should never be exposed over HTTP.
class ToneSchema(StrEnum):
    NEUTRAL = "neutral"
    FRIENDLY = "friendly"
    CONCISE = "concise"


class LanguageSchema(StrEnum):
    DE = "de"
    EN = "en"


class ReviewRequestSchema(BaseModel):
    """What the frontend sends."""

    venue_name: Annotated[str, Field(min_length=2, max_length=120)]
    # VenueCategory is reused directly, unlike Tone/Language above: it is
    # identical across form, domain and response, and duplicating it
    # would add upkeep without adding any actual decoupling.
    category: VenueCategory = VenueCategory.OTHER
    liked: Annotated[str, Field(default="", max_length=2000)]
    disliked: Annotated[str, Field(default="", max_length=2000)]
    suggestions: Annotated[str, Field(default="", max_length=1000)]
    tone: ToneSchema = ToneSchema.NEUTRAL
    language: LanguageSchema = LanguageSchema.EN
    visit_date: date | None = None


class ReviewResponseSchema(BaseModel):
    """What the frontend receives."""

    id: UUID
    venue_name: str
    category: VenueCategory
    review: str
    headline: str | None
    suggested_rating: int
    omissions: list[Omission]


class ErrorResponseSchema(BaseModel):
    code: str
    message: str
    retry_after_seconds: int | None = None
