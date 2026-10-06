import type { Permission } from "@lc/schema";
import { DEFAULT_ROLE_PERMISSIONS } from "@lc/schema";
import type { AuthUser } from "./auth";
import { db } from "./db";
import { HTTPException } from "hono/http-exception";

/* ------------------------------------------------------------------ */
/* 角色权限解析:DB 权威 + 进程内短 TTL 缓存(单进程部署,角色变更即失效) */
/* ------------------------------------------------------------------ */

const CACHE_TTL_MS = 15_000;
const roleCache = new Map<string, { permissions: Permission[]; expiresAt: number }>();

export function invalidateRoleCache(key?: string) {
  if (key) roleCache.delete(key);
  else roleCache.clear();
}

/** 角色权限:优先查库(短缓存),角色不存在时回退到内置默认映射 */
export async function getRolePermissions(roleKey: string): Promise<Permission[]> {
  const cached = roleCache.get(roleKey);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;

  const role = await db.role.findUnique({ where: { key: roleKey } });
  const permissions = (role?.permissions as Permission[] | undefined) ??
    [...(DEFAULT_ROLE_PERMISSIONS[roleKey] ?? [])];

  roleCache.set(roleKey, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
  return permissions;
}

export const getUserPermissions = (user: AuthUser) => getRolePermissions(user.role);

export const hasPermissionAsync = async (user: AuthUser, perm: Permission) =>
  (await getUserPermissions(user)).includes(perm);

/* ------------------------------------------------------------------ */
/* 页面级协作权限                                                       */
/* ------------------------------------------------------------------ */

export type PageAccess = "editor" | "viewer" | "none";

/** db.page.findUnique + include members 的返回形状 */
type PageWithMembers = NonNullable<
  Awaited<ReturnType<typeof loadPageWithMembers>>
>;

function loadPageWithMembers(pageId: string, userId: string) {
  return db.page.findUnique({
    where: { id: pageId },
    include: { members: { where: { userId }, select: { level: true } } },
  });
}

/**
 * 计算用户对某页面的有效访问级别:
 * - 全局持有 page:update(站点维护者)→ editor,不受 visibility 限制
 * - 协作成员按 member.level
 * - visibility = inherit 时,全局 page:read → viewer;restricted 时仅成员可见
 */
export async function resolvePageAccess(
  user: AuthUser,
  pageId: string,
): Promise<{ page: PageWithMembers; access: PageAccess }> {
  const [perms, page] = await Promise.all([
    getUserPermissions(user),
    loadPageWithMembers(pageId, user.id),
  ]);
  if (!page) throw new HTTPException(404, { message: "页面不存在" });

  const memberLevel = page.members[0]?.level as "editor" | "viewer" | undefined;

  let access: PageAccess = "none";
  if (perms.includes("page:update")) {
    access = "editor";
  } else if (memberLevel === "editor") {
    access = "editor";
  } else if (memberLevel === "viewer") {
    access = "viewer";
  } else if (page.visibility === "inherit" && perms.includes("page:read")) {
    access = "viewer";
  }

  return { page, access };
}

/** 路由内快速断言:要求对页面持有至少 viewer/editor 访问级别 */
export async function requirePageAccess(user: AuthUser, pageId: string, min: Exclude<PageAccess, "none">) {
  const { page, access } = await resolvePageAccess(user, pageId);
  const rank: Record<PageAccess, number> = { none: 0, viewer: 1, editor: 2 };
  if (rank[access] < rank[min]) {
    throw new HTTPException(404, { message: "页面不存在" });
  }
  return page;
}
