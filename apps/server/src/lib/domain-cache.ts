import { redis, ensureRedis } from "./redis";

const TTL = 60;

const cacheKey = (host: string) => `lc:domain:${host}`;

/** host → 绑定页 slug;返回 undefined 表示未缓存,null 表示缓存了「未绑定」(负缓存) */
export async function getDomainSlugCached(host: string): Promise<string | null | undefined> {
  if (!(await ensureRedis())) return undefined;
  try {
    const slug = await redis.get(cacheKey(host));
    if (slug === null) return undefined;
    return slug === "" ? null : slug;
  } catch {
    return undefined;
  }
}

/** 缓存绑定关系;slug 传 null 表示「该域名未绑定」(负缓存,防穿透) */
export async function setDomainSlugCached(host: string, slug: string | null): Promise<void> {
  if (!(await ensureRedis())) return;
  try {
    await redis.set(cacheKey(host), slug ?? "", "EX", TTL);
  } catch {
    /* 缓存失败不影响主流程 */
  }
}

export async function invalidateDomain(host: string): Promise<void> {
  if (!(await ensureRedis())) return;
  try {
    await redis.del(cacheKey(host));
  } catch {
    /* 忽略 */
  }
}
