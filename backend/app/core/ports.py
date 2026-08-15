"""Ports of the core. Adapters implement them; the core depends on nothing else"""

from __future__ import annotations

from typing import Protocol

from app.core.models import GeneratedReview, ReviewInput


class ReviewGenerator(Protocol):
    """Turns validated input into a fair review. Implemented by adapters"""

    async def generate(self, request: ReviewInput) -> GeneratedReview: ...
