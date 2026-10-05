import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  transpilePackages: ["@lc/schema", "@lc/materials", "@lc/renderer", "@lc/ui"],
};

export default nextConfig;
