"""Application service. Orchestrates generation; knows only the port."""

from __future__ import annotations

import logging

from app.core.exceptions import ContentRejectedError
from app.core.models import GeneratedReview, ReviewInput
from app.core.ports import ReviewGenerator
from app.core.verification import (
    echoed_omissions,
    envelope_artefact,
    instruction_echo,
    leaked_names,
    strip_relevance_commentary,
    strip_removed_clauses,
    unearned_omissions,
)

logger = logging.getLogger(__name__)

# Three, not two: a retry only pays if the next attempt comes back different,
# which it does at the current sampling (see OPTIONS in the Ollama adapter).
# Only requests that failed a check pay for the extra call.
MAX_ATTEMPTS = 3


class ReviewService:
    """Turns validated input into a review using an injected generator."""

    def __init__(self, generator: ReviewGenerator) -> None:
        self._generator = generator

    async def create_review(self, request: ReviewInput) -> GeneratedReview:
        # The last attempt free of envelope syntax, already mended. One that
        # only leaked a name is still servable, so it is kept even when a
        # later attempt comes back with a brace in it.
        sound: GeneratedReview | None = None
        artefact = ""

        for attempt in range(1, MAX_ATTEMPTS + 1):
            result = await self._generator.generate(request)
            artefact = envelope_artefact(result)
            if artefact:
                logger.warning("Review contains response syntax %r "
                               "(attempt %d)", artefact, attempt)
                continue

            sound = self._repair(request, result)
            faults = self._faults(request, result, sound)
            if not faults:
                return sound
            for fault in faults:
                logger.warning("%s (attempt %d)", fault, attempt)

        # Envelope syntax in every attempt means the cause really is in the
        # input, which is what makes refusing honest. On one sample it would
        # not be: the pattern also matches a stray brace, and at this
        # temperature that can be sampling.
        if sound is None:
            logger.warning(
                "Review contains response syntax %r in every attempt; "
                "refusing the request",
                artefact,
            )
            raise ContentRejectedError(
                "The model wrote response syntax into the review text"
            )

        # A leaked name, or an instruction the strippers could not cut, still
        # ships once every attempt has been spent: a flawed review beats no
        # review, and the warnings above made the failure visible.
        return sound

    @staticmethod
    def _faults(
        request: ReviewInput, raw: GeneratedReview, mended: GeneratedReview
    ) -> list[str]:
        """What is still wrong with an attempt, worded for the log.

        Names are read off the raw text and the echo off the mended one: the
        strippers get their turn first, and only what they cannot cut is
        worth a fresh attempt.
        """
        faults = []
        leaked = leaked_names(request, raw)
        if leaked:
            faults.append(f"Review leaked {len(leaked)} name candidate(s)")
        echo = instruction_echo(request, mended)
        if echo:
            faults.append(f"Review still echoes a removed instruction {echo!r}")
        return faults

    @classmethod
    def _repair(
        cls, request: ReviewInput, result: GeneratedReview
    ) -> GeneratedReview:
        """The deterministic clean-ups, applied to whatever comes back.

        These repair rather than reroll: each removes something that is wrong
        wherever it appears, so a fresh sample would be no safer, only slower.
        """
        result = cls._drop_echoed_omissions(request, result)
        result = cls._drop_relevance_commentary(request, result)
        result = cls._drop_removed_clauses(request, result)
        return cls._drop_unearned_omissions(request, result)

    @staticmethod
    def _drop_unearned_omissions(
        request: ReviewInput, result: GeneratedReview
    ) -> GeneratedReview:
        """Clear records of removals the finished review did not make.

        Last in the chain on purpose: the steps above still change the text,
        and what counts is what the guest ends up reading.
        """
        unearned = unearned_omissions(request, result)
        if not unearned:
            return result

        logger.warning("Dropping %d omission(s) the review did not make",
                       len(unearned))
        return result.model_copy(update={"omissions": []})

    @staticmethod
    def _drop_removed_clauses(
        request: ReviewInput, result: GeneratedReview
    ) -> GeneratedReview:
        """Remove clauses that are mostly about content recorded as removed.

        Off-topic material sharing a field with a real complaint is the one
        removal the prompt has never held on its own: the coverage rule asks
        for a sentence per field and the model obliges for the half that
        should have gone.
        """
        review, dropped = strip_removed_clauses(request, result)
        if not dropped:
            return result

        logger.warning("Dropping %d clause(s) about removed content: %r",
                       len(dropped), dropped)
        return result.model_copy(update={"review": review})

    @staticmethod
    def _drop_relevance_commentary(
        request: ReviewInput, result: GeneratedReview
    ) -> GeneratedReview:
        """Remove a sentence that rules on relevance instead of reviewing.

        Such a sentence is a removal that did not happen — the content the
        omissions list claims to have dropped, kept and framed as a
        dismissal.
        """
        review, dropped = strip_relevance_commentary(
            result.review, result.omissions, request.language
        )
        if not dropped:
            return result

        logger.warning("Dropping a sentence that comments on relevance: %r", dropped)
        return result.model_copy(update={"review": review})

    @staticmethod
    def _drop_echoed_omissions(
        request: ReviewInput, result: GeneratedReview
    ) -> GeneratedReview:
        """Remove omission entries whose content is still in the review.

        No retry here, unlike a leaked name: the entry is metadata, so
        deleting it leaves a correct result, while regenerating would reroll
        the review text to fix something that is not wrong with it.
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
