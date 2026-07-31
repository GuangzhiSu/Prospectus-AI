"""Configuration loading from YAML and env."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class PipelineConfig(BaseModel):
    # openai | qwen_local (local Hugging Face Qwen)
    llm_provider: str = "openai"
    model: str = "gpt-4o"
    # Used when llm_provider is qwen_local; falls back to env QWEN_MODEL
    qwen_model: str | None = None
    max_tokens: int = 8192
    temperature: float = 0.0
    input_folder: str = "./pdfs"
    output_folder: str = "./outputs"
    batch_size: int = 32
    save_raw_responses: bool = False
    sections_only: bool = False
    subsections_only: bool = False
    canonical_sections: list[str] = Field(default_factory=lambda: [
        "Summary", "Risk Factors", "Industry Overview", "Business",
        "Financial Information", "History, Reorganization and Corporate Structure",
        "Connected Transactions", "Directors and Senior Management",
        "Substantial Shareholders", "Future Plans and Use of Proceeds",
        "Underwriting", "Structure of the Global Offering", "Other",
    ])
    subsection_sections: list[str] = Field(default_factory=lambda: [
        "Summary", "Risk Factors", "Industry Overview", "Business",
        "Financial Information", "History, Reorganization and Corporate Structure",
    ])


def load_config(config_path: str | Path | None = None, overrides: dict[str, Any] | None = None) -> PipelineConfig:
    """Load config from YAML file, then apply overrides (e.g. from CLI)."""
    cfg_dict: dict[str, Any] = {}
    if config_path:
        path = Path(config_path)
        if path.exists():
            with open(path) as f:
                cfg_dict = yaml.safe_load(f) or {}
    overrides = overrides or {}
    # Env override for provider (bash scripts can export IPO_LLM_PROVIDER=qwen_local)
    env_provider = os.environ.get("IPO_LLM_PROVIDER")
    if env_provider and "llm_provider" not in overrides:
        cfg_dict["llm_provider"] = env_provider.strip()
    for k, v in overrides.items():
        if v is not None and k in PipelineConfig.model_fields:
            cfg_dict[k] = v
    return PipelineConfig(**cfg_dict)
