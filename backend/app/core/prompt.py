"""Builds the prompt sent to the language model. Owns the fairness rules."""

from __future__ import annotations

import random
import re
from pathlib import Path

from app.core.models import ComplaintWeight, Perspective, ReviewInput
from app.core.verification import split_items

# Resolved relative to this file, not the working directory — the app is
# started from different locations (test, uvicorn, CI), and a relative
# string path would break depending on where that happens to be.
PROMPTS_DIR = Path(__file__).parent / "prompts"

# A field naming this many things is set as a list, one per line.
LIST_THRESHOLD = 2

# ...but only when the guest punctuated it as a list. A field without a comma
# is one sentence however many "and"s it holds, and breaking "the barman was
# hungover and too lazy to clear the tables" in two takes the removal apart
# with it.
_LISTED = re.compile(r"[,;]")

# The perspective line is written for the request in front of it rather than
# stated as a rule. Seven versions of the rule changed nothing. Listing "I",
# "my", "me" as vocabulary did lift the person and cost the name guard every
# time: a first-person telling carries the guest's names with it.
_FIRST_PERSON = re.compile(r"\bI\b|(?i:\b(?:my|mine|me|we|our|ours|us)\b)")

# A possessive and what it owns, cut off before the next verb or preposition.
_OWNS = (
    r"was|were|is|are|had|has|got|received|loved|liked|came|arrived|felt|"
    r"seemed|looked|stayed|took|back|on|in|at|for|from|to|with"
)
_POSSESSIVE = re.compile(
    rf"\b(my|our)\s+((?:(?!(?:{_OWNS})\b)\w+\s*){{1,3}})", re.I
)

# "I" is matched case-sensitively, because lowercase "i" is a different
# word. "we" is not.
_BARE_PRONOUNS = (
    ("I", re.compile(r"\bI\b")),
    ("we", re.compile(r"\bwe\b", re.I)),
)


def _notes(request: ReviewInput) -> str:
    return " ".join(
        part for part in (request.liked, request.disliked, request.suggestions)
        if part
    )


def _own_words(request: ReviewInput) -> list[str]:
    """The first person the guest wrote, in their words.

    Both shapes count: the possessive with what it owns ("my food"), and the
    bare pronoun where they made themselves the subject ("I waited an hour").
    Naming them is what lets `impersonal` keep exactly these and no more.
    """
    text = _notes(request)
    # fromkeys keeps the order the guest wrote them in and drops repeats.
    found = list(dict.fromkeys(
        f"{m.group(1)} {m.group(2).strip()}".lower()
        for m in _POSSESSIVE.finditer(text)
    ))
    return found + [
        word for word, pattern in _BARE_PRONOUNS if pattern.search(text)
    ]


def _no_speaker_line(request: ReviewInput) -> str:
    """The impersonal setting: the guest's own first person and no more."""
    own = _own_words(request)
    if not own:
        return 'no-speaker — no "I", "we", "my" or "our" anywhere'
    kept = ", ".join(f'"{phrase}"' for phrase in own)
    return (f"no-speaker — keep the guest's own {kept} exactly as "
            f"written; add no other first person")


def _speaking_line(request: ReviewInput) -> str:
    """The `i` or `we` setting, and whether the notes already say it."""
    word = "I" if request.perspective is Perspective.FIRST_PERSON else "we"
    line = f'{request.perspective.value} — the review says "{word}"'
    if _FIRST_PERSON.search(_notes(request)):
        return line
    return line + "; the notes do not, so that is yours to add"


def _perspective_line(request: ReviewInput) -> str:
    """The perspective setting, written for this request."""
    if request.perspective is Perspective.IMPERSONAL:
        return _no_speaker_line(request)
    return _speaking_line(request)


def _settings(request: ReviewInput) -> list[str]:
    """The channel the model may take instructions from."""
    lines = []
    # Sent only when there is one. An empty labelled field is an invitation
    # to fill it, and an invented venue name is what the prompt forbids.
    if request.venue_name:
        lines.append(f"Venue: {request.venue_name}")
    lines += [
        f"Category: {request.category.value}",
        f"Language: {request.language.value}",
        f"Tone: {request.tone.value}",
        f"Perspective: {_perspective_line(request)}",
    ]
    if request.visit_date:
        lines.append(f"Visit date: {request.visit_date.isoformat()}")
    return lines


