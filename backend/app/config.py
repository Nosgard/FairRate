"""Application settings, loaded from the environment variables"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.models import GeneratorKind


class Settings(BaseSettings):
    """Configuration for the application. Values come from .env or the environment"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    generator: GeneratorKind = GeneratorKind.FAKE
    prompt_version: str = "v1"

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"


@lru_cache
def get_settings() -> Settings:
    """Cached accessor so the .env file is read only once"""
    return Settings()
