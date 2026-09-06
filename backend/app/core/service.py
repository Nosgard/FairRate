"""Application service. Orchestrates generation; knows only the port."""

from __future__ import annotations

import logging

from app.core.models import GeneratedReview, ReviewInput
from app.core.ports import ReviewGenerator
from app.core.verification import echoed_omissions, leaked_names

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
                return self._drop_echoed_omissions(request, result)

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
        return self._drop_echoed_omissions(request, result)

    @staticmethod
    def _drop_echoed_omissions(
        request: ReviewInput, result: GeneratedReview
    ) -> GeneratedReview:
        """Remove omission entries whose content is still in the review.

        No retry here, unlike a leaked name: the entry is metadata, so
        deleting it leaves a correct result, while regenerating would reroll
        the review text as well to fix something that is not wrong with it.
        """
        echoed = echoed_omissions(request, result)
        if not echoed:
            return result

        logger.warning(
            "Dropping %d omission(s) still present in the review text",
            len(echoed),
        )
        kept = [entry for entry in result.omissions if entry not in echoed]
        return result.model_copy(update={"omissions": kept})
