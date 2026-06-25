"""OpenAI API wrapper: retries, rate limits, structured output, logging. Batch API can replace this layer later."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import structlog
from openai import OpenAI
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = structlog.get_logger()

# Rate limit and server errors to retry
RETRY_EXCEPTIONS = (Exception,)  # OpenAI can raise various; tenacity will retry


def _get_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    base_url = os.environ.get("OPENAI_BASE_URL")
    return OpenAI(api_key=api_key, base_url=base_url if base_url else None)


class OpenAIClient:
    """Wrapper for OpenAI Responses API with retries, timeouts, structured output, and optional raw response saving."""

    def __init__(
        self,
        model: str = "gpt-4o",
        max_tokens: int = 8192,
        temperature: float = 0.0,
        save_raw_dir: Path | str | None = None,
        request_timeout: float = 120.0,
    ):
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.save_raw_dir = Path(save_raw_dir) if save_raw_dir else None
        self.request_timeout = request_timeout
        self._client: OpenAI | None = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            self._client = _get_client()
        return self._client

    @retry(
        retry=retry_if_exception_type(RETRY_EXCEPTIONS),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        reraise=True,
    )
    def create_response(
        self,
        messages: list[dict[str, Any]],
        *,
        response_format: dict[str, Any] | None = None,
        response_format_type: str = "json_schema",
        raw_save_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Call chat completions (Responses API). Supports structured output via response_format (JSON schema).
        Returns the parsed content and usage; if response_format is set, content is parsed as JSON.
        """
        body: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
        }
        if response_format:
            body["response_format"] = {
                "type": response_format_type,
                "json_schema": response_format,
            }
        logger.info("openai_request", model=self.model, num_messages=len(messages))
        response = self.client.chat.completions.create(**body, timeout=self.request_timeout)
        choice = response.choices[0] if response.choices else None
        if not choice:
            raise ValueError("Empty choices in OpenAI response")
        content = (choice.message.content or "").strip()
        usage = getattr(response, "usage", None)
        usage_dict = {}
        if usage:
            usage_dict = {
                "prompt_tokens": getattr(usage, "prompt_tokens", None),
                "completion_tokens": getattr(usage, "completion_tokens", None),
                "total_tokens": getattr(usage, "total_tokens", None),
            }
            logger.info("openai_usage", **usage_dict)
        if raw_save_id and self.save_raw_dir:
            self.save_raw_response(raw_save_id, messages, content, usage_dict)
        out: dict[str, Any] = {"content": content, "usage": usage_dict, "finish_reason": getattr(choice, "finish_reason", None)}
        if response_format and content:
            try:
                out["parsed"] = json.loads(content)
            except json.JSONDecodeError as e:
                logger.warning("openai_json_parse_failed", raw_preview=content[:200], error=str(e))
                out["parse_error"] = str(e)
        return out

    def save_raw_response(self, save_id: str, messages: list[dict], content: str, usage: dict) -> None:
        """Write raw request/response to a file for debugging."""
        if not self.save_raw_dir:
            return
        self.save_raw_dir.mkdir(parents=True, exist_ok=True)
        path = self.save_raw_dir / f"{save_id}.json"
        with open(path, "w") as f:
            json.dump({"messages": messages, "content": content, "usage": usage}, f, indent=2)
        logger.debug("raw_response_saved", path=str(path))
