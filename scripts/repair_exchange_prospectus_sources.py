#!/usr/bin/env python3
"""Repair corpus entries that accidentally contain offering announcements.

Five legacy HKEX listings in the local corpus were short publication notices,
not the prospectuses named by the files.  HKEX publishes those older English
prospectuses as one official PDF per chapter.  This script downloads the
official chapter files, merges them in order, and installs a clean bookmark for
each chapter so the deterministic ground-truth splitter can process them.

The replaced source is moved to ``prospectus_corpus/rejected_sources`` and is
never deleted.  A provenance manifest with source URLs and SHA-256 hashes is
written beside the corpus.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import shutil
import tempfile
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF


COMMON_FRONT = [
    "Important",
    "Expected Timetable",
    "Contents",
    "Summary",
    "Definitions",
]


@dataclass(frozen=True)
class SourceRepair:
    document_id: str
    base_url: str
    file_prefix: str
    first_number: int
    titles: tuple[str, ...]

    def url(self, index: int) -> str:
        number = self.first_number + index
        return f"{self.base_url}/{self.file_prefix}{number}.pdf"


REPAIRS: tuple[SourceRepair, ...] = (
    SourceRepair(
        document_id="00484_global_offering_1",
        base_url=(
            "https://www1.hkexnews.hk/listedco/listconews/sehk/2013/0919/"
            "00484_1730846"
        ),
        file_prefix="E",
        first_number=101,
        titles=(
            "Cover",
            "Important",
            "Expected Timetable",
            "Contents",
            "Summary",
            "Definitions",
            "Glossary",
            "Forward-Looking Statements",
            "Risk Factors",
            "Information about this Prospectus and the Global Offering",
            "Waivers from Strict Compliance with the Listing Rules and Exemptions",
            "Directors and Parties Involved in the Global Offering",
            "Corporate Information",
            "Industry Overview",
            "Regulations",
            "Our History, Reorganization and Corporate Structure",
            "Business",
            "Contractual Arrangements",
            "Relationship with Our Controlling Shareholders",
            "Connected Transactions",
            "Directors and Senior Management",
            "Substantial Shareholders",
            "Share Capital",
            "Financial Information",
            "Future Plans and Use of Proceeds",
            "Underwriting",
            "Structure of the Global Offering",
            "How to Apply for Hong Kong Offer Shares",
            "Appendix I - Accountant's Report",
            "Appendix II - Unaudited Pro Forma Financial Information",
            "Appendix III - Summary of the Constitution and Cayman Islands Company Law",
            "Appendix IV - Statutory and General Information",
            "Appendix V - Documents Delivered and Available for Inspection",
            "Back Cover",
        ),
    ),
    SourceRepair(
        document_id="00700_global_offering_2",
        base_url=(
            "https://www1.hkexnews.hk/listedco/listconews/sehk/2004/0607/0700"
        ),
        file_prefix="EWP",
        first_number=101,
        titles=tuple(
            COMMON_FRONT[:2]
            + ["Table of Contents"]
            + COMMON_FRONT[3:]
            + [
                "Glossary",
                "Risk Factors",
                "Information about this Prospectus",
                "Directors and Parties Involved in the Offering",
                "Corporate Information",
                "Industry Overview",
                "Regulation",
                "Our History and Structure",
                "Business",
                "Financial Information",
                "Future Plans and Use of Proceeds",
                "Substantial Shareholders",
                "Relationship with Our Shareholders",
                "Directors, Senior Management and Employees",
                "Share Capital",
                "Underwriting",
                "Structure of the Offering",
                "How to Apply for Hong Kong Offer Shares",
                "Appendix I - Accountants' Report",
                "Appendix II - Profit Forecast",
                "Appendix III - Unaudited Pro Forma Financial Information",
                "Appendix IV - Property Valuation",
                "Appendix V - Constitution and Cayman Islands Company Law",
                "Appendix VI - Structure Contracts",
                "Appendix VII - Statutory and General Information",
                "Appendix VIII - Documents Delivered and Available for Inspection",
                "Back Cover",
            ]
        ),
    ),
    SourceRepair(
        document_id="01087_global_offering_1",
        base_url=(
            "https://www1.hkexnews.hk/listedco/listconews/sehk/2010/1103/"
            "01087_927740"
        ),
        file_prefix="e",
        first_number=101,
        titles=(
            "Cover",
            "Important",
            "Expected Timetable",
            "Table of Contents",
            "Summary",
            "Definitions",
            "Glossary of Technical Terms",
            "Forward-Looking Statement",
            "Risk Factors",
            "Information about this Prospectus and the Global Offering",
            "Directors and Parties Involved in the Global Offering",
            "Corporate Information",
            "Industry Overview",
            "Regulations",
            "History, Reorganization and Group Structure",
            "Business",
            "Relationship with Controlling Shareholders",
            "Waiver",
            "Directors, Senior Management and Staff",
            "Substantial Shareholders",
            "Share Capital",
            "Financial Information",
            "Future Plans and Use of Proceeds",
            "Underwriting",
            "Structure of the Global Offering",
            "How to Apply for Hong Kong Public Offer Shares",
            "Appendix I - Accountants' Report",
            "Appendix II - Unaudited Pro Forma Financial Information",
            "Appendix III - Profit Forecast",
            "Appendix IV - Property Valuation",
            "Appendix V - Constitution and Cayman Company Law",
            "Appendix VI - Statutory and General Information",
            "Appendix VII - Documents Delivered and Available for Inspection",
            "Back Cover",
        ),
    ),
    SourceRepair(
        document_id="03315_global_offering_1",
        base_url=(
            "https://www1.hkexnews.hk/listedco/listconews/sehk/2013/1122/"
            "03315_1779289"
        ),
        file_prefix="e",
        first_number=101,
        titles=(
            "Cover",
            "Important",
            "Expected Timetable",
            "Contents",
            "Summary",
            "Definitions",
            "Glossary of Technical Terms",
            "Forward-Looking Statements",
            "Risk Factors",
            "Waivers from Strict Compliance with the Listing Rules and Exemptions",
            "Information about this Prospectus and the Global Offering",
            "Directors and Parties Involved in the Global Offering",
            "Corporate Information",
            "Industry Overview",
            "Regulations",
            "History and Corporate Structure",
            "Business",
            "Relationship with Controlling Shareholders",
            "Connected Transactions",
            "Directors and Senior Management",
            "Share Capital",
            "Substantial Shareholders",
            "Financial Information",
            "Future Plans and Use of Proceeds",
            "Underwriting",
            "Structure of the Global Offering",
            "How to Apply for Hong Kong Public Offer Shares",
            "Appendix I - Accountants' Report",
            "Appendix II - Unaudited Pro Forma Financial Information",
            "Appendix III - Summary of Articles of Association",
            "Appendix IV - Statutory and General Information",
            "Appendix V - Documents Delivered and Available for Inspection",
            "Back Cover",
        ),
    ),
    SourceRepair(
        document_id="03888_global_offering_1",
        base_url=(
            "https://www1.hkexnews.hk/listedco/listconews/sehk/2007/0924/"
            "03888_223251"
        ),
        file_prefix="E",
        first_number=101,
        titles=(
            "Important",
            "Expected Timetable",
            "Contents",
            "Summary",
            "Definitions",
            "Glossary of Technical Terms",
            "Risk Factors",
            "Waivers from Compliance with the Listing Rules",
            "Information about this Prospectus and the Global Offering",
            "Parties Involved in the Global Offering",
            "Corporate Information",
            "Industry Overview",
            "Our History and Corporate Structure",
            "Business",
            "Regulations",
            "Connected Transactions",
            "Directors, Senior Management and Staff",
            "Share Capital",
            "Controlling Shareholders and Substantial Shareholders",
            "Financial Information",
            "Use of Proceeds",
            "Underwriting",
            "Structure of the Global Offering",
            "How to Apply for Hong Kong Offer Shares",
            "Terms and Conditions of the Hong Kong Public Offering",
            "Appendix I - Accountants' Report",
            "Appendix II - Unaudited Pro Forma Financial Information",
            "Appendix III - Profit Forecast",
            "Appendix IV - Property Valuation",
            "Appendix V - Constitution and Cayman Islands Companies Law",
            "Appendix VI - Statutory and General Information",
            "Appendix VII - Documents Delivered and Available for Inspection",
        ),
    ),
)


def _download(url: str, destination: Path, retries: int = 3) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "ProspectusAI-ground-truth-audit/2.0"},
    )
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:  # noqa: S310
                payload = response.read()
            if not payload.startswith(b"%PDF"):
                raise ValueError(f"Official URL did not return a PDF: {url}")
            destination.write_bytes(payload)
            return {
                "url": url,
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
        except (OSError, ValueError, urllib.error.URLError) as exc:
            last_error = exc
            if attempt + 1 < retries:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to download {url}: {last_error}")


def _merge_repair(
    repair: SourceRepair, work_dir: Path
) -> tuple[Path, list[dict[str, Any]], dict[str, int]]:
    part_dir = work_dir / repair.document_id
    part_dir.mkdir(parents=True, exist_ok=True)
    part_paths = [part_dir / f"{index:03d}.pdf" for index in range(len(repair.titles))]

    def fetch(index: int) -> tuple[int, dict[str, Any]]:
        return index, _download(repair.url(index), part_paths[index])

    provenance: list[dict[str, Any] | None] = [None] * len(part_paths)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(fetch, index) for index in range(len(part_paths))]
        for future in concurrent.futures.as_completed(futures):
            index, details = future.result()
            provenance[index] = {
                "part": index + 1,
                "title": repair.titles[index],
                **details,
            }

    merged = fitz.open()
    toc: list[list[Any]] = []
    try:
        for title, part_path in zip(repair.titles, part_paths, strict=True):
            part = fitz.open(part_path)
            try:
                toc.append([1, title, len(merged) + 1])
                merged.insert_pdf(part)
            finally:
                part.close()
        merged.set_toc(toc)
        output_path = work_dir / f"{repair.document_id}.pdf"
        merged.save(output_path, garbage=4, deflate=True)
    finally:
        merged.close()

    check = fitz.open(output_path)
    try:
        page_count = len(check)
        text_characters = sum(len(page.get_text("text")) for page in check)
        toc_count = len(check.get_toc())
    finally:
        check.close()
    if page_count < 50 or text_characters < 100_000 or toc_count != len(repair.titles):
        raise RuntimeError(
            f"Rebuilt {repair.document_id} failed validation: "
            f"pages={page_count}, chars={text_characters}, toc={toc_count}"
        )
    metrics = {
        "pages": page_count,
        "text_characters": text_characters,
        "toc_entries": toc_count,
    }
    return output_path, [item for item in provenance if item is not None], metrics


def run(pdf_dir: Path, selected: set[str] | None, apply: bool) -> dict[str, Any]:
    repairs = [
        repair
        for repair in REPAIRS
        if selected is None or repair.document_id in selected
    ]
    if selected:
        unknown = selected - {repair.document_id for repair in REPAIRS}
        if unknown:
            raise ValueError(f"Unknown repair document ids: {sorted(unknown)}")
    if not apply:
        return {
            "status": "dry_run",
            "documents": [repair.document_id for repair in repairs],
            "official_parts": sum(len(repair.titles) for repair in repairs),
        }

    pdf_dir.mkdir(parents=True, exist_ok=True)
    rejected_dir = pdf_dir / "rejected_sources"
    rejected_dir.mkdir(parents=True, exist_ok=True)
    manifest_entries: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(prefix=".source-repair-", dir=pdf_dir) as temp:
        work_dir = Path(temp)
        for repair in repairs:
            rebuilt, provenance, metrics = _merge_repair(repair, work_dir)
            target = pdf_dir / f"{repair.document_id}.pdf"
            backup = rejected_dir / f"{repair.document_id}.announcement.pdf"
            if backup.exists():
                raise FileExistsError(
                    f"Backup already exists; refusing to overwrite recoverable source: {backup}"
                )
            if target.exists():
                target.replace(backup)
            shutil.move(str(rebuilt), target)
            merged_hash = hashlib.sha256(target.read_bytes()).hexdigest()
            manifest_entries.append(
                {
                    "document_id": repair.document_id,
                    "installed_path": str(target),
                    "rejected_original": str(backup) if backup.exists() else None,
                    "merged_sha256": merged_hash,
                    **metrics,
                    "official_parts": provenance,
                }
            )
            print(
                f"Repaired {repair.document_id}: {metrics['pages']} pages, "
                f"{metrics['toc_entries']} sections"
            )

    manifest = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "Hong Kong Exchanges and Clearing Limited (official chapter PDFs)",
        "documents": manifest_entries,
    }
    manifest_path = pdf_dir / "source_repairs_manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Rebuild legacy prospectuses from official HKEX chapter PDFs."
    )
    parser.add_argument("--pdf-dir", type=Path, default=Path("prospectus_corpus"))
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Install rebuilt PDFs and move the prior files to rejected_sources.",
    )
    args = parser.parse_args()
    output = run(args.pdf_dir, set(args.only) or None, args.apply)
    print(json.dumps(output, ensure_ascii=False, indent=2))
