"""
OpenAI-compatible chat completions for Agent1 / Agent2.

Providers (via ``LLM_PROVIDER`` or explicit ``provider`` arg):
  - openai   → OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
  - deepseek → DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL
  - qwen_api → DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, DASHSCOPE_MODEL
    Default model qwen3.5-plus; see Alibaba Model Studio model catalog for IDs.

Uses the official ``openai`` SDK when installed; otherwise falls back to
``requests`` (already common in this repo) so DeepSeek / DashScope / OpenAI
still work without ``pip install openai``.
"""

from __future__ import annotations

import json
import os
from collections.abc import Iterator
from typing import Any

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


def _resolved_creds(provider: str) -> tuple[str, str, str]:
    cfg = _resolve_provider_config(provider)
    api_key = os.environ.get(cfg["api_key_env"], "").strip()
    # Eligibility / drafting may also mirror the key into OPENAI_API_KEY.
    if not api_key and provider.strip().lower() != "openai":
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(f"{cfg['api_key_env']} is not set")
    base_url = os.environ.get(cfg["base_url_env"], "").strip() or cfg["default_base_url"]
    model = os.environ.get(cfg["model_env"], "").strip() or cfg["default_model"]
    return api_key, base_url.rstrip("/"), model


def _assistant_message_text(message: Any) -> str:
    """Prefer answer content; fall back to reasoning fields used by some APIs."""
    if isinstance(message, dict):
        content = (message.get("content") or "").strip()
        reasoning = (
            message.get("reasoning_content")
            or message.get("reasoning")
            or message.get("refusal")
            or ""
        ).strip()
    else:
        content = (getattr(message, "content", None) or "").strip()
        reasoning = (
            getattr(message, "reasoning_content", None)
            or getattr(message, "reasoning", None)
            or getattr(message, "refusal", None)
            or ""
        )
        if not isinstance(reasoning, str):
            reasoning = str(reasoning or "")
        reasoning = reasoning.strip()

    # Prefer content that already looks like structured JSON.
    if content and "{" in content:
        return content
    if content:
        return content
    return reasoning


def _chat_payload(
    prompt: str,
    *,
    provider: str,
    model: str,
    max_out: int,
    stream: bool,
    json_mode: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_out,
        "stream": stream,
    }
    if json_mode and not stream:
        payload["response_format"] = {"type": "json_object"}
    if provider.strip().lower() in ("qwen_api", "deepseek"):
        payload["enable_thinking"] = False
    return payload


