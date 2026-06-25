import path from "path";
import { existsSync } from "fs";

/**
 * Resolve prospectus-ui root (where code modules live).
 * Tries multiple candidates because process.cwd() varies by how the dev server is started.
 */
export function getProspectusRoot(): string {
  if (process.env.PROSPECTUS_ROOT) return process.env.PROSPECTUS_ROOT;
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.resolve(cwd, ".."),
    path.resolve(cwd, "..", ".."),
  ];
  for (const root of candidates) {
    if (
      existsSync(path.join(root, "ai-module", "agent1.py")) ||
      existsSync(path.join(root, "agent1.py"))
    ) {
      return root;
    }
  }
  return path.resolve(cwd, "..", "..");
}

export function getAiModuleRoot(root = getProspectusRoot()): string {
  if (process.env.AI_MODULE_ROOT) return process.env.AI_MODULE_ROOT;
  return path.join(root, "ai-module");
}

export function getAgentScriptPath(
  scriptName: "agent1.py" | "agent2.py" | "agent2_stream.py",
  root = getProspectusRoot()
): string {
  const modularPath = path.join(getAiModuleRoot(root), scriptName);
  if (existsSync(modularPath)) return modularPath;
  return path.join(root, scriptName);
}

export function getWorkspaceRoot(root = getProspectusRoot()): string {
  const configured = process.env.WORKSPACE_ROOT?.trim();
  if (!configured) return root;
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(root, configured);
}

export function workspacePaths(root = getProspectusRoot()) {
  const workspaceRoot = getWorkspaceRoot(root);
  return {
    root: workspaceRoot,
    data: path.join(workspaceRoot, "data"),
    agent1Output: path.join(workspaceRoot, "agent1_output"),
    agent2Output: path.join(workspaceRoot, "agent2_output"),
    uploads: path.join(workspaceRoot, "uploads"),
    rag: path.join(workspaceRoot, "rag"),
    ragRaw: path.join(workspaceRoot, "rag_raw"),
    progress: path.join(workspaceRoot, ".progress.json"),
    kgOutput: path.join(workspaceRoot, "prospectus_kg_output"),
  };
}
