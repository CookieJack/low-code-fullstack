import { Hono } from "hono";
import { db } from "../lib/db";
import { redis, ensureRedis } from "../lib/redis";

export const healthRoutes = new Hono();

healthRoutes.get("/healthz", async (c) => {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    /* ignore */
  }

  let redisOk = false;
  if (await ensureRedis()) {
    try {
      redisOk = (await redis.ping()) === "PONG";
    } catch {
      /* ignore */
    }
  }

  return c.json({ ok: dbOk, db: dbOk, redis: redisOk });
});
