"""Shared typing for LLM backends (OpenAI API vs local Qwen)."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class PipelineLLMClient(Protocol):
    """Contract used by section_split, extraction, and datasets."""

    model: str

    def create_response(
        self,
        messages: list[dict[str, Any]],
        *,
        response_format: dict[str, Any] | None = None,
        response_format_type: str = "json_schema",
        raw_save_id: str | None = None,
    ) -> dict[str, Any]:
        """Return dict with keys: content (str), usage (dict), optional parsed (dict)."""
        ...
