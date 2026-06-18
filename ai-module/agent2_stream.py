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
    print(f"{PREFIX}{json.dumps(event, ensure_ascii=False)}", flush=True)


def enable_stream() -> None:
    os.environ["AGENT2_STREAM"] = "1"
