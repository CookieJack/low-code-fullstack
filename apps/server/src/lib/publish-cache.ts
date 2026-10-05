import { redis, ensureRedis } from "./redis";
import type { PublishedPage } from "@lc/schema";

const TTL = 3600;

const cacheKey = (slug: string) => `lc:pub:${slug}`;

export async function getPublishedCached(slug: string): Promise<PublishedPage | null> {
  if (!(await ensureRedis())) return null;
  try {
    const raw = await redis.get(cacheKey(slug));
    return raw ? (JSON.parse(raw) as PublishedPage) : null;
  } catch {
    return null;
  }
}

export async function setPublishedCached(slug: string, data: PublishedPage): Promise<void> {
  if (!(await ensureRedis())) return;
  try {
    await redis.set(cacheKey(slug), JSON.stringify(data), "EX", TTL);
  } catch {
    /* 缓存失败不影响主流程 */
  }
}

export async function invalidatePublished(slug: string | null | undefined): Promise<void> {
  if (!slug) return;
  if (!(await ensureRedis())) return;
  try {
    await redis.del(cacheKey(slug));
  } catch {
    /* 忽略 */
  }
}
