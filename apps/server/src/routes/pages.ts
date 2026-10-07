import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Prisma } from "@prisma/client";
import {
  createPageInput,
  updatePageInput,
  publishInput,
  upsertPageMemberInput,
  bindPageDomainInput,
  pageSchemaSchema,
  createEmptyPageSchema,
  applyGlobalBlocks,
  type NodeSchema,
  type PageSchema,
  type PublishedPage,
} from "@lc/schema";
import { db } from "../lib/db";
import { parseBody, readJson } from "../lib/http";
import { invalidatePublished, setPublishedCached } from "../lib/publish-cache";
import { invalidateDomain } from "../lib/domain-cache";
import { getSiteSettings, syncGlobalBlocks } from "../lib/settings";
import { landingTemplate } from "../templates";
import { requirePermission, type AuthEnv } from "../middleware/auth";
import {
  getUserPermissions,
  resolvePageAccess,
  type PageAccess,
} from "../lib/access";

export const pagesRoutes = new Hono<AuthEnv>();

/** 发布页占根路径(/{slug}),这些 slug 会被 web 端静态路由/框架路径遮蔽,不允许占用 */
const RESERVED_SLUGS = ["dashboard", "api", "_next", "favicon.ico"] as const;

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

/* ------------------------------------------------------------------ */
/* 页面关系图(Storyboard 视图)                                          */
/* ------------------------------------------------------------------ */

type LinkRef = { prop: string; href: string };

/** 递归收集 props 里的 href:key 为 href 或以 Href 结尾的字符串值(自动覆盖各物料的跳转配置) */
function collectHrefs(props: unknown, path: string, out: LinkRef[]): void {
  if (Array.isArray(props)) {
    for (const item of props) collectHrefs(item, path, out);
    return;
  }
  if (!props || typeof props !== "object") return;
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    const isHref = key === "href" || key.endsWith("Href");
    const childPath = path ? `${path}.${key}` : key;
    if (isHref && typeof value === "string") {
      out.push({ prop: childPath, href: value });
    } else {
      collectHrefs(value, childPath, out);
    }
  }
}

