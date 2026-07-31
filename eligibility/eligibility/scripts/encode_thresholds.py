#!/usr/bin/env python3
"""Emit hard_inspection YAML packs from thresholds_master_v0.5.csv.

Usage:
    python eligibility/eligibility/scripts/encode_thresholds.py [--csv PATH] [--out DIR]
"""
from __future__ import annotations

import argparse
import csv
import re
from collections import defaultdict
from pathlib import Path

import yaml

VERIFIED_BY = (
    "claude_web_verification_2026-07-24 (internal review: Yuanjun 2026-07-24)"
)
VERIFIED_ON = "2026-07-24"

ROW_ID_RE = re.compile(r"^[A-Z0-9]+(-[A-Za-z0-9]+)+$")

PACKS: dict[str, dict] = {
    "cn_main_board.yaml": {
        "ruleset": "CN_Main_Board",
        "ruleset_name": "SSE & SZSE Main Board (沪深主板)",
        "source_ref": "SSE/SZSE 股票上市规则 (2024年4月修订) 3.1.1–3.1.5",
        "prefixes": ("MB-",),
    },
    "cn_star.yaml": {
        "ruleset": "CN_STAR_Market",
        "ruleset_name": "SSE STAR Market (科创板)",
        "source_ref": "科创板上市规则 2.1.1–2.1.4 + 科创属性评价指引",
        "prefixes": ("ST-",),
    },
    "cn_chinext.yaml": {
        "ruleset": "CN_ChiNext",
        "ruleset_name": "SZSE ChiNext (创业板)",
        "source_ref": "创业板上市规则 (2026年修订) 2.1.1–2.1.4",
        "prefixes": ("CX-",),
    },
    "cn_bse.yaml": {
        "ruleset": "CN_BSE",
        "ruleset_name": "Beijing Stock Exchange (北交所)",
        "source_ref": "北交所股票上市规则 2.1.2–2.1.3 + 北交所注册管理办法 Art.9–11",
        "prefixes": ("BJ-", "CS-BJ-"),
    },
    "cn_csrc_preconditions.yaml": {
        "ruleset": "CN_CSRC_Preconditions",
        "ruleset_name": "CSRC IPO registration preconditions (MB/STAR/ChiNext)",
        "source_ref": "首次公开发行股票注册管理办法 (令205号) Arts.10–13",
        "prefixes": ("CS-",),
        "exclude_prefixes": ("CS-BJ-",),
    },
    "hkex_gem.yaml": {
        "ruleset": "HKEX_GEM",
        "ruleset_name": "HKEX GEM listing eligibility",
        "source_ref": "HKEX GEM Listing Rules Chapter 11 (reforms effective 2024-01-01)",
        "prefixes": ("GEM-",),
    },
    "hkex_public_float.yaml": {
        "ruleset": "HKEX_Public_Float",
        "ruleset_name": "HKEX initial public float & free float (MB + GEM)",
        "source_ref": "MB LR 8.08 / 8.08A / 8.09 + GEM Ch.11 (listing documents on/after 2025-08-04)",
        "prefixes": ("HK-F-",),
    },
    "sgx_mainboard.yaml": {
        "ruleset": "SGX_Mainboard",
        "ruleset_name": "SGX Mainboard Rule 210 listing eligibility",
        "source_ref": "SGX Mainboard Rules Chapter 2 Rule 210",
        "prefixes": ("SG-",),
    },
    "sgx_catalist.yaml": {
        "ruleset": "SGX_Catalist",
        "ruleset_name": "SGX Catalist sponsor-based admission",
        "source_ref": "SGX Catalist Rules Ch.2 / Ch.4",
        "prefixes": ("CAT-",),
    },
}

SKIP_ROW_IDS = {"CAT-2"}


def _slug(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower())
    return re.sub(r"_+", "_", text).strip("_")[:64]


