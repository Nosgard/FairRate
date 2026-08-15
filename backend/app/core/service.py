"""Application service. Orchestrates generation; knows only the port"""

from __future__ import annotations

from app.core.models import GeneratedReview, ReviewInput
from app.core.ports import ReviewGenerator


class ReviewService:
    """Turns validated input into a review using an injected generator"""

    def __init__(self, generator: ReviewGenerator) -> None:
        self._generator = generator

    async def create_review(self, request: ReviewInput) -> GeneratedReview:
        return await self._generator.generate(request)
