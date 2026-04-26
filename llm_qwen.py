"""
Shared Qwen LLM via Hugging Face for agent1 and agent2.

Supports:
- Qwen3.5 (default; e.g. Qwen/Qwen3.5-4B, Qwen/Qwen3.5-9B, Qwen/Qwen3.5-27B)
  These are "image-text-to-text" checkpoints but accept text-only chat input.
  Qwen3.5 defaults to "thinking mode"; we disable it for drafting prose.
- Qwen2.5 (legacy; Qwen/Qwen2.5-7B-Instruct, Qwen/Qwen2.5-3B-Instruct)
- Qwen2-VL multimodal (Qwen/Qwen2-VL-2B-Instruct) when images are provided

Environment overrides:
- QWEN_MAX_CTX (int): max tokenized input length (default 16384)
- QWEN_MAX_NEW_TOKENS (int): default max_new_tokens for generate (default 4096)
- QWEN_TEMPERATURE / QWEN_TOP_P / QWEN_TOP_K / QWEN_REPETITION_PENALTY: sampling
- QWEN_DO_SAMPLE (0/1): enable sampling; default 1 for Qwen3.5, 0 for legacy
- QWEN_ENABLE_THINKING (0/1): Qwen3.5 thinking mode; default 0 for drafting
- AGENT1_USE_8BIT / AGENT1_USE_4BIT: optional bitsandbytes quantization
"""

from __future__ import annotations

from typing import Any
import os
import socket

DEFAULT_TEXT_MODEL = "Qwen/Qwen3.5-4B"
DEFAULT_VL_MODEL = "Qwen/Qwen2-VL-2B-Instruct"


def _get_device() -> str:
    import os
    import torch
    if os.environ.get("CUDA_VISIBLE_DEVICES") == "":
        return "cpu"
    return "cuda" if torch.cuda.is_available() else "cpu"


def _is_qwen3_family(model_name: str) -> bool:
    """Qwen3 / Qwen3.5 / Qwen3.6 use the new chat template with thinking mode."""
    n = os.path.basename(model_name.rstrip("/")).lower()
    return n.startswith("qwen3") or "qwen3" in n or "qwen3.5" in n or "qwen3.6" in n


