import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Prisma } from "@prisma/client";
import {
  createPageInput,
  updatePageInput,
  publishInput,
  upsertPageMemberInput,
  pageSchemaSchema,
  createEmptyPageSchema,
  type PageSchema,
  type PublishedPage,
} from "@lc/schema";
import { db } from "../lib/db";
import { parseBody, readJson } from "../lib/http";
import { invalidatePublished, setPublishedCached } from "../lib/publish-cache";
import { landingTemplate } from "../templates";
import { requirePermission, type AuthEnv } from "../middleware/auth";
import {
  getUserPermissions,
  resolvePageAccess,
  type PageAccess,
} from "../lib/access";

export const pagesRoutes = new Hono<AuthEnv>();

const META_SELECT = {
  id: true,
  name: true,
  slug: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const toIso = (d: Date) => d.toISOString();

function metaOf(page: {
  id: string;
  name: string;
  slug: string | null;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: page.id,
    name: page.name,
    slug: page.slug,
    title: page.title,
    status: page.status,
    createdAt: toIso(page.createdAt),
    updatedAt: toIso(page.updatedAt),
  };
}

/** 列表行内快速判定访问级别(与 lib/access.resolvePageAccess 同规则) */
function accessOf(
  perms: readonly string[],
  page: { visibility: string; members: { level: string }[] },
): PageAccess {
  if (perms.includes("page:update") || page.members[0]?.level === "editor") return "editor";
  if (page.members.length > 0) return "viewer";
  if (page.visibility === "inherit" && perms.includes("page:read")) return "viewer";
  return "none";
}

/**
 * 页面列表:站点维护者(page:update)可见全部;
 * 其余用户可见「继承可见性且有全局 page:read」∪「自己是协作成员」的页面。
 */
pagesRoutes.get("/", async (c) => {
  const user = c.get("authUser");
  const perms = await getUserPermissions(user);
  const isStaff = perms.includes("page:update");
  const pages = await db.page.findMany({
    where: isStaff
      ? undefined
      : {
          OR: [
            ...(perms.includes("page:read") ? [{ visibility: "inherit" }] : []),
            { members: { some: { userId: user.id } } },
          ],
        },
    orderBy: { updatedAt: "desc" },
    include: { members: { where: { userId: user.id }, select: { level: true } } },
  });
  return c.json(
    pages.map((p) => ({
      ...metaOf(p),
      visibility: p.visibility,
      access: accessOf(perms, p),
    })),
  );
});

/** 新建页面 */
pagesRoutes.post("/", requirePermission("page:create"), async (c) => {
  const input = parseBody(createPageInput, await readJson(c));
  const schema: PageSchema =
    input.template === "landing"
      ? landingTemplate(input.name)
      : createEmptyPageSchema(input.name);
  const page = await db.page.create({
    data: {
      name: input.name,
      title: input.name,
      schema: schema as object,
    },
  });
  const access = (await resolvePageAccess(c.get("authUser"), page.id)).access;
  return c.json(toDetail(page, access), 201);
});

/** 页面详情(协作成员可见受限页;无访问一律 404,不泄露存在性) */
pagesRoutes.get("/:id", async (c) => {
  const { page, access } = await resolvePageAccess(c.get("authUser"), c.req.param("id"));
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });
  return c.json(toDetail(page, access));
});

/** 更新页面(草稿内容);可见性调整需要全局 page:share */
pagesRoutes.put("/:id", async (c) => {
  const user = c.get("authUser");
  const { page, access } = await resolvePageAccess(user, c.req.param("id"));
  if (access !== "editor") throw new HTTPException(404, { message: "页面不存在" });

  const input = parseBody(updatePageInput, await readJson(c));
  if (input.visibility !== undefined) {
    const perms = await getUserPermissions(user);
    if (!perms.includes("page:share")) {
      throw new HTTPException(403, { message: "没有执行此操作的权限" });
    }
  }

  const updated = await db.page.update({
    where: { id: page.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.schema !== undefined ? { schema: input.schema as object } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
    },
  });
  return c.json(toDetail(updated, access));
});

/** 删除页面(仅全局 page:delete) */
pagesRoutes.delete("/:id", requirePermission("page:delete"), async (c) => {
  const page = await db.page.findUnique({
    where: { id: c.req.param("id") },
    select: { id: true, slug: true },
  });
  if (!page) throw new HTTPException(404, { message: "页面不存在" });
  await db.page.delete({ where: { id: page.id } });
  await invalidatePublished(page.slug);
  return c.json({ ok: true });
});

/** 复制页面(需要源页可读;协作成员不随副本复制) */
pagesRoutes.post("/:id/duplicate", requirePermission("page:create"), async (c) => {
  const source = await db.page.findUnique({ where: { id: c.req.param("id") } });
  if (!source) throw new HTTPException(404, { message: "页面不存在" });
  const { access } = await resolvePageAccess(c.get("authUser"), source.id);
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });

  const copy = await db.page.create({
    data: {
      name: `${source.name} 副本`,
      title: source.title,
      schema: source.schema as object,
      status: "draft",
    },
  });
  return c.json(toDetail(copy, access), 201);
});

