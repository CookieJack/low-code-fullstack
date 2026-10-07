import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db";
import {
  getDomainSlugCached,
  setDomainSlugCached,
} from "../lib/domain-cache";

export const domainRoutes = new Hono();

/** 归一化请求 host:小写、去端口、去结尾点 */
export const normalizeHost = (host: string): string =>
  host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

/**
 * 域名解析(匿名,middleware 用):host → 已发布页 slug。
 * Redis 缓存 60s,含「未绑定」负缓存;绑定/解绑时主动失效。
 */
domainRoutes.get("/resolve", async (c) => {
  const host = normalizeHost(c.req.query("host") ?? "");
  if (!host || !host.includes(".")) {
    throw new HTTPException(400, { message: "缺少 host 参数" });
  }

  const cached = await getDomainSlugCached(host);
  if (cached !== undefined) {
    if (cached === null) throw new HTTPException(404, { message: "域名未绑定" });
    return c.json({ slug: cached });
  }

  const binding = await db.pageDomain.findUnique({
    where: { domain: host },
    select: { page: { select: { slug: true, status: true } } },
  });
  const slug = binding?.page.status === "published" ? binding.page.slug : null;
  await setDomainSlugCached(host, slug);
  if (!slug) throw new HTTPException(404, { message: "域名未绑定或页面未发布" });
  return c.json({ slug });
});
