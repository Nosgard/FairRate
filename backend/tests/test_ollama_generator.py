"""Tests for the schema Ollama is handed.

Ollama compiles it into a grammar, so what it says is what the model is able
to emit — including the order the fields come in.
"""

from __future__ import annotations

from app.core.models import LlmReviewOutput


def test_the_weight_is_settled_after_the_review_and_no_stars_are_asked_for() -> None:
    """Order is compiled in, so the weight cannot steer the prose that is
    already written, and the stars are the caller's arithmetic, not the
    model's guess."""
    properties = list(LlmReviewOutput.model_json_schema()["properties"])

    assert properties.index("review") < properties.index("complaint_weight")
    assert "suggested_rating" not in properties


def test_every_weight_the_grammar_allows_has_a_star() -> None:
    """Free text here would be a hole in the grammar. A closed set is only
    half of it: a value the schema permits and the arithmetic has no entry
    for raises at runtime, on a real request, after the model answered."""
    from app.core.models import ComplaintWeight, ReviewInput
    from app.core.prompt import stars_for

    allowed = LlmReviewOutput.model_json_schema()["$defs"]
    allowed = allowed["ComplaintWeight"]["enum"]
    request = ReviewInput(venue_name="X", liked="a, b, c", disliked="x")

    assert allowed  # a closed set, not free text
    for value in allowed:
        assert 1 <= stars_for(request, ComplaintWeight(value)) <= 5
