#!/usr/bin/env python3
"""Upload a local file to a GitHub Release asset using GITHUB_TOKEN or GH_TOKEN."""

from __future__ import annotations

import argparse
import http.client
import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ASSET = REPO_ROOT / "dist" / "public-datasets" / "ProspectusAI-test-dataset.zip"
DEFAULT_REPO = "GuangzhiSu/Prospectus-AI"


def _token() -> str:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        raise RuntimeError("Set GITHUB_TOKEN or GH_TOKEN with contents:write permission.")
    return token


def _release_tag() -> str:
    version_file = REPO_ROOT / "frontend" / "web" / "src" / "lib" / "app-version.ts"
    text = version_file.read_text(encoding="utf-8")
    match = re.search(r'APP_RELEASE_TAG\s*=\s*APP_VERSION|APP_VERSION\s*=\s*"([^"]+)"', text)
    if match and match.group(1):
        return match.group(1)
    match = re.search(r'APP_VERSION\s*=\s*"([^"]+)"', text)
    if not match:
        raise RuntimeError(f"Could not infer release tag from {version_file}")
    return match.group(1)


def _api_request(method: str, url: str, token: str, body: bytes | None = None) -> dict[str, object]:
    req = urllib.request.Request(
        url,
        method=method,
        data=body,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = resp.read()
    return json.loads(payload.decode("utf-8")) if payload else {}


def _delete_asset(repo: str, asset_id: int, token: str) -> None:
    _api_request(
        "DELETE",
        f"https://api.github.com/repos/{repo}/releases/assets/{asset_id}",
        token,
    )


def _upload_file(repo: str, release_id: int, token: str, asset: Path, name: str) -> dict[str, object]:
    parsed = urllib.parse.urlparse(
        f"https://uploads.github.com/repos/{repo}/releases/{release_id}/assets"
        f"?name={urllib.parse.quote(name)}"
    )
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/zip",
        "Content-Length": str(asset.stat().st_size),
        "X-GitHub-Api-Version": "2022-11-28",
    }
    conn = http.client.HTTPSConnection(parsed.netloc, timeout=600)
    try:
        with asset.open("rb") as fh:
            conn.request("POST", f"{parsed.path}?{parsed.query}", body=fh, headers=headers)
            resp = conn.getresponse()
            payload = resp.read()
    finally:
        conn.close()
    if resp.status >= 400:
        raise RuntimeError(f"GitHub upload failed ({resp.status}): {payload.decode('utf-8', errors='replace')}")
    return json.loads(payload.decode("utf-8"))


def upload(args: argparse.Namespace) -> int:
    token = _token()
    repo = args.repo
    tag = args.tag or _release_tag()
    asset = args.asset.resolve()
    if not asset.is_file():
        raise FileNotFoundError(asset)

    release = _api_request("GET", f"https://api.github.com/repos/{repo}/releases/tags/{tag}", token)
    release_id = int(release["id"])
    name = args.name or asset.name

    existing = None
    for candidate in release.get("assets", []):
        if isinstance(candidate, dict) and candidate.get("name") == name:
            existing = candidate
            break
    if existing:
        if not args.clobber:
            raise RuntimeError(f"Asset {name!r} already exists; pass --clobber to replace it.")
        _delete_asset(repo, int(existing["id"]), token)

    uploaded = _upload_file(repo, release_id, token, asset, name)
    print(f"Uploaded {uploaded.get('name')} to {uploaded.get('browser_download_url')}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=DEFAULT_REPO, help=f"GitHub repo (default: {DEFAULT_REPO})")
    parser.add_argument("--tag", default=None, help="Release tag (default: frontend app version)")
    parser.add_argument("--asset", type=Path, default=DEFAULT_ASSET, help=f"File to upload (default: {DEFAULT_ASSET})")
    parser.add_argument("--name", default=None, help="Release asset name (default: source file name)")
    parser.add_argument("--clobber", action="store_true", help="Replace an existing release asset with the same name.")
    return parser.parse_args()


if __name__ == "__main__":
    raise SystemExit(upload(parse_args()))
