import path from "path";

/**
 * Resolve prospectus-ui root (where agent1.py, agent2.py, data/, agent1_output/ live).
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
  const { existsSync } = require("fs");
  for (const root of candidates) {
    if (existsSync(path.join(root, "agent1.py"))) return root;
  }
  return path.resolve(cwd, "..", "..");
}
