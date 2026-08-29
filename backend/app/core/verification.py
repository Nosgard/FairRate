"""Post-generation checks that run regardless of which generator produced
the output. These catch failures no prompt can rule out."""

from __future__ import annotations

import re

from app.core.models import GeneratedReview, ReviewInput

# Words that start a sentence or are common enough not to be personal names.
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

# Deliberately narrow: three or more letters, capitalised, standalone word.
# This will misfire on capitalised nouns in non-English input and cannot
# catch names that start a sentence. False positives are cheap (one retry);
# false negatives are the real risk, so the check stays conservative.
_CAPITALISED = re.compile(r"\b[A-Z][a-z]{2,}\b")


def _name_candidates(request: ReviewInput) -> set[str]:
    """Capitalised words from the input that might be personal names."""
    text = f"{request.liked} {request.disliked} {request.suggestions}"

    # Words that are part of the venue name are allowed to reappear
    # (e.g. "Dental office Dr. Brandt" legitimately contains "Brandt").
    venue_words = set(_CAPITALISED.findall(request.venue_name))

    candidates: set[str] = set()
    for match in _CAPITALISED.finditer(text):
        word = match.group()
        if word in _STOPWORDS or word in venue_words:
            continue
        # Skip words that begin a sentence - likely not a name.
        preceding = text[: match.start()].rstrip()
        if not preceding or preceding.endswith((".", "!", "?")):
            continue
        candidates.add(word)

    return candidates


def leaked_names(request: ReviewInput, result: GeneratedReview) -> set[str]:
    """Name candidates from the input that still appear in the review text.

    This is a heuristic, not a guarantee: it cannot detect every real name,
    and it will occasionally flag words that aren't names at all. It exists
    because the prompt alone cannot be trusted to remove names reliably,
    especially with smaller local models (see docs/ for measured results).
    """
    haystack = f"{result.review} {result.headline or ''}"
    return {
        word
        for word in _name_candidates(request)
        if re.search(rf"\b{re.escape(word)}\b", haystack)
    }