/** 发布:全局 page:publish,或对该页拥有编辑级协作权限 */
pagesRoutes.post("/:id/publish", async (c) => {
  const user = c.get("authUser");
  const { page, access } = await resolvePageAccess(user, c.req.param("id"));
  const perms = await getUserPermissions(user);
  if (access !== "editor" && !perms.includes("page:publish")) {
    throw new HTTPException(404, { message: "页面不存在" });
  }

  const input = parseBody(publishInput, await readJson(c));
  const clash = await db.page.findUnique({ where: { slug: input.slug } });
  if (clash && clash.id !== page.id) {
    throw new HTTPException(409, { message: `路径 /p/${input.slug} 已被其他页面占用` });
  }

  const publishedSchema = page.schema as object;
  const updated = await db.page.update({
    where: { id: page.id },
    data: {
      slug: input.slug,
      publishedSchema,
      status: "published",
    },
  });

  const data: PublishedPage = {
    pageId: updated.id,
    slug: input.slug,
    title: updated.title || updated.name,
    schema: pageSchemaSchema.parse(publishedSchema),
  };
  await invalidatePublished(page.slug);
  await setPublishedCached(input.slug, data);

  return c.json({ ok: true, slug: input.slug, url: `/p/${input.slug}` });
});

/** 下线发布:全局 page:unpublish,或对该页拥有编辑级协作权限 */
pagesRoutes.post("/:id/unpublish", async (c) => {
  const user = c.get("authUser");
  const { page, access } = await resolvePageAccess(user, c.req.param("id"));
  const perms = await getUserPermissions(user);
  if (access !== "editor" && !perms.includes("page:unpublish")) {
    throw new HTTPException(404, { message: "页面不存在" });
  }

  await db.page.update({
    where: { id: page.id },
    data: { status: "draft", publishedSchema: Prisma.DbNull },
  });
  await invalidatePublished(page.slug);
  return c.json({ ok: true });
});

/** 表单提交数据:全局 submission:read,或为该页协作成员 */
pagesRoutes.get("/:id/submissions", async (c) => {
  const user = c.get("authUser");
  const { page, access } = await resolvePageAccess(user, c.req.param("id"));
  const perms = await getUserPermissions(user);
  if (access === "none" && !perms.includes("submission:read")) {
    throw new HTTPException(404, { message: "页面不存在" });
  }

  const list = await db.formSubmission.findMany({
    where: { pageId: page.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return c.json(list);
});

/* ------------------------------------------------------------------ */
/* 页面协作成员(需全局 page:share)                                      */
/* ------------------------------------------------------------------ */

const MEMBER_SELECT = {
  id: true,
  userId: true,
  level: true,
  user: { select: { username: true, name: true } },
} as const;

const memberToDto = (m: {
  id: string;
  userId: string;
  level: string;
  user: { username: string; name: string };
}) => ({
  id: m.id,
  userId: m.userId,
  username: m.user.username,
  name: m.user.name,
  level: m.level,
});

/** 协作成员列表 */
pagesRoutes.get("/:id/members", requirePermission("page:share"), async (c) => {
  const { page, access } = await resolvePageAccess(c.get("authUser"), c.req.param("id"));
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });

  const members = await db.pageMember.findMany({
    where: { pageId: page.id },
    orderBy: { createdAt: "asc" },
    select: MEMBER_SELECT,
  });
  return c.json(members.map(memberToDto));
});

/** 添加/更新协作成员 */
pagesRoutes.post("/:id/members", requirePermission("page:share"), async (c) => {
  const { page, access } = await resolvePageAccess(c.get("authUser"), c.req.param("id"));
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });

  const input = parseBody(upsertPageMemberInput, await readJson(c));
  const target = await db.user.findUnique({ where: { id: input.userId }, select: { id: true } });
  if (!target) throw new HTTPException(404, { message: "用户不存在" });

  const member = await db.pageMember.upsert({
    where: { pageId_userId: { pageId: page.id, userId: input.userId } },
    create: { pageId: page.id, userId: input.userId, level: input.level },
    update: { level: input.level },
    select: MEMBER_SELECT,
  });
  return c.json(memberToDto(member));
});

/** 移除协作成员 */
pagesRoutes.delete("/:id/members/:userId", requirePermission("page:share"), async (c) => {
  const { page, access } = await resolvePageAccess(c.get("authUser"), c.req.param("id"));
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });

  await db.pageMember.deleteMany({
    where: { pageId: page.id, userId: c.req.param("userId") },
  });
  return c.json({ ok: true });
});

/* ------------------------------------------------------------------ */

function toDetail(
  page: {
    id: string;
    name: string;
    slug: string | null;
    title: string;
    status: string;
    visibility: string;
    createdAt: Date;
    updatedAt: Date;
    schema: unknown;
    publishedSchema: unknown;
  },
  access: PageAccess,
) {
  return {
    ...metaOf(page),
    visibility: page.visibility,
    access,
    schema: pageSchemaSchema.parse(page.schema),
    publishedSchema: page.publishedSchema
      ? pageSchemaSchema.parse(page.publishedSchema)
      : null,
  };
}
