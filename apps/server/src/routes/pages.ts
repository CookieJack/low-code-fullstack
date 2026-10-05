import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Prisma } from "@prisma/client";
import {
  createPageInput,
  updatePageInput,
  publishInput,
  pageSchemaSchema,
  createEmptyPageSchema,
  type PageSchema,
  type PublishedPage,
} from "@lc/schema";
import { db } from "../lib/db";
import { parseBody, readJson } from "../lib/http";
import { invalidatePublished, setPublishedCached } from "../lib/publish-cache";
import { landingTemplate } from "../templates";

export const pagesRoutes = new Hono();

const META_SELECT = {
  id: true,
  name: true,
  slug: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toDetail(page: {
  id: string;
  name: string;
  slug: string | null;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  schema: unknown;
  publishedSchema: unknown;
}) {
  return {
    ...page,
    schema: pageSchemaSchema.parse(page.schema),
    publishedSchema: page.publishedSchema
      ? pageSchemaSchema.parse(page.publishedSchema)
      : null,
  };
}

/** 页面列表 */
pagesRoutes.get("/", async (c) => {
  const list = await db.page.findMany({
    orderBy: { updatedAt: "desc" },
    select: META_SELECT,
  });
  return c.json(list);
});

/** 新建页面 */
pagesRoutes.post("/", async (c) => {
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
  return c.json(toDetail(page), 201);
});

/** 页面详情 */
pagesRoutes.get("/:id", async (c) => {
  const page = await db.page.findUnique({ where: { id: c.req.param("id") } });
  if (!page) throw new HTTPException(404, { message: "页面不存在" });
  return c.json(toDetail(page));
});

/** 更新页面(草稿) */
pagesRoutes.put("/:id", async (c) => {
  const input = parseBody(updatePageInput, await readJson(c));
  const exists = await db.page.findUnique({
    where: { id: c.req.param("id") },
    select: { id: true },
  });
  if (!exists) throw new HTTPException(404, { message: "页面不存在" });
  const page = await db.page.update({
    where: { id: exists.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.schema !== undefined ? { schema: input.schema as object } : {}),
    },
  });
  return c.json(toDetail(page));
});

/** 删除页面 */
pagesRoutes.delete("/:id", async (c) => {
  const page = await db.page.findUnique({
    where: { id: c.req.param("id") },
    select: { id: true, slug: true },
  });
  if (!page) throw new HTTPException(404, { message: "页面不存在" });
  await db.page.delete({ where: { id: page.id } });
  await invalidatePublished(page.slug);
  return c.json({ ok: true });
});

/** 复制页面 */
pagesRoutes.post("/:id/duplicate", async (c) => {
  const source = await db.page.findUnique({ where: { id: c.req.param("id") } });
  if (!source) throw new HTTPException(404, { message: "页面不存在" });
  const copy = await db.page.create({
    data: {
      name: `${source.name} 副本`,
      title: source.title,
      schema: source.schema as object,
      status: "draft",
    },
  });
  return c.json(toDetail(copy), 201);
});

/** 发布:快照当前草稿 → publishedSchema,写 Redis 缓存 */
pagesRoutes.post("/:id/publish", async (c) => {
  const input = parseBody(publishInput, await readJson(c));
  const page = await db.page.findUnique({ where: { id: c.req.param("id") } });
  if (!page) throw new HTTPException(404, { message: "页面不存在" });

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

/** 下线发布 */
pagesRoutes.post("/:id/unpublish", async (c) => {
  const page = await db.page.findUnique({
    where: { id: c.req.param("id") },
    select: { id: true, slug: true },
  });
  if (!page) throw new HTTPException(404, { message: "页面不存在" });
  await db.page.update({
    where: { id: page.id },
    data: { status: "draft", publishedSchema: Prisma.DbNull },
  });
  await invalidatePublished(page.slug);
  return c.json({ ok: true });
});

/** 表单提交数据 */
pagesRoutes.get("/:id/submissions", async (c) => {
  const exists = await db.page.findUnique({
    where: { id: c.req.param("id") },
    select: { id: true },
  });
  if (!exists) throw new HTTPException(404, { message: "页面不存在" });
  const list = await db.formSubmission.findMany({
    where: { pageId: exists.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return c.json(list);
});
