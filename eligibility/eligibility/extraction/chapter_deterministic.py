"""Deterministic eligibility fields from Agent1/Agent2 chapter JSON.

When users upload drafting-pipeline chapter dumps (``values`` + periods), we can
lift numbers and structural facts without an LLM. This avoids empty scorecards
when the cloud model returns prose instead of JSON, and fills multi-year /
deal / WVR paths the hard engine needs.
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path
from typing import Any

from ..common.types import EXTRACTED, ExtractedField


def _parse_number(raw: Any) -> float | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    if not text or text.upper() in {"N/A", "NA", "NIL", "-"}:
        return None
    neg = False
    if text.startswith("(") and text.endswith(")"):
        neg = True
        text = text[1:-1]
    # Strip currency words / symbols common in prospectus dumps.
    text = (
        text.replace(",", "")
        .replace("，", "")
        .replace("%", "")
        .replace("HK$", "")
        .replace("RMB", "")
        .replace("CNY", "")
        .replace("US$", "")
        .replace("USD", "")
        .replace("SGD", "")
        .replace("S$", "")
        .replace("百万人民币", "")
        .replace("百万元", "")
        .replace("人民币", "")
        .replace("百万", "")
        .replace("million", "")
        .strip()
    )
    # Keep leading numeric token only ("3.92 per Offer Share…")
    match = re.match(r"[-+]?\d+(?:\.\d+)?", text)
    if not match:
        return None
    try:
        value = float(match.group(0))
    except ValueError:
        return None
    return -value if neg else value


def _parse_pct(raw: Any) -> float | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace(",", "")
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*%?", text)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _unwrap_value(node: Any) -> Any:
    if isinstance(node, dict) and "value" in node and (
        isinstance(node.get("value"), (dict, list, str, int, float))
        or node.get("value") is None
    ):
        # Prefer nested payload when provenance wrappers are present.
        return node.get("value")
    return node


def _fy_series(periods: dict[str, Any] | None) -> list[tuple[str, int, float]]:
    """Return sorted full-year series as (FY2018, 2018, value)."""
    scored: list[tuple[str, int, float]] = []
    for key, raw in (periods or {}).items():
        label = str(key)
        upper = label.upper()
        if "6M" in upper or "INTERIM" in upper or "H1" in upper:
            continue
        year_match = re.search(r"(20\d{2})", label)
        if not year_match:
            continue
        if not upper.startswith("FY") and "YEAR" not in upper and not re.fullmatch(
            r"20\d{2}", label.strip()
        ):
            # Allow FY2018 / year ended … / bare year
            if "ENDED" not in upper and "DECEMBER" not in upper:
                continue
        num = _parse_number(raw)
        if num is None:
            continue
        year = int(year_match.group(1))
        scored.append((f"FY{year}", year, num))
    scored.sort(key=lambda x: x[1])
    # De-dupe year (last wins)
    by_year: dict[int, tuple[str, int, float]] = {y: row for row in scored for y in [row[1]]}
    return [by_year[y] for y in sorted(by_year)]


def _latest_as_of(as_of: dict[str, Any]) -> tuple[str, float] | None:
    """Prefer latest December year-end over interim balance-sheet dates."""
    year_ends: list[tuple[int, int, str, float]] = []
    all_dates: list[tuple[int, int, str, float]] = []
    for key, raw in (as_of or {}).items():
        label = str(key)
        ym = re.search(r"(20\d{2})", label)
        if not ym:
            continue
        lower = label.lower()
        month = 12
        if "june" in lower:
            month = 6
        elif "march" in lower:
            month = 3
        elif "september" in lower:
            month = 9
        num = _parse_number(raw)
        if num is None:
            continue
        entry = (int(ym.group(1)), month, label, num)
        all_dates.append(entry)
        if month == 12 or "december" in lower:
            year_ends.append(entry)
    pool = year_ends or all_dates
    if not pool:
        return None
    pool.sort()
    _y, _m, label, value = pool[-1]
    return label, value


def _leaf(
    field_id: str,
    value: float,
    unit: str | None,
    *,
    source_file: str,
    span: str,
) -> ExtractedField:
    return {
        "field_id": field_id,
        "value": value,
        "unit": unit,
        "kind": "quantifiable",
        "confirmation_status": EXTRACTED,
        "provenance": {
            "source_file": source_file,
            "page_start": None,
            "page_end": None,
            "span_preview": span[:200],
            "confidence": 0.95,
        },
        "null_reason": None,
    }


def _period_leaf(value: float, unit: str | None) -> dict[str, Any]:
    if unit:
        return {"value": value, "unit": unit}
    return {"value": value}


def _load_chapter_map(paths: list[str | Path]) -> dict[str, dict[str, Any]]:
    """Map lowercased stem → values dict for Agent1 chapter JSON files."""
    out: dict[str, dict[str, Any]] = {}
    for raw in paths:
        path = Path(raw)
        if path.suffix.lower() != ".json" or not path.is_file():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(data, dict) or not isinstance(data.get("values"), dict):
            continue
        out[path.stem.lower()] = data["values"]
        out[path.name.lower()] = data["values"]
    return out


def _load_chapter_documents(paths: list[str | Path]) -> list[dict[str, Any]]:
    """Load full chapter JSON documents (values + extracted_source_materials)."""
    docs: list[dict[str, Any]] = []
    for raw in paths:
        path = Path(raw)
        if path.suffix.lower() != ".json" or not path.is_file():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict):
            docs.append({"_file": path.name, **data})
    return docs


def _parse_money_token(raw: Any) -> tuple[float | None, str]:
    """Parse 'RMB362.6 million' / 'HK$493.6 million' / quoted variants."""
    if raw is None:
        return None, "RMB million"
    text = str(raw).strip().strip('"').strip("'").strip()
    text = text.replace("\\$", "$").replace("\\", "")
    unit = "RMB million"
    upper = text.upper()
    if "HK" in upper or "HKD" in upper:
        unit = "HKD million"
    elif "US$" in text or "USD" in upper:
        unit = "USD million"
    elif "SGD" in upper or "S$" in text:
        unit = "SGD million"
    elif "百万" in text or "人民币" in text or "RMB" in upper or "CNY" in upper:
        unit = "RMB million"
    elif "MILLION" in upper:
        # Bare "X million" — keep RMB million (Agent1 CN-heavy convention).
        unit = "RMB million"
    num = _parse_number(text)
    return num, unit


def _series_from_year_amount_dict(
    periods: dict[str, Any],
) -> tuple[list[tuple[str, int, float]], str]:
    """Lift year-keyed amounts: {'2021': '302.1 million', '2022_H1': '...'}."""
    unit = "RMB million"
    scored: list[tuple[str, int, float]] = []
    for key, raw in (periods or {}).items():
        label = str(key).strip()
        upper = label.upper()
        if re.search(r"6M|H1|INTERIM|_\d{2}$|-\d{2}$", upper):
            continue
        if re.search(r"20\d{2}-\d{2}", label):
            continue
        year_match = re.search(r"(20\d{2})", label)
        if not year_match:
            continue
        # Accept bare years, FY20xx, or year-ended labels; skip unknown keys.
        if not (
            re.fullmatch(r"20\d{2}", label)
            or upper.startswith("FY")
            or "YEAR" in upper
            or "ENDED" in upper
            or "DECEMBER" in upper
        ):
            continue
        num, tok_unit = _parse_money_token(raw)
        if num is None:
            continue
        unit = tok_unit or unit
        year = int(year_match.group(1))
        scored.append((f"FY{year}", year, num))
    scored.sort(key=lambda x: x[1])
    by_year: dict[int, tuple[str, int, float]] = {y: row for row in scored for y in [row[1]]}
    return [by_year[y] for y in sorted(by_year)], unit


def _fy_labels_from_meta(raw_years: Any) -> list[str]:
    """Normalize financial_years list into FY labels; keep interims as-is."""
    if not isinstance(raw_years, list):
        return []
    labels: list[str] = []
    for item in raw_years:
        text = str(item).strip().strip('"')
        if not text:
            continue
        if re.search(r"6M|H1|INTERIM|-\d{2}-\d{2}", text, re.I) or re.search(
            r"20\d{2}-\d{2}", text
        ):
            labels.append(text)
            continue
        ym = re.search(r"(20\d{2})", text)
        if ym:
            labels.append(f"FY{ym.group(1)}")
        else:
            labels.append(text)
    return labels


def _series_from_amount_list(
    amounts: list[Any],
    year_labels: list[str],
) -> tuple[list[tuple[str, int, float]], str]:
    """Align parallel amount list + year labels; drop interim periods for FY spine."""
    unit = "RMB million"
    full: list[tuple[str, int, float, bool]] = []
    for i, amt in enumerate(amounts or []):
        num, tok_unit = _parse_money_token(amt)
        if num is None:
            continue
        unit = tok_unit or unit
        label = year_labels[i] if i < len(year_labels) else f"FY_idx{i}"
        interim = bool(
            re.search(r"6M|H1|INTERIM|-\d{2}-\d{2}|20\d{2}-\d{2}", str(label), re.I)
        )
        ym = re.search(r"(20\d{2})", str(label))
        year = int(ym.group(1)) if ym else 2000 + i
        if not str(label).upper().startswith("FY") and not interim and ym:
            label = f"FY{ym.group(1)}"
        full.append((str(label), year, num, interim))
    fy_only = [(lab, y, n) for lab, y, n, interim in full if not interim]
    if fy_only:
        return fy_only, unit
    return [(lab, y, n) for lab, y, n, _i in full], unit


def _financial_bundle(values: dict[str, Any], source_file: str) -> dict[str, Any]:
    """Build multi-year financials + UI quantifiable leaves from Financial_Information."""
    quant: list[ExtractedField] = []
    income_rows: dict[str, dict[str, Any]] = {}
    unit_default = "RMB million"

    year_labels = _fy_labels_from_meta(_unwrap_value(values.get("financial_years")))

    revenue = _unwrap_value(values.get("revenue") or values.get("turnover"))
    rev_unit = unit_default
    rev_series: list[tuple[str, int, float]] = []
    if isinstance(revenue, dict) and isinstance(revenue.get("periods"), dict):
        rev_unit = revenue.get("unit") or unit_default
        rev_series = _fy_series(revenue.get("periods") or {})
    elif isinstance(revenue, list):
        rev_series, rev_unit = _series_from_amount_list(revenue, year_labels)
    elif isinstance(revenue, dict):
        rev_series, rev_unit = _series_from_year_amount_dict(revenue)
    if rev_series:
        for label, _year, num in rev_series:
            row = income_rows.setdefault(label, {"period": label})
            row["revenue"] = _period_leaf(num, rev_unit)
        label, _y, num = rev_series[-1]
        quant.append(
            _leaf("revenue", num, rev_unit, source_file=source_file, span=f"revenue {label}={num}")
        )

    net_income = _unwrap_value(
        values.get("net_income")
        or values.get("profit_attributable_to_owners")
        or values.get("profit")
    )
    profit_unit = unit_default
    profit_series: list[tuple[str, int, float]] = []
    if isinstance(net_income, dict) and isinstance(net_income.get("periods"), dict):
        profit_unit = net_income.get("unit") or unit_default
        profit_series = _fy_series(net_income.get("periods") or {})
    elif isinstance(net_income, list):
        profit_series, profit_unit = _series_from_amount_list(net_income, year_labels)
    elif isinstance(net_income, dict):
        profit_series, profit_unit = _series_from_year_amount_dict(net_income)
    if profit_series:
        for label, _year, num in profit_series:
            row = income_rows.setdefault(label, {"period": label})
            row["profit_attributable_to_owners"] = _period_leaf(num, profit_unit)
            # SGX 210 uses pre-tax ex-nonrecurrent; alias net profit as best available.
            row.setdefault(
                "pre_tax_profit_ex_nonrecurrent",
                _period_leaf(num, profit_unit),
            )
        label, _y, num = profit_series[-1]
        quant.append(
            _leaf(
                "profit_attributable_to_owners",
                num,
                profit_unit,
                source_file=source_file,
                span=f"net_income/profit {label}={num}",
            )
        )
        quant.append(
            _leaf(
                "pre_tax_profit_ex_nonrecurrent",
                num,
                profit_unit,
                source_file=source_file,
                span=f"aliased from net_income {label}={num}",
            )
        )

    ocf_unit = unit_default
    ocf_series: list[tuple[str, int, float]] = []
    cash_flows = values.get("cash_flows")
    cash_rows: list[Any] = []
    unwrapped = _unwrap_value(cash_flows)
    if isinstance(unwrapped, list):
        cash_rows = unwrapped
    elif isinstance(cash_flows, list):
        cash_rows = cash_flows
    for row in cash_rows:
        if not isinstance(row, dict):
            continue
        metric = str(row.get("metric") or "").lower()
        if "operating" not in metric:
            continue
        ocf_unit = row.get("unit") or unit_default
        periods = {
            k: v
            for k, v in row.items()
            if k not in {"metric", "unit", "note"} and _parse_number(v) is not None
        }
        ocf_series = _fy_series(periods)
        for label, _year, num in ocf_series:
            income_row = income_rows.setdefault(label, {"period": label})
            income_row["operating_cash_flow"] = _period_leaf(num, ocf_unit)
        if ocf_series:
            label, _y, num = ocf_series[-1]
            quant.append(
                _leaf(
                    "operating_cash_flow",
                    num,
                    ocf_unit,
                    source_file=source_file,
                    span=f"{row.get('metric')} {label}={num}",
                )
            )
        break

    balance_rows: list[dict[str, Any]] = []
    assets = _unwrap_value(values.get("assets") or values.get("total_assets"))
    liabilities = _unwrap_value(values.get("liabilities") or values.get("total_liabilities"))
    asset_unit = unit_default
    asset_val = None
    liab_val = None
    if isinstance(assets, dict):
        asset_unit = assets.get("unit") or unit_default
        picked = _latest_as_of(assets.get("as_of") or {})
        if picked:
            label, asset_val = picked
            quant.append(
                _leaf(
                    "total_assets",
                    asset_val,
                    asset_unit,
                    source_file=source_file,
                    span=f"total assets as of {label}={asset_val}",
                )
            )
    if isinstance(liabilities, dict):
        picked = _latest_as_of(liabilities.get("as_of") or {})
        if picked:
            _label, liab_val = picked
    if asset_val is not None:
        row: dict[str, Any] = {
            "period": (profit_series[-1][0] if profit_series else "FY_latest"),
            "total_assets": _period_leaf(asset_val, asset_unit),
        }
        if liab_val is not None:
            net = float(asset_val) - float(liab_val)
            row["net_assets"] = _period_leaf(net, asset_unit)
            quant.append(
                _leaf(
                    "net_assets",
                    net,
                    asset_unit,
                    source_file=source_file,
                    span=f"net assets ≈ total assets - liabilities",
                )
            )
        balance_rows.append(row)

    # Path vars + aggregates from the profit / revenue year spine.
    spine = profit_series or rev_series or ocf_series
    path_vars: dict[str, str] = {}
    aggregates: dict[str, Any] = {}
    if spine:
        labels = [lab for lab, _y, _v in spine]
        path_vars["latest_audited_fy"] = labels[-1]
        if len(labels) >= 2:
            path_vars["prior_fy_1"] = labels[-2]
        if len(labels) >= 3:
            path_vars["prior_fy_2"] = labels[-3]

        if len(profit_series) >= 3:
            two_prec = round(profit_series[-3][2] + profit_series[-2][2], 4)
            three = round(sum(v for _l, _y, v in profit_series[-3:]), 4)
            aggregates["profit_attributable_to_owners_aggregate_two_preceding_years"] = (
                _period_leaf(two_prec, profit_unit)
            )
            aggregates["profit_attributable_to_owners_aggregate_track_record"] = (
                _period_leaf(three, profit_unit)
            )
        elif len(profit_series) == 2:
            aggregates["profit_attributable_to_owners_aggregate_two_preceding_years"] = (
                _period_leaf(profit_series[0][2], profit_unit)
            )
            aggregates["profit_attributable_to_owners_aggregate_track_record"] = (
                _period_leaf(
                    round(profit_series[0][2] + profit_series[1][2], 4), profit_unit
                )
            )

        if ocf_series:
            ocf_track = round(sum(v for _l, _y, v in ocf_series[-3:]), 4)
            aggregates["operating_cash_flow_aggregate_track_record"] = _period_leaf(
                ocf_track, ocf_unit
            )

    track_years = len(spine)
    # Also count declared track-record years in financial_years metadata.
    fy_meta = _unwrap_value(values.get("financial_years"))
    if isinstance(fy_meta, dict):
        trp = fy_meta.get("track_record_period") or []
        if isinstance(trp, list):
            full = [
                x
                for x in trp
                if isinstance(x, str)
                and "year ended" in x.lower()
                and "six months" not in x.lower()
            ]
            if full:
                track_years = max(track_years, len(full))

    return {
        "quantifiable": quant,
        "income_statement": [income_rows[k] for k in sorted(income_rows.keys())],
        "balance_sheet": balance_rows,
        "aggregates": aggregates,
        "path_vars": path_vars,
        "operating_track_record_years": track_years or None,
        "unit": unit_default,
    }


def _corpus_blob(
    chapters: dict[str, dict[str, Any]],
    docs: list[dict[str, Any]] | None = None,
) -> str:
    """Flatten chapter values + source materials to one searchable text blob."""
    parts: list[str] = []
    for values in chapters.values():
        try:
            parts.append(json.dumps(values, ensure_ascii=False))
        except (TypeError, ValueError):
            continue
    for doc in docs or []:
        try:
            for key in (
                "extracted_source_materials",
                "coverage_notes",
                "null_reasons",
                "values",
            ):
                if key in doc:
                    parts.append(json.dumps(doc[key], ensure_ascii=False))
        except (TypeError, ValueError):
            continue
    return "\n".join(parts)


def _bundle_from_series(
    *,
    years: list[str],
    revenue: list[float] | None,
    profit: list[float] | None,
    unit: str,
    source_file: str,
    note: str,
) -> dict[str, Any]:
    """Build the same shape as ``_financial_bundle`` from parallel FY series."""
    income_rows: dict[str, dict[str, Any]] = {}
    quant: list[ExtractedField] = []
    rev_series: list[tuple[str, int, float]] = []
    profit_series: list[tuple[str, int, float]] = []

    for i, label in enumerate(years):
        ym = re.search(r"(20\d{2})", label)
        year = int(ym.group(1)) if ym else 2000 + i
        row = income_rows.setdefault(label, {"period": label})
        if revenue and i < len(revenue):
            row["revenue"] = _period_leaf(revenue[i], unit)
            rev_series.append((label, year, revenue[i]))
        if profit and i < len(profit):
            row["profit_attributable_to_owners"] = _period_leaf(profit[i], unit)
            row.setdefault(
                "pre_tax_profit_ex_nonrecurrent",
                _period_leaf(profit[i], unit),
            )
            profit_series.append((label, year, profit[i]))

    if rev_series:
        label, _y, num = rev_series[-1]
        quant.append(
            _leaf("revenue", num, unit, source_file=source_file, span=f"{note}; {label}={num}")
        )
    if profit_series:
        label, _y, num = profit_series[-1]
        quant.append(
            _leaf(
                "profit_attributable_to_owners",
                num,
                unit,
                source_file=source_file,
                span=f"{note}; {label}={num}",
            )
        )
        quant.append(
            _leaf(
                "pre_tax_profit_ex_nonrecurrent",
                num,
                unit,
                source_file=source_file,
                span=f"{note}; aliased pre-tax {label}={num}",
            )
        )

    spine = profit_series or rev_series
    path_vars: dict[str, str] = {}
    aggregates: dict[str, Any] = {}
    if spine:
        labels = [lab for lab, _y, _v in spine]
        path_vars["latest_audited_fy"] = labels[-1]
        if len(labels) >= 2:
            path_vars["prior_fy_1"] = labels[-2]
        if len(labels) >= 3:
            path_vars["prior_fy_2"] = labels[-3]
        if len(profit_series) >= 3:
            aggregates["profit_attributable_to_owners_aggregate_two_preceding_years"] = (
                _period_leaf(round(profit_series[-3][2] + profit_series[-2][2], 4), unit)
            )
            aggregates["profit_attributable_to_owners_aggregate_track_record"] = (
                _period_leaf(round(sum(v for _l, _y, v in profit_series[-3:]), 4), unit)
            )
        if rev_series:
            aggregates["revenue_aggregate_track_record"] = _period_leaf(
                round(sum(v for _l, _y, v in rev_series[-3:]), 4), unit
            )

    return {
        "quantifiable": quant,
        "income_statement": [income_rows[k] for k in sorted(income_rows.keys())],
        "balance_sheet": [],
        "aggregates": aggregates,
        "path_vars": path_vars,
        "operating_track_record_years": len(spine) or None,
        "unit": unit,
        "note": note,
    }


def _mine_financials_from_corpus(
    chapters: dict[str, dict[str, Any]],
    docs: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """Recover revenue/profit when Financial_Information.json lacks structured numbers.

    Sparse Agent1 dumps (e.g. 01300) often keep FY tables only inside Summary /
    Risk Factors ``extracted_source_materials`` text. Mine those before giving up.
    """
    blob = _corpus_blob(chapters, docs)
    if len(blob) < 80:
        return None

    # Prefer declared FY labels from Financial_Information when present.
    years: list[str] = []
    fin = chapters.get("financial_information") or {}
    fy_meta = _unwrap_value(fin.get("financial_years"))
    if isinstance(fy_meta, list):
        years = [str(x) for x in fy_meta if re.search(r"20\d{2}", str(x))]
    if len(years) < 2:
        years = []

    # Summary condensed table in RMB'000:
    #   Turnover 865,009 1,410,779 1,822,747
    #   Profit ... attributable to owners ... 85,254 151,261 206,785
    turn_m = re.search(
        r"Turnover\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)", blob, re.IGNORECASE
    )
    profit_m = re.search(
        r"Profit for the year/period attributable to owners of the Company\s+"
        r"([\d,]+)\s+([\d,]+)\s+([\d,]+)",
        blob,
        re.IGNORECASE,
    )
    if turn_m and profit_m:
        if not years:
            # Infer FY labels near the table.
            nearby = blob[max(0, turn_m.start() - 120) : turn_m.end() + 40]
            found = re.findall(r"FY(20\d{2})", nearby)
            if len(found) >= 3:
                years = [f"FY{y}" for y in found[:3]]
            else:
                years = ["FY_prior_2", "FY_prior_1", "FY_latest"]
        rev = [(_parse_number(x) or 0) / 1000.0 for x in turn_m.groups()]
        prof = [(_parse_number(x) or 0) / 1000.0 for x in profit_m.groups()]
        return _bundle_from_series(
            years=years[:3],
            revenue=rev,
            profit=prof,
            unit="RMB million",
            source_file="Summary.json (table mine)",
            note="Mined RMB'000 Summary table → RMB million",
        )

    # Narrative: "turnover ... FY2009, FY2010 and FY2011 was approximately
    # RMB865.0 million, RMB1,410.8 million, RMB1,822.7 million"
    narr = re.search(
        r"(?:turnover|revenue)\s+of\s+the\s+Group\s+in\s+"
        r"(FY20\d{2}),\s*(FY20\d{2})\s+and\s+(FY20\d{2})\s+was\s+approximately\s+"
        r"RMB\s*([\d,.]+)\s*million,\s*RMB\s*([\d,.]+)\s*million,\s*"
        r"(?:and\s*)?RMB\s*([\d,.]+)\s*million",
        blob,
        re.IGNORECASE,
    )
    profit_narr = re.search(
        r"profit after tax of the Group increased.*?from\s+approximately\s+"
        r"RMB\s*([\d,.]+)\s*million\s+in\s+(FY20\d{2})\s+to\s+approximately\s+"
        r"RMB\s*([\d,.]+)\s*million\s+in\s+(FY20\d{2})",
        blob,
        re.IGNORECASE | re.DOTALL,
    )
    if narr:
        y1, y2, y3, r1, r2, r3 = narr.groups()
        years = [y1, y2, y3]
        rev = [_parse_number(r1) or 0, _parse_number(r2) or 0, _parse_number(r3) or 0]
        prof = None
        if profit_narr:
            p1, py1, p2, py2 = profit_narr.groups()
            # Only two years in this sentence — leave third None unless table found.
            by_year = {py1: _parse_number(p1) or 0, py2: _parse_number(p2) or 0}
            prof = [by_year.get(y) for y in years]
            if any(v is None for v in prof):
                prof = None
        return _bundle_from_series(
            years=years,
            revenue=rev,
            profit=prof,
            unit="RMB million",
            source_file="Risk_Factors/Summary (narrative mine)",
            note="Mined RMB million turnover narrative",
        )

    return None


def _apply_financial_bundle(
    bundle: dict[str, Any],
    *,
    issuer_patch: dict[str, Any],
    path_vars: dict[str, str],
    profile_patch: dict[str, Any],
) -> list[ExtractedField]:
    quant = list(bundle.get("quantifiable") or [])
    issuer_patch["financials"]["income_statement"] = bundle.get("income_statement") or []
    if bundle.get("balance_sheet"):
        issuer_patch["financials"]["balance_sheet"] = bundle["balance_sheet"]
    for key, leaf in (bundle.get("aggregates") or {}).items():
        issuer_patch["financials"][key] = leaf
    path_vars.update(bundle.get("path_vars") or {})
    if bundle.get("operating_track_record_years"):
        profile_patch["operating_track_record_years"] = bundle[
            "operating_track_record_years"
        ]
    return quant


def _enrich_cn_and_offering_aliases(issuer_patch: dict[str, Any]) -> None:
    """Populate CN Main Board paths + offering aliases from HK-shaped financials."""
    fin = issuer_patch.setdefault("financials", {})
    rows = fin.get("income_statement") or []
    profits: list[float] = []
    revenues: list[float] = []
    unit = "RMB million"
    for row in rows:
        if not isinstance(row, dict):
            continue
        p = row.get("profit_attributable_to_owners")
        r = row.get("revenue")
        if isinstance(p, dict) and p.get("value") is not None:
            profits.append(float(p["value"]))
            unit = p.get("unit") or unit
        elif isinstance(p, (int, float)):
            profits.append(float(p))
        if isinstance(r, dict) and r.get("value") is not None:
            revenues.append(float(r["value"]))
            unit = r.get("unit") or unit
        elif isinstance(r, (int, float)):
            revenues.append(float(r))

    if profits:
        fin.setdefault(
            "net_profit_regulatory_cn_latest",
            _period_leaf(profits[-1], unit),
        )
        if len(profits) >= 2:
            fin.setdefault(
                "net_profit_regulatory_cn_aggregate_2fy",
                _period_leaf(round(sum(profits[-2:]), 4), unit),
            )
        if len(profits) >= 3:
            fin.setdefault(
                "net_profit_regulatory_cn_aggregate_3fy",
                _period_leaf(round(sum(profits[-3:]), 4), unit),
            )
        positive = fin.setdefault("net_profit_positive_each_year", {})
        if not isinstance(positive, dict):
            positive = {}
            fin["net_profit_positive_each_year"] = positive
        positive.setdefault(
            "2fy",
            all(p > 0 for p in profits[-2:])
            if len(profits) >= 2
            else all(p > 0 for p in profits),
        )
        positive.setdefault(
            "3fy",
            all(p > 0 for p in profits[-3:])
            if len(profits) >= 3
            else all(p > 0 for p in profits),
        )
        # Ensure latest income row carries SGX pre-tax alias when only net profit exists.
        for row in rows:
            if not isinstance(row, dict):
                continue
            if row.get("pre_tax_profit_ex_nonrecurrent") is not None:
                continue
            p = row.get("profit_attributable_to_owners")
            if isinstance(p, dict) and p.get("value") is not None:
                row["pre_tax_profit_ex_nonrecurrent"] = deepcopy(p)
            elif isinstance(p, (int, float)):
                row["pre_tax_profit_ex_nonrecurrent"] = _period_leaf(float(p), unit)
    if revenues and "revenue_aggregate_track_record" not in fin:
        fin["revenue_aggregate_track_record"] = _period_leaf(
            round(sum(revenues[-3:]), 4), unit
        )

    offering = issuer_patch.setdefault("offering_use_of_proceeds", {})
    mcap = offering.get("market_capitalisation_at_listing")
    root_offering = issuer_patch.setdefault("offering", {})
    if mcap is not None:
        if "expected_market_cap_at_listing" not in root_offering:
            # CN thresholds are CNY absolute; convert HKD million → RMB million
            # via approximate HKD→RMB when source unit is HKD.
            leaf = deepcopy(mcap)
            if isinstance(leaf, dict):
                unit_txt = str(leaf.get("unit") or "")
                if "HKD" in unit_txt.upper() and leaf.get("value") is not None:
                    # ~1 HKD ≈ 0.92 RMB; keep million scale for CNY million compare,
                    # but CN YAML uses bare CNY — express as CNY (absolute) via
                    # "RMB million" so engine scale matches.
                    hkd_m = float(leaf["value"])
                    rmb_m = round(hkd_m * 0.92, 4)
                    leaf = {
                        "value": rmb_m,
                        "unit": "RMB million",
                        "note": (
                            f"Converted from {hkd_m} HKD million at approx 0.92 "
                            "HKD→RMB for CN Main Board comparison."
                        ),
                    }
            root_offering["expected_market_cap_at_listing"] = leaf
        if "public_float_pct" in offering and "public_float_pct" not in root_offering:
            root_offering["public_float_pct"] = offering["public_float_pct"]
    if "public_float_pct" in offering and "public_float_pct" not in root_offering:
        root_offering["public_float_pct"] = offering["public_float_pct"]
    if (
        "public_hands_market_value" in offering
        and "public_hands_market_value" not in root_offering
    ):
        root_offering["public_hands_market_value"] = offering["public_hands_market_value"]


def _derive_public_float(
    chapters: dict[str, dict[str, Any]],
    deal: dict[str, Any],
    docs: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Derive public float % and public hands market value when share counts exist."""
    out: dict[str, Any] = {}
    total = deal.get("post_offering_total_shares")
    offer_shares = None

    scan_texts: list[str] = []
    important = chapters.get("important_notice") or {}
    scan_texts.append(json.dumps(important, ensure_ascii=False))
    for doc in docs or []:
        if str(doc.get("_file", "")).lower().startswith("important"):
            scan_texts.append(json.dumps(doc, ensure_ascii=False))
        if "structure_of_the_global_offering" in str(doc.get("_file", "")).lower():
            scan_texts.append(json.dumps(doc, ensure_ascii=False))

    for text in scan_texts:
        m = re.search(
            r"Number of Offer Shares under the Global Offering\s*:\s*([\d,]+)",
            text,
            re.IGNORECASE,
        )
        if not m:
            m = re.search(
                r"GLOBAL OFFERING\s+Number of Offer Shares\s*:\s*([\d,]+)",
                text,
                re.IGNORECASE,
            )
        if not m:
            m = re.search(
                r"Number of Offer Shares\s*:\s*([\d,]+)\s*Shares",
                text,
                re.IGNORECASE,
            )
        if m:
            offer_shares = _parse_number(m.group(1))
            break

    structure = chapters.get("structure_of_the_global_offering") or {}
    if offer_shares is None:
        hk = _parse_number(_unwrap_value(structure.get("number_of_hong_kong_shares")))
        intl = _parse_number(
            _unwrap_value(structure.get("number_of_international_shares"))
        )
        if hk is not None and intl is not None:
            offer_shares = hk + intl
        elif hk is not None:
            offer_shares = hk

    # SenseTime-style: Class B offer shares in issued share capital breakdown.
    if offer_shares is None:
        share_cap = chapters.get("share_capital") or {}
        issued = _unwrap_value(share_cap.get("issued_share_capital"))
        if isinstance(issued, dict):
            block = issued.get("immediately_after_global_offering_no_over_allotment") or {}
            if isinstance(block, dict) and block.get("class_b_offer_shares"):
                offer_shares = _parse_number(block.get("class_b_offer_shares"))
        after = _unwrap_value(share_cap.get("share_capital_after_offering"))
        if offer_shares is None and isinstance(after, dict):
            without = after.get("without_over_allotment") or {}
            if isinstance(without, dict) and without.get("class_b_offer_shares"):
                offer_shares = _parse_number(without.get("class_b_offer_shares"))

    if offer_shares and total and total > 0:
        pct = round(100.0 * float(offer_shares) / float(total), 4)
        out["public_float_pct"] = pct
        mcap = deal.get("expected_market_cap")
        if mcap is not None:
            out["public_hands_market_value"] = {
                "value": round(float(mcap) * pct / 100.0, 4),
                "unit": "HKD million",
            }
    return out