/** 站内跳转 href 归一化为路径;外链/协议链接/锚点/相对路径返回 null */
function normalizeInternalHref(raw: string): string | null {
  const href = raw.trim();
  if (!href || href.startsWith("#") || !href.startsWith("/")) return null;
  if (/^(https?:)?\/\//i.test(href) || /^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  const path = href.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return path === "" ? "/home" : path;
}

const isReservedPath = (path: string) =>
  (RESERVED_SLUGS as readonly string[]).includes(path.slice(1).split("/")[0]);

/**
 * 页面关系图:可见页面为节点;连线由各页 schema 里的站内 href × 全站 slug
 * 自动推导(只读);指向不存在页面的 href 输出为死链占位节点。
 */
pagesRoutes.get("/graph", async (c) => {
  const user = c.get("authUser");
  const perms = await getUserPermissions(user);
  const isStaff = perms.includes("page:update");
  const visible = await db.page.findMany({
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

  // 目标匹配用全量 slug;命中但当前用户不可见的页面直接丢边,不泄露受限页存在性
  const allSlugs = await db.page.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
  });
  const slugSet = new Set(allSlugs.map((p) => `/${p.slug}`));
  const visibleByPath = new Map<string, string>();
  for (const p of visible) if (p.slug) visibleByPath.set(`/${p.slug}`, p.id);

  const pages = visible.map((p) => ({
    ...metaOf(p),
    visibility: p.visibility,
    access: accessOf(perms, p),
  }));

  const edgeMap = new Map<
    string,
    { source: string; target: string; origins: { materialType: string; prop: string }[] }
  >();
  const originKeys = new Map<string, Set<string>>();
  const placeholderPaths = new Set<string>();

  const addLink = (sourceId: string, targetId: string, materialType: string, prop: string) => {
    const key = `${sourceId}->${targetId}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, { source: sourceId, target: targetId, origins: [] });
      originKeys.set(key, new Set());
    }
    const originKey = `${materialType}.${prop}`;
    const seen = originKeys.get(key)!;
    if (!seen.has(originKey)) {
      seen.add(originKey);
      edgeMap.get(key)!.origins.push({ materialType, prop });
    }
  };

  for (const page of visible) {
    const parsed = pageSchemaSchema.safeParse(page.schema);
    if (!parsed.success) continue;
    const walkNodes = (nodes: NodeSchema[]) => {
      for (const node of nodes) {
        const refs: LinkRef[] = [];
        collectHrefs(node.props, "", refs);
        for (const ref of refs) {
          const path = normalizeInternalHref(ref.href);
          if (!path || isReservedPath(path)) continue;
          if (page.slug && path === `/${page.slug}`) continue; // 自环跳过
          const targetId = visibleByPath.get(path);
          if (targetId) {
            addLink(page.id, targetId, node.type, ref.prop);
          } else if (!slugSet.has(path)) {
            placeholderPaths.add(path);
            addLink(page.id, `placeholder:${path}`, node.type, ref.prop);
          }
        }
        if (node.children?.length) walkNodes(node.children);
      }
    };
    walkNodes(parsed.data.nodes);
  }

  return c.json({
    pages,
    edges: [...edgeMap.values()],
    placeholders: [...placeholderPaths].map((path) => ({
      id: `placeholder:${path}`,
      href: path,
    })),
  });
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
  return c.json(await toDetail(page, access), 201);
});

/** 页面详情(协作成员可见受限页;无访问一律 404,不泄露存在性) */
pagesRoutes.get("/:id", async (c) => {
  const { page, access } = await resolvePageAccess(c.get("authUser"), c.req.param("id"));
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });
  return c.json(await toDetail(page, access));
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

  // 页头/页尾为站点级配置:任一页面保存即同步全站(编辑器/发布页实时生效)
  if (input.schema !== undefined) {
    await syncGlobalBlocks(input.schema);
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
  return c.json(await toDetail(updated, access));
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
  return c.json(await toDetail(copy, access), 201);
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
  if ((RESERVED_SLUGS as readonly string[]).includes(input.slug)) {
    throw new HTTPException(409, { message: `路径 /${input.slug} 为系统保留,请换一个路径` });
  }
  const clash = await db.page.findUnique({ where: { slug: input.slug } });
  if (clash && clash.id !== page.id) {
    throw new HTTPException(409, { message: `路径 /${input.slug} 已被其他页面占用` });
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

  return c.json({ ok: true, slug: input.slug, url: `/${input.slug}` });
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
/* 自定义域名绑定(需全局 site:domain)                                   */
/* ------------------------------------------------------------------ */

const DOMAIN_SELECT = {
  id: true,
  domain: true,
  createdAt: true,
} as const;

const domainToDto = (d: { id: string; domain: string; createdAt: Date }) => ({
  id: d.id,
  domain: d.domain,
  createdAt: d.createdAt.toISOString(),
});

/** 域名绑定列表 */
pagesRoutes.get("/:id/domains", requirePermission("site:domain"), async (c) => {
  const { page, access } = await resolvePageAccess(c.get("authUser"), c.req.param("id"));
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });

  const domains = await db.pageDomain.findMany({
    where: { pageId: page.id },
    orderBy: { createdAt: "asc" },
    select: DOMAIN_SELECT,
  });
  return c.json(domains.map(domainToDto));
});

/** 绑定域名(一个域名全局只能绑定一个页面) */
pagesRoutes.post("/:id/domains", requirePermission("site:domain"), async (c) => {
  const { page, access } = await resolvePageAccess(c.get("authUser"), c.req.param("id"));
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });

  const input = parseBody(bindPageDomainInput, await readJson(c));
  const clash = await db.pageDomain.findUnique({ where: { domain: input.domain } });
  if (clash) {
    throw new HTTPException(409, { message: `域名 ${input.domain} 已绑定到其他页面` });
  }

  const binding = await db.pageDomain.create({
    data: { domain: input.domain, pageId: page.id },
    select: DOMAIN_SELECT,
  });
  await invalidateDomain(input.domain);
  return c.json(domainToDto(binding), 201);
});

/** 解绑域名 */
pagesRoutes.delete("/:id/domains/:domainId", requirePermission("site:domain"), async (c) => {
  const { page, access } = await resolvePageAccess(c.get("authUser"), c.req.param("id"));
  if (access === "none") throw new HTTPException(404, { message: "页面不存在" });

  const binding = await db.pageDomain.findFirst({
    where: { id: c.req.param("domainId"), pageId: page.id },
    select: { id: true, domain: true },
  });
  if (!binding) throw new HTTPException(404, { message: "绑定不存在" });
  await db.pageDomain.delete({ where: { id: binding.id } });
  await invalidateDomain(binding.domain);
  return c.json({ ok: true });
});

/* ------------------------------------------------------------------ */

async function toDetail(
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
  // 草稿视图统一应用站点级页头/页尾:编辑器打开任一页面看到的都是最新全局配置
  const settings = await getSiteSettings();
  return {
    ...metaOf(page),
    visibility: page.visibility,
    access,
    schema: applyGlobalBlocks(pageSchemaSchema.parse(page.schema), settings),
    publishedSchema: page.publishedSchema
      ? pageSchemaSchema.parse(page.publishedSchema)
      : null,
  };
}
