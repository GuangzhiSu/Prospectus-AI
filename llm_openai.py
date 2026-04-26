"""
OpenAI-compatible chat completions for Agent2 / Agent1 when LLM_PROVIDER=openai.

Env:
  OPENAI_API_KEY (required)
  OPENAI_BASE_URL (optional; default api.openai.com)
  OPENAI_MODEL (optional; default gpt-4o-mini)
"""

from __future__ import annotations

import os


def run_openai_chat(prompt: str, *, max_new_tokens: int = 4096) -> str:
    """Single-turn chat: user message = prompt, return assistant text."""
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ImportError("pip install openai") from exc

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    base_url = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip()

    kwargs: dict = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url

    client = OpenAI(**kwargs)
    # Map "new tokens" to a reasonable max_completion_tokens (API uses completion side).
    max_out = min(max(256, max_new_tokens), 16384)

    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=max_out,
    )
    choice = resp.choices[0]
    text = (choice.message.content or "").strip()
    return text
