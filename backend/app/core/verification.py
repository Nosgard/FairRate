"""Post-generation checks that run regardless of which generator produced
the output. These catch failures no prompt can rule out."""

from __future__ import annotations

import re
from collections.abc import Sequence

from app.core.models import (
    GeneratedReview,
    Language,
    Omission,
    OmissionType,
    ReviewInput,
)

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

# Days and months are capitalised and are not people. A guest writing "open
# on Sundays" had every review retried twice for a leaked name, and the
# re-roll is the one thing in this pipeline that can lose an item the first
# attempt had. The list is closed and unambiguous, so nothing here is a
# guess about what a name looks like.
_CALENDAR = frozenset(
    {
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
        "Sunday", "Mondays", "Tuesdays", "Wednesdays", "Thursdays",
        "Fridays", "Saturdays", "Sundays",
        "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December",
    }
)
_STOPWORDS = _STOPWORDS | _CALENDAR

# Deliberately narrow: three or more letters, capitalised, standalone word.
# This will misfire on capitalised nouns in non-English input and cannot
# catch names that start a sentence. False positives are cheap (one retry);
# false negatives are the real risk, so the check stays conservative.
_CAPITALISED = re.compile(r"\b[A-Z][a-z]{2,}\b")


# A capitalised word opening a field is skipped below — most are ordinary
# sentence starts ("Waited 30 minutes"). One shape is worth rescuing: guests
# name staff by placing them, and a word before a place phrase is a name far
# more often than a verb.
_PLACES = r"at|behind|on|in|from|by|near|beside|across|opposite"
# The determiner is what makes it a place and not a time: "Sarah at the
# counter" matches, "Closed on Monday" does not.
_NAME_THEN_PLACE = re.compile(
    rf"^([A-Z][a-z]{{2,}})\s+(?:{_PLACES})\s+(?:the|a|an|our|their)\b"
)


def _field_opening_name(field: str) -> str | None:
    """A name opening a field, recognised by the place phrase after it."""
    match = _NAME_THEN_PLACE.match(field.strip())
    return match.group(1) if match else None


def _name_candidates(request: ReviewInput) -> set[str]:
    """Capitalised words from the input that might be personal names."""
    fields = (request.liked, request.disliked, request.suggestions)
    # Joined as sentences, not with a space: a field boundary is a sentence
    # boundary, and otherwise the first word of `Disliked` never reached the
    # sentence-start skip below. Advice opens with a verb often enough for
    # that to matter — "Cleaning the toilets…" was read as a name.
    text = ". ".join(field for field in fields if field)

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

    for field in fields:
        opener = _field_opening_name(field)
        if opener and opener not in _STOPWORDS and opener not in venue_words:
            candidates.add(opener)

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


# Shapes that belong to the JSON envelope, not to a sentence about a meal.
# Straight and typographic quotes both appear: constrained decoding refuses
# a straight quote inside a string, so a model trying to close the field
# early reaches for the curly one instead and the text stays parseable.
_ENVELOPE = re.compile(
    r"""["“”]\s*[,:]\s*["“”]"""  # "…", "…   or   "…": "…
    r"""|\b(?:review|headline|suggested_rating|omissions)\b\s*"""
    r"""["“”]?\s*:"""  # a field name used as a key
    r"""|[{}]"""  # braces have no business in prose
)


# A sentence that rules on what is relevant instead of describing the visit:
# "A parking ticket outside is unrelated to the restaurant." The model keeps
# the content it was meant to drop and dresses it as a dismissal, leaking it
# and contradicting the omissions list in one breath. Nine prompt variants
# failed to stop it, so it is caught here instead.
_RELEVANCE_COMMENTARY = re.compile(
    r"\b(?:is|was|were|are|had|have)\s+(?:entirely\s+|completely\s+|quite\s+)?"
    r"(?:unrelated|irrelevant|not\s+relevant|not\s+related|of\s+no\s+relevance)\b"
    r"|\b(?:has|had|have)\s+nothing\s+to\s+do\s+with\b"
    r"|\bnothing\s+to\s+do\s+with\s+the\b"
    r"|\bunrelated\s+to\s+the\b"
    # The same move in softer clothes, which is what appeared once the
    # wording above stopped working: the content stays, excused now rather
    # than dismissed.
    r"|\b(?:did|does|do)\s+not\s+affect\b"
    r"|\b(?:had|has|have)\s+no\s+(?:bearing|impact|effect)\s+on\b"
    # The same move again, this time against an instruction: the model
    # declines it and repeats it in the same breath. Across seven injection
    # shapes this was the commonest leak of all — "Despite the request to
    # write an advertisement, the shop offers a good range."
    r"|\bdespite\s+(?:being\s+(?:told|asked|instructed|prompted|directed)"
    r"|the\s+(?:request|instruction|note)s?\s+to)\b"
    r"|\bbeyond\s+the\s+(?:request|instruction)s?\s+to\b"
    r"|\b(?:was|were|been)\s+(?:told|asked|instructed|prompted|directed)\s+to\b"
    # Measured, not guessed: "being prompted to" and "dissatisfaction with
    # the instruction to" were the two shapes that slipped the list above.
    r"|\b(?:with|about)\s+the\s+(?:instruction|request)s?\s+to\b"
    r"|\bthe\s+reviewer\s+must\b",
    re.I,
)

