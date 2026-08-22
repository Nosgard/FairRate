"""Wiring. The only place that decides which generator implementation is used"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.adapters.anthropic_generator import AnthropicGenerator
from app.adapters.fake_generator import FakeGenerator
from app.adapters.ollama_generator import OllamaGenerator
from app.config import Settings, get_settings
from app.core.models import GeneratorKind
from app.core.ports import ReviewGenerator
from app.core.prompt import PromptBuilder
from app.core.service import ReviewService

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_generator(settings: SettingsDep) -> ReviewGenerator:
    """Pick the generator based on configuration"""
    prompts = PromptBuilder(version=settings.prompt_version)

    match settings.generator:
        case GeneratorKind.FAKE:
            return FakeGenerator()
        case GeneratorKind.OLLAMA:
            return OllamaGenerator(
                base_url=settings.ollama_base_url,
                model=settings.ollama_model,
                prompt_builder=prompts,
            )
        case GeneratorKind.ANTHROPIC:
            return AnthropicGenerator(
                api_key=settings.anthropic_api_key,
                model=settings.anthropic_model,
                prompt_builder=prompts,
            )


GeneratorDep = Annotated[ReviewGenerator, Depends(get_generator)]


def get_review_service(generator: GeneratorDep) -> ReviewService:
    return ReviewService(generator)


ReviewServiceDep = Annotated[ReviewService, Depends(get_review_service)]