def _http_session():
    """Session that ignores broken macOS/corporate system proxies by default.

    Set ``PROSPECTUS_HTTP_TRUST_ENV=1`` to honor HTTP(S)_PROXY / system proxy.
    """
    import requests

    session = requests.Session()
    trust = os.environ.get("PROSPECTUS_HTTP_TRUST_ENV", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    session.trust_env = trust
    return session


def _chat_via_requests(
    prompt: str,
    *,
    max_new_tokens: int,
    provider: str,
    stream: bool,
    json_mode: bool = False,
) -> str | Iterator[str]:
    try:
        import requests  # noqa: F401
    except ImportError as exc:
        raise ImportError(
            "Neither openai nor requests is installed. "
            "Run: pip install openai   (or: pip install requests)"
        ) from exc

    api_key, base_url, model = _resolved_creds(provider)
    max_out = min(max(256, max_new_tokens), 16384)
    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = _chat_payload(
        prompt,
        provider=provider,
        model=model,
        max_out=max_out,
        stream=stream,
        json_mode=json_mode,
    )
    session = _http_session()
    no_proxy = {"http": None, "https": None}

    if not stream:
        resp = session.post(
            url, headers=headers, json=payload, timeout=180, proxies=no_proxy
        )
        if not resp.ok:
            raise RuntimeError(
                f"{provider} HTTP {resp.status_code}: {resp.text[:500]}"
            )
        data = resp.json()
        try:
            message = data["choices"][0].get("message") or {}
            content = _assistant_message_text(message)
            if not content:
                raise RuntimeError(
                    f"{provider} returned empty content: {json.dumps(data)[:500]}"
                )
            return content
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"{provider} unexpected response: {data!r}"[:500]) from exc

    def _gen() -> Iterator[str]:
        with session.post(
            url,
            headers=headers,
            json=payload,
            timeout=300,
            stream=True,
            proxies=no_proxy,
        ) as resp:
            if not resp.ok:
                raise RuntimeError(
                    f"{provider} HTTP {resp.status_code}: {resp.text[:500]}"
                )
            for raw in resp.iter_lines(decode_unicode=True):
                if not raw:
                    continue
                line = raw.strip()
                if not line.startswith("data:"):
                    continue
                data_str = line[5:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                choices = chunk.get("choices") or []
                if not choices:
                    continue
                delta = (choices[0].get("delta") or {}).get("content")
                if delta:
                    yield delta

    return _gen()


def _chat_via_openai_sdk(
    prompt: str,
    *,
    max_new_tokens: int,
    provider: str,
    stream: bool,
    json_mode: bool = False,
) -> str | Iterator[str]:
    from openai import OpenAI

    api_key, base_url, model = _resolved_creds(provider)
    max_out = min(max(256, max_new_tokens), 16384)

    client_kwargs: dict[str, Any] = {"api_key": api_key, "base_url": base_url}
    # Bypass system HTTP proxies unless explicitly opted in (same as requests path).
    trust = os.environ.get("PROSPECTUS_HTTP_TRUST_ENV", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    if not trust:
        try:
            import httpx

            client_kwargs["http_client"] = httpx.Client(
                trust_env=False, timeout=180.0
            )
        except Exception:
            pass

    client = OpenAI(**client_kwargs)

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_out,
        "stream": stream,
    }
    if json_mode and not stream:
        kwargs["response_format"] = {"type": "json_object"}
    if provider.strip().lower() in ("qwen_api", "deepseek"):
        kwargs["extra_body"] = {"enable_thinking": False}

    if not stream:
        resp = client.chat.completions.create(**kwargs)
        content = _assistant_message_text(resp.choices[0].message)
        if not content:
            raise RuntimeError(f"{provider} returned empty assistant content")
        return content

    def _gen() -> Iterator[str]:
        stream_resp = client.chat.completions.create(**kwargs)
        for chunk in stream_resp:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    return _gen()


def _dispatch(
    prompt: str,
    *,
    max_new_tokens: int,
    provider: str,
    stream: bool,
    json_mode: bool = False,
) -> str | Iterator[str]:
    try:
        import openai  # noqa: F401
    except ImportError:
        return _chat_via_requests(
            prompt,
            max_new_tokens=max_new_tokens,
            provider=provider,
            stream=stream,
            json_mode=json_mode,
        )
    return _chat_via_openai_sdk(
        prompt,
        max_new_tokens=max_new_tokens,
        provider=provider,
        stream=stream,
        json_mode=json_mode,
    )


def run_openai_chat(
    prompt: str,
    *,
    max_new_tokens: int = 4096,
    provider: str = "openai",
    json_mode: bool = False,
) -> str:
    """Single-turn chat: user message = prompt, return assistant text."""
    result = _dispatch(
        prompt,
        max_new_tokens=max_new_tokens,
        provider=provider,
        stream=False,
        json_mode=json_mode,
    )
    assert isinstance(result, str)
    return result


def run_openai_chat_stream(
    prompt: str,
    *,
    max_new_tokens: int = 4096,
    provider: str = "openai",
):
    """Yield assistant text deltas from an OpenAI-compatible streaming completion."""
    result = _dispatch(
        prompt, max_new_tokens=max_new_tokens, provider=provider, stream=True
    )
    chunks: list[str] = []
    for piece in result:  # type: ignore[union-attr]
        chunks.append(piece)
        yield piece
    if not "".join(chunks).strip():
        # Stream produced nothing — retry once without streaming.
        text = run_openai_chat(
            prompt, max_new_tokens=max_new_tokens, provider=provider
        )
        if text:
            yield text
