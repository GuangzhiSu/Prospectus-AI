import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getDefaultLocalModelDir } from "@/lib/app-settings";

export const runtime = "nodejs";

export async function GET() {
  const dir = getDefaultLocalModelDir();
  try {
    await fs.access(path.join(dir, "config.json"));
    const st = await fs.stat(dir);
    return NextResponse.json({
      installed: true,
      path: dir,
      mtimeMs: st.mtimeMs,
    });
  } catch {
    return NextResponse.json({
      installed: false,
      path: dir,
    });
  }
}