def is_data_row(row: dict) -> bool:
    rid = (row.get("row_id") or "").strip()
    if not rid or rid in SKIP_ROW_IDS:
        return False
    if not ROW_ID_RE.match(rid):
        return False
    if not (row.get("metric_field") or row.get("op")):
        return False
    return True


def rows_for_pack(pack_key: str, rows: list[dict]) -> list[dict]:
    cfg = PACKS[pack_key]
    prefixes = cfg["prefixes"]
    exclude = cfg.get("exclude_prefixes", ())
    out = []
    for row in rows:
        rid = row["row_id"]
        if not any(rid.startswith(p) for p in prefixes):
            continue
        if any(rid.startswith(p) for p in exclude):
            continue
        out.append(row)
    return out


def map_metric_field(field: str) -> tuple[str | None, str | None]:
    """Return (input_path, profile_field)."""
    field = (field or "").strip()
    if not field or field.lower() in ("(none)", "n/a"):
        return None, None
    if "+" in field or "soft:" in field.lower():
        return None, None
    if field.startswith("profile."):
        return None, field[len("profile.") :]
    path = field.replace("[latest]", "[period={latest_audited_fy}]")
    return path, None


def parse_numeric(value: str) -> float | int | None:
    if not value:
        return None
    cleaned = re.sub(r"[^\d.\-]", "", value.replace(",", ""))
    if not cleaned:
        return None
    return int(cleaned) if cleaned.isdigit() else float(cleaned)


def threshold_from_row(row: dict) -> dict | None:
    unit = (row.get("unit_ccy") or "").strip()
    raw = (row.get("value") or "").strip()
    if not raw or "DEFERRED_REVIEW" in raw.upper() or raw.upper().startswith("SEE"):
        return None
    if unit == "mixed":
        return None
    if unit == "bool" or raw.upper() == "TRUE":
        return None
    if re.search(r"\(|\bOR\b|\bAND\b", raw, re.I):
        return None
    if unit == "%":
        m = re.search(r"([\d.]+)\s*%", raw)
        if m:
            return {"value": float(m.group(1)), "unit": "%"}
        return None
    num = parse_numeric(raw)
    if num is None:
        return None
    if unit in ("CNY", "HKD", "SGD", "RMB"):
        return {"value": num, "unit": unit}
    if unit in ("count", "months", "years", "FYs"):
        unit_map = {"FYs": "financial years", "years": "years", "months": "months", "count": "count"}
        return {"value": num, "unit": unit_map.get(unit, unit)}
    return {"value": num, "unit": unit or None}


def map_operator(op: str, value: str, unit: str) -> str:
    op = (op or ">=").strip()
    if op == "=" and (value or "").upper() == "TRUE" and unit == "bool":
        return "is_true"
    if op == "=":
        return "=="
    return op if op in (">=", ">", "<=", "<", "==") else ">="


def is_deferred(row: dict) -> bool:
    val = (row.get("value") or "").upper()
    mf = (row.get("metric_field") or "").lower()
    if "DEFERRED_REVIEW" in val:
        return True
    if "soft:" in mf:
        return True
    if (row.get("op") or "").strip().lower() == "see":
        return True
    return False


def is_complex(row: dict) -> bool:
    mf = row.get("metric_field") or ""
    raw = row.get("value") or ""
    if "+" in mf:
        return True
    if (row.get("unit_ccy") or "") == "mixed":
        return True
    if re.search(r"\(|\bOR\b|\bAND\b", raw, re.I):
        return True
    if " + " in raw and "DEFERRED" in raw.upper():
        return True
    if (row.get("op") or "").strip().lower() == "see":
        return True
    return False


def is_pending(row: dict) -> bool:
    return (row.get("threshold_verified") or "").strip() == "pending_text_check"


