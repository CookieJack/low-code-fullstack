import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  transpilePackages: ["@lc/schema", "@lc/materials", "@lc/renderer", "@lc/ui"],
  // 开发/直连 Next 时,把本地上传图片的 GET 代理到 API server(浏览器存的是相对路径)。
  // docker 部署下 nginx 已把 /api 分流到 server,不会命中这条规则。
  async rewrites() {
    const apiOrigin =
      process.env.NEXT_PUBLIC_API_URL || process.env.API_INTERNAL_URL || "http://localhost:3001";
    return [{ source: "/api/uploads/:path*", destination: `${apiOrigin}/api/uploads/:path*` }];
  },
};

export default nextConfig;
