import path from "path";
import { existsSync } from "fs";

/** Root of this standalone project (`modular/` when checked out alone). */
export function getModularRoot(): string {
  if (process.env.MODULAR_ROOT) {
    return path.resolve(process.env.MODULAR_ROOT);
  }
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.resolve(cwd, ".."),
    path.resolve(cwd, "..", ".."),
    path.resolve(cwd, "..", "..", ".."),
  ];
  for (const c of candidates) {
    if (
      existsSync(path.join(c, "ai-module", "agent1.py")) &&
      existsSync(path.join(c, "platform-module", "web", "package.json"))
    ) {
      return c;
    }
  }
  return path.resolve(cwd, "..", "..");
}

export function getProspectusRoot(): string {
  if (process.env.PROSPECTUS_ROOT) {
    return path.resolve(process.env.PROSPECTUS_ROOT);
  }
  return path.join(getModularRoot(), "workspace");
}

export function getAiModuleRoot(): string {
  if (process.env.AI_MODULE_ROOT) {
    return path.resolve(process.env.AI_MODULE_ROOT);
  }
  return path.join(getModularRoot(), "ai-module");
}

export function getBundledRoot(): string {
  return path.join(getModularRoot(), "bundled");
}

export function workspacePaths(root?: string) {
  const ws = root ?? getProspectusRoot();
  const modular = getModularRoot();
  return {
    root: ws,
    data: path.join(ws, "data"),
    agent1Output: path.join(ws, "agent1_output"),
    agent2Output: path.join(ws, "agent2_output"),
    platformConfig: path.join(ws, "platform-config"),
    sectionRequirements: path.join(
      ws,
      "platform-config",
      "agent2_section_requirements.json"
    ),
    issuerMetadata: path.join(ws, "platform-config", "issuer_metadata.json"),
    kgInputs: path.join(ws, "platform-config", "kg-inputs"),
    kgOutput: path.join(ws, "prospectus_kg_output"),
    jobs: path.join(ws, "jobs"),
    scripts: path.join(modular, "scripts"),
    bundled: path.join(modular, "bundled"),
    templates: path.join(modular, "templates"),
    packaging: path.join(modular, "packaging"),
  };
}

/** Full KG tree for /kg-view (bundled + workspace; fetch structure via scripts/sync_data.py). */
export function getKgOutputDir(): string {
  const ws = workspacePaths();
  const bundledKg = path.join(getBundledRoot(), "prospectus_kg_output");
  for (const candidate of [ws.kgOutput, bundledKg]) {
    if (existsSync(path.join(candidate, "structure", "docgraph.json"))) {
      return candidate;
    }
  }
  return ws.kgOutput;
}
