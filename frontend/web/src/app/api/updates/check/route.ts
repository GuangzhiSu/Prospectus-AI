import { NextResponse } from "next/server";

import { APP_RELEASE_TAG, APP_VERSION } from "@/lib/app-version";

export const runtime = "nodejs";
export const maxDuration = 30;

type GitHubReleaseAsset = {
  name?: string;
  browser_download_url?: string;
};

type GitHubRelease = {
  tag_name?: string;
  html_url?: string;
  name?: string;
  body?: string;
  assets?: GitHubReleaseAsset[];
};

function normalizeVersion(value: string | undefined): string {
  return (value || "").trim().replace(/^v/i, "");
}

function compareVersions(a: string, b: string): number {
  const pa = normalizeVersion(a).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const pb = normalizeVersion(b).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i += 1) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

function findInstallerAsset(release: GitHubRelease): GitHubReleaseAsset | undefined {
  return release.assets?.find((asset) => {
    const name = asset.name || "";
    return /^ProspectusAI-Setup-.*\.exe$/i.test(name);
  });
}

export async function GET() {
  const repo = process.env.UPDATE_REPO || "GuangzhiSu/Prospectus-AI";
  const currentVersion = process.env.APP_VERSION || APP_VERSION;
  const currentTag = process.env.APP_RELEASE_TAG || APP_RELEASE_TAG;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ProspectusAI-update-checker",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          currentVersion,
          currentTag,
          error: `GitHub release check failed (${res.status})`,
        },
        { status: 502 }
      );
    }

    const release = (await res.json()) as GitHubRelease;
    const latestTag = release.tag_name || "";
    const latestVersion = normalizeVersion(latestTag);
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    const installer = findInstallerAsset(release);

    return NextResponse.json({
      ok: true,
      currentVersion,
      currentTag,
      latestVersion,
      latestTag,
      hasUpdate,
      releaseName: release.name || latestTag,
      releaseUrl: release.html_url || `https://github.com/${repo}/releases/latest`,
      installerUrl: installer?.browser_download_url || null,
      installerName: installer?.name || null,
      notes: release.body || "",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        currentVersion,
        currentTag,
        error: e instanceof Error ? e.message : "Update check failed",
      },
      { status: 500 }
    );
  }
}
