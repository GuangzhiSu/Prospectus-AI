"""Local Qwen inference via Hugging Face transformers (JSON-in-prompt structured output)."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger()

# Default: Qwen 3.5 27B on Hugging Face. Override with QWEN_MODEL or config.qwen_model.
DEFAULT_QWEN_MODEL = "Qwen/Qwen3.5-27B"

_MODEL_TOKENIZER_CACHE: dict[str, tuple[Any, Any]] = {}


def _device() -> str:
    if os.environ.get("QWEN_USE_CPU") == "1" or os.environ.get("AGENT1_USE_CPU") == "1":
        return "cpu"
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"


def _load_model_and_tokenizer(model_name: str) -> tuple[Any, Any]:
    if model_name in _MODEL_TOKENIZER_CACHE:
        return _MODEL_TOKENIZER_CACHE[model_name]
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError as e:
        raise ImportError(
            "Local Qwen requires: pip install transformers torch accelerate"
        ) from e

    device = _device()
    use_8bit = os.environ.get("QWEN_USE_8BIT") == "1" or os.environ.get("AGENT1_USE_8BIT") == "1"
    use_4bit = os.environ.get("QWEN_USE_4BIT") == "1" or os.environ.get("AGENT1_USE_4BIT") == "1"
    load_kwargs: dict[str, Any] = {
        "trust_remote_code": True,
        "torch_dtype": torch.bfloat16 if device == "cuda" else torch.float32,
    }
    if device == "cuda" and (use_8bit or use_4bit):
        try:
            load_kwargs["device_map"] = "auto"
            load_kwargs["load_in_4bit" if use_4bit else "load_in_8bit"] = True
        except Exception:
            pass

    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(model_name, **load_kwargs)
    if "device_map" not in load_kwargs:
        model = model.to(device)

    _MODEL_TOKENIZER_CACHE[model_name] = (model, tokenizer)
    logger.info("qwen_model_loaded", model=model_name, device=str(model.device))
    return model, tokenizer


def _extract_json_object(text: str) -> str | None:
    """Best-effort: isolate one JSON object from model output."""
    s = text.strip()
    if not s:
        return None
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", s, re.IGNORECASE)
    if fence:
        s = fence.group(1).strip()
    # Balanced braces from first {
    start = s.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return None


def _schema_instruction(response_format: dict[str, Any] | None, max_schema_chars: int = 28000) -> str:
    if not response_format:
        return ""
    schema = response_format.get("schema")
    if not schema:
        return ""
    blob = json.dumps(schema, ensure_ascii=False, indent=2)
    if len(blob) > max_schema_chars:
        blob = blob[:max_schema_chars] + "\n... (schema truncated)"
    return (
        "\n\nYou MUST respond with a single valid JSON object only (no markdown fences, no commentary). "
        "The JSON must conform to this JSON Schema:\n\n"
        f"{blob}\n"
    )


class QwenLocalClient:
    """Run Qwen locally; structured output via schema-in-prompt + JSON parse."""

    def __init__(
        self,
        model: str | None = None,
        max_tokens: int = 8192,
        temperature: float = 0.0,
        save_raw_dir: Path | str | None = None,
        request_timeout: float = 0.0,  # unused (local)
    ):
        self.model = model or os.environ.get("QWEN_MODEL", DEFAULT_QWEN_MODEL)
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.save_raw_dir = Path(save_raw_dir) if save_raw_dir else None

    def _generate(self, messages: list[dict[str, Any]], extra_suffix: str = "") -> str:
        model, tokenizer = _load_model_and_tokenizer(self.model)
        try:
            import torch
        except ImportError:
            raise ImportError("torch is required for QwenLocalClient")

        # Append assistant instruction as final user content chunk for JSON mode
        if extra_suffix:
            messages = list(messages)
            last = messages[-1] if messages else {"role": "user", "content": ""}
            if last.get("role") != "user":
                messages.append({"role": "user", "content": extra_suffix})
            else:
                messages[-1] = {
                    "role": "user",
                    "content": (last.get("content") or "") + extra_suffix,
                }

        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        max_ctx = 8192 if next(model.parameters()).is_cuda else 16384
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=max_ctx)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        pad_id = tokenizer.pad_token_id or tokenizer.eos_token_id
        max_new = min(self.max_tokens, 8192)
        do_sample = self.temperature > 0
        gen_kw: dict[str, Any] = {
            "max_new_tokens": max_new,
            "do_sample": do_sample,
            "pad_token_id": pad_id,
        }
        if do_sample:
            gen_kw["temperature"] = self.temperature

        with torch.no_grad():
            out = model.generate(**inputs, **gen_kw)
        response = tokenizer.decode(
            out[0][inputs["input_ids"].shape[1] :],
            skip_special_tokens=True,
        )
        return response.strip()

    def save_raw_response(self, save_id: str, messages: list[dict], content: str, usage: dict) -> None:
        if not self.save_raw_dir:
            return
        self.save_raw_dir.mkdir(parents=True, exist_ok=True)
        path = self.save_raw_dir / f"{save_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"messages": messages, "content": content, "usage": usage}, f, indent=2)
        logger.debug("qwen_raw_response_saved", path=str(path))

    def create_response(
        self,
        messages: list[dict[str, Any]],
        *,
        response_format: dict[str, Any] | None = None,
        response_format_type: str = "json_schema",
        raw_save_id: str | None = None,
    ) -> dict[str, Any]:
        del response_format_type  # OpenAI-only; Qwen always uses schema-in-prompt
        suffix = _schema_instruction(response_format) if response_format else ""
        logger.info("qwen_local_request", model=self.model, num_messages=len(messages), json_mode=bool(response_format))

        content = self._generate(messages, extra_suffix=suffix)
        usage_dict: dict[str, Any] = {}

        if raw_save_id and self.save_raw_dir:
            self.save_raw_response(raw_save_id, messages, content, usage_dict)

        out: dict[str, Any] = {
            "content": content,
            "usage": usage_dict,
            "finish_reason": "stop",
        }

        if response_format and content:
            blob = _extract_json_object(content) or content.strip()
            try:
                out["parsed"] = json.loads(blob)
            except json.JSONDecodeError as e:
                logger.warning("qwen_json_parse_failed", raw_preview=content[:200], error=str(e))
                out["parse_error"] = str(e)

        return out
