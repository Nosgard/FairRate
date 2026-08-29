"""Application service. Orchestrates generation; knows only the port."""

from __future__ import annotations

import logging

from app.core.models import GeneratedReview, ReviewInput
from app.core.ports import ReviewGenerator
from app.core.verification import leaked_names

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 2


class ReviewService:
    """Turns validated input into a review using an injected generator."""

    def __init__(self, generator: ReviewGenerator) -> None:
        self._generator = generator

    async def create_review(self, request: ReviewInput) -> GeneratedReview:
        result = await self._generator.generate(request)

        for attempt in range(2, MAX_ATTEMPTS + 1):
            leaked = leaked_names(request, result)
            if not leaked:
                return result

            # A second attempt is not a fix — the same prompt can fail the
            # same way twice. It is cheap insurance against non-determinism,
            # not a guarantee. See verification.py for what this can and
            # cannot catch.
            logger.warning(
                "Review leaked %d name candidate(s); retrying (attempt %d)",
                len(leaked),
                attempt,
            )
            result = await self._generator.generate(request)

        # If the retry also leaked, the flawed result is still returned:
        # a review with a name is better than no review at all, and the
        # # warning above already made the failure visible in the logs.
        return result
