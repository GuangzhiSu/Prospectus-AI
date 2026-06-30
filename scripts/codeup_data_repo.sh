#!/usr/bin/env bash
# Codeup Git LFS data repository helper for prospectus-ui artifact bundles.
#
# Usage:
#   ./scripts/codeup_data_repo.sh init git@codeup.aliyun.com:<org>/prospectus-ui-data.git
#   ./scripts/codeup_data_repo.sh pull
#   ./scripts/codeup_data_repo.sh push --tag local-2026-05-21
#   eval "$(./scripts/codeup_data_repo.sh env)"
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_REPO="${PROSPECTUS_DATA_REPO:-${HOME}/.cache/prospectus-ui-data}"
GITATTRIBUTES='*.tar.zst filter=lfs diff=lfs merge=lfs -text'

require_git_lfs() {
  if ! command -v git-lfs >/dev/null 2>&1 && ! git lfs version >/dev/null 2>&1; then
    echo "Install Git LFS first: https://git-lfs.com" >&2
    exit 1
  fi
}

install_lfs_in_repo() {
  local repo="$1"
  (cd "$repo" && git lfs install --local >/dev/null 2>&1 || cd "$repo" && git lfs install >/dev/null 2>&1 || true)
}

ensure_gitattributes() {
  local repo="$1"
  if [[ -f "$repo/.gitattributes" ]] && grep -q '\*.tar\.zst' "$repo/.gitattributes" 2>/dev/null; then
    return 0
  fi
  printf '%s\n' "$GITATTRIBUTES" >>"$repo/.gitattributes"
  (
    cd "$repo"
    git add .gitattributes
    if git diff --cached --quiet; then
      return 0
    fi
    git commit -m "Track *.tar.zst with Git LFS" || true
  )
}

ensure_readme() {
  local repo="$1"
  if [[ -f "$repo/README.md" ]]; then
    return 0
  fi
  cat >"$repo/README.md" <<'EOF'
# prospectus-ui-data

Large artifact bundles (`.tar.zst`) for [prospectus-ui](../prospectus-ui).
Managed via Git LFS on Codeup. Do not commit source code here.

Directory layout: `<tag>/<bundle>.tar.zst` (tag matches `data/manifest.json` `published_tag`).
EOF
  (
    cd "$repo"
    git add README.md
    git commit -m "Add data repository README" || true
  )
}

cmd_init() {
  local git_url="${1:-${CODEUP_DATA_REPO_URL:-}}"
  if [[ -z "$git_url" ]]; then
    echo "Usage: $0 init <git-url>" >&2
    echo "  or set CODEUP_DATA_REPO_URL" >&2
    exit 1
  fi
  require_git_lfs
  mkdir -p "$(dirname "$DATA_REPO")"
  if [[ -d "$DATA_REPO/.git" ]]; then
    echo "Data repo already exists: $DATA_REPO"
    install_lfs_in_repo "$DATA_REPO"
    (
      cd "$DATA_REPO"
      git remote set-url origin "$git_url" 2>/dev/null || git remote add origin "$git_url"
      git pull --rebase origin HEAD 2>/dev/null || true
    )
  elif [[ -d "$DATA_REPO" ]] && [[ -n "$(ls -A "$DATA_REPO" 2>/dev/null)" ]]; then
    echo "Directory exists but is not a git repo: $DATA_REPO" >&2
    exit 1
  else
    if git ls-remote "$git_url" HEAD >/dev/null 2>&1; then
      git clone "$git_url" "$DATA_REPO"
    else
      echo "Remote empty or unreachable; initializing local repo at $DATA_REPO"
      mkdir -p "$DATA_REPO"
      (
        cd "$DATA_REPO"
        git init
        git remote add origin "$git_url"
        git checkout -b main 2>/dev/null || git checkout -b master
      )
    fi
  fi
  install_lfs_in_repo "$DATA_REPO"
  ensure_gitattributes "$DATA_REPO"
  ensure_readme "$DATA_REPO"
  (
    cd "$DATA_REPO"
    git lfs pull 2>/dev/null || true
    if git rev-parse --verify HEAD >/dev/null 2>&1; then
      git push -u origin HEAD 2>/dev/null || echo "Note: push to origin failed (check SSH/token and repo permissions)"
    fi
  )
  echo "Data repo ready: $DATA_REPO"
  echo "Set: export PROSPECTUS_DATA_REPO=$DATA_REPO"
}

