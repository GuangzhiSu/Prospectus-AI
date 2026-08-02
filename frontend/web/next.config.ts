import type { NextConfig } from "next";
import path from "path";

// `next build` cwd is `frontend/web`; repo root is two levels up.
const repoRoot = path.resolve(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  /** Avoid bundling sharp native addons (Linux vs Windows); we do not use next/image optimization. */
  images: {
    unoptimized: true,
  },
  /** Ship a self-contained Node server for Windows / offline installs (`node server.js`). */
  output: "standalone",
  /** Trace files from monorepo root when resolving server bundles. */
  outputFileTracingRoot: repoRoot,
  /** Eligibility API spawns the standalone Python bridge; include those files in server bundles. */
  outputFileTracingIncludes: {
    "/api/developer-tools/**/*": [
      "./devtools-data/**/*",
      "../../frontend/web/devtools-data/**/*",
    ],
    "/api/eligibility/run": [
      "../../.python_packages/**/*",
      "../../eligibility/**/*",
      "../../ai-module/llm_*.py",
      "../../ai-module/llm_providers.py",
      "../../ai-module/llm_sanitize.py",
    ],
  },
  /** Omit sharp / @img native addons so Linux-built standalone can run with Windows Node (no Linux .node files). */
  outputFileTracingExcludes: {
    "*": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
};

export default nextConfig;
