import { NextResponse } from "next/server";
import path from "path";
import { getProspectusRoot } from "@/lib/prospectus-root";
import {
  formatPythonProcessError,
  pythonDisplayName,
  resolvePythonCommand,
  spawnPython,
} from "@/lib/python-runtime";

export const runtime = "nodejs";

type GpuInfo = {
  ok: boolean;
  cuda_available?: boolean;
  device_count?: number;
  device_names?: string[];
  error?: string;
  python?: string;
};

export async function GET() {
  const root = getProspectusRoot();
  const pythonResolution = await resolvePythonCommand(root);
  if (!pythonResolution.ok) {
    return NextResponse.json({
      ok: false,
      error: pythonResolution.error,
      python: "unavailable",
    } satisfies GpuInfo);
  }
  const python = pythonResolution.python;
  const code = `
import json
try:
    import torch
    c = torch.cuda.is_available()
    n = torch.cuda.device_count() if c else 0
    names = [torch.cuda.get_device_name(i) for i in range(n)] if c else []
    print(json.dumps({"cuda_available": c, "device_count": n, "device_names": names}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

  return new Promise<NextResponse>((resolve) => {
    const proc = spawnPython(python, ["-c", code], {
      cwd: root,
      env: process.env,
    });
    let out = "";
    let err = "";
    proc.stdout?.on("data", (d) => {
      out += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      err += d.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve(
          NextResponse.json(
            {
              ok: false,
              error: formatPythonProcessError(err || out || `exit ${code}`),
              python: path.basename(pythonDisplayName(python)),
            } satisfies GpuInfo,
            { status: 200 }
          )
        );
        return;
      }
      try {
        const line = out.trim().split("\n").filter(Boolean).pop() || "{}";
        const data = JSON.parse(line) as Record<string, unknown>;
        if (data.error) {
          resolve(
            NextResponse.json({
              ok: false,
              error: String(data.error),
              python: path.basename(pythonDisplayName(python)),
            } satisfies GpuInfo)
          );
          return;
        }
        resolve(
          NextResponse.json({
            ok: true,
            cuda_available: Boolean(data.cuda_available),
            device_count: Number(data.device_count) || 0,
            device_names: Array.isArray(data.device_names)
              ? (data.device_names as string[])
              : [],
            python: path.basename(pythonDisplayName(python)),
          } satisfies GpuInfo)
        );
      } catch {
        resolve(
          NextResponse.json(
            {
              ok: false,
              error: err || out || "parse error",
              python: path.basename(pythonDisplayName(python)),
            } satisfies GpuInfo
          )
        );
      }
    });
    proc.on("error", (e) => {
      resolve(
        NextResponse.json(
          {
            ok: false,
            error: formatPythonProcessError(String(e.message)),
            python: path.basename(pythonDisplayName(python)),
          } satisfies GpuInfo
        )
      );
    });
  });
}
