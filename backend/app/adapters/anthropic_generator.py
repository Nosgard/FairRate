"""Adapter for the Anthropic API. Translates provider errors into domain errors."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

import anthropic
from pydantic import ValidationError

from app.core.exceptions import InvalidLlmOutputError, LlmUnavailableError
from app.core.models import GeneratedReview, LlmReviewOutput, ReviewInput
from app.core.prompt import PromptBuilder, stars_for

# The schema allows a 3000-character review plus up to six omissions,
# which with the JSON envelope runs well past a thousand tokens. At the
# old 1024 a long review was truncated mid-string, and truncated JSON
# fails validation rather than arriving short.
MAX_TOKENS = 4000


class AnthropicGenerator:
    """Implements ReviewGenerator by calling the Anthropic messages API."""

    def __init__(
        self,
        api_key: str,
        model: str,
        prompt_builder: PromptBuilder,
    ) -> None:
        # Checked here, not left to fail on first use: with an empty key
        # the config default would otherwise surface as a cryptic API
        # error on the first request instead of at startup.
        if not api_key:
            raise ValueError("An API key is required to use AnthropicGenerator.")

        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model
        self._prompts = prompt_builder

    async def _call_model(self, request: ReviewInput) -> str:
        """Send the prompt and return the raw text response.

        `parse` rather than `create`, and `output_format` rather than a
        hand-built schema: only `parse` runs the SDK's schema transform.
        The API rejects `maxItems`, `minLength` and the other bounds
        outright, and the transform moves them into the schema description
        rather than dropping them, so the model still sees them. Without it
        the prompt alone decides the format, and every request failed.
        """
        try:
            response = await self._client.messages.parse(
                model=self._model,
                max_tokens=MAX_TOKENS,
                system=self._prompts.system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": self._prompts.build_user_message(request),
                    }
                ],
                output_format=LlmReviewOutput,
            )
        except anthropic.APIStatusError as exc:
            # This is where SDK-specific exceptions stop existing for the
            # rest of the app. The service and API layer never see
            # anthropic.* — only the domain exceptions below.
            raise LlmUnavailableError(
                f"Anthropic API returned status {exc.status_code}"
            ) from exc
        except anthropic.APIConnectionError as exc:
            raise LlmUnavailableError("Could not reach the Anthropic API") from exc
        except ValidationError as exc:
            # `parse` validates against the model before returning, so a
            # bounds violation lands here rather than in _parse below.
            raise InvalidLlmOutputError(
                "Model returned JSON that does not match the expected shape"
            ) from exc

        # The schema only binds when the model finished on its own terms.
        # Both of these mean the text may fall short of it, and saying so
        # beats a confusing validation error further down.
        if response.stop_reason == "refusal":
            raise InvalidLlmOutputError("Model refused to answer")
        if response.stop_reason == "max_tokens":
            raise InvalidLlmOutputError(
                "Model output was cut off at max_tokens"
            )

        parts = [block.text for block in response.content if block.type == "text"]
        if not parts:
            raise InvalidLlmOutputError("Model returned no text content")

        return "\n".join(parts)

    @staticmethod
    def _parse(raw: str) -> LlmReviewOutput:
        """Turn the raw text into a validated LlmReviewOutput.

        Kept after `output_format` on purpose: the schema sent to the API
        carries no bounds, so the shape is guaranteed there and the
        bounds are guaranteed here.
        """
        text = raw.strip()

        # The prompt forbids code fences, but models occasionally add them
        # anyway — stripping them here is cheaper than a failed request.
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
            # Distinct from the JSONDecodeError above: this is syntactically
            # valid JSON that doesn't match the expected shape. Same
            # exception type, different log message, useful when debugging
            # a prompt that returns the wrong fields.
            raise InvalidLlmOutputError(
                "Model returned JSON that does not match the expected shape"
            ) from exc

    async def generate(self, request: ReviewInput) -> GeneratedReview:
        """Implements the ReviewGenerator port."""
        raw = await self._call_model(request)
        parsed = self._parse(raw)

        # id, created_at, venue_name and category never come from the
        # model — they're set here from the request. This is why
        # LlmReviewOutput and GeneratedReview are separate models.
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
