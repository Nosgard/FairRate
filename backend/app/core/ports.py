"""Ports of the core. Adapters implement them; the core depends on nothing else."""

from __future__ import annotations

from typing import Protocol

from app.core.models import GeneratedReview, ReviewInput


class ReviewGenerator(Protocol):
    """Turns validated input into a fair review. Implemented by adapters.

    A Protocol rather than an abstract base class: adapters satisfy this
    by matching the signature, not by inheriting from it. All Generators
    share no common ancestor."""

    async def generate(self, request: ReviewInput) -> GeneratedReview: ...
