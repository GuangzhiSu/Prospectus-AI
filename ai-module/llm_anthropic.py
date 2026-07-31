"""
Anthropic Messages API for Agent1 / Agent2 when LLM_PROVIDER=anthropic.

Env:
  ANTHROPIC_API_KEY (required)
  ANTHROPIC_MODEL (optional; default claude-sonnet-4-6)
"""

from __future__ import annotations

import os


def run_anthropic_chat(prompt: str, *, max_new_tokens: int = 4096) -> str:
    """Single-turn chat: user message = prompt, return assistant text."""
    try:
        import anthropic
    except ImportError as exc:
        raise ImportError("pip install anthropic") from exc

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6").strip()
    max_out = min(max(256, max_new_tokens), 8192)

    client = anthropic.Anthropic(api_key=api_key)
    resp = client.messages.create(
        model=model,
        max_tokens=max_out,
        messages=[{"role": "user", "content": prompt}],
    )
    parts: list[str] = []
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "".join(parts).strip()


def run_anthropic_chat_stream(prompt: str, *, max_new_tokens: int = 4096):
    """Yield assistant text deltas from Anthropic streaming Messages API."""
    try:
        import anthropic
    except ImportError as exc:
        raise ImportError("pip install anthropic") from exc

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6").strip()
    max_out = min(max(256, max_new_tokens), 8192)

    client = anthropic.Anthropic(api_key=api_key)
    with client.messages.stream(
        model=model,
        max_tokens=max_out,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            if text:
                yield text
