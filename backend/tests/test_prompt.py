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
