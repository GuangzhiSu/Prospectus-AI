"""Instantiate OpenAI or local Qwen client from pipeline config."""

from __future__ import annotations

import os
from pathlib import Path

from .config import PipelineConfig
from .llm_protocol import PipelineLLMClient
from .openai_client import OpenAIClient
from .qwen_local_client import DEFAULT_QWEN_MODEL, QwenLocalClient


def create_pipeline_llm_client(
    config: PipelineConfig,
    *,
    save_raw_dir: Path | str | None = None,
) -> PipelineLLMClient:
    """Single entry for section split + extraction + dataset build."""
    provider = (config.llm_provider or "openai").strip().lower()
    raw = save_raw_dir if config.save_raw_responses else None
    if provider in ("qwen", "qwen_local", "qwen-hf", "local_qwen"):
        model = config.qwen_model or os.environ.get("QWEN_MODEL", DEFAULT_QWEN_MODEL)
        return QwenLocalClient(
            model=model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            save_raw_dir=raw,
        )
    return OpenAIClient(
        model=config.model,
        max_tokens=config.max_tokens,
        temperature=config.temperature,
        save_raw_dir=raw,
    )
