import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { pageSchemaSchema, type PublishedPage } from "@lc/schema";
import { db } from "../lib/db";
import { getPublishedCached, setPublishedCached } from "../lib/publish-cache";

export const publicRoutes = new Hono();

/** 已发布页面 schema(Redis 缓存 → PG 回源) */
publicRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const cached = await getPublishedCached(slug);
  if (cached) {
    c.header("X-Cache", "hit");
    return c.json(cached);
  }

  const page = await db.page.findUnique({ where: { slug } });
  if (!page || page.status !== "published" || !page.publishedSchema) {
    throw new HTTPException(404, { message: "页面不存在或未发布" });
  }

  const data: PublishedPage = {
    pageId: page.id,
    slug: page.slug!,
    title: page.title || page.name,
    schema: pageSchemaSchema.parse(page.publishedSchema),
  };
  void setPublishedCached(slug, data);
  c.header("X-Cache", "miss");
  return c.json(data);
});
