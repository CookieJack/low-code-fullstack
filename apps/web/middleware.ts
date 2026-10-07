import { NextResponse, type NextRequest } from "next/server";

/**
 * 自定义域名出站:请求 Host 命中已绑定的自定义域名时,把站点根路径
 * 重写为该页面的发布页 /{slug}(浏览器地址栏保持自定义域名)。
 *
 * 平台自身路径(/dashboard /dashboard/login /dashboard/editor 等)不受影响;
 * 域名解析由 server 的匿名接口 /api/domains/resolve 提供(Redis 缓存),
 * middleware 侧再做一层短 TTL 内存缓存(含负缓存)避免高频回源。
 */

const RESOLVE_TTL_MS = 30_000;
const resolveCache = new Map<string, { slug: string | null; expiresAt: number }>();

const INTERNAL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

export async function middleware(req: NextRequest) {
  // 仅站点根路径出站;平台功能路径与静态资源保持原样
  if (req.nextUrl.pathname !== "/") return NextResponse.next();

  const host = (req.headers.get("host") ?? "")
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
  // 无点号主机名(localhost、容器名)与 IP 直连不可能是绑定域名,直接放行
  if (!host || !host.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return NextResponse.next();
  }

  const now = Date.now();
  const cached = resolveCache.get(host);
  let slug: string | null | undefined;
  if (cached && cached.expiresAt > now) {
    slug = cached.slug;
  } else {
    try {
      const res = await fetch(`${INTERNAL}/api/domains/resolve?host=${encodeURIComponent(host)}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) slug = ((await res.json()) as { slug: string }).slug;
      else if (res.status === 404) slug = null;
    } catch {
      /* 解析失败按未绑定放行,不阻塞平台访问 */
    }
    resolveCache.set(host, { slug: slug ?? null, expiresAt: now + RESOLVE_TTL_MS });
  }

  if (!slug) return NextResponse.next();
  return NextResponse.rewrite(new URL(`/${slug}`, req.url));
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
