from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AI_MODULE = ROOT / "ai-module"
KNOWLEDGE_MODULE = ROOT / "knowledge-module"
PIPELINE_SRC = ROOT / "pipeline-module" / "ipo_prospectus_pipeline" / "src"

for path in (ROOT, PIPELINE_SRC, KNOWLEDGE_MODULE, AI_MODULE):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))