def provenance(row: dict) -> dict:
    tv = (row.get("threshold_verified") or "").strip()
    pending = tv == "pending_text_check"
    web = tv.startswith("web_verified")
    eff = (row.get("effective_from") or "").strip()
    if eff == "current":
        eff = "2024-04-30"
    out = {
        "threshold_verified": bool(web and not pending),
        "effective_from": eff,
        "effective_from_verified": bool(web and eff and eff != "current"),
        "verified_against": (row.get("rule_citation") or "").strip(),
    }
    if web and not pending:
        out["verified_on"] = VERIFIED_ON
        out["verified_by"] = VERIFIED_BY
    if pending:
        out["threshold_verified"] = False
        out["needs_human_verify"] = True
    if row.get("basis_note"):
        out["guidance_note"] = row["basis_note"].strip()
    return out


def build_check(row: dict) -> dict:
    rid = row["row_id"]
    limb = row.get("limb") or rid
    metric_field = row.get("metric_field") or ""
    input_path, profile_field = map_metric_field(metric_field)
    op = map_operator(row.get("op", ""), row.get("value", ""), row.get("unit_ccy", ""))
    deferred = is_deferred(row)
    complex_row = is_complex(row)
    pending = is_pending(row)

    check: dict = {
        "id": _slug(rid),
        "metric": limb.strip(),
    }
    if profile_field:
        check["profile_field"] = profile_field
    elif input_path:
        check["input_path"] = input_path
    else:
        check["input_path"] = _slug(metric_field or rid)

    check["operator"] = op
    threshold = threshold_from_row(row)
    if threshold is not None:
        check["threshold"] = threshold
    elif op == "is_true":
        pass
    elif pending:
        check["threshold"] = None

    check.update(provenance(row))
    if deferred or complex_row:
        check["requires_llm"] = deferred
        if complex_row and not deferred:
            check["guidance_note"] = (
                check.get("guidance_note", "")
                + f" Complex / tiered threshold ({row.get('value', '')})."
            ).strip()
    return check


def build_all_of(rows: list[dict]) -> dict:
    or_groups: dict[str, list[dict]] = defaultdict(list)
    sequential: list[dict] = []
    for row in rows:
        og = (row.get("or_group") or "").strip()
        if og:
            or_groups[og].append(row)
        else:
            sequential.append(row)

    items: list[dict] = []
    for row in sequential:
        items.append({"check": build_check(row)})
    for group_rows in or_groups.values():
        if len(group_rows) == 1:
            items.append({"check": build_check(group_rows[0])})
        else:
            items.append({"any_of": [{"check": build_check(r)} for r in group_rows]})
    return {"all_of": items}


def standard_key(row: dict) -> tuple[str, str | None]:
    rid = row["row_id"]
    std = (row.get("standard") or "").strip()

    m = re.match(r"^[A-Z]+-S(\d+)([a-z])?", rid)
    if m:
        num, branch = m.group(1), m.group(2)
        return f"Std {num}", f"branch_{branch}" if branch else None

    m = re.match(r"^GEM-T(\d+)", rid)
    if m:
        return std or f"GEM Test {m.group(1)}", None

    m = re.match(r"^SG-S(\d+)", rid)
    if m:
        return f"210(2)({chr(96 + int(m.group(1)))})", None

    if std.startswith("Art."):
        return std.split(",")[0].strip(), None

    if "WVR" in std or "-WVR-" in rid:
        alt = re.search(r"alt\s*(\d+)", std, re.I)
        return "WVR", f"alt_{alt.group(1)}" if alt else rid

    if "-RC-" in rid:
        alt = re.search(r"alt\s*(\d+)", std, re.I)
        return "red_chip", f"alt_{alt.group(1)}" if alt else rid

    if "科创属性" in std:
        if "exceptional" in std.lower() or row["row_id"] == "ST-AT-EX":
            return "star_attributes_exceptional", None
        return "star_attributes", None

    if rid.startswith("HK-F-"):
        return std, None

    if rid.startswith("SG-"):
        return std, None

    return std or rid, None


