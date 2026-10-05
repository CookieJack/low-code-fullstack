import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node22",
  outDir: "dist",
  sourcemap: true,
  external: ["@prisma/client", "prisma"],
  // @lc/schema 是 TS 源码包,必须打进 bundle
  noExternal: ["@lc/schema"],
});
