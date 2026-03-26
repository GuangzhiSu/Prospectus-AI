// app/api/files/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

function prettyOriginalName(storedName: string) {
  // stored format: <timestamp>_<uuid>__<original>
  const parts = storedName.split("__");
  return parts.length >= 2 ? parts.slice(1).join("__") : storedName;
}

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const names = await fs.readdir(uploadDir);
    const items = await Promise.all(
      names.map(async (n) => {
        const full = path.join(uploadDir, n);
        const st = await fs.stat(full);
        return {
          storedName: n,
          name: prettyOriginalName(n),
          size: st.size,
          lastModified: st.mtime.toISOString(),
        };
      })
    );

    items.sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1));
    return NextResponse.json({ items });
  } catch (err: any) {
    return new NextResponse(err?.message ? String(err.message) : "Server error", {
      status: 500,
    });
  }
}
