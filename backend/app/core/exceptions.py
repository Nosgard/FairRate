"""Domain exceptions. Adapters translate provider errors into these"""

from __future__ import annotations


class FairRateError(Exception):
    """Base class for all domain errors"""


class LlmUnavailableError(FairRateError):
    """The language model could not be reached"""


class InvalidLlmOutputError(FairRateError):
    """The language model returned output that could not be parsed"""


class ContentRejectedError(FairRateError):
    """The input could not be turned into a review at all"""
