# Prospectus AI Module

This folder contains the Python AI runtime that is intentionally isolated from the web UI and packaging layer.

## Contents

- `agent1.py` - converts issuer Excel/JSON inputs from `data/` into `agent1_output/`
- `agent2.py` - drafts prospectus sections from `agent1_output/` into `agent2_output/`
- `llm_*.py` - local Qwen and cloud LLM provider adapters
- `prospectus_graph/` - retrieval, LangGraph state, verification, output bundle logic
- `section_quality.py` - Python section quality gates
- `requirements.txt` - Python dependencies for the AI runtime

Run these scripts from the repository root so existing runtime paths stay stable:

```bash
pip install -r ai-module/requirements.txt
python ai-module/agent1.py
python ai-module/agent2.py --section Summary
```

Set `WORKSPACE_ROOT=workspace` to read/write runtime files under `workspace/data/`, `workspace/agent1_output/`, and `workspace/agent2_output/` instead of the repo root.

The web app resolves this directory as `PROSPECTUS_ROOT/ai-module` by default. Set `AI_MODULE_ROOT` only when developing the AI module from a separate checkout.
