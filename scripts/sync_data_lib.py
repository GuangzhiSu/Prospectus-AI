"""Shared helpers for data manifest fetch / verify / pack (used by sync_data.py and bundle scripts)."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import tarfile
import tempfile
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import urlparse

try:
    import zstandard as zstd
except ImportError:
    zstd = None  # type: ignore[assignment]

REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "data" / "manifest.json"
BUNDLE_STAGING = REPO_ROOT / "dist" / "data-bundles"


def load_manifest(path: Path | None = None) -> dict[str, Any]:
    p = path or MANIFEST_PATH
    with p.open(encoding="utf-8") as f:
        return json.load(f)


def save_manifest(data: dict[str, Any], path: Path | None = None) -> None:
    p = path or MANIFEST_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def resolve_url(url: str) -> str:
    """Expand ${PROSPECTUS_DATA_REMOTE}/... and env vars in manifest URLs."""
    remote = os.environ.get("PROSPECTUS_DATA_REMOTE", "").rstrip("/")
    out = url.replace("${PROSPECTUS_DATA_REMOTE}", remote)
    if out.startswith("$"):
        # bare env reference
        key = out.lstrip("$")
        out = os.environ.get(key, out)
    return out


def artifacts_for_profile(manifest: dict[str, Any], profile: str) -> list[dict[str, Any]]:
    profiles = manifest.get("profiles", {})
    if profile not in profiles:
        raise KeyError(f"Unknown profile {profile!r}. Valid: {sorted(profiles)}")
    ids = set(profiles[profile].get("artifacts", []))
    out: list[dict[str, Any]] = []
    for art in manifest.get("artifacts", []):
        if art["id"] in ids:
            out.append(art)
    return out


def sha256_file(path: Path, chunk: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            block = f.read(chunk)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def sha256_tree(root: Path, *, relative_to: Path | None = None) -> str:
    """Hash sorted file contents under root (for post-extract verify of directories)."""
    base = relative_to or root
    h = hashlib.sha256()
    if not root.exists():
        return h.hexdigest()
    files = sorted(p for p in root.rglob("*") if p.is_file())
    for fp in files:
        rel = str(fp.relative_to(base)).replace("\\", "/")
        h.update(rel.encode("utf-8"))
        h.update(b"\0")
        h.update(fp.read_bytes())
    return h.hexdigest()


def repo_path(rel: str) -> Path:
    return (REPO_ROOT / rel).resolve()


def extract_tar_zst(archive: Path, dest: Path) -> None:
    if zstd is None:
        raise RuntimeError("Install zstandard: pip install zstandard")
    dest.mkdir(parents=True, exist_ok=True)
    dctx = zstd.ZstdDecompressor()
    with tempfile.TemporaryDirectory(prefix="sync_data_") as tmp:
        tar_path = Path(tmp) / "bundle.tar"
        with archive.open("rb") as src, tar_path.open("wb") as out:
            dctx.copy_stream(src, out)
        with tarfile.open(tar_path, "r") as tar:
            try:
                tar.extractall(path=dest, filter="data")
            except TypeError:
                tar.extractall(path=dest)


def create_tar_zst(source_dir: Path, archive: Path, *, relative_paths: list[str] | None = None) -> None:
    if zstd is None:
        raise RuntimeError("Install zstandard: pip install zstandard")
    archive.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="pack_data_") as tmp:
        tar_path = Path(tmp) / "bundle.tar"
        with tarfile.open(tar_path, "w") as tar:
            if relative_paths:
                for rel in relative_paths:
                    full = source_dir / rel
                    if full.is_file():
                        tar.add(full, arcname=rel)
                    elif full.is_dir():
                        for fp in sorted(full.rglob("*")):
                            if fp.is_file():
                                tar.add(fp, arcname=str(fp.relative_to(source_dir)))
            else:
                for fp in sorted(source_dir.rglob("*")):
                    if fp.is_file():
                        tar.add(fp, arcname=str(fp.relative_to(source_dir)))
        cctx = zstd.ZstdCompressor(level=3)
        with tar_path.open("rb") as src, archive.open("wb") as out:
            cctx.copy_stream(src, out)


def download_file(url: str, dest: Path) -> None:
    resolved = resolve_url(url)
    if not resolved or resolved == url and "${" in url:
        raise RuntimeError(
            f"URL not resolved (set PROSPECTUS_DATA_REMOTE or use file://): {url}"
        )
    parsed = urlparse(resolved)
    dest.parent.mkdir(parents=True, exist_ok=True)

    if parsed.scheme in ("", "file"):
        src = Path(parsed.path if parsed.scheme == "file" else resolved)
        if not src.is_file():
            raise FileNotFoundError(src)
        shutil.copy2(src, dest)
        return

    if parsed.scheme == "s3":
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("pip install boto3 for s3:// URLs") from exc
        bucket = parsed.netloc
        key = parsed.path.lstrip("/")
        boto3.client("s3").download_file(bucket, key, str(dest))
        return

    if parsed.scheme in ("http", "https"):
        import urllib.request

        urllib.request.urlretrieve(resolved, dest)
        return

    if parsed.scheme == "hf":
        # hf://datasets/org/name/path/in/repo
        try:
            from huggingface_hub import hf_hub_download
        except ImportError as exc:
            raise RuntimeError("pip install huggingface_hub for hf:// URLs") from exc
        rest = parsed.netloc + parsed.path
        parts = rest.strip("/").split("/")
        if len(parts) < 3:
            raise ValueError(f"hf:// URL must be hf://datasets/<repo_id>/<filename>: {url}")
        repo_id = "/".join(parts[1:-1]) if parts[0] == "datasets" else "/".join(parts[:-1])
        filename = parts[-1]
        repo_type = "dataset" if parts[0] == "datasets" else "model"
        path = hf_hub_download(repo_id=repo_id, filename=filename, repo_type=repo_type)
        shutil.copy2(path, dest)
        return

    raise ValueError(f"Unsupported URL scheme: {resolved}")


def extract_dest_for(art: dict[str, Any]) -> Path:
    """Directory to extract archive into (usually repo root so arcnames match)."""
    base = art.get("extract_base", ".")
    if base in (".", ""):
        return REPO_ROOT
    return repo_path(base)


def fetch_artifact(art: dict[str, Any], *, force: bool = False) -> Path:
    extract_dest = extract_dest_for(art)
    check_path = repo_path(art.get("extract_to", art.get("pack_paths", ["."])[0]))
    kind = art.get("kind", "archive")
    if kind == "git-tracked":
        if not check_path.exists():
            raise FileNotFoundError(f"Expected git-tracked path missing: {check_path}")
        return check_path

    archive_name = art.get("archive")
    if not archive_name:
        raise ValueError(f"Artifact {art['id']} missing 'archive'")
    cache = BUNDLE_STAGING / "cache" / Path(archive_name).name
    url = art.get("url", "")
    if force or not cache.is_file():
        if not url:
            raise RuntimeError(f"Artifact {art['id']} has no url; maintainer must publish first")
        print(f"Downloading {art['id']} …")
        download_file(url, cache)
        expected = art.get("sha256")
        if expected:
            got = sha256_file(cache)
            if got != expected:
                cache.unlink(missing_ok=True)
                raise ValueError(f"SHA256 mismatch for {art['id']}: expected {expected}, got {got}")

    if check_path.exists() and not force:
        print(f"Skip extract {art['id']} (exists): {check_path}")
        return check_path

    print(f"Extracting {art['id']} → {extract_dest}")
    extract_tar_zst(cache, extract_dest)
    return check_path


def verify_artifact(art: dict[str, Any]) -> tuple[bool, str]:
    kind = art.get("kind", "archive")
    check = repo_path(art.get("extract_to", art.get("pack_paths", [""])[0]))
    if kind == "git-tracked":
        if not check.is_file():
            return False, f"missing {check}"
        expected = art.get("sha256")
        if expected:
            got = sha256_file(check)
            if got != expected:
                return False, f"sha256 mismatch {check}"
        return True, "ok"

    if check.is_file():
        expected = art.get("sha256")
        if expected:
            got = sha256_file(check)
            if got != expected:
                return False, f"sha256 mismatch {check}"
        return True, "ok"

    if not check.exists():
        return False, f"missing {check}"

    expected_tree = art.get("tree_sha256")
    if expected_tree:
        got = sha256_tree(check, relative_to=REPO_ROOT)
        if got != expected_tree:
            return False, f"tree_sha256 mismatch (got {got[:16]}…)"
    return True, "ok"


def publish_remote_url(remote: str, key: str) -> str:
    remote = remote.rstrip("/")
    if remote.startswith("s3://"):
        return f"{remote}/{key}"
    return f"file://{remote}/{key}"


def pack_paths_for_artifact(art: dict[str, Any]) -> list[str]:
    """Return repo-relative paths to include in a bundle."""
    pack = art.get("pack_paths")
    if pack:
        return list(pack)
    extract_to = art["extract_to"]
    return [extract_to]


def iter_pack_members(repo: Path, rel_paths: list[str]) -> Iterator[tuple[Path, str]]:
    for rel in rel_paths:
        full = repo / rel
        if not full.exists():
            continue
        if full.is_file():
            yield full, rel
        elif full.is_dir():
            for fp in sorted(full.rglob("*")):
                if fp.is_file():
                    yield fp, str(fp.relative_to(repo)).replace("\\", "/")
