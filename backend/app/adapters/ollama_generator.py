"""Adapter for a local Ollama instance. No API key, no cost, runs offline"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

import httpx
from pydantic import ValidationError

from app.core.exceptions import InvalidLlmOutputError, LlmUnavailableError
from app.core.models import GeneratedReview, LlmReviewOutput, ReviewInput
from app.core.prompt import PromptBuilder

# Local models on CPU hardware can take 30-90 seconds for one review.
# httpx's default timeout (5s) would abort almost every real request.
TIMEOUT_SECONDS = 120.0


class OllamaGenerator:
    """Implements ReviewGenerator by calling a local Ollama server."""

    def __init__(
        self,
        base_url: str,
        model: str,
        prompt_builder: PromptBuilder | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._prompts = prompt_builder or PromptBuilder()

    async def _call_model(self, request: ReviewInput) -> str:
        """Send the prompt to Ollama and return the raw text response"""
        payload = {
            "model": self._model,
            "system": self._prompts.system_prompt,
            "prompt": self._prompts.build_user_message(request),
            # Forces syntactically valid JSON at the Ollama level — the
            # main defence against smaller models producing malformed
            # output. Anthropic's API has no equivalent for this.
            "format": "json",
            "stream": False,
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
            raise InvalidLlmOutputError("Ollama returned not content")

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
                "Model return JSON that does not match the expected shape"
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
            suggested_rating=parsed.suggested_rating,
            omissions=parsed.omissions,
        )