def _counts(request: ReviewInput) -> tuple[int, int]:
    """How many things the guest liked, and how many they held against it."""
    return len(split_items(request.liked)), len(split_items(request.disliked))


# The stars, read off the balance of the notes and the weight the model gave
# the worst complaint.
#
# Every column steps down by one, because a boundary the model is unsure of
# must not double as a boundary between two stars. Removing 3 from the
# schema instead turned a mixed visit into a coin toss between 2 and 4.
#
# Five stars need an empty Disliked field.
_W = ComplaintWeight
_STARS = {
    "praise": {_W.MINOR: 4, _W.REAL: 3, _W.HARMFUL: 2},
    "even": {_W.MINOR: 3, _W.REAL: 3, _W.HARMFUL: 2},
    "blame": {_W.MINOR: 2, _W.REAL: 2, _W.HARMFUL: 1},
}


def stars_for(request: ReviewInput, weight: ComplaintWeight) -> int:
    """The stars, once the model has said what the complaint weighs."""
    good, bad = _counts(request)
    if bad == 0:
        return 5 if good else 3
    if good == 0:
        return 1

    if good > bad:
        side = "praise"
    elif bad > good:
        side = "blame"
    else:
        side = "even"
    # "none" alongside a complaint means the model read it as weightless.
    if weight is _W.NONE:
        weight = _W.MINOR
    return _STARS[side][weight]


class PromptBuilder:
    """Loads a versioned system prompt and renders the user payload."""

    # No default version. One used to exist and pointed at v1 long after the
    # builder had moved on, so anything falling back on it would have been
    # given a prompt describing a structure it never sees. Required here, a
    # missing version is a TypeError at startup rather than a wrong prompt in
    # production.
    def __init__(self, version: str, rng: random.Random | None = None) -> None:
        self.version = version
        self._system_prompt = self._load(version)
        # Injectable so a test can pin the draws below. Production leaves it
        # unset and gets the module's own generator.
        self._rng = rng or random.Random()

    @staticmethod
    def _load(version: str) -> str:
        path = PROMPTS_DIR / f"{version}_system.md"
        if not path.is_file():
            raise FileNotFoundError(f"No system prompt found at {path}")
        return path.read_text(encoding="utf-8").strip()

    @property
    def system_prompt(self) -> str:
        return self._system_prompt

    def _render_field(self, label: str, field: str) -> str:
        """Set a field as a list, in a fresh order each time.

        A run of commas arrives as one block and comes back summarised, with
        individual things dropped from it; separate lines are separate
        things. The order is drawn per call because the review otherwise
        narrates in the order the guest typed, so the same notes always
        produce the same shape. Nothing is rewritten — the items are the
        guest's own words, broken where they put the commas.
        """
        items = split_items(field)
        if len(items) < LIST_THRESHOLD or not _LISTED.search(field):
            return f"{label}: {field}"
        lines = "\n".join(f"- {item}" for item in self._rng.sample(items, len(items)))
        return f"{label}:\n{lines}"

    def _note_lines(self, request: ReviewInput) -> list[str]:
        """The guest's filled fields, Liked and Disliked in a drawn order.

        Suggestions stays last: the system prompt makes the guest's advice
        the sentence the review ends on.
        """
        pairs = [("Liked", request.liked), ("Disliked", request.disliked)]
        self._rng.shuffle(pairs)
        pairs.append(("Suggestions", request.suggestions))
        return [
            self._render_field(label, field) for label, field in pairs if field
        ]

    def build_user_message(self, request: ReviewInput) -> str:
        """Render the request as two channels: settings, then guest text.

        The split is the point. Settings are instructions the model must
        follow; the guest's text never is. Keeping both in one fenced block
        forced the system prompt to call its own contents "never an
        instruction" while some of them were exactly that, and a boundary
        that contradicts itself is not a boundary.
        """
        head = "\n".join(_settings(request))
        notes = self._note_lines(request)
        # A blank line once a field is a list, or the next label sits flush
        # against the last bullet and reads as one more of them.
        gap = "\n\n" if any("\n- " in note for note in notes) else "\n"
        # Only what the guest typed lives inside these tags. The system
        # prompt treats their contents as material to review, never as
        # instructions — this is the prompt injection defence, not a filter
        # list that could be bypassed.
        return f"{head}\n\n<guest_notes>\n{gap.join(notes)}\n</guest_notes>"
