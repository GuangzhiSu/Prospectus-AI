"""Command-line entry point for the listing-eligibility diagnostic.

    python -m eligibility --in data/sensetime.json
    python -m eligibility --in data/sensetime.json --profile profile.json \
        --out eligibility/outputs/report.json --audit eligibility/outputs/audit.json

The diagnostic reads an issuer input JSON, never modifies it, and writes an
English diagnostic report plus a provenance audit trail. It renders no verdict.
``--profile`` supplies the FX rate (``fx_rate_to_hkd``) and ``path_vars`` (e.g.
which period is the latest audited financial year); both default to empty so
that gates needing them surface MISSING_INPUT / INDETERMINATE honestly.
"""
from __future__ import annotations

import argparse
import datetime
import json
import sys

from .engine import EvalContext
from .loader import load_all, select_by_name
from .report import build_report, render_scorecard


def _load_profile(path: str | None) -> dict:
    if not path:
        return {}
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def _build_audit(report: dict) -> dict:
    """Flat provenance trail: which rule read which issuer path to what status."""
    trail = []
    for block in report["rulesets"]:
        for gate in block["gates"]:
            for chk in gate["checks"]:
                trail.append(
                    {
                        "ruleset": block["ruleset"],
                        "rule_version": block["version"],
                        "gate_id": gate["gate_id"],
                        "rule_ref": chk["rule_ref"] or gate["rule_ref"],
                        "metric": chk["metric"],
                        "used_path": chk["used_path"],
                        "actual": chk["actual"],
                        "required": chk["required"],
                        "status": chk["status"],
                        "note": chk["note"],
                        "threshold_verified": chk["threshold_verified"],
                        "effective_from": chk["effective_from"],
                        "effective_from_verified": chk["effective_from_verified"],
                        "verified_against": chk["verified_against"],
                        "verified_on": chk["verified_on"],
                        "verified_by": chk["verified_by"],
                        "date_note": chk["date_note"],
                        "human_signoff": gate["human_signoff"],
                    }
                )
    return {
        "report_type": "listing_eligibility_diagnostic_audit",
        "generated_at": report["generated_at"],
        "issuer_id": report["issuer_id"],
        "fx_profile": report["fx_profile"],
        "path_vars": report["path_vars"],
        "provenance": trail,
        "unverified_thresholds": report["summary"]["unverified_thresholds"],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="eligibility",
        description=(
            "Listing-eligibility diagnostic (deterministic hard gates). "
            "Reports met / shortfall / missing-input / indeterminate per "
            "pathway against cited rule references. Renders no verdict."
        ),
    )
    parser.add_argument("--in", dest="inp", required=True,
                        help="issuer input JSON (read-only)")
    parser.add_argument("--out", dest="out", default=None,
                        help="diagnostic report JSON (default: stdout only)")
    parser.add_argument("--audit", dest="audit", default=None,
                        help="provenance audit-trail JSON")
    parser.add_argument("--profile", dest="profile", default=None,
                        help="run profile JSON: fx_rate_to_hkd + path_vars")
    parser.add_argument("--ruleset", dest="rulesets", action="append",
                        default=None,
                        help="restrict to named ruleset(s); repeatable")
    parser.add_argument("--as-of", dest="as_of", default=None,
                        help="effective date filter (YYYY-MM-DD)")
    parser.add_argument("--no-scorecard", dest="scorecard", action="store_false",
                        help="suppress the printed scorecard")
    args = parser.parse_args(argv)

    with open(args.inp, encoding="utf-8") as handle:
        root = json.load(handle)

    rulesets = load_all()
    if args.rulesets:
        rulesets = select_by_name(rulesets, args.rulesets)
        if not rulesets:
            print(f"No ruleset matched {args.rulesets}", file=sys.stderr)
            return 2

    profile = _load_profile(args.profile)
    fx_profile = (
        {"fx_rate_to_hkd": profile["fx_rate_to_hkd"]}
        if "fx_rate_to_hkd" in profile
        else None
    )
    ctx = EvalContext(
        root=root,
        fx=profile.get("fx_rate_to_hkd"),
        path_vars=profile.get("path_vars", {}),
        profile=profile,
    )

    generated_at = datetime.datetime.now().isoformat(timespec="seconds")
    issuer_id = root.get("issuer_id", "unknown")
    report = build_report(
        issuer_id, rulesets, ctx, fx_profile, generated_at, args.as_of
    )

    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump(report, handle, ensure_ascii=False, indent=2)
    if args.audit:
        with open(args.audit, "w", encoding="utf-8") as handle:
            json.dump(_build_audit(report), handle, ensure_ascii=False, indent=2)

    if args.scorecard:
        print(render_scorecard(report))
    if args.out:
        print(f"\nwrote report: {args.out}")
    if args.audit:
        print(f"wrote audit:  {args.audit}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
