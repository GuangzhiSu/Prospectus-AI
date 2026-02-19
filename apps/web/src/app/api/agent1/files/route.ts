// GET /api/agent1/files - List Excel files in data/
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";

export async function GET() {
  try {
    const root = getProspectusRoot();
    const dataDir = path.join(root, "data");
    try {
      await fs.access(dataDir);
    } catch {
      return NextResponse.json({ items: [] });
    }

    const names = await fs.readdir(dataDir);
    const items = await Promise.all(
      names
        .filter((n) => n.toLowerCase().endsWith(".xlsx"))
        .map(async (n) => {
          const full = path.join(dataDir, n);
          const st = await fs.stat(full);
          return {
            name: n,
            size: st.size,
            lastModified: st.mtime.toISOString(),
          };
        })
    );

    items.sort((a, b) =>
      (a.lastModified < b.lastModified ? 1 : -1)
    );
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
