"""Adapter for a local Ollama instance. No API key, no cost, runs offline"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

import httpx
from pydantic import ValidationError

from app.core.exceptions import InvalidLlmOutputError, LlmUnavailableError
from app.core.models import GeneratedReview, LlmReviewOutput, ReviewInput
from app.core.prompt import PromptBuilder, stars_for

# Local models on CPU hardware can take 30-90 seconds for one review.
# httpx's default timeout (5s) would abort almost every real request.
TIMEOUT_SECONDS = 120.0

# Ollama's own defaults apply to whatever the Modelfile leaves unset, and
# qwen2.5 sets nothing.
#
# num_ctx: the default 2048 truncates the system prompt, and the model then
# invents. 8192 holds the longest allowed input plus the answer.
#
# temperature / top_p / min_p: room to say the same facts differently, which
# is what regenerate is for. top_p 1.0 with a min_p floor halved the
# phrasing overlap between repeats; higher temperature buys no more variety
# and starts leaking names.
OPTIONS = {
    "num_ctx": 8192,
    "temperature": 0.9,
    "top_p": 1.0,
    "min_p": 0.02,
    "repeat_penalty": 1.05,
}


class OllamaGenerator:
    """Implements ReviewGenerator by calling a local Ollama server."""

    def __init__(
        self,
        base_url: str,
        model: str,
        prompt_builder: PromptBuilder,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._prompts = prompt_builder

    async def _call_model(self, request: ReviewInput) -> str:
        """Send the prompt to Ollama and return the raw text response"""
        payload = {
            "model": self._model,
            "system": self._prompts.system_prompt,
            "prompt": self._prompts.build_user_message(request),
            # The schema itself, not just "json". Ollama constrains decoding
            # to it, so a wrong enum value or a missing field cannot be
            # produced at all, where "json" only guaranteed matching braces.
            # Taken from the model that validates the result, so prompt and
            # validation cannot drift apart.
            "format": LlmReviewOutput.model_json_schema(),
            "stream": False,
            "options": OPTIONS,
        }

        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{self._base_url}/api/generate",
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise LlmUnavailableError(
                f"Ollama returned status {exc.response.status_code}"
            ) from exc
        except httpx.RequestError as exc:
            raise LlmUnavailableError(
                f"Could not reach Ollama at {self._base_url}"
            ) from exc

        try:
            envelope = response.json()
        except ValueError as exc:
            raise InvalidLlmOutputError("Ollama returned a malformed envelope") from exc

        # Ollama wraps the model's output in an envelope; the actual
        # payload is a JSON *string* inside "response", not inline JSON.
        # This is the layer AnthropicGenerator doesn't need.
        text = envelope.get("response", "")
        if not text:
            raise InvalidLlmOutputError("Ollama returned no content")

        return str(text)

    @staticmethod
    def _parse(raw: str) -> LlmReviewOutput:
        """Turn the inner JSON string into a validated LlmReviewOutput."""
        text = raw.strip()

        if text.startswith("```"):
            text = text.removeprefix("```json").removeprefix("```")
            text = text.removesuffix("```").strip()

        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            raise InvalidLlmOutputError("Model did not return valid JSON") from exc

        try:
            return LlmReviewOutput.model_validate(payload)
        except ValidationError as exc:
            raise InvalidLlmOutputError(
                "Model returned JSON that does not match the expected shape"
            ) from exc

    async def generate(self, request: ReviewInput) -> GeneratedReview:
        """Implements the ReviewGenerator port."""
        raw = await self._call_model(request)
        parsed = self._parse(raw)

        return GeneratedReview(
            id=uuid4(),
            created_at=datetime.now(UTC),
            venue_name=request.venue_name,
            category=request.category,
            review=parsed.review,
            headline=parsed.headline,
            suggested_rating=stars_for(request, parsed.complaint_weight),
            omissions=parsed.omissions,
        )