cmd_pull() {
  if [[ ! -d "$DATA_REPO/.git" ]]; then
    echo "Data repo not initialized. Run: $0 init <git-url>" >&2
    exit 1
  fi
  require_git_lfs
  install_lfs_in_repo "$DATA_REPO"
  (
    cd "$DATA_REPO"
    git pull --rebase
    git lfs pull
  )
  echo "Updated LFS objects in $DATA_REPO"
}

cmd_push() {
  local tag="${PROSPECTUS_DATA_TAG:-}"
  local update_manifest=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tag) tag="$2"; shift 2 ;;
      --update-manifest) update_manifest=true; shift ;;
      *) echo "Unknown: $1" >&2; exit 1 ;;
    esac
  done
  if [[ -z "$tag" ]]; then
    tag="$(date -u +%Y-%m-%d)"
    tag="local-${tag}"
  fi
  if [[ ! -d "$DATA_REPO/.git" ]]; then
    echo "Data repo not initialized. Run: $0 init <git-url>" >&2
    exit 1
  fi
  require_git_lfs
  install_lfs_in_repo "$DATA_REPO"
  local published="$REPO_ROOT/dist/data-bundles/published/$tag"
  if [[ ! -d "$published" ]]; then
    echo "No published bundles at $published" >&2
    echo "Run first: ./scripts/publish_data_snapshot.sh --tag $tag" >&2
    exit 1
  fi
  local dest_dir="$DATA_REPO/$tag"
  mkdir -p "$dest_dir"
  shopt -s nullglob
  local files=("$published"/*.tar.zst)
  shopt -u nullglob
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No .tar.zst files in $published" >&2
    exit 1
  fi
  for f in "${files[@]}"; do
    echo "Copy $(basename "$f") → $dest_dir/"
    cp -f "$f" "$dest_dir/"
  done
  ensure_gitattributes "$DATA_REPO"
  (
    cd "$DATA_REPO"
    git add "$tag"/*.tar.zst
    if git diff --cached --quiet; then
      echo "Nothing new to commit for tag=$tag"
    else
      git commit -m "Publish data bundles tag=$tag"
    fi
    git push origin HEAD
    git lfs push origin HEAD --all
  )
  echo "Pushed bundles to Codeup data repo (tag=$tag)"

  if $update_manifest; then
    python3 "$REPO_ROOT/scripts/sync_data.py" publish-local --profile kg-dev --tag "$tag" --update-manifest >/dev/null 2>&1 || true
    python3 "$REPO_ROOT/scripts/sync_data.py" publish-local --profile dev-full --tag "$tag" --update-manifest
    echo "Updated $REPO_ROOT/data/manifest.json (published_tag=$tag)"
  fi
}

cmd_env() {
  # Resolve to absolute path for file:// URLs
  local abs_repo
  abs_repo="$(cd "$(dirname "$DATA_REPO")" 2>/dev/null && cd "$(basename "$DATA_REPO")" && pwd)" || abs_repo="$DATA_REPO"
  cat <<EOF
export PROSPECTUS_DATA_REPO='$abs_repo'
export PROSPECTUS_DATA_REMOTE='file://$abs_repo'
EOF
}

usage() {
  cat <<EOF
Usage:
  $0 init <git-url>              Clone/init Codeup LFS data repo
  $0 pull                        git pull + git lfs pull
  $0 push --tag <tag>            Copy published bundles and push to Codeup
  $0 env                         Print export PROSPECTUS_DATA_* for sync_data fetch

Environment:
  PROSPECTUS_DATA_REPO           Local clone path (default: ~/.cache/prospectus-ui-data)
  CODEUP_DATA_REPO_URL           Git URL for init when omitted on command line
  PROSPECTUS_DATA_TAG            Tag directory name (default: local-YYYY-MM-DD)
EOF
}

main() {
  local cmd="${1:-}"
  shift || true
  case "$cmd" in
    init) cmd_init "$@" ;;
    pull) cmd_pull ;;
    push) cmd_push "$@" ;;
    env) cmd_env ;;
    -h|--help|help|"") usage ;;
    *) echo "Unknown command: $cmd" >&2; usage; exit 1 ;;
  esac
}

main "$@"
