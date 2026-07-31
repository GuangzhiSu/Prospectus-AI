#!/usr/bin/env bash
# Create branch multimarket-eligibility-v1 on GuangzhiSu/Prospectus-AI
# with local project contents, excluding "test dataset".
set -euo pipefail

SRC="/Users/yanzhouyang/ProspectAI-multimarket-v1"
REPO_URL="${REPO_URL:-https://github.com/GuangzhiSu/Prospectus-AI.git}"
BRANCH="${BRANCH:-multimarket-eligibility-v1}"
WORK="${WORK:-/tmp/Prospectus-AI-${BRANCH}}"

echo "==> Cloning $REPO_URL into $WORK"
rm -rf "$WORK"
git clone "$REPO_URL" "$WORK"
cd "$WORK"

echo "==> Creating branch $BRANCH from remote default"
git fetch origin
if git symbolic-ref refs/remotes/origin/HEAD >/dev/null 2>&1; then
  DEFAULT_BRANCH="$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')"
else
  DEFAULT_BRANCH="main"
fi
git checkout "$DEFAULT_BRANCH"
git pull --ff-only origin "$DEFAULT_BRANCH" || true
git checkout -b "$BRANCH"

echo "==> Syncing files from $SRC (excluding test dataset)"
rsync -a --delete \
  --exclude '.git/' \
  --exclude 'test dataset/' \
  --exclude 'testing dataset/' \
  --exclude 'node_modules/' \
  --exclude 'frontend/web/node_modules/' \
  --exclude 'frontend/web/.next/' \
  --exclude 'uploads/' \
  --exclude '.DS_Store' \
  --exclude '.prospectus-qwen-debug.log' \
  "$SRC/" "$WORK/"

echo "==> Staging"
git add -A

if git status --porcelain | grep -E 'test dataset|testing dataset' >/dev/null; then
  echo "ERROR: test dataset paths are staged — aborting."
  git status --porcelain | grep -E 'test dataset|testing dataset' || true
  exit 1
fi

echo "==> Commit"
git commit -m "Add multimarket eligibility diagnostic workspace.

Bring ProspectAI-multimarket-v1 changes (HK/CN/SGX eligibility tool + frontend)
onto a dedicated branch; exclude local test dataset dumps."

echo "==> Push"
git push -u origin "$BRANCH"

echo "Done: https://github.com/GuangzhiSu/Prospectus-AI/tree/${BRANCH}"
