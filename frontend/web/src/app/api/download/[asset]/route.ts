import { NextResponse } from "next/server";

import { getDownloadAsset } from "@/lib/download-assets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ asset: string }> }
) {
  const { asset: assetId } = await params;
  const asset = getDownloadAsset(assetId);
  if (!asset) {
    return NextResponse.json({ error: "Unknown download asset" }, { status: 404 });
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
