import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { getModularRoot, workspacePaths } from "./paths";

function bundledRoot(): string {
  return path.join(getModularRoot(), "bundled");
}

/** Copy shipped defaults into workspace when missing (no parent repo required). */
export async function ensurePlatformConfig(): Promise<void> {
  const ws = workspacePaths();
  const bundled = bundledRoot();

  await fs.mkdir(ws.platformConfig, { recursive: true });
  await fs.mkdir(ws.kgInputs, { recursive: true });
  await fs.mkdir(ws.data, { recursive: true });

  const copies: Array<{ src: string; dst: string }> = [
    {
      src: path.join(bundled, "platform-config", "agent2_section_requirements.json"),
      dst: ws.sectionRequirements,
    },
    {
      src: path.join(bundled, "platform-config", "issuer_metadata.json"),
      dst: ws.issuerMetadata,
    },
    {
      src: path.join(bundled, "platform-config", "kg-inputs", "input_schema.json"),
      dst: path.join(ws.kgInputs, "input_schema.json"),
    },
    {
      src: path.join(
        bundled,
        "platform-config",
        "kg-inputs",
        "input_schema_crosswalk.json"
      ),
      dst: path.join(ws.kgInputs, "input_schema_crosswalk.json"),
    },
    {
      src: path.join(bundled, "sample-data", "data.json"),
      dst: path.join(ws.data, "data.json"),
    },
  ];

  for (const { src, dst } of copies) {
    if (existsSync(src) && !existsSync(dst)) {
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
    }
  }

  // Optional: full KG inputs tree for kg-view (structure/ still fetched via sync_data)
  const bundledKg = path.join(bundled, "prospectus_kg_output", "inputs");
  if (existsSync(bundledKg)) {
    const wsKg = path.join(ws.root, "prospectus_kg_output", "inputs");
    await fs.mkdir(wsKg, { recursive: true });
    const entries = await fs.readdir(bundledKg);
    for (const name of entries) {
      const src = path.join(bundledKg, name);
      const dst = path.join(wsKg, name);
      if (!existsSync(dst)) {
        const stat = await fs.stat(src);
        if (stat.isFile()) {
          await fs.copyFile(src, dst);
        }
      }
    }
  }
}

export function getBundledPath(...parts: string[]): string {
  return path.join(bundledRoot(), ...parts);
}
