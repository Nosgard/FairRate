"""Tests for the Anthropic adapter. No network, no API key, no cost.

The adapter had no tests at all, which is why a total outage went unnoticed:
v7 does not ask for JSON — it forbids it, and its worked example shows an
unquoted pseudo-format. The model copied that faithfully and every request
came back unparseable.
"""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.adapters.anthropic_generator import AnthropicGenerator
from app.config import Settings
from app.core.exceptions import InvalidLlmOutputError
from app.core.models import LlmReviewOutput, ReviewInput
from app.core.prompt import PromptBuilder

# Captured from a real call with the v7 prompt and no output format. Not
# invented: this is what the model actually sent back.
PSEUDO_FORMAT = (
    'omissions: []\n\nreview: "We loved the homemade pasta and the friendly '
    "welcome from the staff. The hour-long wait for the food to arrive was "
    'frustrating, though."\n\nheadline: "Homemade pasta, hour-long wait"'
    "\n\nsuggested_rating: 3"
)

VALID = json.dumps(
    {
        "omissions": [],
        "review": "We were impressed by the friendly staff, and the homemade "
        "pasta was excellent. The wait ran to an hour.",
        "headline": "Homemade pasta, an hour's wait",
        "complaint_weight": "real",
    }
)


def _request() -> ReviewInput:
    return ReviewInput(
        venue_name="Trattoria Bruno",
        liked="Homemade pasta, friendly staff",
        disliked="Waited an hour for the food",
    )


def _generator(parse) -> AnthropicGenerator:
    """An adapter whose client is a stub, so nothing leaves the process."""
    generator = AnthropicGenerator(
        api_key="test-key",
        model="claude-haiku-4-5",
        prompt_builder=PromptBuilder(version=Settings().prompt_version),
    )
    generator._client = SimpleNamespace(  # noqa: SLF001
        messages=SimpleNamespace(parse=parse)
    )
    return generator


def _response(text: str, stop_reason: str = "end_turn") -> SimpleNamespace:
    return SimpleNamespace(
        stop_reason=stop_reason,
        content=[SimpleNamespace(type="text", text=text)],
    )


def test_the_unformatted_prompt_produces_something_unparseable() -> None:
    """The failure this adapter shipped with, held in place by real data."""
    with pytest.raises(InvalidLlmOutputError, match="did not return valid JSON"):
        AnthropicGenerator._parse(PSEUDO_FORMAT)  # noqa: SLF001


async def test_returns_a_review_when_the_answer_matches_the_schema() -> None:
    async def parse(**kwargs):
        assert kwargs["output_format"] is LlmReviewOutput
        return _response(VALID)

    result = await _generator(parse).generate(_request())

    assert result.venue_name == "Trattoria Bruno"
    # Two things liked against one real complaint. The model never named a
    # number; this one is worked out from the weight it did name.
    assert result.suggested_rating == 3
    assert "homemade pasta" in result.review


async def test_reports_a_refusal_rather_than_a_validation_error() -> None:
    """The schema only binds when the model finished on its own terms."""

    async def parse(**kwargs):
        return _response("", stop_reason="refusal")

    with pytest.raises(InvalidLlmOutputError, match="refused"):
        await _generator(parse).generate(_request())


async def test_reports_a_cut_off_answer() -> None:
    async def parse(**kwargs):
        return _response(VALID[:60], stop_reason="max_tokens")

    with pytest.raises(InvalidLlmOutputError, match="cut off"):
        await _generator(parse).generate(_request())


async def test_turns_a_bounds_violation_into_a_domain_error() -> None:
    """`parse` validates before returning, so a too-short headline raises
    inside the SDK call — where nothing used to catch it."""

    async def parse(**kwargs):
        raise ValidationError.from_exception_data("LlmReviewOutput", [])

    with pytest.raises(InvalidLlmOutputError, match="does not match"):
        await _generator(parse).generate(_request())


def test_the_schema_sent_to_the_api_carries_no_unsupported_constraint() -> None:
    """Structured outputs rejects bounds outright. The SDK's transform moves
    them into the description; this holds that in place, because passing the
    raw model schema is a 400."""
    from anthropic.lib._parse._transform import transform_schema

    schema = transform_schema(LlmReviewOutput)
    flat = json.dumps(schema)

    for unsupported in ('"maxItems"', '"minLength"', '"maxLength"',
                        '"minimum"', '"maximum"'):
        assert unsupported not in flat

    assert set(schema["properties"]) == {
        "omissions",
        "review",
        "headline",
        "complaint_weight",
    }
    assert schema["additionalProperties"] is False
