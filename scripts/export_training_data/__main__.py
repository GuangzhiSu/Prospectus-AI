from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_MODULE = ROOT / "knowledge-module"
if str(KNOWLEDGE_MODULE) not in sys.path:
    sys.path.insert(0, str(KNOWLEDGE_MODULE))

from prospectus_docgraph.export.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
