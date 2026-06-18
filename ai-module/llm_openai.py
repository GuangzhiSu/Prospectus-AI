"""
OpenAI-compatible chat completions for Agent1 / Agent2.

Providers (via ``LLM_PROVIDER`` or explicit ``provider`` arg):
  - openai   → OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
  - deepseek → DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL
  - qwen_api → DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, DASHSCOPE_MODEL
    Default model qwen3.5-plus; see Alibaba Model Studio model catalog for IDs.
"""

from __future__ import annotations

import os

_PROVIDER_DEFAULTS: dict[str, dict[str, str]] = {
    "openai": {
        "api_key_env": "OPENAI_API_KEY",
        "base_url_env": "OPENAI_BASE_URL",
        "model_env": "OPENAI_MODEL",
        "default_base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
    },
    "deepseek": {
        "api_key_env": "DEEPSEEK_API_KEY",
        "base_url_env": "DEEPSEEK_BASE_URL",
        "model_env": "DEEPSEEK_MODEL",
        "default_base_url": "https://api.deepseek.com",
        "default_model": "deepseek-v4-flash",
    },
    "qwen_api": {
        "api_key_env": "DASHSCOPE_API_KEY",
        "base_url_env": "DASHSCOPE_BASE_URL",
        "model_env": "DASHSCOPE_MODEL",
        "default_base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "default_model": "qwen3.5-plus",
    },
}


def _resolve_provider_config(provider: str) -> dict[str, str]:
    key = provider.strip().lower()
    if key not in _PROVIDER_DEFAULTS:
        raise ValueError(f"Unsupported OpenAI-compatible provider: {provider!r}")
    return _PROVIDER_DEFAULTS[key]


def run_openai_chat(
    prompt: str,
    *,
    max_new_tokens: int = 4096,
    provider: str = "openai",
) -> str:
    """Single-turn chat: user message = prompt, return assistant text."""
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ImportError("pip install openai") from exc

    cfg = _resolve_provider_config(provider)
    api_key = os.environ.get(cfg["api_key_env"], "").strip()
    if not api_key:
        raise RuntimeError(f"{cfg['api_key_env']} is not set")

    base_url = os.environ.get(cfg["base_url_env"], "").strip() or cfg["default_base_url"]
    model = os.environ.get(cfg["model_env"], "").strip() or cfg["default_model"]

    client = OpenAI(api_key=api_key, base_url=base_url)
    max_out = min(max(256, max_new_tokens), 16384)

    kwargs: dict = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_completion_tokens": max_out,
    }
    if provider.strip().lower() == "qwen_api":
        kwargs["extra_body"] = {"enable_thinking": False}

    resp = client.chat.completions.create(**kwargs)
    choice = resp.choices[0]
    return (choice.message.content or "").strip()


def run_openai_chat_stream(
    prompt: str,
    *,
    max_new_tokens: int = 4096,
    provider: str = "openai",
):
    """Yield assistant text deltas from an OpenAI-compatible streaming completion."""
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ImportError("pip install openai") from exc

    cfg = _resolve_provider_config(provider)
    api_key = os.environ.get(cfg["api_key_env"], "").strip()
    if not api_key:
        raise RuntimeError(f"{cfg['api_key_env']} is not set")

    base_url = os.environ.get(cfg["base_url_env"], "").strip() or cfg["default_base_url"]
    model = os.environ.get(cfg["model_env"], "").strip() or cfg["default_model"]

    client = OpenAI(api_key=api_key, base_url=base_url)
    max_out = min(max(256, max_new_tokens), 16384)

    kwargs: dict = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_completion_tokens": max_out,
        "stream": True,
    }
    if provider.strip().lower() == "qwen_api":
        kwargs["extra_body"] = {"enable_thinking": False}

    stream = client.chat.completions.create(**kwargs)
    for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
