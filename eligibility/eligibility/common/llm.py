"""Eligibility LLM client — same provider model as prospectus drafting.

Uses ``LLM_PROVIDER`` from app settings (via ``buildAgentProcessEnv``):

  - qwen_local  → ai-module local Hugging Face Qwen
  - openai      → OpenAI-compatible HTTP API
  - deepseek    → DeepSeek API
  - qwen_api    → DashScope compatible-mode
  - anthropic   → Anthropic Messages API

Prefers ``ai-module`` backends when that package is on ``PYTHONPATH`` (the web
run route adds it). Falls back to a local OpenAI-compatible client for cloud
providers if ai-module is unavailable.

Hard inspection never imports this module. Stub mode
(``ELIGIBILITY_LLM_STUB=1``) or missing credentials for API providers keeps CI /
offline runs deterministic.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any


class LLMError(RuntimeError):
    """Raised when an LLM call fails and stub mode is disabled."""


def llm_provider() -> str:
    """Same env as drafting: ``LLM_PROVIDER`` (optional eligibility override)."""
    return (
        os.environ.get("ELIGIBILITY_LLM_PROVIDER")
        or os.environ.get("LLM_PROVIDER")
        or "qwen_local"
    ).strip().lower()


def _ensure_ai_module_on_path() -> None:
    """Allow ``import llm_providers`` the same way Agent1/2 do."""
    if "llm_providers" in sys.modules:
        return
    here = Path(__file__).resolve()
    # eligibility/eligibility/common/llm.py → repo root ≈ parents[3]
    candidates = [
        here.parents[3] / "ai-module",
        here.parents[4] / "ai-module" if len(here.parents) > 4 else None,
        Path(os.environ.get("AI_MODULE_ROOT", "")),
        Path(os.environ.get("PROSPECTUS_ROOT", "")) / "ai-module",
    ]
    for cand in candidates:
        if not cand:
            continue
        if (cand / "llm_providers.py").is_file():
            path = str(cand)
            if path not in sys.path:
                sys.path.insert(0, path)
            return


def _provider_has_credentials(provider: str) -> bool:
    if provider == "qwen_local":
        return True  # local weights; load may still fail at call time
    if provider == "anthropic":
        return bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())
    if provider == "deepseek":
        return bool(
            os.environ.get("DEEPSEEK_API_KEY", "").strip()
            or os.environ.get("OPENAI_API_KEY", "").strip()
        )
    if provider == "qwen_api":
        return bool(
            os.environ.get("DASHSCOPE_API_KEY", "").strip()
            or os.environ.get("OPENAI_API_KEY", "").strip()
        )
    if provider == "openai":
        return bool(os.environ.get("OPENAI_API_KEY", "").strip())
    return False


def stub_mode() -> bool:
    flag = os.environ.get("ELIGIBILITY_LLM_STUB", "").strip().lower()
    if flag in ("1", "true", "yes"):
        return True
    if flag in ("0", "false", "no"):
        return False
    # Auto: stub only when the selected API provider has no credentials.
    # Local Qwen never auto-stubs (mirrors drafting: try to load the model).
    return not _provider_has_credentials(llm_provider())


def provider_status() -> dict[str, Any]:
    provider = llm_provider()
    return {
        "provider": provider,
        "stub": stub_mode(),
        "has_credentials": _provider_has_credentials(provider),
    }


def _combine_prompt(system: str, user: str) -> str:
    system = (system or "").strip()
    user = (user or "").strip()
    if system and user:
        return f"{system}\n\n---\n\n{user}"
    return system or user


def _strip_reasoning_preamble(text: str) -> str:
    """Drop chain-of-thought preambles so JSON parsers see the object."""
    cleaned = (text or "").strip()
    if not cleaned:
        return ""
    try:
        from llm_sanitize import strip_model_reasoning  # type: ignore

        cleaned = strip_model_reasoning(cleaned) or cleaned
    except Exception:
        pass
    # Drop common "Thinking Process:" / analysis prefaces without XML tags.
    cleaned = re.sub(
        r"(?is)^\s*(?:thinking process:|analysis:|reasoning:).*?(?=\{)",
        "",
        cleaned,
        count=1,
    )
    return cleaned.strip()


def _repair_json_candidate(candidate: str) -> dict[str, Any] | None:
    """Best-effort repair for truncated / trailing-comma LLM JSON."""
    cleaned = candidate.strip()
    # Drop trailing commas before } or ]
    cleaned = re.sub(r",(\s*[}\]])", r"\1", cleaned)
    # Normalize smart quotes that break JSON.
    cleaned = (
        cleaned.replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Balance braces/brackets if the model cut off mid-object.
    opens = cleaned.count("{") - cleaned.count("}")
    open_lists = cleaned.count("[") - cleaned.count("]")
    if opens > 0 or open_lists > 0:
        patched = cleaned + ("]" * max(0, open_lists)) + ("}" * max(0, opens))
        patched = re.sub(r",(\s*[}\]])", r"\1", patched)
        try:
            return json.loads(patched)
        except json.JSONDecodeError:
            return None
    return None


def _balanced_json_slices(text: str) -> list[str]:
    """Return candidate `{...}` slices using brace balancing (not greedy regex)."""
    out: list[str] = []
    start = -1
    depth = 0
    in_str = False
    escape = False
    for i, ch in enumerate(text):
        if start < 0:
            if ch == "{":
                start = i
                depth = 1
                in_str = False
                escape = False
            continue
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                out.append(text[start : i + 1])
                start = -1
    return out


def _extract_json_object(text: str) -> dict[str, Any]:
    """Parse a JSON object from model output that may include thinking prose."""
    raw = text or ""
    cleaned = _strip_reasoning_preamble(raw)
    if not cleaned and not raw.strip():
        raise LLMError("LLM returned empty content")

    candidates: list[str] = []
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned or raw, re.DOTALL)
    if fence:
        candidates.append(fence.group(1).strip())
    if cleaned:
        candidates.append(cleaned)
        candidates.extend(_balanced_json_slices(cleaned))
    candidates.extend(_balanced_json_slices(raw))

    preferred: dict[str, Any] | None = None
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            parsed = _repair_json_candidate(candidate)
        if not isinstance(parsed, dict):
            continue
        # Prefer feedback-shaped payloads when multiple objects appear.
        if "readiness" in parsed or "headline" in parsed or "gaps" in parsed:
            return parsed
        if preferred is None:
            preferred = parsed
    if preferred is not None:
        return preferred
    raise LLMError(f"LLM returned non-JSON: {raw[:400]}")


def _chat_via_ai_module(
    prompt: str, *, max_tokens: int, json_mode: bool = False
) -> str | None:
    """Return assistant text via drafting backends, or None if unavailable."""
    _ensure_ai_module_on_path()
    try:
        from llm_providers import run_chat  # type: ignore
    except ImportError:
        return None
    return run_chat(prompt, max_new_tokens=max_tokens, json_mode=json_mode)


def _openai_compatible_config(provider: str) -> tuple[str, str, str]:
    if provider == "deepseek":
        return (
            os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").strip()
            or "https://api.deepseek.com",
            (
                os.environ.get("DEEPSEEK_API_KEY")
                or os.environ.get("OPENAI_API_KEY")
                or ""
            ).strip(),
            (
                os.environ.get("DEEPSEEK_MODEL")
                or os.environ.get("OPENAI_MODEL")
                or "deepseek-v4-flash"
            ).strip(),
        )
    if provider == "qwen_api":
        return (
            os.environ.get(
                "DASHSCOPE_BASE_URL",
                "https://dashscope.aliyuncs.com/compatible-mode/v1",
            ).strip()
            or "https://dashscope.aliyuncs.com/compatible-mode/v1",
            (
                os.environ.get("DASHSCOPE_API_KEY")
                or os.environ.get("OPENAI_API_KEY")
                or ""
            ).strip(),
            (
                os.environ.get("DASHSCOPE_MODEL")
                or os.environ.get("OPENAI_MODEL")
                or "qwen3.5-plus"
            ).strip(),
        )
    return (
        os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()
        or "https://api.openai.com/v1",
        os.environ.get("OPENAI_API_KEY", "").strip(),
        (
            os.environ.get("OPENAI_MODEL")
            or os.environ.get("OPENAI_CHAT_MODEL")
            or "gpt-4o-mini"
        ).strip(),
    )


def _chat_openai_compatible(
    system: str,
    user: str,
    *,
    provider: str,
    max_tokens: int,
    temperature: float,
    json_mode: bool,
) -> str:
    base_url, api_key, model = _openai_compatible_config(provider)
    if not api_key:
        raise LLMError(f"No API key configured for provider {provider}")

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    if provider in ("qwen_api", "deepseek"):
        # Reasoning models otherwise stream chain-of-thought into content.
        payload["enable_thinking"] = False

    # Prefer openai SDK; fall back to requests (often already installed).
    try:
        from openai import OpenAI
    except ImportError:
        OpenAI = None  # type: ignore

    try:
        if OpenAI is not None:
            client_kwargs: dict[str, Any] = {"api_key": api_key, "base_url": base_url}
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
            kwargs = dict(payload)
            if provider in ("qwen_api", "deepseek"):
                kwargs.pop("enable_thinking", None)
                kwargs["extra_body"] = {"enable_thinking": False}
            resp = client.chat.completions.create(**kwargs)
            message = resp.choices[0].message
            content = (getattr(message, "content", None) or "").strip()
            reasoning = (
                getattr(message, "reasoning_content", None)
                or getattr(message, "reasoning", None)
                or ""
            )
            if not isinstance(reasoning, str):
                reasoning = str(reasoning or "")
            reasoning = reasoning.strip()
            if content and "{" in content:
                return content
            if content:
                return content
            return reasoning

        import requests

        session = requests.Session()
        trust = os.environ.get("PROSPECTUS_HTTP_TRUST_ENV", "").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        session.trust_env = trust
        url = f"{base_url.rstrip('/')}/chat/completions"
        http = session.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=180,
            proxies={"http": None, "https": None},
        )
        if not http.ok:
            raise LLMError(
                f"LLM call failed ({provider}): HTTP {http.status_code} {http.text[:400]}"
            )
        data = http.json()
        message = data["choices"][0].get("message") or {}
        content = (message.get("content") or "").strip()
        reasoning = (
            message.get("reasoning_content")
            or message.get("reasoning")
            or message.get("refusal")
            or ""
        ).strip()
        if content and "{" in content:
            return content
        if content:
            return content
        return reasoning
    except LLMError:
        raise
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)
        if "ProxyError" in type(exc).__name__ or "Tunnel connection failed" in msg:
            raise LLMError(
                f"LLM call failed ({provider}): HTTPS proxy blocked the request. "
                "ProspectAI bypasses system proxies by default; if you need a proxy, "
                "set PROSPECTUS_HTTP_TRUST_ENV=1 and a working HTTPS_PROXY. "
                f"Details: {msg[:240]}"
            ) from exc
        raise LLMError(f"LLM call failed ({provider}): {exc}") from exc


def _chat_anthropic(system: str, user: str, *, max_tokens: int) -> str:
    try:
        import anthropic
    except ImportError as exc:
        raise LLMError("anthropic package required: pip install anthropic") from exc

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise LLMError("ANTHROPIC_API_KEY is not set")
    model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6").strip()
    client = anthropic.Anthropic(api_key=api_key)
    try:
        resp = client.messages.create(
            model=model,
            max_tokens=min(max(256, max_tokens), 8192),
            system=system or "You are a helpful assistant.",
            messages=[{"role": "user", "content": user}],
        )
    except Exception as exc:  # noqa: BLE001
        raise LLMError(f"Anthropic call failed: {exc}") from exc
    parts: list[str] = []
    for block in resp.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "".join(parts).strip()


def _chat_raw(
    system: str,
    user: str,
    *,
    max_tokens: int = 4096,
    temperature: float = 0.0,
    json_mode: bool = False,
) -> str:
    provider = llm_provider()
    if json_mode:
        # Keep system/user roles for cloud APIs — flattening hurts JSON mode.
        user_suffix = (
            "\n\nReturn a single JSON object only. "
            "Do not include analysis, markdown fences, or thinking text."
        )
        if "json object only" not in user.lower():
            user = (user or "") + user_suffix

    # Cloud providers: call with proper system/user roles (more reliable JSON).
    if provider in ("openai", "deepseek", "qwen_api"):
        return _chat_openai_compatible(
            system,
            user,
            provider=provider,
            max_tokens=max_tokens,
            temperature=temperature,
            json_mode=json_mode,
        )
    if provider == "anthropic":
        return _chat_anthropic(system, user, max_tokens=max_tokens)

    # Local Qwen via ai-module (single-turn prompt).
    prompt = _combine_prompt(system, user)
    if json_mode and "json" not in prompt.lower():
        prompt = prompt + "\n\nReturn a single JSON object only."
    via = _chat_via_ai_module(prompt, max_tokens=max_tokens, json_mode=json_mode)
    if via is not None:
        return via
    if provider == "qwen_local":
        raise LLMError(
            "Local Qwen selected but ai-module is not importable. "
            "Ensure AI_MODULE_ROOT / repo ai-module is on PYTHONPATH "
            "(the web eligibility run route sets this automatically)."
        )
    raise LLMError(f"Unsupported LLM_PROVIDER: {provider}")


def _fallback_stub_payload(
    stub_payload: dict[str, Any] | None, exc: BaseException
) -> dict[str, Any]:
    payload = dict(stub_payload or {"stub": True})
    notes = list(payload.get("notes") or [])
    msg = str(exc)
    notes.append(
        "LLM response unusable — fell back to deterministic structured feedback. "
        f"{type(exc).__name__}: {msg[:240]}"
    )
    payload["notes"] = notes
    payload["stub"] = True
    payload["llm_error"] = msg[:500]
    return payload


def chat_json(
    system: str,
    user: str,
    *,
    stub_payload: dict[str, Any] | None = None,
    temperature: float = 0.0,
    max_tokens: int = 1536,
) -> dict[str, Any]:
    """Call the configured provider and parse a JSON object.

    Retries across json_mode / plain-text modes and salvages thinking prose by
    extracting balanced JSON or asking the model to convert its own output.
    Compatible with OpenAI, DeepSeek, DashScope, Anthropic, and Local Qwen.
    """
    if stub_mode():
        return stub_payload if stub_payload is not None else {"stub": True}

    strict_user = (
        (user or "").rstrip()
        + "\n\nCRITICAL: Reply with ONLY one JSON object. "
        "The first non-whitespace character must be '{'. "
        "No thinking, no markdown, no commentary."
    )
    attempts: list[tuple[str, str, bool]] = [
        (system, user, True),
        (system, strict_user, True),
        (system, strict_user, False),
    ]
    last_exc: BaseException | None = None
    raw_texts: list[str] = []

    for sys_prompt, usr_prompt, use_json_mode in attempts:
        try:
            content = _chat_raw(
                sys_prompt,
                usr_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                json_mode=use_json_mode,
            )
            if content:
                raw_texts.append(content)
            return _extract_json_object(content)
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            continue

    # Salvage: convert the last raw model output into JSON.
    if raw_texts:
        try:
            convert = _chat_raw(
                (
                    "You convert messy model output into one valid JSON object. "
                    "Preserve any readiness/headline/summary/gaps/priority_actions "
                    "fields if present. Output JSON only."
                ),
                "Model output to convert:\n\n" + raw_texts[-1][:8000],
                max_tokens=max_tokens,
                temperature=0.0,
                json_mode=True,
            )
            return _extract_json_object(convert)
        except Exception as exc:  # noqa: BLE001
            last_exc = exc

    if stub_payload is not None and last_exc is not None:
        return _fallback_stub_payload(stub_payload, last_exc)
    if last_exc is not None:
        raise LLMError(str(last_exc)) from last_exc
    raise LLMError("LLM returned no usable JSON")


def chat_text(
    system: str,
    user: str,
    *,
    stub_text: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 1536,
) -> str:
    """Call the configured provider and return plain text."""
    if stub_mode():
        return stub_text if stub_text is not None else (
            "[stub] Eligibility LLM not configured for the selected provider. "
            "Open Settings → Inference backend, save a provider (Local Qwen or "
            "an API key), then re-run."
        )
    return _chat_raw(
        system,
        user,
        max_tokens=max_tokens,
        temperature=temperature,
        json_mode=False,
    )
