"""Tests for the prompt builder"""

from __future__ import annotations

import pytest

from app.core.prompt import PromptBuilder


def test_loads_default_system_prompt() -> None:
    builder = PromptBuilder()

    assert builder.version == "v1"
    assert "fairness rules" in builder.system_prompt.lower()


def test_raises_on_unknown_version() -> None:
    with pytest.raises(FileNotFoundError):
        PromptBuilder(version="does-not-exist")


def test_includes_perspective() -> None:
    from app.core.models import Perspective, ReviewInput

    builder = PromptBuilder()
    message = builder.build_user_message(
        ReviewInput(venue_name="Some Place", liked="good", perspective=Perspective.WE)
    )

    assert "Perspective: we" in message
