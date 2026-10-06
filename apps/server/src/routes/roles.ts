import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { PERMISSIONS, createRoleInput, updateRoleInput } from "@lc/schema";
import { db } from "../lib/db";
import { parseBody, readJson } from "../lib/http";
import { invalidateRoleCache } from "../lib/access";
import { requirePermission, type AuthEnv } from "../middleware/auth";

export const roleRoutes = new Hono<AuthEnv>();

const VALID_PERMISSIONS = new Set<string>(PERMISSIONS);

const toDto = (role: {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  _count?: { users: number };
}) => ({
  id: role.id,
  key: role.key,
  name: role.name,
  description: role.description,
  permissions: role.permissions,
  isSystem: role.isSystem,
  userCount: role._count?.users ?? 0,
  createdAt: role.createdAt.toISOString(),
});

const SELECT_WITH_COUNT = {
  id: true,
  key: true,
  name: true,
  description: true,
  permissions: true,
  isSystem: true,
  createdAt: true,
  _count: { select: { users: true } },
} as const;

/** 角色列表(角色编辑界面、用户管理的角色下拉共用) */
roleRoutes.get("/", requirePermission("role:read"), async (c) => {
  const list = await db.role.findMany({
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    select: SELECT_WITH_COUNT,
  });
  return c.json(list.map(toDto));
});

/** 新建自定义角色 */
roleRoutes.post("/", requirePermission("role:create"), async (c) => {
  const input = parseBody(createRoleInput, await readJson(c));
  const exists = await db.role.findUnique({ where: { key: input.key } });
  if (exists) throw new HTTPException(409, { message: "角色标识已存在" });

  const role = await db.role.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    },
    select: SELECT_WITH_COUNT,
  });
  return c.json(toDto(role), 201);
});

/** 更新角色(name/description/permissions)。内置 admin 锁定为全量权限 */
roleRoutes.put("/:id", requirePermission("role:update"), async (c) => {
  const id = c.req.param("id");
  const input = parseBody(updateRoleInput, await readJson(c));
  const role = await db.role.findUnique({ where: { id } });
  if (!role) throw new HTTPException(404, { message: "角色不存在" });
  if (role.key === "admin") {
    throw new HTTPException(400, { message: "内置管理员角色的权限不可修改" });
  }

  const updated = await db.role.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.permissions !== undefined ? { permissions: input.permissions } : {}),
    },
    select: SELECT_WITH_COUNT,
  });
  // 权限解析有短缓存,角色变更立即失效
  invalidateRoleCache(role.key);
  return c.json(toDto(updated));
});

/** 删除角色:仅自定义角色,且不能仍有用户使用 */
roleRoutes.delete("/:id", requirePermission("role:delete"), async (c) => {
  const id = c.req.param("id");
  const role = await db.role.findUnique({
    where: { id },
    select: { id: true, key: true, isSystem: true, _count: { select: { users: true } } },
  });
  if (!role) throw new HTTPException(404, { message: "角色不存在" });
  if (role.isSystem) throw new HTTPException(400, { message: "内置角色不可删除" });
  if (role._count.users > 0) {
    throw new HTTPException(409, { message: `仍有 ${role._count.users} 个用户使用该角色,请先调整其角色` });
  }

  await db.role.delete({ where: { id } });
  invalidateRoleCache(role.key);
  return c.json({ ok: true });
});

/** users 路由复用:校验角色 key 存在(外键兜底前给出可读错误) */
export async function assertRoleExists(key: string) {
  const role = await db.role.findUnique({ where: { key }, select: { key: true } });
  if (!role) throw new HTTPException(400, { message: "角色不存在" });
  return role;
}
