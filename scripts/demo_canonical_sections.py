#!/usr/bin/env python3
"""
Demo: print all canonical top-level sections in ``typical_order_index`` order.

Run from repo root::

    python scripts/demo_canonical_sections.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def main() -> None:
    from prospectus_docgraph.schema.seed import seed_canonical_sections

    mgr = seed_canonical_sections()
    print("Canonical HKEX-style sections (seed)\n")
    for sec in mgr.get_sections():
        m = "M" if sec.mandatory else "O"
        o = sec.typical_order_index
        o_str = str(o) if o is not None else "—"
        print(f"  [{o_str:>3}] [{m}] {sec.id}")
        print(f"         {sec.canonical_name}")


if __name__ == "__main__":
    main()