def classify_row(row: dict) -> str:
    rid = row["row_id"]
    std = (row.get("standard") or "").lower()

    if "-P0" in rid or "structural" in std or rid == "CAT-1":
        return "structural"
    if "continuity" in std or re.search(r"-C-\d", rid):
        return "continuity"
    if "lock-up" in std or "lockup" in std:
        return "continuity"
    if "WVR" in (row.get("standard") or "") or "-WVR-" in rid:
        return "wvr"
    if "-RC-" in rid or "red-chip" in std:
        return "red_chip"
    if "科创属性" in (row.get("standard") or ""):
        return "star_attributes"
    if re.search(r"-S\d", rid) or "GEM-T" in rid or rid.startswith("SG-S"):
        return "financial"
    if rid.startswith("CS-"):
        return "precondition"
    if rid.startswith("HK-F-"):
        if (row.get("or_group") or "").strip():
            return "public_float_or"
        if rid in ("HK-F-1", "HK-F-2", "HK-F-3"):
            return "public_float_tier"
        return "public_float"
    if rid.startswith("SG-Q") or "210(3)(a)" in (row.get("standard") or ""):
        return "continuity"
    if rid.startswith("SG-F") or rid.startswith("SG-G"):
        return "governance"
    if "Life science" in (row.get("standard") or "") or rid.startswith("SG-LS"):
        return "life_science"
    if "Mineral" in (row.get("standard") or "") or rid.startswith("SG-MO"):
        return "mineral"
    if rid.startswith("SG-P-1"):
        return "public_float_tier"
    if rid.startswith("SG-P"):
        return "public_float"
    if rid.startswith("SG-DCS"):
        return "note"
    return "other"


