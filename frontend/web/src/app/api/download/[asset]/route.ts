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

  return NextResponse.redirect(asset.href);
}
