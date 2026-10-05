import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedis(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  client.on("error", (err) => console.error("[redis]", err.message));
  return client;
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/** 幂等连接;Redis 仅做缓存/限流,不可用时调用方降级,不阻塞业务 */
export async function ensureRedis(): Promise<boolean> {
  if (redis.status === "ready") return true;
  if (redis.status === "wait" || redis.status === "end") {
    try {
      await redis.connect();
    } catch {
      return false;
    }
  }
  return (redis.status as string) === "ready";
}
