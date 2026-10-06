import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createUserInput, updateUserInput } from "@lc/schema";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { parseBody, readJson } from "../lib/http";
import { requirePermission, type AuthEnv } from "../middleware/auth";

export const userRoutes = new Hono<AuthEnv>();

/** 全部端点仅 admin 可用 */
userRoutes.use("*", requirePermission("user:read"));

const PUBLIC_SELECT = {
  id: true,
  username: true,
  name: true,
  role: true,
  enabled: true,
  createdAt: true,
} as const;

const toDto = (u: {
  id: string;
  username: string;
  name: string;
  role: string;
  enabled: boolean;
  createdAt: Date;
}) => ({ ...u, createdAt: u.createdAt.toISOString() });

/** 最后一个启用中的 admin 受保护:禁用/降级/删除后会导致系统锁死 */
async function guardLastAdmin(userId: string, next: { role?: string; enabled?: boolean }) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new HTTPException(404, { message: "用户不存在" });
  const losesAdmin =
    target.role === "admin" &&
    ((next.role !== undefined && next.role !== "admin") ||
      (next.enabled !== undefined && next.enabled === false));
  if (!losesAdmin) return;
  const admins = await db.user.count({ where: { role: "admin", enabled: true } });
  if (admins <= 1) {
    throw new HTTPException(400, { message: "不能停用或降级最后一位管理员" });
  }
}

/** 用户列表 */
userRoutes.get("/", async (c) => {
  const list = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: PUBLIC_SELECT,
  });
  return c.json(list.map(toDto));
});

/** 新建用户 */
userRoutes.post("/", requirePermission("user:create"), async (c) => {
  const input = parseBody(createUserInput, await readJson(c));
  const exists = await db.user.findUnique({ where: { username: input.username } });
  if (exists) throw new HTTPException(409, { message: "用户名已被占用" });

  const user = await db.user.create({
    data: {
      username: input.username,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      role: input.role,
    },
    select: PUBLIC_SELECT,
  });
  return c.json(toDto(user), 201);
});

/** 更新用户(名称/角色/启用/重置密码) */
userRoutes.put("/:id", requirePermission("user:update"), async (c) => {
  const id = c.req.param("id");
  const input = parseBody(updateUserInput, await readJson(c));
  await guardLastAdmin(id, input);

  const user = await db.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.password !== undefined
        ? { passwordHash: await hashPassword(input.password) }
        : {}),
    },
    select: PUBLIC_SELECT,
  });
  // 角色或禁用状态变更后,使其所有 refresh token 失效,已签发的 access token 最长 2h 内自然过期
  if (input.role !== undefined || input.enabled !== undefined) {
    await db.refreshToken.deleteMany({ where: { userId: id } });
  }
  return c.json(toDto(user));
});

/** 删除用户(不能删除自己) */
userRoutes.delete("/:id", requirePermission("user:delete"), async (c) => {
  const id = c.req.param("id");
  if (id === c.get("authUser").id) {
    throw new HTTPException(400, { message: "不能删除当前登录的账号" });
  }
  const exists = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HTTPException(404, { message: "用户不存在" });
  await db.user.delete({ where: { id } });
  return c.json({ ok: true });
});
