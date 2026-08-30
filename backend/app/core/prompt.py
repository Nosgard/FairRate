"""Builds the prompt sent to the language model. Owns the fairness rules."""

from __future__ import annotations

from pathlib import Path

from app.core.models import ReviewInput

# Resolved relative to this file, not the working directory — the app is
# started from different locations (test, uvicorn, CI), and a relative
# string path would break depending on where that happens to be.
PROMPTS_DIR = Path(__file__).parent / "prompts"
DEFAULT_VERSION = "v1"


class PromptBuilder:
    """Loads a versioned system prompt and renders the user payload."""

    def __init__(self, version: str = DEFAULT_VERSION) -> None:
        self.version = version
        self._system_prompt = self._load(version)

    @staticmethod
    def _load(version: str) -> str:
        path = PROMPTS_DIR / f"{version}_system.md"
        if not path.is_file():
            raise FileNotFoundError(f"No system prompt found at {path}")
        return path.read_text(encoding="utf-8").strip()

    @property
    def system_prompt(self) -> str:
        return self._system_prompt

    def build_user_message(self, request: ReviewInput) -> str:
        """Render the request as data, clearly fenced off from instructions."""
        fields = [
            f"Venue: {request.venue_name}",
            f"Category: {request.category.value}",
            f"Language: {request.language.value}",
            f"Tone: {request.tone.value}",
            f"Perspective: {request.perspective.value}",
        ]
        if request.visit_date:
            fields.append(f"Visit date: {request.visit_date.isoformat()}")
        if request.liked:
            fields.append(f"Liked: {request.liked}")
        if request.disliked:
            fields.append(f"Disliked: {request.disliked}")
        if request.suggestions:
            fields.append(f"Suggestions: {request.suggestions}")

        body = "\n".join(fields)
        # Everything the user wrote lives inside these tags. The system
        # prompt instructs the model to treat their contents as data to
        # review, never as instructions to follow — this is the prompt
        # injection defence, not a filter list that could be bypassed.
        return f"<user_input>\n{body}\n</user_input>"
