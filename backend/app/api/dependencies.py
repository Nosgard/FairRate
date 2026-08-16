"""Wiring. The only place that decides which generator implementation is used"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.adapters.anthropic_generator import AnthropicGenerator
from app.adapters.fake_generator import FakeGenerator
from app.config import Settings, get_settings
from app.core.ports import ReviewGenerator
from app.core.prompt import PromptBuilder
from app.core.service import ReviewService

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_generator(settings: SettingsDep) -> ReviewGenerator:
    """Pick the generator based on configuration"""
    if settings.use_fake_llm:
        return FakeGenerator()

    return AnthropicGenerator(
        api_key=settings.anthropic_api_key,
        model=settings.model,
        prompt_builder=PromptBuilder(version=settings.prompt_version),
    )


GeneratorDep = Annotated[ReviewGenerator, Depends(get_generator)]


def get_review_service(generator: GeneratorDep) -> ReviewService:
    return ReviewService(generator)


ReviewServiceDep = Annotated[ReviewService, Depends(get_review_service)]
