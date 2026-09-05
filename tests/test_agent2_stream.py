from __future__ import annotations

import io
import json
import sys

import agent2_stream


class GbkTextStream:
    def __init__(self) -> None:
        self.buffer = io.BytesIO()

    def write(self, value: str) -> int:
        value.encode("gbk")
        return len(value)

    def flush(self) -> None:
        pass


def test_emit_writes_utf8_even_when_text_stream_is_gbk(monkeypatch) -> None:
    output = GbkTextStream()
    monkeypatch.setattr(sys, "stdout", output)
    monkeypatch.setenv("AGENT2_STREAM", "1")

    agent2_stream.emit({"text": "non\u2011breaking 中文"})

    line = output.buffer.getvalue().decode("utf-8").strip()
    assert line.startswith(agent2_stream.PREFIX)
    assert json.loads(line[len(agent2_stream.PREFIX) :]) == {
        "text": "non\u2011breaking 中文"
    }