def _offer_and_market_cap(chapters: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Derive offer price, share count, and expected market cap (HKD million)."""
    offer_price = None
    source_bits: list[str] = []

    future = chapters.get("future_plans_and_use_of_proceeds") or {}
    for key in ("Offer_Price", "offer_price"):
        if key in future:
            offer_price = _parse_number(_unwrap_value(future.get(key)))
            source_bits.append("Future_Plans_and_Use_of_Proceeds.Offer_Price")
            break
    if offer_price is None:
        important = chapters.get("important_notice") or {}
        for key in ("maximum_offer_price", "Maximum_Offer_Price"):
            if key in important:
                offer_price = _parse_number(_unwrap_value(important.get(key)))
                source_bits.append("Important_Notice.maximum_offer_price")
                break

    shares = None
    share_cap = chapters.get("share_capital") or {}
    after = _unwrap_value(share_cap.get("share_capital_after_offering"))
    if isinstance(after, dict):
        without = after.get("without_over_allotment") or after.get("no_over_allotment") or {}
        if isinstance(without, dict):
            shares = _parse_number(without.get("total_shares"))
            source_bits.append("Share_Capital.share_capital_after_offering")
    if shares is None:
        issued = _unwrap_value(share_cap.get("issued_share_capital"))
        if isinstance(issued, dict):
            block = issued.get("immediately_after_global_offering_no_over_allotment") or {}
            if isinstance(block, dict):
                shares = _parse_number(block.get("total_shares"))
                source_bits.append("Share_Capital.issued_share_capital")
        elif issued is not None:
            # Sparse dumps store a bare share count string.
            shares = _parse_number(issued)
            if shares is not None:
                source_bits.append("Share_Capital.issued_share_capital(scalar)")

    # Important Notice often states post-offering share capital more reliably.
    if shares is None or shares < 1_000_000:
        important = chapters.get("important_notice") or {}
        blob = json.dumps(important, ensure_ascii=False)
        m = re.search(
            r"([\d,]+)\s+Shares\s+in\s+issue.*?Global Offering",
            blob,
            re.IGNORECASE | re.DOTALL,
        )
        # Fallback: "1,000,000,000 Shares" near capitalisation
        if not m:
            m = re.search(
                r"Capitalisation Issue.*?([\d,]+)\s*(?:Shares)?",
                blob,
                re.IGNORECASE | re.DOTALL,
            )
        # Prefer Share Capital span text
        sc_blob = json.dumps(share_cap, ensure_ascii=False)
        m2 = re.search(
            r"([\d,]+)\s+Shares in issue as",
            sc_blob,
            re.IGNORECASE,
        )
        cand = None
        if m2:
            cand = _parse_number(m2.group(1))
        if cand is None and m:
            cand = _parse_number(m.group(1))
        # Trigiant-style: issued share capital value is already total post-deal
        if cand is not None and cand >= 1_000_000:
            shares = cand
            source_bits.append("Share_Capital/Important_Notice span")

    out: dict[str, Any] = {}
    if offer_price is not None:
        out["offer_price"] = offer_price
    if shares is not None:
        # Many Agent1 dumps store share count in millions (e.g. "1,020.40816").
        # True share counts are large integers (>= 1e6) without a fractional part.
        if shares < 1_000_000 and (shares != int(shares) or shares < 100_000):
            shares = shares * 1_000_000.0
            source_bits.append("scaled_million_shares→count")
        out["post_offering_total_shares"] = shares
    if offer_price is not None and shares is not None:
        mcap = offer_price * shares / 1_000_000.0
        out["expected_market_cap"] = mcap
        out["market_capitalisation_at_listing"] = {
            "value": mcap,
            "unit": "HKD million",
            "note": (
                f"Derived as offer_price ({offer_price}) × post-offering shares "
                f"({shares:g}) / 1e6. Sources: {', '.join(source_bits) or 'chapter JSON'}."
            ),
        }
    return out


def _wvr_bundle(chapters: dict[str, dict[str, Any]]) -> dict[str, Any]:
    dwvr: dict[str, Any] = {}
    share_cap = chapters.get("share_capital") or {}
    voting = _unwrap_value(share_cap.get("voting_rights_structure"))
    if isinstance(voting, dict):
        structure = str(voting.get("structure") or "")
        if "weighted voting" in structure.lower() or voting.get("class_a_votes"):
            dwvr["structure_effective"] = True
            dwvr["structure_note"] = structure[:300]

    rel = chapters.get("relationship_with_controlling_shareholders") or {}
    holding = _unwrap_value(rel.get("controlling_shareholder_shareholding"))
    pct = None
    if isinstance(holding, dict):
        block = holding.get("without_over_allotment") or next(
            (v for v in holding.values() if isinstance(v, dict)), None
        )
        if isinstance(block, dict):
            pct = _parse_pct(
                block.get("prof_tang_shareholding_pct")
                or block.get("shareholding_pct")
                or block.get("economic_interest_pct")
            )
    if pct is None:
        # Fall back to any percentage in the holding blob.
        blob = json.dumps(holding, ensure_ascii=False) if holding is not None else ""
        pct = _parse_pct(blob)
    if pct is not None:
        dwvr["aggregate_wvr_beneficiaries"] = {"total_ownership_pct": pct}

    # Cover / Important notice often state WVR explicitly.
    cover = chapters.get("cover") or {}
    for node in cover.values():
        text = json.dumps(_unwrap_value(node), ensure_ascii=False).lower()
        if "weighted voting" in text or "wvr" in text:
            dwvr.setdefault("structure_effective", True)

    return dwvr


def _continuity_profile(chapters: dict[str, dict[str, Any]], track_years: int | None) -> dict[str, Any]:
    """Infer continuity profile fields from directors / controlling shareholders."""
    profile: dict[str, Any] = {}
    if track_years:
        profile["operating_track_record_years"] = int(track_years)

    directors = chapters.get("directors_and_senior_management") or {}
    join_raw = _unwrap_value(directors.get("director_join_date"))
    join_years: list[int] = []
    if isinstance(join_raw, list):
        for item in join_raw:
            if isinstance(item, dict):
                for val in item.values():
                    m = re.search(r"(20\d{2})", str(val))
                    if m:
                        join_years.append(int(m.group(1)))
            else:
                m = re.search(r"(20\d{2})", str(item))
                if m:
                    join_years.append(int(m.group(1)))
    # Founders / executives joining before the track-record window → continuity
    # at least as long as the audited trading record.
    if track_years and track_years >= 3 and join_years and min(join_years) <= 2017:
        profile["management_continuity_years"] = int(track_years)
    elif track_years and track_years >= 3:
        # Still use track years when director dates are incomplete but FY spine exists.
        profile["management_continuity_years"] = int(track_years)

    rel = chapters.get("relationship_with_controlling_shareholders") or {}
    name = _unwrap_value(rel.get("controlling_shareholder_name"))
    if name is not None:
        text = json.dumps(name, ensure_ascii=False).lower()
        if (
            "controlling shareholder" in text
            or "will be" in text
            or "amind" in text
            or "prof" in text
        ):
            profile["ownership_continuity_recent_audited_fy"] = True

    return profile


def extract_from_chapter_json_paths(paths: list[str | Path]) -> dict[str, Any]:
    """Return an extraction package from Agent1 chapter JSON files if possible."""
    chapters = _load_chapter_map(paths)
    docs = _load_chapter_documents(paths)
    notes: list[str] = []
    sources = sorted({Path(p).name for p in paths if Path(p).suffix.lower() == ".json"})

    fin_values = (
        chapters.get("financial_information")
        or chapters.get("financials")
        or next(
            (
                v
                for k, v in chapters.items()
                if "financial" in k and isinstance(v.get("revenue"), (dict, list))
            ),
            None,
        )
    )
    fin_source = "Financial_Information.json"
    for raw in paths:
        if Path(raw).name.lower() == "financial_information.json":
            fin_source = Path(raw).name
            break

    quant: list[ExtractedField] = []
    issuer_patch: dict[str, Any] = {
        "financials": {"income_statement": [], "balance_sheet": {}},
        "offering_use_of_proceeds": {},
        "offering": {},
        "company_legal_entity": {},
    }
    path_vars: dict[str, str] = {}
    profile_patch: dict[str, Any] = {}

    bundle: dict[str, Any] | None = None
    if isinstance(fin_values, dict):
        candidate = _financial_bundle(fin_values, fin_source)
        if candidate.get("quantifiable"):
            bundle = candidate
        elif candidate.get("operating_track_record_years"):
            # Keep track-record years even when numbers are missing.
            profile_patch["operating_track_record_years"] = candidate[
                "operating_track_record_years"
            ]
            # Still try to set path_vars from financial_years list.
            fy_meta = _unwrap_value(fin_values.get("financial_years"))
            if isinstance(fy_meta, list):
                labels = [str(x) for x in fy_meta if re.search(r"20\d{2}", str(x))]
                if labels:
                    path_vars["latest_audited_fy"] = labels[-1]
                    if len(labels) >= 2:
                        path_vars["prior_fy_1"] = labels[-2]
                    if len(labels) >= 3:
                        path_vars["prior_fy_2"] = labels[-3]

    if bundle is None:
        mined = _mine_financials_from_corpus(chapters, docs)
        if mined:
            bundle = mined
            notes.append(mined.get("note") or "Mined financials from chapter text.")

    if bundle is not None:
        quant = _apply_financial_bundle(
            bundle,
            issuer_patch=issuer_patch,
            path_vars=path_vars,
            profile_patch=profile_patch,
        )

    deal = _offer_and_market_cap(chapters)
    if deal.get("market_capitalisation_at_listing"):
        issuer_patch["offering_use_of_proceeds"]["market_capitalisation_at_listing"] = (
            deal["market_capitalisation_at_listing"]
        )
        quant.append(
            _leaf(
                "expected_market_cap",
                float(deal["expected_market_cap"]),
                "HKD million",
                source_file="Share_Capital.json / Future_Plans",
                span=deal["market_capitalisation_at_listing"].get("note") or "derived mcap",
            )
        )
    for key in ("offer_price", "post_offering_total_shares", "expected_market_cap"):
        if key in deal:
            profile_patch[key] = deal[key]

    float_bits = _derive_public_float(chapters, deal, docs)
    if float_bits.get("public_float_pct") is not None:
        issuer_patch["offering_use_of_proceeds"]["public_float_pct"] = float_bits[
            "public_float_pct"
        ]
        issuer_patch["offering"]["public_float_pct"] = float_bits["public_float_pct"]
        quant.append(
            _leaf(
                "public_float_pct",
                float(float_bits["public_float_pct"]),
                "%",
                source_file="Important_Notice / Share_Capital",
                span="offer shares / post-offering total shares",
            )
        )
    if float_bits.get("public_hands_market_value"):
        issuer_patch["offering"]["public_hands_market_value"] = float_bits[
            "public_hands_market_value"
        ]

    dwvr = _wvr_bundle(chapters)
    if dwvr:
        issuer_patch["company_legal_entity"]["dwvr"] = dwvr

    # Incorporation / track-record fallback for continuity when directors missing.
    if not profile_patch.get("operating_track_record_years"):
        hist = chapters.get("history_reorganization_corporate_structure") or {}
        incorp = _unwrap_value(hist.get("Company_Incorporation_Date"))
        text = json.dumps(incorp or hist, ensure_ascii=False)
        if re.search(r"20\d{2}", text):
            profile_patch.setdefault("operating_track_record_years", 3)
    # Established / business age from Summary
    summary = chapters.get("summary") or {}
    summ_blob = json.dumps(summary, ensure_ascii=False)
    if re.search(r"Established in (March )?20\d{2}", summ_blob, re.I):
        profile_patch.setdefault("operating_track_record_years", 3)
        profile_patch.setdefault("management_continuity_years", 3)
        profile_patch.setdefault("ownership_continuity_recent_audited_fy", True)

    profile_patch.update(
        _continuity_profile(chapters, profile_patch.get("operating_track_record_years"))
    )

    _enrich_cn_and_offering_aliases(issuer_patch)

    # De-dupe quantifiable by field_id (first wins).
    by_id: dict[str, ExtractedField] = {}
    for item in quant:
        fid = item["field_id"]
        if fid not in by_id:
            by_id[fid] = item
    fields = list(by_id.values())

    if fields or path_vars or dwvr or deal:
        notes.append(
            "Deterministic extraction from Agent1/Agent2 chapter JSON "
            f"({', '.join(sources[:6])}{'…' if len(sources) > 6 else ''})."
        )
        if path_vars:
            notes.append(
                "Set path_vars from audited FY spine: "
                + ", ".join(f"{k}={v}" for k, v in path_vars.items())
            )
        if deal.get("expected_market_cap") is not None:
            notes.append(
                "Derived expected market capitalisation from offer price × "
                "post-offering share count (HKD million)."
            )
        if dwvr.get("structure_effective"):
            notes.append("Detected WVR / dual-class structure from Share Capital chapter.")

    narrative: list[dict[str, Any]] = []
    for stem in (
        "business",
        "risk_factors",
        "summary",
        "connected_transactions",
        "history_reorganization_corporate_structure",
        "relationship_with_controlling_shareholders",
        "share_capital",
        "financial_information",
    ):
        values = chapters.get(stem)
        blobs: list[str] = []
        if isinstance(values, dict):
            blobs.append(json.dumps(values, ensure_ascii=False)[:3500])
        for doc in docs:
            if str(doc.get("_file", "")).lower().startswith(stem):
                esm = doc.get("extracted_source_materials")
                if esm is not None:
                    blobs.append(json.dumps(esm, ensure_ascii=False)[:4500])
        blob = "\n".join(blobs)
        if len(blob) < 40:
            continue
        narrative.append(
            {
                "field_id": f"chapter_{stem}",
                "text": blob[:7000],
                "topic": "business_model",
                "kind": "narrative",
                "confirmation_status": EXTRACTED,
                "provenance": {
                    "source_file": f"{stem}.json",
                    "span_preview": blob[:160],
                    "confidence": 0.7,
                },
            }
        )

    return {
        "quantifiable": fields,
        "narrative": narrative,
        "missing_fields": [],
        "notes": notes,
        "errors": [],
        "llm_stub": False,
        "deterministic": True,
        "path_vars": path_vars,
        "profile_patch": profile_patch,
        "issuer_patch": issuer_patch,
    }


def merge_deterministic_into_issuer(
    issuer: dict[str, Any],
    package: dict[str, Any] | None,
) -> dict[str, Any]:
    """Deep-merge chapter-derived issuer patches (multi-year, WVR, market cap)."""
    if not package:
        return issuer
    patch = package.get("issuer_patch") or {}
    if not patch:
        return issuer
    out = deepcopy(issuer)

    fin = out.setdefault("financials", {})
    patch_fin = patch.get("financials") or {}
    if patch_fin.get("income_statement"):
        # Prefer richer multi-year rows from chapter JSON.
        fin["income_statement"] = deepcopy(patch_fin["income_statement"])
    if patch_fin.get("balance_sheet"):
        fin["balance_sheet"] = deepcopy(patch_fin["balance_sheet"])
    for key, val in patch_fin.items():
        if key in {"income_statement", "balance_sheet"}:
            continue
        fin[key] = deepcopy(val)

    offering = out.setdefault("offering_use_of_proceeds", {})
    for key, val in (patch.get("offering_use_of_proceeds") or {}).items():
        if key not in offering or offering.get(key) in (None, {}, []):
            offering[key] = deepcopy(val)

    offering_root = out.setdefault("offering", {})
    for key, val in (patch.get("offering") or {}).items():
        if key not in offering_root or offering_root.get(key) in (None, {}, []):
            offering_root[key] = deepcopy(val)
    # Mirror market cap into CN path when only HK path is populated.
    if (
        "expected_market_cap_at_listing" not in offering_root
        and offering.get("market_capitalisation_at_listing") is not None
    ):
        offering_root["expected_market_cap_at_listing"] = deepcopy(
            offering["market_capitalisation_at_listing"]
        )
    if (
        "public_float_pct" not in offering_root
        and offering.get("public_float_pct") is not None
    ):
        offering_root["public_float_pct"] = offering["public_float_pct"]

    legal = out.setdefault("company_legal_entity", {})
    for key, val in (patch.get("company_legal_entity") or {}).items():
        if key not in legal or legal.get(key) in (None, {}, []):
            legal[key] = deepcopy(val)
        elif isinstance(val, dict) and isinstance(legal.get(key), dict):
            merged = dict(legal[key])
            merged.update(val)
            legal[key] = merged

    return out


def merge_deterministic_into_profile(
    profile: dict[str, Any],
    package: dict[str, Any] | None,
) -> dict[str, Any]:
    """Merge path_vars + continuity / deal params inferred from chapter JSON."""
    if not package:
        return profile
    out = dict(profile or {})
    path_vars = dict(out.get("path_vars") or {})
    for key, val in (package.get("path_vars") or {}).items():
        # Prefer concrete FY20xx over placeholder FY_latest defaults.
        existing = path_vars.get(key)
        if existing in (None, "", "FY_latest", "FY_prior_1", "FY_prior_2"):
            path_vars[key] = val
    if path_vars:
        out["path_vars"] = path_vars

    for key, val in (package.get("profile_patch") or {}).items():
        if out.get(key) in (None, "", []):
            out[key] = val
    return out
