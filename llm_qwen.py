"""
Shared Qwen LLM via Hugging Face for agent1 and agent2.

Supports:
- Text: Qwen2.5 (e.g. Qwen/Qwen2.5-7B-Instruct, Qwen/Qwen2.5-3B-Instruct)
- Multimodal: Qwen2-VL (e.g. Qwen/Qwen2-VL-2B-Instruct) when images are provided
"""

from __future__ import annotations

from typing import Any

# Default models
DEFAULT_TEXT_MODEL = "Qwen/Qwen2.5-7B-Instruct"
DEFAULT_VL_MODEL = "Qwen/Qwen2-VL-2B-Instruct"


def _get_device() -> str:
    import os
    import torch
    if os.environ.get("CUDA_VISIBLE_DEVICES") == "":
        return "cpu"
    return "cuda" if torch.cuda.is_available() else "cpu"


def _load_qwen_model(
    model_name: str = DEFAULT_TEXT_MODEL,
    device: str | None = None,
) -> tuple[Any, Any]:
    """Load model and tokenizer once for reuse. Returns (model, tokenizer)."""
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch
        import os
    except ImportError:
        raise ImportError(
            "Qwen text model requires: pip install transformers torch accelerate"
        )
    if device is None:
        device = _get_device()
    use_8bit = os.environ.get("AGENT1_USE_8BIT") == "1"
    use_4bit = os.environ.get("AGENT1_USE_4BIT") == "1"
    load_kwargs: dict = {
        "trust_remote_code": True,
        "torch_dtype": torch.bfloat16 if device == "cuda" else torch.float32,
    }
    if device == "cuda" and (use_8bit or use_4bit):
        try:
            load_kwargs["device_map"] = "auto"
            if use_4bit:
                load_kwargs["load_in_4bit"] = True
            else:
                load_kwargs["load_in_8bit"] = True
        except Exception:
            pass
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(model_name, **load_kwargs)
    if "device_map" not in load_kwargs:
        model = model.to(device)
    return model, tokenizer


def run_qwen_with_model(
    model: Any,
    tokenizer: Any,
    prompt: str,
    max_new_tokens: int = 2048,
) -> str:
    """Generate using pre-loaded model and tokenizer."""
    import torch
    max_length = 8192 if next(model.parameters()).is_cuda else 32768
    messages = [{"role": "user", "content": prompt}]
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=max_length,
    )
    inputs = {k: v.to(model.device) for k, v in inputs.items()}
    pad_id = tokenizer.pad_token_id or tokenizer.eos_token_id
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=pad_id,
        )
    response = tokenizer.decode(
        out[0][inputs["input_ids"].shape[1] :],
        skip_special_tokens=True,
    )
    return response.strip()


def run_qwen_text(
    prompt: str,
    model_name: str = DEFAULT_TEXT_MODEL,
    max_new_tokens: int = 2048,
    device: str | None = None,
) -> str:
    """Run Qwen2.5 (text-only) via Hugging Face transformers."""
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
