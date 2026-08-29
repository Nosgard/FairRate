"""Domain exceptions. Adapters translate provider errors into these."""

from __future__ import annotations


class FairRateError(Exception):
    """Base class for all domain errors."""


class LlmUnavailableError(FairRateError):
    """The language model could not be reached.

    Raised for network failures, timeouts and provider outages —
    anything where retrying later might succeed."""


class InvalidLlmOutputError(FairRateError):
    """The language model returned output that could not be parsed.

    Raised for malformed JSON or JSON that doesn't match LlmReviewOutput —
    a problem with this response, not necessarily the next one."""


class ContentRejectedError(FairRateError):
    """The input could not be turned into a review at all.

    Currently unused by any adapter; reserved for a future rule that refuses
    generation outright rather than softening or deleting content."""