def _load_qwen_model(
    model_name: str = DEFAULT_TEXT_MODEL,
    device: str | None = None,
) -> tuple[Any, Any]:
    """Load model and tokenizer once for reuse. Returns (model, tokenizer).

    Tries AutoModelForCausalLM first (works for Qwen2.5 text-only), falls back to
    AutoModelForImageTextToText (required for multimodal Qwen3.5 checkpoints).
    """
    try:
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
        )
        import torch
    except ImportError:
        raise ImportError(
            "Qwen text model requires: pip install transformers torch accelerate"
        )
    if device is None:
        device = _get_device()
    use_8bit = os.environ.get("AGENT1_USE_8BIT") == "1"
    use_4bit = os.environ.get("AGENT1_USE_4BIT") == "1"
    local_only = (
        os.environ.get("TRANSFORMERS_OFFLINE") == "1"
        or os.environ.get("HF_LOCAL_ONLY") == "1"
    )
    model_is_local_path = os.path.exists(model_name)
    load_kwargs: dict = {
        "trust_remote_code": True,
        "torch_dtype": torch.bfloat16 if device == "cuda" else torch.float32,
    }
    if device == "cuda":
        # Let accelerate shard a large model (e.g. 27B) across GPUs when present.
        if use_8bit or use_4bit or os.environ.get("QWEN_DEVICE_MAP", "") == "auto":
            load_kwargs["device_map"] = "auto"
            if use_4bit:
                load_kwargs["load_in_4bit"] = True
            elif use_8bit:
                load_kwargs["load_in_8bit"] = True

    def _friendly_load_error(e: Exception) -> RuntimeError:
        msg = str(e)
        networkish = (
            isinstance(e, socket.gaierror)
            or "nodename nor servname provided" in msg
            or "Name or service not known" in msg
            or "Temporary failure in name resolution" in msg
            or "huggingface.co" in msg
            or "hf_hub_download" in msg
        )
        if local_only and not model_is_local_path:
            return RuntimeError(
                "USER_FRIENDLY: Model files are not available locally.\n"
                "Please connect to the internet once to download the model, or set AGENT1_MODEL to a local model folder."
            )
        if networkish and not model_is_local_path:
            return RuntimeError(
                "USER_FRIENDLY: Unable to download the AI model (network/DNS issue).\n"
                "Please ensure this machine can access Hugging Face, or set AGENT1_MODEL to a local model folder. "
                "If you are behind a proxy or use a mirror, configure HTTPS_PROXY/HTTP_PROXY or HF_ENDPOINT."
            )
        return RuntimeError(
            "USER_FRIENDLY: Failed to load the AI model.\n"
            f"Underlying error: {msg[:500]}"
        )

    # Tokenizer (use left truncation so the assistant-generation prompt tail is never cut off).
    try:
        tok_kwargs = {"trust_remote_code": True}
        if local_only and not model_is_local_path:
            tok_kwargs["local_files_only"] = True
        tokenizer = AutoTokenizer.from_pretrained(model_name, **tok_kwargs)
        try:
            tokenizer.truncation_side = "left"
        except Exception:
            pass
    except Exception as e:
        raise _friendly_load_error(e)

    m_kwargs = dict(load_kwargs)
    if local_only and not model_is_local_path:
        m_kwargs["local_files_only"] = True

    # Primary path: AutoModelForCausalLM.
    model = None
    last_err: Exception | None = None
    try:
        model = AutoModelForCausalLM.from_pretrained(model_name, **m_kwargs)
    except Exception as e:
        last_err = e
        # Multimodal checkpoints (Qwen3.5-*) may require AutoModelForImageTextToText.
        try:
            from transformers import AutoModelForImageTextToText
        except Exception:
            AutoModelForImageTextToText = None  # type: ignore
        if AutoModelForImageTextToText is not None:
            try:
                model = AutoModelForImageTextToText.from_pretrained(model_name, **m_kwargs)
                last_err = None
            except Exception as e2:
                last_err = e2
    if model is None:
        raise _friendly_load_error(last_err or RuntimeError("Failed to load model"))

    if "device_map" not in load_kwargs:
        model = model.to(device)
    return model, tokenizer


def _build_generate_kwargs(tokenizer: Any) -> dict:
    """Assemble sampling/generation kwargs from env, with Qwen3.5-friendly defaults."""
    do_sample_env = os.environ.get("QWEN_DO_SAMPLE")
    do_sample = True if do_sample_env is None else do_sample_env == "1"
    kw: dict = {
        "do_sample": do_sample,
        "pad_token_id": tokenizer.pad_token_id or tokenizer.eos_token_id,
    }
    if do_sample:
        kw["temperature"] = float(os.environ.get("QWEN_TEMPERATURE", "0.7"))
        kw["top_p"] = float(os.environ.get("QWEN_TOP_P", "0.8"))
        kw["top_k"] = int(os.environ.get("QWEN_TOP_K", "20"))
        kw["repetition_penalty"] = float(os.environ.get("QWEN_REPETITION_PENALTY", "1.05"))
    return kw


def _apply_chat_template(
    tokenizer: Any,
    prompt: str,
    is_qwen3: bool,
) -> str:
    """Apply chat template. For Qwen3.5, disable thinking mode by default (keeps
    drafting output prose-only instead of emitting <think>...</think> blocks)."""
    messages = [{"role": "user", "content": prompt}]
    common = {"tokenize": False, "add_generation_prompt": True}
    if is_qwen3:
        enable_thinking = os.environ.get("QWEN_ENABLE_THINKING", "0") == "1"
        try:
            return tokenizer.apply_chat_template(
                messages, enable_thinking=enable_thinking, **common
            )
        except TypeError:
            # Older tokenizer without enable_thinking kwarg; fall through.
            pass
    return tokenizer.apply_chat_template(messages, **common)


