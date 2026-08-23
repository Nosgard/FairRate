"""Post-generation checks that run regardless of which generator produced
the output. These catch failures no prompt can rule out"""

from __future__ import annotations

import re

from app.core.models import GeneratedReview, ReviewInput

# Words that start a sentence or are common enough not to be personal names
_STOPWORDS = frozenset(
    {
        "I",
        "The",
        "A",
        "An",
        "This",
        "That",
        "They",
        "We",
        "It",
        "My",
        "Our",
        "But",
        "And",
        "However",
        "Also",
        "When",
        "After",
        "Before",
    }
)

_CAPITALISED = re.compile(r"\b[A-Z][a-z]{2,}\b")


def _name_candidates(request: ReviewInput) -> set[str]:
    """Capitalised words from the input that might be personal names"""
    text = f"{request.liked} {request.disliked} {request.suggestions}"
    venue_words = set(_CAPITALISED.findall(request.venue_name))

    candidates: set[str] = set()
    for match in _CAPITALISED.finditer(text):
        word = match.group()
        if word in _STOPWORDS or word in venue_words:
            continue
        # Skip words that begin a sentence - likely not a name
        preceding = text[: match.start()].rstrip()
        if not preceding or preceding.endswith((".", "!", "?")):
            continue
        candidates.add(word)

    return candidates


def leaked_names(request: ReviewInput, result: GeneratedReview) -> set[str]:
    """Name candidates from the input that still appear in the review text"""
    haystack = f"{result.review} {result.headline or ''}"
    return {
        word
        for word in _name_candidates(request)
        if re.search(rf"\b{re.escape(word)}\b", haystack)
    }
