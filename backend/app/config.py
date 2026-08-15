"""Application settings, loaded from the environment variables"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration for the application. Values come from .env or the environment"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    anthropic_api_key: str = ""
    model: str = "claude-haiku-4-5-20251001"
    prompt_version: str = "v1"
    use_fake_llm: bool = True


@lru_cache
def get_settings() -> Settings:
    """Cached accessor so the .env file is read only once"""
    return Settings()
