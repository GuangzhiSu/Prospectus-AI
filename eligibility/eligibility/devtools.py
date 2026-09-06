"""Developer-tools helpers for the IPO Diagnostic workspace.

Catalog / trace / YAML patch stay on the hard path plus file I/O. They never
import the LLM stack so the page can load offline and the document owner can
see why a gate is ``NOT_EVALUATED`` without running extraction.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any

from .hard_inspection.engine import EvalContext, eval_gate
from .hard_inspection.loader import (
    RULES_DIR,
    load_all,
    load_soft_layer,
    walk_checks,
)
from .hard_inspection.resolver import read_leaf

PACKAGE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_DIR.parents[1]
UPDATE_DIR = REPO_ROOT / "update" / "update"
DOCS_DIR = REPO_ROOT / "docs"
CSV_PATH = PACKAGE_DIR / "thresholds_master_v0.5.csv"
XLSX_NAME = "INPUT_AND_ELIGIBILITY_MASTER_EN.xlsx"

MARKETS: list[dict[str, Any]] = [
    {
        "key": "hkex_main_board",
        "label": "Hong Kong — Main Board",
        "labelZh": "香港 — 主板",
        "rulesets": ["HKEX_Main_Board", "HKEX_Chapter_8A_WVR", "HKEX_Public_Float"],
    },
    {
        "key": "hkex_gem",
        "label": "Hong Kong — GEM",
        "labelZh": "香港 — GEM",
        "rulesets": ["HKEX_GEM", "HKEX_Public_Float"],
    },
    {
        "key": "hkex_18c",
        "label": "Hong Kong — Chapter 18C (Specialist Tech)",
        "labelZh": "香港 — 第18C章（特专科技）",
        "rulesets": ["HKEX_Chapter_18C_Specialist_Technology", "HKEX_Public_Float"],
    },
    {
        "key": "hkex_18a",
        "label": "Hong Kong — Chapter 18A (Biotech)",
        "labelZh": "香港 — 第18A章（生物科技）",
        "rulesets": ["HKEX_Chapter_18A_Biotech", "HKEX_Public_Float"],
    },
    {
        "key": "cn_main_board",
        "label": "PRC — SSE/SZSE Main Board",
        "labelZh": "A股 — 沪深主板",
        "rulesets": ["CN_Main_Board", "CN_CSRC_Preconditions"],
    },
    {
        "key": "cn_star",
        "label": "PRC — STAR Market",
        "labelZh": "A股 — 科创板",
        "rulesets": ["CN_STAR_Market", "CN_CSRC_Preconditions"],
    },
    {
        "key": "cn_chinext",
        "label": "PRC — ChiNext",
        "labelZh": "A股 — 创业板",
        "rulesets": ["CN_ChiNext", "CN_CSRC_Preconditions"],
    },
    {
        "key": "cn_bse",
        "label": "PRC — Beijing Stock Exchange",
        "labelZh": "A股 — 北交所",
        "rulesets": ["CN_BSE"],
    },
    {
        "key": "sgx_mainboard",
        "label": "Singapore — SGX Mainboard",
        "labelZh": "新加坡 — SGX 主板",
        "rulesets": ["SGX_Mainboard"],
    },
    {
        "key": "sgx_catalist",
        "label": "Singapore — Catalist",
        "labelZh": "新加坡 — Catalist",
        "rulesets": ["SGX_Catalist"],
    },
    {
        "key": "csrc_overseas",
        "label": "PRC — CSRC overseas listing filing",
        "labelZh": "中国 — 证监会境外上市备案",
        "rulesets": ["CSRC_Overseas_Listing_Filing"],
    },
    {
        "key": "qualitative",
        "label": "Qualitative substance signals",
        "labelZh": "定性实质信号（软层）",
        "rulesets": ["HKEX_Qualitative_Substance"],
    },
]

CAUSE_CRITERIA = "criteria"
CAUSE_EXTRACTION = "extraction"
CAUSE_DIAGNOSTIC = "diagnostic"
CAUSE_READY = "ready"

_DEFAULT_PATH_VARS = {
    "latest_audited_fy": "FY_latest",
    "prior_fy_1": "FY_prior_1",
    "prior_fy_2": "FY_prior_2",
}

_VAR_RE = re.compile(r"\{([A-Za-z0-9_]+)\}")
_GATE_ID_RE = re.compile(r"^(\s*)-\s+id:\s*['\"]?([^'\"\n]+)['\"]?\s*$", re.M)


def _markets_for_ruleset(ruleset: str) -> list[str]:
    return [market["key"] for market in MARKETS if ruleset in market["rulesets"]]


def _gate_needs_human_verify(gate: dict) -> bool:
    if gate.get("needs_human_verify"):
        return True
    return any(
        bool(check.get("needs_human_verify"))
        for check in walk_checks(gate.get("requirement", {}))
    )


def _check_payload(check: dict) -> dict[str, Any]:
    threshold = check.get("threshold")
    threshold_value = None
    threshold_unit = None
    if isinstance(threshold, dict):
        threshold_value = threshold.get("value")
        threshold_unit = threshold.get("unit")
    elif threshold is not None:
        threshold_value = threshold
    return {
        "id": check.get("id", ""),
        "metric": check.get("metric", ""),
        "operator": check.get("operator", ""),
        "inputPath": check.get("input_path") or None,
        "profileField": check.get("profile_field") or None,
        "thresholdValue": threshold_value,
        "thresholdUnit": threshold_unit,
        "thresholdVerified": bool(check.get("threshold_verified", False)),
        "needsHumanVerify": bool(check.get("needs_human_verify", False)),
        "requiresLlm": bool(check.get("requires_llm", False)),
        "ruleRef": check.get("rule_ref", ""),
        "guidanceNote": check.get("guidance_note", ""),
        "verifiedAgainst": check.get("verified_against", ""),
        "verifiedOn": check.get("verified_on", ""),
        "dateNote": check.get("date_note", ""),
    }


def static_attribution(gate: dict) -> tuple[str, str]:
    """Why this gate would render NOT_EVALUATED before any company JSON is supplied."""
    if gate.get("requires_llm") or gate.get("layer") == "soft":
        return CAUSE_DIAGNOSTIC, (
            "这是定性 / 需 AI 判断的条款。硬门槛引擎按设计不会给出达标或未达标，"
            "工作区显示「未评估」是预期行为，不是文档缺数，也不是抽取失败。"
        )
    if not gate.get("evaluated", True):
        reason = (gate.get("stub_reason") or "").strip()
        extra = f" 规则里的说明：{reason}" if reason else ""
        return CAUSE_CRITERIA, (
            "这条规则已经写进 YAML，但本阶段被关掉了（evaluated: false）。"
            "文档同事如果确认门槛已核验，可以把开关打开后再跑诊断。"
            + extra
        )
    if _gate_needs_human_verify(gate):
        return CAUSE_CRITERIA, (
            "文档 / 工作簿把这条标成待原文确认（needs_human_verify / pending_text_check）。"
            "在补齐官方原文之前，系统故意不给出达标或未达标。"
        )
    return CAUSE_READY, (
        "规则已打开。传入公司 JSON 后，硬引擎会给出达标 / 未达标 / 缺输入 / 无法比较；"
        "如果那时仍是「未评估」，再查诊断代码。"
    )


def _flatten_checks(gate: dict) -> list[dict[str, Any]]:
    if gate.get("requirement"):
        return [_check_payload(check) for check in walk_checks(gate["requirement"])]
    return [_check_payload(check) for check in gate.get("checks") or []]


def _gate_payload(ruleset: dict, gate: dict) -> dict[str, Any]:
    ruleset_id = ruleset.get("ruleset", "")
    cause, reason = static_attribution(gate)
    layer = ruleset.get("layer", gate.get("layer", "hard"))
    return {
        "id": gate.get("id", ""),
        "title": gate.get("title") or gate.get("condition") or gate.get("id", ""),
        "ruleRef": gate.get("rule_ref", ""),
        "ruleset": ruleset_id,
        "rulesetName": ruleset.get("ruleset_name", ruleset_id),
        "sourceFile": ruleset.get("_source_file", ""),
        "layer": layer,
        "marketKeys": _markets_for_ruleset(ruleset_id),
        "evaluated": bool(gate.get("evaluated", True)),
        "requiresLlm": bool(gate.get("requires_llm", False)),
        "needsHumanVerify": _gate_needs_human_verify(gate),
        "humanSignoff": bool(gate.get("human_signoff", False)),
        "stubReason": gate.get("stub_reason", ""),
        "effectiveFrom": gate.get("effective_from"),
        "sourceRef": ruleset.get("source_ref", ""),
        "inRegressionBaseline": bool(ruleset.get("in_regression_baseline", False)),
        "version": ruleset.get("version", ""),
        "condition": gate.get("condition", ""),
        "severity": gate.get("severity", ""),
        "guidanceRef": gate.get("guidance_ref", ""),
        "substantiveConcern": gate.get("substantive_concern", ""),
        "remediationPath": gate.get("remediation_path", ""),
        "disclosedInSection": gate.get("disclosed_in_section") or [],
        "checks": _flatten_checks(gate),
        "staticCause": cause,
        "staticReason": reason,
    }


def _load_workbook_rows() -> tuple[list[dict[str, str]], dict[str, Any]]:
    rows: list[dict[str, str]] = []
    meta = {
        "path": str(CSV_PATH.relative_to(REPO_ROOT)) if CSV_PATH.exists() else "",
        "exists": CSV_PATH.exists(),
        "xlsxExpected": f"update/update/{XLSX_NAME}",
        "xlsxPresent": (UPDATE_DIR / XLSX_NAME).exists(),
    }
    if not CSV_PATH.exists():
        return rows, meta
    with CSV_PATH.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for raw in reader:
            row_id = (raw.get("row_id") or "").strip()
            if not row_id or "pack:" in row_id and "—" in row_id:
                continue
            if not raw.get("market") and not raw.get("metric_field"):
                continue
            rows.append({key: (value or "").strip() for key, value in raw.items()})
    meta["rowCount"] = len(rows)
    return rows, meta


def _match_workbook_rows(gate: dict[str, Any], rows: list[dict[str, str]]) -> list[dict[str, str]]:
    source = (gate.get("sourceFile") or "").replace(".yaml", "")
    rule_ref = (gate.get("ruleRef") or "").lower()
    paths = {
        (check.get("inputPath") or "").split("{")[0].rstrip(".")
        for check in gate.get("checks") or []
        if check.get("inputPath")
    }
    matched: list[dict[str, str]] = []
    for row in rows:
        citation = (row.get("rule_citation") or "").lower()
        field = row.get("metric_field") or ""
        status = row.get("threshold_verified") or ""
        hit = False
        if source and source in " ".join(
            [row.get("row_id", ""), row.get("board_pathway", ""), row.get("standard", "")]
        ):
            hit = True
        if rule_ref and citation and (citation in rule_ref or rule_ref in citation):
            hit = True
        if field and any(field in path or path in field for path in paths if path):
            hit = True
        if hit:
            matched.append(
                {
                    "rowId": row.get("row_id", ""),
                    "market": row.get("market", ""),
                    "board": row.get("board_pathway", ""),
                    "standard": row.get("standard", ""),
                    "limb": row.get("limb", ""),
                    "metricField": field,
                    "op": row.get("op", ""),
                    "value": row.get("value", ""),
                    "unit": row.get("unit_ccy", ""),
                    "citation": row.get("rule_citation", ""),
                    "url": row.get("official_source_url", ""),
                    "effectiveFrom": row.get("effective_from", ""),
                    "verified": status,
                    "reviewStatus": row.get("review_status", ""),
                    "notes": row.get("reviewer_notes") or row.get("basis_note") or "",
                }
            )
    return matched[:12]


def _source_docs() -> list[dict[str, Any]]:
    candidates = [
        (
            "summary",
            UPDATE_DIR / "SUMMARY_CN_ONEPAGER.md",
            "一页纸摘要",
            "文档同事写的多市场资格诊断摘要。对照这里看门槛有没有写进 YAML。",
        ),
        (
            "spec",
            UPDATE_DIR / "INPUT_AND_ELIGIBILITY_SPEC_EN.md",
            "输入与资格规格书",
            "叙述层规格。数字以工作簿 / CSV 为准，本文不重复 189 条 limb。",
        ),
        (
            "encode",
            UPDATE_DIR / "CC_ENCODE_PROMPT_EN.md",
            "编码指令",
            "把工作簿编成 YAML 规则包的指令。文档缺漏或含糊会从这里传到规则。",
        ),
        (
            "csv",
            CSV_PATH,
            "门槛总表 CSV（v0.5）",
            "工作簿 sheet 3_Thresholds_Master 的可 diff 快照，189 条判断行。",
        ),
        (
            "extraction_rules",
            PACKAGE_DIR / "extraction" / "prompts" / "extraction_rules.md",
            "抽取规则",
            "第一段抽取（文档 → JSON）的纪律。如果 JSON 缺字段，先看这里和字段对照。",
        ),
        (
            "module",
            DOCS_DIR / "ELIGIBILITY_MODULE.md",
            "核验日志",
            "对照官方原文的核验记录，以及哪些行仍是 pending_text_check。",
        ),
    ]
    docs: list[dict[str, Any]] = []
    for doc_id, path, title, note in candidates:
        exists = path.exists()
        content = path.read_text(encoding="utf-8") if exists and path.suffix in {".md", ".csv"} else ""
        docs.append(
            {
                "id": doc_id,
                "title": title,
                "note": note,
                "path": str(path.relative_to(REPO_ROOT)) if exists else str(path),
                "exists": exists,
                "kind": "csv" if path.suffix == ".csv" else "markdown",
                "characters": len(content),
                "content": content,
            }
        )
    xlsx = UPDATE_DIR / XLSX_NAME
    docs.append(
        {
            "id": "xlsx",
            "title": "门槛主工作簿（Excel）",
            "note": (
                "规格书写明这是数字的唯一事实来源。仓库里目前只有 CSV 快照；"
                "如果 Excel 没有放进 update/update，文档同事无法在这里直接改总表。"
            ),
            "path": f"update/update/{XLSX_NAME}",
            "exists": xlsx.exists(),
            "kind": "xlsx",
            "characters": 0,
            "content": "",
        }
    )
    return docs


def _field_rows(gates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for gate in gates:
        for check in gate.get("checks") or []:
            key = check.get("inputPath") or (
                f"profile.{check['profileField']}" if check.get("profileField") else ""
            )
            if not key:
                continue
            entry = grouped.setdefault(
                key,
                {
                    "key": key,
                    "inputPath": check.get("inputPath"),
                    "profileField": check.get("profileField"),
                    "kind": "profile" if check.get("profileField") else "issuer",
                    "gates": [],
                    "metrics": [],
                },
            )
            label = f"{gate['ruleset']} / {gate['id']}"
            if label not in entry["gates"]:
                entry["gates"].append(label)
            if check.get("metric") and check["metric"] not in entry["metrics"]:
                entry["metrics"].append(check["metric"])
    return sorted(grouped.values(), key=lambda item: item["key"])


def build_catalog() -> dict[str, Any]:
    hard = load_all()
    soft = load_soft_layer()
    workbook_rows, workbook_meta = _load_workbook_rows()
    gates = [_gate_payload(ruleset, gate) for ruleset in hard + soft for gate in ruleset["gates"]]
    for gate in gates:
        gate["workbookRows"] = _match_workbook_rows(gate, workbook_rows)

    cause_counts = {CAUSE_CRITERIA: 0, CAUSE_DIAGNOSTIC: 0, CAUSE_READY: 0, CAUSE_EXTRACTION: 0}
    for gate in gates:
        cause_counts[gate["staticCause"]] = cause_counts.get(gate["staticCause"], 0) + 1

    rulesets = []
    for ruleset in hard + soft:
        pack_gates = [gate for gate in gates if gate["ruleset"] == ruleset.get("ruleset")]
        rulesets.append(
            {
                "id": ruleset.get("ruleset"),
                "name": ruleset.get("ruleset_name", ruleset.get("ruleset")),
                "sourceFile": ruleset.get("_source_file"),
                "layer": ruleset.get("layer", "hard"),
                "version": ruleset.get("version", ""),
                "sourceRef": ruleset.get("source_ref", ""),
                "inRegressionBaseline": bool(ruleset.get("in_regression_baseline", False)),
                "gateCount": len(pack_gates),
                "notEvaluatedCount": sum(1 for gate in pack_gates if gate["staticCause"] != CAUSE_READY),
                "marketKeys": _markets_for_ruleset(ruleset.get("ruleset", "")),
            }
        )

    return {
        "markets": MARKETS,
        "rulesets": rulesets,
        "gates": gates,
        "fields": _field_rows(gates),
        "sourceDocs": _source_docs(),
        "workbook": workbook_meta,
        "workbookRows": [
            {
                "rowId": row.get("row_id", ""),
                "market": row.get("market", ""),
                "board": row.get("board_pathway", ""),
                "standard": row.get("standard", ""),
                "limb": row.get("limb", ""),
                "metricField": row.get("metric_field", ""),
                "op": row.get("op", ""),
                "value": row.get("value", ""),
                "unit": row.get("unit_ccy", ""),
                "citation": row.get("rule_citation", ""),
                "url": row.get("official_source_url", ""),
                "effectiveFrom": row.get("effective_from", ""),
                "verified": row.get("threshold_verified", ""),
                "reviewStatus": row.get("review_status", ""),
                "notes": row.get("reviewer_notes") or row.get("basis_note") or "",
            }
            for row in workbook_rows
        ],
        "summary": {
            "gateCount": len(gates),
            "rulesetCount": len(rulesets),
            "readyCount": cause_counts[CAUSE_READY],
            "criteriaCount": cause_counts[CAUSE_CRITERIA],
            "diagnosticCount": cause_counts[CAUSE_DIAGNOSTIC],
            "workbookRowCount": workbook_meta.get("rowCount", 0),
            "xlsxPresent": workbook_meta.get("xlsxPresent", False),
        },
        "legend": {
            CAUSE_CRITERIA: "规则 / 文档：门槛被关掉、待原文确认，或工作簿写得不清楚。",
            CAUSE_EXTRACTION: "抽取 JSON：规则已打开，但公司 JSON 缺少这条要用的字段。",
            CAUSE_DIAGNOSTIC: "诊断引擎：定性 / 需 AI 的条款，硬引擎按设计不评估。",
            CAUSE_READY: "规则已打开，传入完整 JSON 后应当给出达标 / 未达标 / 缺输入。",
        },
    }


def _resolve_path(raw_path: str, path_vars: dict) -> str:
    def repl(match: re.Match[str]) -> str:
        name = match.group(1)
        return str(path_vars[name]) if name in path_vars else match.group(0)

    return _VAR_RE.sub(repl, raw_path)


def _missing_inputs(gate: dict, ctx: EvalContext) -> list[dict[str, str]]:
    missing: list[dict[str, str]] = []
    for check in walk_checks(gate.get("requirement", {})):
        profile_field = check.get("profile_field")
        if profile_field:
            if ctx.profile.get(profile_field) is None:
                missing.append(
                    {
                        "checkId": check.get("id", ""),
                        "path": f"profile.{profile_field}",
                        "reason": f"运行档案里没有 {profile_field}",
                    }
                )
            continue
        raw_path = check.get("input_path") or ""
        if not raw_path:
            continue
        path = _resolve_path(raw_path, ctx.path_vars)
        if _VAR_RE.search(path):
            missing.append(
                {
                    "checkId": check.get("id", ""),
                    "path": path,
                    "reason": "路径变量未提供（例如 latest_audited_fy）",
                }
            )
            continue
        leaf = read_leaf(ctx.root, path)
        if not leaf.present:
            missing.append(
                {
                    "checkId": check.get("id", ""),
                    "path": path,
                    "reason": leaf.reason or "JSON 中没有这个字段",
                }
            )
    return missing


def _runtime_attribution(
    gate: dict, result: Any, missing: list[dict[str, str]]
) -> tuple[str, str]:
    static_cause, static_reason = static_attribution(gate)
    if static_cause != CAUSE_READY:
        return static_cause, static_reason
    status = getattr(result, "status", "")
    if status == "NOT_EVALUATED":
        return CAUSE_DIAGNOSTIC, (
            getattr(result, "note", "")
            or "规则已打开，但引擎仍返回未评估。这更像诊断代码问题，而不是文档或抽取。"
        )
    if status == "MISSING_INPUT":
        paths = "、".join(item["path"] for item in missing[:4]) or "所需字段"
        return CAUSE_EXTRACTION, (
            f"规则已打开，硬引擎因为公司 JSON 缺字段而给出「缺输入」。缺的是：{paths}。"
        )
    if status == "INDETERMINATE":
        return CAUSE_EXTRACTION, (
            "JSON 里有值，但缺币种或汇率，引擎无法比较。补全单位或 FX 后再跑。"
        )
    return CAUSE_READY, "这条已经按硬门槛评估（达标或未达标）。"


def build_trace(
    issuer: dict[str, Any],
    *,
    profile: dict[str, Any] | None = None,
    ruleset_names: list[str] | None = None,
    market_key: str | None = None,
) -> dict[str, Any]:
    profile = dict(profile or {})
    path_vars = dict(_DEFAULT_PATH_VARS)
    path_vars.update(profile.get("path_vars") or {})
    profile["path_vars"] = path_vars
    ctx = EvalContext(
        root=issuer,
        fx=profile.get("fx_rate_to_hkd"),
        path_vars=path_vars,
        profile=profile,
    )

    wanted = set(ruleset_names or [])
    if market_key:
        for market in MARKETS:
            if market["key"] == market_key:
                wanted.update(market["rulesets"])
    hard = load_all()
    soft = load_soft_layer()
    if wanted:
        hard = [ruleset for ruleset in hard if ruleset.get("ruleset") in wanted]
        soft = [ruleset for ruleset in soft if ruleset.get("ruleset") in wanted]

    results: list[dict[str, Any]] = []
    counts = {
        "PASS": 0,
        "SHORTFALL": 0,
        "MISSING_INPUT": 0,
        "INDETERMINATE": 0,
        "NOT_EVALUATED": 0,
        CAUSE_CRITERIA: 0,
        CAUSE_EXTRACTION: 0,
        CAUSE_DIAGNOSTIC: 0,
        CAUSE_READY: 0,
    }
    for ruleset in hard:
        meta = {"ruleset": ruleset.get("ruleset"), "version": ruleset.get("version")}
        for gate in ruleset["gates"]:
            result = eval_gate(gate, meta, ctx)
            missing = _missing_inputs(gate, ctx)
            cause, reason = _runtime_attribution(gate, result, missing)
            counts[result.status] = counts.get(result.status, 0) + 1
            counts[cause] = counts.get(cause, 0) + 1
            results.append(
                {
                    **_gate_payload(ruleset, gate),
                    "status": result.status,
                    "note": result.note,
                    "runtimeCause": cause,
                    "runtimeReason": reason,
                    "missingInputs": missing,
                    "checkResults": [
                        {
                            "id": item.check_id,
                            "metric": item.metric,
                            "status": item.status,
                            "required": item.required,
                            "actual": item.actual,
                            "path": item.used_path,
                            "note": item.note,
                        }
                        for item in result.checks
                    ],
                }
            )
    for ruleset in soft:
        for gate in ruleset["gates"]:
            payload = _gate_payload(ruleset, gate)
            counts["NOT_EVALUATED"] += 1
            counts[CAUSE_DIAGNOSTIC] += 1
            results.append(
                {
                    **payload,
                    "status": "NOT_EVALUATED",
                    "note": "soft / qualitative layer",
                    "runtimeCause": CAUSE_DIAGNOSTIC,
                    "runtimeReason": payload["staticReason"],
                    "missingInputs": [],
                    "checkResults": [],
                }
            )

    present_paths = []
    missing_paths = []
    for gate in results:
        for check in gate.get("checks") or []:
            raw = check.get("inputPath") or (
                f"profile.{check['profileField']}" if check.get("profileField") else ""
            )
            if not raw:
                continue
            if check.get("profileField"):
                present = ctx.profile.get(check["profileField"]) is not None
                target = f"profile.{check['profileField']}"
            else:
                path = _resolve_path(raw, path_vars)
                present = read_leaf(ctx.root, path).present if not _VAR_RE.search(path) else False
                target = path
            bucket = present_paths if present else missing_paths
            if target not in bucket:
                bucket.append(target)

    return {
        "issuerId": issuer.get("issuer_id") or issuer.get("issuerName") or "pasted_json",
        "marketKey": market_key,
        "rulesetNames": sorted(wanted) if wanted else [item.get("ruleset") for item in hard + soft],
        "summary": counts,
        "presentFieldCount": len(present_paths),
        "missingFieldCount": len(missing_paths),
        "missingFields": missing_paths[:80],
        "presentFields": present_paths[:80],
        "gates": results,
    }


def _safe_yaml_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return '""'
    text = str(value)
    if text == "":
        return '""'
    if re.fullmatch(r"-?\d+(\.\d+)?", text):
        return text
    escaped = text.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _find_gate_span(text: str, gate_id: str) -> tuple[int, int, str] | None:
    matches = list(_GATE_ID_RE.finditer(text))
    for index, match in enumerate(matches):
        if match.group(2) != gate_id:
            continue
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        return start, end, match.group(1)
    return None


def _replace_or_insert_key(block: str, key: str, rendered: str, indent: str) -> str:
    pattern = re.compile(rf"^({re.escape(indent)}{re.escape(key)}:\s*).+$", re.M)
    if pattern.search(block):
        return pattern.sub(rf"\g<1>{rendered}", block, count=1)
    id_line = re.search(rf"^{re.escape(indent)}-\s+id:\s*.+$", block, re.M)
    insertion = f"{indent}{key}: {rendered}\n"
    if id_line:
        point = id_line.end()
        return block[:point] + "\n" + insertion + block[point:].lstrip("\n")
    return insertion + block


def _patch_check_threshold(block: str, check_id: str, value: Any, unit: Any) -> str:
    check_re = re.compile(
        rf"^(\s*)id:\s*['\"]?{re.escape(check_id)}['\"]?\s*$",
        re.M,
    )
    match = check_re.search(block)
    if not match:
        return block
    indent = match.group(1)
    start = match.start()
    next_check = re.search(rf"^{re.escape(indent)}id:\s*", block[match.end():], re.M)
    end = match.end() + next_check.start() if next_check else len(block)
    chunk = block[start:end]
    inline = re.compile(
        r"threshold:\s*\{\s*value:\s*[^,]+,\s*unit:\s*['\"][^'\"]*['\"]\s*\}"
    )
    replacement = (
        "threshold: { value: "
        f"{_safe_yaml_scalar(value)}, unit: {_safe_yaml_scalar(unit)} }}"
    )
    if inline.search(chunk):
        chunk = inline.sub(replacement, chunk, count=1)
    else:
        value_re = re.compile(r"^(\s*value:\s*).+$", re.M)
        unit_re = re.compile(r"^(\s*unit:\s*).+$", re.M)
        if value is not None and value_re.search(chunk):
            chunk = value_re.sub(rf"\g<1>{_safe_yaml_scalar(value)}", chunk, count=1)
        if unit is not None and unit_re.search(chunk):
            chunk = unit_re.sub(rf"\g<1>{_safe_yaml_scalar(unit)}", chunk, count=1)
    return block[:start] + chunk + block[end:]


def patch_gate(source_file: str, gate_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    """Surgically edit one gate in a YAML pack, preserving comments."""
    name = Path(source_file).name
    if not re.fullmatch(r"[A-Za-z0-9_.-]+\.ya?ml", name):
        raise ValueError("Invalid ruleset file name.")
    path = Path(RULES_DIR) / name
    if not path.exists():
        soft_dir = PACKAGE_DIR / "qualitative" / "rules"
        path = soft_dir / name
    if not path.exists():
        raise FileNotFoundError(f"Ruleset file not found: {name}")

    original = path.read_text(encoding="utf-8")
    span = _find_gate_span(original, gate_id)
    if span is None:
        raise KeyError(f"Gate {gate_id} not found in {name}")
    start, end, indent = span
    block = original[start:end]
    inner = indent + "  "

    if "evaluated" in updates and updates["evaluated"] is not None:
        block = _replace_or_insert_key(
            block, "evaluated", _safe_yaml_scalar(bool(updates["evaluated"])), inner
        )
    if "stubReason" in updates and updates["stubReason"] is not None:
        block = _replace_or_insert_key(
            block, "stub_reason", _safe_yaml_scalar(updates["stubReason"]), inner
        )
    if "title" in updates and updates["title"]:
        block = _replace_or_insert_key(block, "title", _safe_yaml_scalar(updates["title"]), inner)
    if "ruleRef" in updates and updates["ruleRef"]:
        block = _replace_or_insert_key(
            block, "rule_ref", _safe_yaml_scalar(updates["ruleRef"]), inner
        )

    for check in updates.get("checks") or []:
        check_id = check.get("id")
        if not check_id:
            continue
        if "thresholdValue" in check or "thresholdUnit" in check:
            block = _patch_check_threshold(
                block,
                check_id,
                check.get("thresholdValue"),
                check.get("thresholdUnit"),
            )

    path.write_text(original[:start] + block + original[end:], encoding="utf-8")
    from .hard_inspection.loader import load_ruleset

    loaded = load_ruleset(str(path))
    gate = next((item for item in loaded["gates"] if item.get("id") == gate_id), None)
    if gate is None:
        raise KeyError(f"Patched file no longer contains gate {gate_id}")
    return {
        "ok": True,
        "sourceFile": name,
        "path": str(path.relative_to(REPO_ROOT)),
        "gate": _gate_payload(loaded, gate),
    }


def _read_json_arg(raw: str | None) -> Any:
    if not raw:
        return None
    path = Path(raw)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return json.loads(raw)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="eligibility.devtools")
    sub = parser.add_subparsers(dest="command", required=True)
    catalog = sub.add_parser("catalog", help="Dump the IPO Diagnostic catalog as JSON")
    catalog.add_argument(
        "--output",
        default=None,
        help="Write a formatted catalog snapshot to this path instead of stdout.",
    )
    trace = sub.add_parser("trace", help="Attribute NOT_EVALUATED against issuer JSON")
    trace.add_argument("--issuer", required=True, help="Issuer JSON path or literal")
    trace.add_argument("--profile", default=None)
    trace.add_argument("--market", default=None)
    trace.add_argument("--ruleset", action="append", default=None)
    patch = sub.add_parser("patch", help="Patch one gate in a YAML pack")
    patch.add_argument("--file", required=True)
    patch.add_argument("--gate", required=True)
    patch.add_argument("--updates", required=True, help="JSON object of fields to change")
    args = parser.parse_args(argv)

    if args.command == "catalog":
        payload = build_catalog()
        if args.output:
            output = Path(args.output)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"Wrote IPO Diagnostic catalog snapshot: {output}")
        else:
            print(json.dumps(payload, ensure_ascii=False))
        return 0
    if args.command == "trace":
        issuer = _read_json_arg(args.issuer)
        if not isinstance(issuer, dict):
            raise SystemExit("Issuer JSON must be an object.")
        profile = _read_json_arg(args.profile) or {}
        print(
            json.dumps(
                build_trace(
                    issuer,
                    profile=profile if isinstance(profile, dict) else {},
                    ruleset_names=args.ruleset,
                    market_key=args.market,
                ),
                ensure_ascii=False,
            )
        )
        return 0
    updates = _read_json_arg(args.updates)
    if not isinstance(updates, dict):
        raise SystemExit("Patch updates must be a JSON object.")
    print(json.dumps(patch_gate(args.file, args.gate, updates), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
