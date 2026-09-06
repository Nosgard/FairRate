"""Post-generation checks that run regardless of which generator produced
the output. These catch failures no prompt can rule out."""

from __future__ import annotations

import re

from app.core.models import GeneratedReview, Language, Omission, ReviewInput

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


# Function words carry no evidence either way, so they are stripped before
# the notes below are compared against the review. Kept per language: a
# German note scored against the English list would keep "der", "war" and
# "mit" as content, and those recur throughout a German review — which
# would inflate the overlap and discard entries that are perfectly valid.
_EN_NOISE = frozenset(
    {
        "a",
        "about",
        "after",
        "all",
        "also",
        "an",
        "and",
        "any",
        "are",
        "as",
        "at",
        "be",
        "because",
        "been",
        "but",
        "by",
        "for",
        "from",
        "had",
        "has",
        "have",
        "he",
        "her",
        "his",
        "i",
        "in",
        "is",
        "it",
        "its",
        "me",
        "my",
        "no",
        "not",
        "of",
        "on",
        "one",
        "or",
        "our",
        "out",
        "she",
        "some",
        "than",
        "that",
        "the",
        "their",
        "them",
        "then",
        "there",
        "they",
        "this",
        "to",
        "up",
        "very",
        "was",
        "we",
        "were",
        "what",
        "when",
        "which",
        "who",
        "will",
        "with",
        "would",
        "you",
        "your",
    }
)

_DE_NOISE = frozenset(
    {
        "aber",
        "alle",
        "als",
        "am",
        "an",
        "auch",
        "auf",
        "aus",
        "bei",
        "bin",
        "das",
        "dass",
        "dem",
        "den",
        "der",
        "des",
        "die",
        "dies",
        "doch",
        "ein",
        "eine",
        "einem",
        "einen",
        "einer",
        "eines",
        "er",
        "es",
        "für",
        "hat",
        "hatte",
        "ich",
        "ihr",
        "im",
        "in",
        "ist",
        "ja",
        "kein",
        "mein",
        "mit",
        "nach",
        "nicht",
        "noch",
        "nur",
        "oder",
        "sehr",
        "sich",
        "sie",
        "sind",
        "so",
        "über",
        "um",
        "und",
        "uns",
        "unser",
        "von",
        "vor",
        "war",
        "waren",
        "was",
        "wie",
        "wir",
        "wurde",
        "zu",
        "zum",
    }
)

_WORD = re.compile(r"\w+", re.UNICODE)

# An entry is only discarded when nearly everything it claims to have
# removed is demonstrably still there. The observed failure — a note reading
# "staff took the cost because it was my first visit" against a review that
# kept "The staff waived the cost of my espresso because it was my first
# visit" — scores 0.8, while correctly written notes describe the act of
# removal ("Removed a staff member's name") and share almost nothing with
# the review text, scoring 0.25 or below. The bar sits at the top of that
# empty band, not in the middle of it.
_ECHO_THRESHOLD = 0.8

# Below this, the ratio is noise rather than evidence: a two-word note hits
# 1.0 the moment the review happens to contain one of its words. Short notes
# are therefore kept, whatever their overlap.
_MIN_NOTE_TOKENS = 4


def _content_tokens(text: str, language: Language) -> set[str]:
    """Lowercased, de-noised words, with a plural "s" stripped.

    The normalisation is deliberately crude — no stemmer, so "waived" and
    "waiving" stay distinct. Every word this fails to match lowers the
    overlap, which keeps an entry rather than discarding it, so the gaps
    all fail in the safe direction.
    """
    noise = _DE_NOISE if language is Language.DE else _EN_NOISE
    tokens = set()
    for match in _WORD.finditer(text.lower()):
        word = match.group()
        # A stray single letter — the "s" of a possessive, an initial — is
        # evidence of nothing either way.
        if len(word) < 2 or word in noise:
            continue
        if len(word) >= 4 and word.endswith("s"):
            word = word[:-1]
        tokens.add(word)
    return tokens


def echoed_omissions(request: ReviewInput, result: GeneratedReview) -> list[Omission]:
    """Omission entries whose content is still present in the review.

    An entry asserts that something was taken out. When nearly every word of
    that assertion is still in the text, the assertion is false and the
    entry was invented — the review kept the content and the model listed it
    as removed anyway.

    This catches entries the review contradicts, not entries with no
    referent at all: a note describing something that appears neither in the
    input nor in the review has no overlap and passes unnoticed.
    """
    haystack = _content_tokens(
        f"{result.review} {result.headline or ''}", request.language
    )

    echoed: list[Omission] = []
    for omission in result.omissions:
        tokens = _content_tokens(omission.note, request.language)
        if len(tokens) < _MIN_NOTE_TOKENS:
            continue
        if len(tokens & haystack) / len(tokens) >= _ECHO_THRESHOLD:
            echoed.append(omission)

    return echoed
