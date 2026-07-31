#!/usr/bin/env python3
"""
Fetch / verify / push large data artifacts listed in data/manifest.json.

Examples:
  python scripts/sync_data.py fetch --profile dev-full
  python scripts/sync_data.py verify --profile kg-dev
  python scripts/sync_data.py push --artifact prospectus-corpus --tag v2026-05-20
  python scripts/sync_data.py publish-local --profile dev-full
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

_REPO = Path(__file__).resolve().parents[1]
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))

from scripts.sync_data_lib import (  # noqa: E402
    BUNDLE_STAGING,
    MANIFEST_PATH,
    REPO_ROOT,
    artifacts_for_profile,
    create_tar_zst,
    fetch_artifact,
    load_manifest,
    pack_paths_for_artifact,
    resolve_url,
    publish_remote_url,
    save_manifest,
    sha256_file,
    verify_artifact,
)


def _cmd_fetch(args: argparse.Namespace) -> int:
    manifest = load_manifest()
    arts = artifacts_for_profile(manifest, args.profile)
    if not arts:
        print(f"Profile {args.profile!r}: nothing to fetch (git-tracked / minimal).")
        return 0
    errors = 0
    for art in arts:
        try:
            fetch_artifact(art, force=args.force)
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {art['id']}: {exc}", file=sys.stderr)
            errors += 1
    return 1 if errors else 0


def _cmd_verify(args: argparse.Namespace) -> int:
    manifest = load_manifest()
    if args.profile:
        arts = artifacts_for_profile(manifest, args.profile)
    else:
        arts = manifest.get("artifacts", [])
    ok_all = True
    for art in arts:
        ok, msg = verify_artifact(art)
        status = "OK" if ok else "MISSING"
        print(f"{status} {art['id']}: {msg}")
        ok_all = ok_all and ok
    return 0 if ok_all else 1


def _cmd_push(args: argparse.Namespace) -> int:
    manifest = load_manifest()
    remote = os.environ.get("PROSPECTUS_DATA_REMOTE", "").rstrip("/")
    if not remote:
        print("Set PROSPECTUS_DATA_REMOTE (e.g. s3://my-bucket/prospectus-ai-data)", file=sys.stderr)
        return 1

    art_by_id = {a["id"]: a for a in manifest.get("artifacts", [])}
    targets = [art_by_id[args.artifact]] if args.artifact else artifacts_for_profile(manifest, args.profile)

    tag = args.tag or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    errors = 0
    for art in targets:
        archive_rel = art.get("archive")
        if not archive_rel:
            print(f"Skip {art['id']}: not an archive artifact", file=sys.stderr)
            continue
        local = BUNDLE_STAGING / Path(archive_rel).name
        if not local.is_file():
            local = REPO_ROOT / archive_rel
        if not local.is_file():
            print(f"FAIL {art['id']}: bundle not found at {local}", file=sys.stderr)
            errors += 1
            continue
        dest_key = f"{tag}/{Path(archive_rel).name}"
        url = publish_remote_url(remote, dest_key)
        print(f"Uploading {art['id']} → {url}")
        try:
            upload_file(local, url)
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL upload {art['id']}: {exc}", file=sys.stderr)
            errors += 1
            continue
        if remote.startswith("s3://"):
            art["url"] = f"${{PROSPECTUS_DATA_REMOTE}}/{dest_key}"
        else:
            art["url"] = url
        art["sha256"] = sha256_file(local)
        art["size_bytes"] = local.stat().st_size
        art["published_tag"] = tag
        print(f"OK {art['id']} sha256={art['sha256'][:16]}… size={art['size_bytes']}")

    if args.update_manifest and not errors:
        save_manifest(manifest)
        print(f"Updated {MANIFEST_PATH}")
    elif not args.update_manifest:
        print("Manifest not updated (pass --update-manifest to write data/manifest.json)")
    return 1 if errors else 0


def upload_file(local: Path, url: str) -> None:
    resolved = resolve_url(url) if "${" in url else url
    from urllib.parse import urlparse

    parsed = urlparse(resolved)
    if parsed.scheme == "s3":
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("pip install boto3") from exc
        bucket = parsed.netloc
        key = parsed.path.lstrip("/")
        boto3.client("s3").upload_file(str(local), bucket, key)
        return
    if parsed.scheme in ("http", "https"):
        raise RuntimeError("HTTP upload not implemented; use s3:// or copy file:// manually")
    if parsed.scheme == "file":
        dest = Path(parsed.path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        import shutil

        shutil.copy2(local, dest)
        return
    raise ValueError(f"Unsupported upload URL: {resolved}")


def _cmd_publish_local(args: argparse.Namespace) -> int:
    """Pack profile artifacts locally and refresh manifest sha256 + URL templates."""
    manifest = load_manifest()
    arts = artifacts_for_profile(manifest, args.profile)
    out_dir = BUNDLE_STAGING
    out_dir.mkdir(parents=True, exist_ok=True)
    tag = args.tag or os.environ.get("PROSPECTUS_DATA_TAG") or manifest.get("published_tag") or "local-draft"
    local_base = out_dir / "published" / tag
    local_base.mkdir(parents=True, exist_ok=True)

    for art in arts:
        if art.get("kind") == "git-tracked":
            continue
        archive_rel = art.get("archive")
        if not archive_rel:
            continue
        archive_path = out_dir / Path(archive_rel).name
        pack_list = pack_paths_for_artifact(art)
        print(f"Packing {art['id']} ({len(pack_list)} roots)…")
        create_tar_zst(REPO_ROOT, archive_path, relative_paths=pack_list)
        art["sha256"] = sha256_file(archive_path)
        art["size_bytes"] = archive_path.stat().st_size
        dest = local_base / Path(archive_rel).name
        import shutil

        shutil.copy2(archive_path, dest)
        art["url"] = f"${{PROSPECTUS_DATA_REMOTE}}/{tag}/{dest.name}"
        print(f"  → {archive_path} ({art['size_bytes'] / 1e6:.1f} MB)")
        print(f"     published copy: {dest}")

    if args.update_manifest:
        manifest["published_tag"] = tag
        save_manifest(manifest)
        print(f"Wrote {MANIFEST_PATH} (tag={tag})")
    return 0


def _cmd_ingest(args: argparse.Namespace) -> int:
    """Extract a local .tar.zst using manifest metadata (offline handoff)."""
    manifest = load_manifest()
    archive_path = Path(args.archive).resolve()
    if not archive_path.is_file():
        print(f"Not found: {archive_path}", file=sys.stderr)
        return 1

    art = None
    for candidate in manifest.get("artifacts", []):
        if args.artifact and candidate["id"] == args.artifact:
            art = candidate
            break
        if Path(candidate.get("archive", "")).name == archive_path.name:
            art = candidate
            break
    if not art:
        print("No matching artifact in manifest; pass --artifact <id>", file=sys.stderr)
        return 1

    cache = BUNDLE_STAGING / "cache" / archive_path.name
    cache.parent.mkdir(parents=True, exist_ok=True)
    import shutil

    shutil.copy2(archive_path, cache)
    art = dict(art)
    if args.skip_sha:
        art.pop("sha256", None)
    else:
        expected = art.get("sha256")
        if expected:
            got = sha256_file(cache)
            if got != expected:
                print(f"SHA256 mismatch: expected {expected}, got {got}", file=sys.stderr)
                return 1
    fetch_artifact(art, force=True)
    return 0


def _cmd_list(args: argparse.Namespace) -> int:
    manifest = load_manifest()
    print(json.dumps(manifest, indent=2, ensure_ascii=False))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="command", required=True)

    p_fetch = sub.add_parser("fetch", help="Download and extract artifacts for a profile")
    p_fetch.add_argument("--profile", default="dev-full")
    p_fetch.add_argument("--force", action="store_true")
    p_fetch.set_defaults(func=_cmd_fetch)

    p_verify = sub.add_parser("verify", help="Check local paths / checksums")
    p_verify.add_argument("--profile", default=None)
    p_verify.set_defaults(func=_cmd_verify)

    p_push = sub.add_parser("push", help="Upload bundle(s) to PROSPECTUS_DATA_REMOTE")
    p_push.add_argument("--profile", default="dev-full")
    p_push.add_argument("--artifact", default=None)
    p_push.add_argument("--tag", default=None)
    p_push.add_argument("--update-manifest", action="store_true")
    p_push.set_defaults(func=_cmd_push)

    p_pub = sub.add_parser("publish-local", help="Pack bundles and set file:// URLs + sha256 in manifest")
    p_pub.add_argument("--profile", required=True)
    p_pub.add_argument("--tag", default=None, help="Release tag for URL paths (default: manifest published_tag)")
    p_pub.add_argument("--update-manifest", action="store_true")
    p_pub.set_defaults(func=_cmd_publish_local)

    p_ingest = sub.add_parser("ingest", help="Extract a local bundle (offline handoff)")
    p_ingest.add_argument("archive", help="Path to .tar.zst")
    p_ingest.add_argument("--artifact", default=None)
    p_ingest.add_argument("--skip-sha", action="store_true")
    p_ingest.set_defaults(func=_cmd_ingest)

    p_list = sub.add_parser("list", help="Print manifest JSON")
    p_list.set_defaults(func=_cmd_list)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
