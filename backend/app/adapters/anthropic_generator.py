"""Adapter for the Anthropic API. Translates provider errors into domain errors"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

import anthropic
from pydantic import ValidationError

from app.core.exceptions import InvalidLlmOutputError, LlmUnavailableError
from app.core.models import GeneratedReview, LlmReviewOutput, ReviewInput
from app.core.prompt import PromptBuilder

MAX_TOKENS = 1024


class AnthropicGenerator:
    """Implements ReviewGenerator by calling the Anthropic messages API"""

    def __init__(
        self,
        api_key: str,
        model: str,
        prompt_builder: PromptBuilder | None = None,
    ) -> None:
        if not api_key:
            raise ValueError("An API key is required to use AnthropicGenerator.")

        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model
        self._prompts = prompt_builder or PromptBuilder()

    async def _call_model(self, request: ReviewInput) -> str:
        """Send the prompt and return the raw text response"""
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=MAX_TOKENS,
                system=self._prompts.system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": self._prompts.build_user_message(request),
                    }
                ],
            )
        except anthropic.APIStatusError as exc:
            raise LlmUnavailableError(
                f"Anthropic API returned status {exc.status_code}"
            ) from exc
        except anthropic.APIConnectionError as exc:
            raise LlmUnavailableError("Could not reach the Anthropic API") from exc

        parts = [block.text for block in response.content if block.type == "text"]
        if not parts:
            raise InvalidLlmOutputError("Model returned no text content")

        return "\n".join(parts)

    @staticmethod
    def _parse(raw: str) -> LlmReviewOutput:
        """Turn the raw text into a validated LlmReviewOutput"""
        text = raw.strip()

        # The prompt forbids code fences, but models occasionally add them anyway
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
        """Implements the ReviewGenerator port"""
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
