import { NextResponse } from "next/server";

import { getDownloadAsset, RELEASE_API_URL } from "@/lib/download-assets";

export const runtime = "nodejs";
export const maxDuration = 60;

type GitHubReleaseAsset = {
  name?: unknown;
  browser_download_url?: unknown;
};

async function resolveDynamicAsset(pattern: string): Promise<string | null> {
  try {
    const res = await fetch(RELEASE_API_URL, { cache: "no-store" });
    if (!res.ok) return null;

    const release = (await res.json()) as { assets?: GitHubReleaseAsset[] };
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const matcher = new RegExp(pattern);
    const match = assets.find(
      (item) =>
        typeof item.name === "string" &&
        matcher.test(item.name) &&
        typeof item.browser_download_url === "string"
    );

    return typeof match?.browser_download_url === "string"
      ? match.browser_download_url
      : null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ asset: string }> }
) {
  const { asset: assetId } = await params;
  const asset = getDownloadAsset(assetId);
  if (!asset) {
    return NextResponse.json({ error: "Unknown download asset" }, { status: 404 });
  }

  if (asset.dynamicAssetPattern) {
    const dynamicHref = await resolveDynamicAsset(asset.dynamicAssetPattern);
    if (dynamicHref) return NextResponse.redirect(dynamicHref);
    if (asset.fallbackHref) return NextResponse.redirect(asset.fallbackHref);
  }

  if (asset.fallbackHref) {
    try {
      const res = await fetch(asset.href, {
        method: "HEAD",
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.redirect(asset.fallbackHref);
      }
    } catch {
      return NextResponse.redirect(asset.fallbackHref);
    }
  }

  return NextResponse.redirect(asset.href);
}
