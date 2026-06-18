"""
Unified LLM entry point for Agent1 / Agent2.

Dispatches by ``LLM_PROVIDER`` env:
  - qwen_local  → llm_qwen (Hugging Face, in-process)
  - openai      → llm_openai (OpenAI-compatible)
  - deepseek    → llm_openai (DeepSeek API)
  - qwen_api    → llm_openai (DashScope compatible-mode)
  - anthropic   → llm_anthropic (Claude / Opus)
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from typing import Any


def llm_provider() -> str:
    return (os.environ.get("LLM_PROVIDER") or "qwen_local").strip().lower()


def is_local_qwen() -> bool:
    return llm_provider() == "qwen_local"


def run_chat(
    prompt: str,
    *,
    model_name: str | None = None,
    model: Any = None,
    tokenizer: Any = None,
    max_new_tokens: int = 4096,
) -> str:
    """Route a single-turn prompt to the configured backend."""
    return "".join(
        run_chat_stream(
            prompt,
            model_name=model_name,
            model=model,
            tokenizer=tokenizer,
            max_new_tokens=max_new_tokens,
        )
    )


def run_chat_stream(
    prompt: str,
    *,
    model_name: str | None = None,
    model: Any = None,
    tokenizer: Any = None,
    max_new_tokens: int = 4096,
) -> Iterator[str]:
    """Route a single-turn prompt; yield assistant text chunks as they arrive."""
    provider = llm_provider()

    if provider == "anthropic":
        from llm_anthropic import run_anthropic_chat_stream

        yield from run_anthropic_chat_stream(prompt, max_new_tokens=max_new_tokens)
        return

    if provider in ("openai", "deepseek", "qwen_api"):
        from llm_openai import run_openai_chat_stream

        yield from run_openai_chat_stream(
            prompt, max_new_tokens=max_new_tokens, provider=provider
        )
        return

    from llm_qwen import run_qwen_text_stream, run_qwen_with_model_stream

    resolved = model_name or os.environ.get("AGENT2_MODEL") or os.environ.get(
        "AGENT1_MODEL", "Qwen/Qwen3.5-4B"
    )
    if model is not None and tokenizer is not None:
        yield from run_qwen_with_model_stream(
            model, tokenizer, prompt, max_new_tokens=max_new_tokens
        )
    else:
        yield from run_qwen_text_stream(
            prompt, model_name=resolved, max_new_tokens=max_new_tokens
        )
