"""CLI bridge for Next.js: read a JSON payload path, write report JSON path.

    PYTHONPATH=eligibility:ai-module python -m eligibility.bridge --in payload.json --out report.json

Uses the same ``LLM_PROVIDER`` / settings env as prospectus drafting. Does not
force stub mode — callers set ``ELIGIBILITY_LLM_STUB=1`` for offline CI.
"""
from __future__ import annotations

import argparse
import json
import os


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="eligibility.bridge")
    parser.add_argument("--in", dest="inp", required=True, help="request JSON path")
    parser.add_argument("--out", dest="out", required=True, help="report JSON path")
    args = parser.parse_args(argv)

    from .common.llm import provider_status
    from .pipeline import run_session_dict

    with open(args.inp, encoding="utf-8") as handle:
        payload = json.load(handle)
    report = run_session_dict(payload)
    report["llm"] = provider_status()
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print(
        json.dumps(
            {
                "ok": True,
                "out": args.out,
                "issuer_id": report.get("issuer_id"),
                "llm": report.get("llm"),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
