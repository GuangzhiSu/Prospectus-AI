# Publishing artifacts to team storage (maintainer)

Bundles are built under `dist/data-bundles/`. Checksums are recorded in `manifest.json`.

## 1. Pack and refresh manifest

```bash
./scripts/publish_data_snapshot.sh
```

## 2. Upload to S3 (example)

```bash
export PROSPECTUS_DATA_REMOTE=s3://YOUR-BUCKET/prospectus-ai-data
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...

./scripts/publish_data_snapshot.sh --push --tag v1
git add data/manifest.json
```

Collaborators then:

```bash
export PROSPECTUS_DATA_REMOTE=s3://YOUR-BUCKET/prospectus-ai-data
python scripts/sync_data.py fetch --profile dev-full
```

## 3. Offline handoff (no cloud)

Copy `dist/data-bundles/published/*.tar.zst` to collaborators. They run:

```bash
./scripts/ingest_data_bundle.sh /path/to/prospectus_corpus.tar.zst
```

Use `--skip-sha` only if the archive was rebuilt and manifest hashes are not updated yet.