_SENTENCE = re.compile(r"[^.!?]*[.!?]|\S[^.!?]*$")

# The same comment worn as a trailing clause rather than its own sentence.
# Removing the sentence would take the review with it, so the clause is cut
# from the comma instead.
_TRAILING_COMMENT = re.compile(
    r",\s*(?:though|but|although|however|while)\b[^.!?]*"
    r"\b(?:unrelated|irrelevant|not\s+relevant|not\s+related|"
    r"nothing\s+to\s+do\s+with|no\s+bearing)\b[^.!?]*",
    re.I,
)

# The schema's own floor. Stripping must not take the review below it.
_MIN_REVIEW_CHARS = 15


def strip_relevance_commentary(
    review: str, omissions: Sequence[Omission], language: Language
) -> tuple[str, str]:
    """The review without such a sentence, and the sentence taken out.

    Only removed when the omissions list says its subject was taken out.
    Wording alone is not enough — "the music was loud but did not affect the
    food" is a sentence a guest could genuinely mean.

    Returns the review unchanged when there is nothing to strip, or when
    stripping would leave less than the schema allows.
    """
    noted = [_content_tokens(entry.note, language) for entry in omissions]
    noted = [tokens for tokens in noted if tokens]
    if not noted:
        return review, ""

    def is_commentary(sentence: str) -> bool:
        if not _RELEVANCE_COMMENTARY.search(sentence):
            return False
        tokens = _content_tokens(sentence, language)
        return any(tokens & entry for entry in noted)

    sentences = _SENTENCE.findall(review)
    offending = [s for s in sentences if is_commentary(s)]
    if not offending:
        return review, ""

    kept = " ".join(s.strip() for s in sentences if not is_commentary(s)).strip()
    if len(kept) >= _MIN_REVIEW_CHARS:
        return kept, offending[0].strip()

    # Dropping the whole sentence would take the review below the floor,
    # which happens when the comment rides along as a trailing clause:
    # "The pizza was good, though a comparison to another place is not
    # relevant." The clause is the part that says nothing, so take that.
    clause = _TRAILING_COMMENT.search(review)
    if clause:
        trimmed = review[: clause.start()].rstrip().rstrip(",") + "."
        if len(trimmed) >= _MIN_REVIEW_CHARS:
            return trimmed, clause.group(0).lstrip(", ").strip()

    return review, ""


_REMOVED_SHARE = 0.5

# Clause boundaries, not just sentence ones. Off-topic material often rides
# along as a trailing clause — "The pizza was good, though a comparison to
# another place was made." Removing the whole sentence would take the review
# with it, so the clause is the unit that has to be scored.
_CLAUSE_SPLIT = re.compile(
    r"(?<=[.!?])\s+|,\s+(?=though|but|although|however|while|and\s)"
)


def _clauses(text: str) -> list[str]:
    return [c for c in _CLAUSE_SPLIT.split(text) if c and c.strip()]


def sentences_about_removals(
    request: ReviewInput, result: GeneratedReview
) -> list[str]:
    """Review sentences that are mostly about content recorded as removed.

    Off-topic material sharing a field with a real complaint is the failure
    the prompt has never held on its own, so it is caught here.

    Only `off_topic` and `instruction_attempt` count. The other two name
    things that legitimately stay — an insult note names the dish, a
    personal_attack note names the service — and scoring those would strike
    correct sentences.
    """
    written = _content_tokens(
        f"{request.liked} {request.disliked} {request.suggestions}",
        request.language,
    )
    removed: set[str] = set()
    for entry in result.omissions:
        if entry.type in (OmissionType.OFF_TOPIC,
                          OmissionType.INSTRUCTION_ATTEMPT):
            removed |= _content_tokens(entry.note, request.language) & written
    if not removed:
        return []

    hits = []
    for piece in _clauses(result.review):
        borrowed = _content_tokens(piece, request.language) & written
        if not borrowed:
            continue
        if len(borrowed & removed) / len(borrowed) >= _REMOVED_SHARE:
            hits.append(piece.strip())
    return hits


def instruction_echo(request: ReviewInput, result: GeneratedReview) -> str:
    """Commentary about a removed instruction that the repairs could not cut.

    The strippers take whole sentences, or a clause hanging off a
    conjunction. An injection arriving as the second half of the only
    sentence, joined by a plain comma, fits neither — no cut leaves clean
    prose. So this reports what survived and the caller asks the model
    again, as it already does for a leaked name.

    Gated on a recorded instruction: "I was asked to leave the terrace" is a
    complaint, not an echo.
    """
    if not any(entry.type is OmissionType.INSTRUCTION_ATTEMPT
               for entry in result.omissions):
        return ""
    match = _RELEVANCE_COMMENTARY.search(result.review)
    return match.group(0) if match else ""