def run_qwen_with_model(
    model: Any,
    tokenizer: Any,
    prompt: str,
    max_new_tokens: int | None = None,
) -> str:
    """Generate using a pre-loaded model and tokenizer."""
    import torch

    if max_new_tokens is None:
        max_new_tokens = int(os.environ.get("QWEN_MAX_NEW_TOKENS", "4096"))

    # Default input context budget. Qwen3.5 supports 262K natively, but KV cache
    # dominates VRAM for long contexts. 16K is safe on a 24GB GPU with 4B/9B models.
    is_cuda = next(model.parameters()).is_cuda
    default_ctx = 16384 if is_cuda else 32768
    max_length = int(os.environ.get("QWEN_MAX_CTX", str(default_ctx)))

    name = getattr(model.config, "_name_or_path", "") or ""
    is_qwen3 = _is_qwen3_family(name)

    text = _apply_chat_template(tokenizer, prompt, is_qwen3=is_qwen3)
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=max_length,
    )
    target_device = next(model.parameters()).device
    inputs = {k: v.to(target_device) for k, v in inputs.items()}

    gen_kwargs = _build_generate_kwargs(tokenizer)
    gen_kwargs["max_new_tokens"] = int(max_new_tokens)

    with torch.no_grad():
        out = model.generate(**inputs, **gen_kwargs)
    response = tokenizer.decode(
        out[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )
    # If a Qwen3 thinking block leaked through (e.g. user set QWEN_ENABLE_THINKING=1),
    # strip it so downstream consumers only see the final answer.
    if "</think>" in response:
        response = response.split("</think>", 1)[1]
    return response.strip()


def run_qwen_text(
    prompt: str,
    model_name: str = DEFAULT_TEXT_MODEL,
    max_new_tokens: int | None = None,
    device: str | None = None,
) -> str:
    """Load Qwen once per call and generate text."""
    model, tokenizer = _load_qwen_model(model_name, device)
    return run_qwen_with_model(model, tokenizer, prompt, max_new_tokens)


def run_qwen_vl(
    prompt: str,
    images: list[Any],
    model_name: str = DEFAULT_VL_MODEL,
    max_new_tokens: int = 2048,
    device: str | None = None,
) -> str:
    """Run Qwen2-VL (multimodal) via Hugging Face when images are provided."""
    try:
        from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
        import torch
        from PIL import Image
        import tempfile
        import os
    except ImportError:
        raise ImportError(
            "Qwen2-VL requires: pip install transformers torch accelerate pillow"
        )

    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
    model = Qwen2VLForConditionalGeneration.from_pretrained(
        model_name,
        trust_remote_code=True,
        torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
        device_map="auto" if device == "cuda" else None,
    )
    if device != "cuda":
        model = model.to(device)

    max_images = 4
    content = []
    temp_files = []
    for img in images[:max_images]:
        if isinstance(img, Image.Image):
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            img.save(tmp.name)
            temp_files.append(tmp.name)
            content.append({"type": "image", "path": tmp.name})
    content.append({"type": "text", "text": prompt})

    try:
        conversation = [{"role": "user", "content": content}]
        inputs = processor.apply_chat_template(
            conversation,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        )
        inputs = inputs.to(model.device)

        with torch.no_grad():
            out = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                pad_token_id=processor.tokenizer.eos_token_id,
            )

        input_len = inputs["input_ids"].shape[1]
        generated_ids = out[:, input_len:]
        response = processor.batch_decode(
            generated_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True,
        )[0]
        return response.strip()
    finally:
        for p in temp_files:
            try:
                os.unlink(p)
            except Exception:
                pass
