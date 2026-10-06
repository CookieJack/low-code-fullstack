import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loginInput, refreshInput } from "@lc/schema";
import { db } from "../lib/db";
import { parseBody, readJson } from "../lib/http";
import { rateLimit } from "../lib/rate-limit";
import {
  issueTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyPassword,
} from "../lib/auth";
import type { AuthEnv } from "../middleware/auth";

export const authRoutes = new Hono<AuthEnv>();

const clientIp = (c: { req: { header: (k: string) => string | undefined } }) =>
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
  c.req.header("x-real-ip") ??
  "unknown";

/** 登录(IP 限流:10 次/分钟,防爆破) */
authRoutes.post("/login", async (c) => {
  const allowed = await rateLimit(`login:${clientIp(c)}`, 10, 60);
  if (!allowed) {
    throw new HTTPException(429, { message: "尝试过于频繁,请稍后再试" });
  }

  const input = parseBody(loginInput, await readJson(c));
  const user = await db.user.findUnique({ where: { username: input.username } });
  // 用户名不存在与密码错误同样处理,不暴露账号是否存在
  const ok = user && user.enabled ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !ok) {
    throw new HTTPException(401, { message: "用户名或密码错误" });
  }

  return c.json(await issueTokens(user));
});

/** 刷新 token(一次性轮换:旧 refreshToken 立即作废) */
authRoutes.post("/refresh", async (c) => {
  const input = parseBody(refreshInput, await readJson(c));
  const tokens = await rotateRefreshToken(input.refreshToken);
  if (!tokens) {
    throw new HTTPException(401, { message: "登录已失效,请重新登录" });
  }
  return c.json(tokens);
});

/** 登出:撤销 refreshToken */
authRoutes.post("/logout", async (c) => {
  const body = await readJson(c).catch(() => ({}));
  const input = refreshInput.safeParse(body);
  if (input.success) {
    await revokeRefreshToken(input.data.refreshToken);
  }
  return c.json({ ok: true });
});

/** 当前登录用户(前端挂载时刷新角色/校验 token) */
authRoutes.get("/me", async (c) => {
  const authUser = c.get("authUser");
  const user = await db.user.findUnique({ where: { id: authUser.id } });
  if (!user || !user.enabled) {
    throw new HTTPException(401, { message: "账号不存在或已被禁用" });
  }
  return c.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    enabled: user.enabled,
    createdAt: user.createdAt.toISOString(),
  });
});
