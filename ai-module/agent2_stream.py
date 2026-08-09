"""Structured stdout events for Agent2 streaming (consumed by the web UI via SSE)."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

PREFIX = "@@AGENT2@@"


def stream_enabled() -> bool:
    return os.environ.get("AGENT2_STREAM", "").strip().lower() in ("1", "true", "yes")


def emit(event: dict[str, Any]) -> None:
    if not stream_enabled():
        return
    line = f"{PREFIX}{json.dumps(event, ensure_ascii=False)}\n"
    stdout_buffer = getattr(sys.stdout, "buffer", None)
    if stdout_buffer is not None:
        stdout_buffer.write(line.encode("utf-8"))
        stdout_buffer.flush()
        return
    sys.stdout.write(line)
    sys.stdout.flush()


def enable_stream() -> None:
    os.environ["AGENT2_STREAM"] = "1"
