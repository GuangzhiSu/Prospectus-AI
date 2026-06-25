import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";

import { getDownloadAsset } from "@/lib/download-assets";
import { getProspectusRoot } from "@/lib/prospectus-root";

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

  const root = getProspectusRoot();
  const filePath = path.join(root, asset.filePath);
  const stat = await fsp.stat(filePath).catch(() => null);
  if (!stat?.isFile()) {
    return NextResponse.json(
      { error: "Download package has not been built on this machine yet." },
      { status: 404 }
    );
  }

  const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${asset.filename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