def build_financial_requirement(rows: list[dict]) -> dict:
    standards: dict[str, dict[str | None, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        std, branch = standard_key(row)
        standards[std][branch].append(row)

    std_reqs = []
    for std_key in sorted(standards.keys()):
        branches = standards[std_key]
        branch_keys = [k for k in branches if k is not None]
        if branch_keys:
            branch_reqs = [build_all_of(branches[bk]) for bk in sorted(branch_keys)]
            std_reqs.append({"any_of": branch_reqs})
        else:
            std_reqs.append(build_all_of(branches[None]))

    return {"any_of": std_reqs}


def gate_needs_stub(rows: list[dict]) -> tuple[bool, bool]:
    """Return (evaluated, requires_llm). New packs: evaluated always false."""
    requires_llm = any(is_deferred(r) for r in rows)
    stub = any(is_pending(r) or is_complex(r) or is_deferred(r) for r in rows)
    return False, requires_llm or stub


def make_gate(gate_id: str, title: str, rule_ref: str, rows: list[dict], **extra) -> dict:
    evaluated, requires_llm = gate_needs_stub(rows)
    eff_dates = [r.get("effective_from") for r in rows if r.get("effective_from") and r["effective_from"] != "current"]
    effective_from = min(eff_dates) if eff_dates else "2024-04-30"

    gate: dict = {
        "id": gate_id,
        "title": title,
        "rule_ref": rule_ref,
        "effective_from": effective_from if effective_from != "current" else "2024-04-30",
        "evaluated": evaluated,
        "human_signoff": False,
    }
    if requires_llm:
        gate["requires_llm"] = True
        gate["stub_reason"] = "deferred / complex / pending verification — not hard-evaluated this phase"
    if not evaluated:
        gate.setdefault("stub_reason", "multi-market pack v1 — no fixture this phase")

    cat = extra.get("category", "default")
    if cat == "financial":
        gate["requirement"] = build_financial_requirement(rows)
    elif cat == "or_group":
        gate["requirement"] = {"any_of": [build_all_of([r]) for r in rows]}
    elif cat == "wvr" or cat == "red_chip":
        alts: dict[str, list[dict]] = defaultdict(list)
        for row in rows:
            _, branch = standard_key(row)
            alts[branch or row["row_id"]].append(row)
        gate["requirement"] = {
            "any_of": [build_all_of(group) for group in alts.values()]
        }
    elif cat == "star_attributes" and any(r["row_id"] == "ST-AT-EX" for r in rows):
        core = [r for r in rows if r["row_id"] != "ST-AT-EX"]
        ex = [r for r in rows if r["row_id"] == "ST-AT-EX"]
        gate["requirement"] = {
            "any_of": [
                build_all_of(core),
                build_all_of(ex),
            ]
        }
    else:
        gate["requirement"] = build_all_of(rows)

    return gate


def build_gates(rows: list[dict]) -> list[dict]:
    buckets: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        buckets[classify_row(row)].append(row)

    gates: list[dict] = []

    if buckets["structural"]:
        gates.append(
            make_gate(
                "structural_requirements",
                "Structural / offering requirements",
                buckets["structural"][0].get("rule_citation", "structural"),
                buckets["structural"],
            )
        )

    if buckets["financial"]:
        gates.append(
            make_gate(
                "financial_eligibility_tests",
                "Financial eligibility — meet at least one standard / test",
                buckets["financial"][0].get("rule_citation", "financial"),
                buckets["financial"],
                category="financial",
            )
        )

    if buckets["wvr"]:
        gates.append(
            make_gate(
                "wvr_requirements",
                "Weighted voting rights (WVR) additional requirements",
                "WVR",
                buckets["wvr"],
                category="wvr",
            )
        )

    if buckets["red_chip"]:
        for alt_key, group in _group_by_alt(buckets["red_chip"]).items():
            gates.append(
                make_gate(
                    f"red_chip_{_slug(alt_key)}",
                    f"Red-chip route — {alt_key}",
                    group[0].get("rule_citation", "red-chip"),
                    group,
                )
            )

    if buckets["star_attributes"]:
        core = [r for r in buckets["star_attributes"] if r["row_id"] != "ST-AT-EX"]
        if core:
            gates.append(
                make_gate(
                    "star_market_attributes",
                    "STAR Market 科创属性 — cumulative indicators",
                    "科创属性评价指引",
                    core,
                    category="star_attributes",
                )
            )
        ex = [r for r in buckets["star_attributes"] if r["row_id"] == "ST-AT-EX"]
        if ex:
            gates.append(
                make_gate(
                    "star_attributes_exceptional",
                    "STAR Market 科创属性 — exceptional alternative",
                    ex[0].get("rule_citation", "科创属性评价指引 第二条"),
                    ex,
                )
            )

    if buckets["precondition"]:
        arts: dict[str, list[dict]] = defaultdict(list)
        for row in buckets["precondition"]:
            art = (row.get("standard") or row["row_id"]).split(",")[0].strip()
            arts[art].append(row)
        for art, group in sorted(arts.items()):
            gates.append(
                make_gate(
                    f"csrc_{_slug(art)}",
                    f"CSRC precondition — {art}",
                    group[0].get("rule_citation", art),
                    group,
                )
            )

    if buckets["continuity"]:
        gates.append(
            make_gate(
                "continuity_requirements",
                "Management / ownership continuity",
                buckets["continuity"][0].get("rule_citation", "continuity"),
                buckets["continuity"],
            )
        )

    if buckets["public_float"] or buckets.get("public_float_tier") or buckets.get("public_float_or"):
        for row in buckets.get("public_float_tier", []):
            gates.append(
                make_gate(
                    f"public_float_tier_{_slug(row['row_id'])}",
                    row.get("limb") or row["row_id"],
                    row.get("rule_citation", "8.08(1)"),
                    [row],
                )
            )
        or_rows = buckets.get("public_float_or", [])
        if or_rows:
            or_groups: dict[str, list[dict]] = defaultdict(list)
            for row in or_rows:
                or_groups[(row.get("or_group") or "default").strip()].append(row)
            for group in or_groups.values():
                if len(group) == 1 and "+" not in (group[0].get("metric_field") or ""):
                    gates.append(
                        make_gate(
                            f"public_float_{_slug(group[0]['row_id'])}",
                            group[0].get("limb") or group[0]["row_id"],
                            group[0].get("rule_citation", "8.08A"),
                            group,
                        )
                    )
                else:
                    gates.append(
                        make_gate(
                            f"public_float_or_{_slug(group[0].get('or_group', 'g'))}",
                            "Free float alternative (8.08A)",
                            group[0].get("rule_citation", "8.08A"),
                            group,
                            category="or_group",
                        )
                    )
        simple = [r for r in buckets.get("public_float", []) if not is_complex(r)]
        complex_rows = [r for r in buckets.get("public_float", []) if is_complex(r)]
        if simple:
            gates.append(
                make_gate(
                    "public_float_requirements",
                    "Public float / free float requirements",
                    simple[0].get("rule_citation", "public float"),
                    simple,
                )
            )
        for row in complex_rows:
            gates.append(
                make_gate(
                    f"public_float_{_slug(row['row_id'])}",
                    row.get("limb") or row["row_id"],
                    row.get("rule_citation", "public float"),
                    [row],
                )
            )

    if buckets["governance"]:
        for row in buckets["governance"]:
            gates.append(
                make_gate(
                    f"governance_{_slug(row['row_id'])}",
                    row.get("limb") or row["row_id"],
                    row.get("rule_citation", "governance"),
                    [row],
                )
            )

    for alt_cat, prefix in (("life_science", "life_science"), ("mineral", "mineral")):
        if buckets[alt_cat]:
            gates.append(
                make_gate(
                    f"{prefix}_alternative",
                    f"SGX {alt_cat.replace('_', ' ').title()} alternative route",
                    buckets[alt_cat][0].get("rule_citation", "210 alternative"),
                    buckets[alt_cat],
                )
            )

    if buckets["note"]:
        for row in buckets["note"]:
            gates.append(
                make_gate(
                    f"note_{_slug(row['row_id'])}",
                    row.get("limb") or row["row_id"],
                    row.get("rule_citation", "note"),
                    [row],
                )
            )

    if buckets["other"]:
        for row in buckets["other"]:
            gates.append(
                make_gate(
                    f"other_{_slug(row['row_id'])}",
                    row.get("limb") or row["row_id"],
                    row.get("rule_citation", "other"),
                    [row],
                )
            )

    return gates


def _group_by_alt(rows: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        std = row.get("standard") or row["row_id"]
        alt = re.search(r"alt\s*(\d+|[a-z]\d?)", std, re.I)
        key = f"alt_{alt.group(1)}" if alt else _slug(std)
        groups[key].append(row)
    return groups


def emit_pack(pack_key: str, rows: list[dict]) -> dict:
    cfg = PACKS[pack_key]
    pack_rows = rows_for_pack(pack_key, rows)
    return {
        "ruleset": cfg["ruleset"],
        "ruleset_name": cfg["ruleset_name"],
        "version": "0.1.0-draft",
        "in_regression_baseline": False,
        "source_ref": cfg["source_ref"],
        "gates": build_gates(pack_rows),
    }


def dump_yaml(data: dict) -> str:
    return yaml.dump(
        data,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=100,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Encode threshold CSV to YAML packs")
    parser.add_argument(
        "--csv",
        default=str(
            Path(__file__).resolve().parents[1] / "thresholds_master_v0.5.csv"
        ),
    )
    parser.add_argument(
        "--out",
        default=str(
            Path(__file__).resolve().parents[1] / "hard_inspection" / "rules"
        ),
    )
    args = parser.parse_args()

    with open(args.csv, newline="", encoding="utf-8") as handle:
        rows = [r for r in csv.DictReader(handle) if is_data_row(r)]

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    written = []
    for pack_key in PACKS:
        pack = emit_pack(pack_key, rows)
        path = out_dir / pack_key
        path.write_text(dump_yaml(pack), encoding="utf-8")
        written.append(pack_key)
        print(f"Wrote {path} ({len(pack['gates'])} gates)")

    print(f"Done — {len(written)} packs written to {out_dir}")


if __name__ == "__main__":
    main()
