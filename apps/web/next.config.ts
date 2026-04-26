import type { NextConfig } from "next";
import path from "path";

// `next build` cwd is `apps/web`; repo root is two levels up.
const repoRoot = path.resolve(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  /** Ship a self-contained Node server for Windows / offline installs (`node server.js`). */
  output: "standalone",
  /** Trace files from monorepo root when resolving server bundles. */
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
