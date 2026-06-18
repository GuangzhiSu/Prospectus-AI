import type { NextConfig } from "next";
import path from "path";

// Standalone project root: modular/ (parent of platform-module/web)
const modularRoot = path.resolve(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  output: "standalone",
  outputFileTracingRoot: modularRoot,
  outputFileTracingExcludes: {
    "*": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
};

export default nextConfig;
