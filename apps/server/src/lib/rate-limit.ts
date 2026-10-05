import { redis, ensureRedis } from "./redis";

/** 固定窗口限流;Redis 不可用时放行,不阻塞业务 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (!(await ensureRedis())) return true;
  try {
    const k = `lc:rl:${key}`;
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, windowSec);
    return n <= limit;
  } catch {
    return true;
  }
}
