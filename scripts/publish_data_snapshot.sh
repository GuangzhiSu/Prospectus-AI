#!/usr/bin/env bash
# Maintainer: pack all dev profiles, refresh manifest checksums, optionally upload to S3 or Codeup LFS.
#
# Usage:
#   ./scripts/publish_data_snapshot.sh                    # pack dev-full + kg-dev, update manifest
#   PROSPECTUS_DATA_REMOTE=s3://bucket/prospectus-ai-data \
#     ./scripts/publish_data_snapshot.sh --push --tag v1
#   ./scripts/codeup_data_repo.sh init git@codeup.aliyun.com:<org>/prospectus-ui-data.git
#     ./scripts/publish_data_snapshot.sh --codeup-push --tag local-2026-05-21
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUSH=false
CODEUP_PUSH=false
TAG="${PROSPECTUS_DATA_TAG:-local-$(date -u +%Y-%m-%d)}"
cd "$REPO_ROOT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) PUSH=true; shift ;;
    --codeup-push) PUSH=true; CODEUP_PUSH=true; shift ;;
    --tag) TAG="$2"; shift 2 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
done

export PROSPECTUS_DATA_TAG="$TAG"
for profile in kg-dev dev-full; do
  echo "==> Packing profile: $profile (tag=$TAG)"
  python3 scripts/sync_data.py publish-local --profile "$profile" --tag "$TAG" --update-manifest
done

echo "==> Manifest updated at data/manifest.json"
echo "    Local bundles: dist/data-bundles/"
echo "    Published copies: dist/data-bundles/published/"

if $PUSH; then
  if $CODEUP_PUSH; then
    export PROSPECTUS_DATA_TAG="$TAG"
    "$REPO_ROOT/scripts/codeup_data_repo.sh" push --tag "$TAG" --update-manifest
    echo "Codeup LFS upload complete. Commit data/manifest.json and push to the main repo."
  else
    if [[ -z "${PROSPECTUS_DATA_REMOTE:-}" ]]; then
      echo "Set PROSPECTUS_DATA_REMOTE for --push (e.g. s3://my-bucket/prospectus-ai-data)" >&2
      exit 1
    fi
    ARGS=(--update-manifest)
    [[ -n "$TAG" ]] && ARGS+=(--tag "$TAG")
    for profile in kg-dev dev-full; do
      python3 scripts/sync_data.py push --profile "$profile" "${ARGS[@]}"
    done
    echo "Upload complete. Commit data/manifest.json and open a PR."
  fi
else
  echo "Next: upload with one of:"
  echo "  S3:    PROSPECTUS_DATA_REMOTE=s3://... ./scripts/publish_data_snapshot.sh --push --tag <version>"
  echo "  Codeup: ./scripts/codeup_data_repo.sh init <git-url> && ./scripts/publish_data_snapshot.sh --codeup-push --tag <version>"
  echo "Or share dist/data-bundles/published/*.tar.zst via pack_data_bundle / ingest_data_bundle"
fi
