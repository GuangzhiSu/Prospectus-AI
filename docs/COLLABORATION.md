# Collaborating on Prospectus AI (code + large KG data)

**Chinese full setup guide for collaborators:** [COLLABORATOR_SETUP.zh-CN.md](COLLABORATOR_SETUP.zh-CN.md)（如何一次性获得语料、KG、示例数据与运行环境）。

GitHub carries **source code** and **contract-level** KG JSON. PDF corpora, full `prospectus_kg_output/`, and issuer Excel samples live in a **data manifest** ([`data/manifest.json`](../data/manifest.json)) and are synced with [`scripts/sync_data.py`](../scripts/sync_data.py).

## Data tiers

| Tier | What | Where |
|------|------|--------|
| 1 — Git | `scripts/`, `apps/`, `agent2_section_requirements.json`, `prospectus_kg_output/inputs/input_schema*.json`, crosswalk | Clone + PR |
| 2 — Artifacts | `prospectus_corpus/`, bulk KG (`records/`, `structure/`, …), `data/*.xlsx` | `sync_data fetch` or offline `.tar.zst` |
| 3 — Local only | `agent1_output/`, `agent2_output/`, model weights | Never commit |

## Profiles

| Profile | Use when |
|---------|----------|
| `minimal` | UI + Agent2 only; schema/crosswalk already in git |
| `kg-dev` | KG pipeline, kg-view (`docgraph`), records editing |
| `dev-full` | Full internal dev (corpus + entire `prospectus_kg_output` + sample Excel) |

## First-time setup (collaborator)

```bash
git clone <repo-url>
cd prospectus-ui
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cd apps/web && npm install && cd ../..

# Option A — remote artifacts (after maintainer published)
export PROSPECTUS_DATA_REMOTE=s3://YOUR-BUCKET/prospectus-ai-data   # or team URL
python scripts/sync_data.py fetch --profile dev-full
python scripts/sync_data.py verify --profile dev-full

# Option B — offline bundle (USB / shared drive)
./scripts/ingest_data_bundle.sh /path/to/prospectus_corpus.tar.zst
./scripts/ingest_data_bundle.sh /path/to/prospectus_kg_output.tar.zst

# Web app
cat > apps/web/.env.local << 'EOF'
PROSPECTUS_ROOT=/absolute/path/to/prospectus-ui
AGENT1_PYTHON=/absolute/path/to/prospectus-ui/.venv/bin/python
AGENT1_MODEL=Qwen/Qwen2.5-3B-Instruct
AGENT1_USE_CPU=1
EOF
npm run dev
```

Rebuild KG from corpus if you only have PDFs:

```bash
python -m scripts.build_prospectus_kg --stages all --resume
```

## What to change how

| Change | Workflow |
|--------|----------|
| App code, agents, prompts | Git branch → PR |
| `input_schema.json`, `input_schema_crosswalk.json` | Git PR (tracked under `prospectus_kg_output/inputs/`) |
| `records/`, `docgraph`, corpus PDFs | Edit locally → `sync_data push` or send bundles → maintainer updates manifest |
| Agent run outputs | Do not commit; regenerate locally |

### Returning bulk KG work

1. Pack (or let the script pack):

   ```bash
   ./scripts/pack_data_bundle.sh kg-dev
   ```

2. Upload (if you have write access to team storage):

   ```bash
   export PROSPECTUS_DATA_REMOTE=s3://YOUR-BUCKET/prospectus-ai-data
   python scripts/sync_data.py push --profile kg-dev --tag v2026-05-20-yourname --update-manifest
   ```

   Open a PR that includes the updated `data/manifest.json` (new URLs + sha256).

3. **Without cloud access**: send `dist/data-bundles/*.tar.zst` to the maintainer; they run `./scripts/ingest_data_bundle.sh` and publish.

## Maintainer: publish initial / updated snapshots

```bash
pip install zstandard   # or pip install -r requirements.txt
./scripts/publish_data_snapshot.sh

# After configuring bucket:
export PROSPECTUS_DATA_REMOTE=s3://YOUR-BUCKET/prospectus-ai-data
./scripts/publish_data_snapshot.sh --push --tag v1
git add data/manifest.json prospectus_kg_output/inputs/*.json
git commit -m "Publish data manifest v1"
```

Environment variables:

| Variable | Purpose |
|----------|---------|
| `PROSPECTUS_DATA_REMOTE` | Base URI for uploads/downloads (`s3://…`, or local dir for `file://`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3 access (standard boto3) |
| `HF_TOKEN` | Only if manifest URLs use `hf://datasets/…` |

## Offline bundle scripts

| Script | Role |
|--------|------|
| [`scripts/pack_data_bundle.sh`](../scripts/pack_data_bundle.sh) | Pack profile → `dist/data-bundles/` + refresh manifest hashes |
| [`scripts/ingest_data_bundle.sh`](../scripts/ingest_data_bundle.sh) | Extract a collaborator `.tar.zst` |
| [`scripts/publish_data_snapshot.sh`](../scripts/publish_data_snapshot.sh) | Maintainer pack (+ optional push) |

## Do not commit

- `prospectus_corpus/` (unless using manifest workflow — still not via raw git)
- `prospectus_kg_output/inputs/records/`, `qwen_raw_extract_v2/`, `native_docs/`, `finetune/`
- `agent1_output/`, `agent2_output/`, `*.safetensors`, `.env`

See [`.gitignore`](../.gitignore) and [README.md](../README.md).