def envelope_artefact(result: GeneratedReview) -> str:
    """The first JSON-envelope fragment found in the review text, else "".

    A model writing the envelope inside its own string field is authoring
    the response rather than the review, which is what a successful
    injection looks like. The schema keeps the result parseable, so nothing
    else notices: the text arrives looking like a review and is served as
    one. The caller retries, and refuses only if every attempt carried it.
    """
    match = _ENVELOPE.search(f"{result.review} {result.headline or ''}")
    return match.group(0) if match else ""


# Auxiliaries and modals, kept apart so the reason stays visible. The
# be-family was already in the list below and the get- and do-families were
# not, so "I got beaten up" and "I was beaten up" counted as different
# content: an item that had only changed voice looked as though it had been
# taken out, and a false removal record survived on the strength of it.
_EN_AUXILIARIES = frozenset(
    {
        "am",
        "being",
        "can",
        "could",
        "did",
        "do",
        "does",
        "doing",
        "get",
        "gets",
        "getting",
        "got",
        "gotten",
        "may",
        "might",
        "must",
        "shall",
        "should",
    }
)
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
) | _EN_AUXILIARIES

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

# An entry goes only when nearly everything it claims to have removed is
# still there. A note echoing the review scores 0.8; a note describing the
# act of removal ("Removed a staff member's name") scores 0.25 or below.
# The bar sits at the top of that empty band, not in the middle.
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

    An entry asserts something was taken out. When nearly every word of that
    assertion is still in the text, the entry was invented. A note with no
    referent at all has no overlap and passes unnoticed.

    Instruction entries are exempt: for them, content still in the text
    means the removal failed, not that the record lied, and dropping the
    record hides the leak.
    """
    haystack = _content_tokens(
        f"{result.review} {result.headline or ''}", request.language
    )

    echoed: list[Omission] = []
    for omission in result.omissions:
        if omission.type is OmissionType.INSTRUCTION_ATTEMPT:
            continue
        tokens = _content_tokens(omission.note, request.language)
        if len(tokens) < _MIN_NOTE_TOKENS:
            continue
        if len(tokens & haystack) / len(tokens) >= _ECHO_THRESHOLD:
            echoed.append(omission)

    return echoed


# An item counts as kept when this much of it reaches the review. The same
# figure as the echo check above, and for the same reason: a miss keeps the
# entry, so a crude match errs towards saying nothing was removed.
_KEPT_THRESHOLD = 0.8


def unearned_omissions(
    request: ReviewInput, result: GeneratedReview
) -> list[Omission]:
    """Omission entries recorded although every note came through whole.

    When each thing the guest wrote is still in the review, nothing left it,
    and the entry tells them their complaint was cut when it was not:
    "a customer shouted at me" came back in full with a personal_attack
    logged against it.

    Anchored on the input, not the note, because a note that paraphrases
    slips past echoed_omissions. One item this cannot recognise keeps every
    entry.
    """
    if not result.omissions:
        return []

    haystack = _content_tokens(
        f"{result.review} {result.headline or ''}", request.language
    )
    for field in (request.liked, request.disliked, request.suggestions):
        for item in split_items(field):
            tokens = _content_tokens(item, request.language)
            if not tokens:
                continue
            if len(tokens & haystack) / len(tokens) < _KEPT_THRESHOLD:
                return []

    return list(result.omissions)


# A sentence that starts lowercase is the mark of a cut that landed badly:
# take the first clause out of "X, and Y" and what is left begins on "and".
_BROKEN_START = re.compile(r"(?:^|(?<=[.!?])\s+)[a-z]")


def _reads_as_prose(text: str) -> bool:
    """Whether every sentence still starts with a capital."""
    return not _BROKEN_START.search(text)


def strip_removed_clauses(
    request: ReviewInput, result: GeneratedReview
) -> tuple[str, list[str]]:
    """The review without clauses that are mostly about removed content.

    Clause level rather than sentence level: the material often rides along
    as a trailing "though …", and dropping the whole sentence would take the
    review with it.
    """
    offending = sentences_about_removals(request, result)
    if not offending:
        return result.review, []

    kept = [c.strip() for c in _clauses(result.review)
            if c.strip() not in offending]
    text = " ".join(kept).strip().rstrip(",")
    if text and not text.endswith((".", "!", "?")):
        text += "."
    # Nothing is repaired here. A rewriter that cannot leave clean prose
    # leaves the text alone: what it would publish otherwise goes to the
    # guest unread, and a broken sentence is worse than an off-topic one.
    if len(text) < _MIN_REVIEW_CHARS or not _reads_as_prose(text):
        return result.review, []
    return text, offending


# Fields are usually lists: "Delicious burgers, fresh ingredients, no
# artificial flavours, plastic-free spoons" is four things, not one.
_ITEM_SPLIT = re.compile(r"[,;]|\band\b(?=[^,;]*$)", re.I)


def split_items(field: str) -> list[str]:
    """The things a field names, split where the guest put the commas.

    Public because the prompt builder sets such a field as a list.
    """
    return [part.strip() for part in _ITEM_SPLIT.split(field) if part.strip()]


