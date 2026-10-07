import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Permission } from "@lc/schema";
import type { AuthUser } from "../lib/auth";
import { verifyAccessToken } from "../lib/auth";
import { getUserPermissions } from "../lib/access";

export type AuthEnv = {
  Variables: { authUser: AuthUser };
};

/** 匿名可访问的接口(发布页 SSR、表单收集、健康检查、登录/验证码/刷新、上传图片读取、站点设置读取、域名解析) */
const PUBLIC_RULES: { method: string; pattern: RegExp }[] = [
  { method: "GET", pattern: /^\/api\/p\/[^/]+$/ },
  { method: "POST", pattern: /^\/api\/forms$/ },
  { method: "GET", pattern: /^\/api\/healthz$/ },
  { method: "POST", pattern: /^\/api\/auth\/login$/ },
  { method: "GET", pattern: /^\/api\/auth\/captcha$/ },
  { method: "POST", pattern: /^\/api\/auth\/refresh$/ },
  { method: "GET", pattern: /^\/api\/uploads\/.+$/ },
  { method: "GET", pattern: /^\/api\/settings\/site$/ },
  { method: "GET", pattern: /^\/api\/domains\/resolve$/ },
];

const isPublic = (method: string, path: string) =>
  PUBLIC_RULES.some((r) => r.method === method && r.pattern.test(path));

/** 挂在 /api/* 上:白名单直接放行,其余要求 Bearer token 并注入 authUser */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  if (isPublic(c.req.method, c.req.path)) return next();

  const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? await verifyAccessToken(token) : null;
  if (!user) {
    throw new HTTPException(401, { message: "未登录或登录已过期" });
  }
  c.set("authUser", user);
  return next();
});

/** 在 authMiddleware 之后使用:校验当前用户是否持有权限点(权限由 DB 中的角色决定) */
export const requirePermission = (perm: Permission) =>
  requireAnyPermission([perm]);

export const requireAnyPermission = (perms: readonly Permission[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get("authUser");
    if (!user) throw new HTTPException(401, { message: "未登录或登录已过期" });
    const owned = await getUserPermissions(user);
    if (!perms.some((p) => owned.includes(p))) {
      throw new HTTPException(403, { message: "没有执行此操作的权限" });
    }
    return next();
  });
