"""Builds the prompt sent to the language model. Owns the fairness rules"""

from __future__ import annotations

from pathlib import Path

from app.core.models import ReviewInput

PROMPTS_DIR = Path(__file__).parent / "prompts"
DEFAULT_VERSION = "v1"


class PromptBuilder:
    """Loads a versioned system prompt and renders the user payload"""

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
