import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createTemplateInput, updateTemplateInput } from "@lc/schema";
import { db } from "../lib/db";
import { parseBody, readJson } from "../lib/http";
import { requirePermission, type AuthEnv } from "../middleware/auth";

export const templateRoutes = new Hono<AuthEnv>();

const toDto = (t: {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string | null;
  enabled: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  category: t.category,
  thumbnail: t.thumbnail,
  enabled: t.enabled,
  useCount: t.useCount,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
});

/** 模板列表(仅启用中):新建页面弹窗选用 */
templateRoutes.get("/", requirePermission("page:create"), async (c) => {
  const list = await db.pageTemplate.findMany({
    where: { enabled: true },
    orderBy: { createdAt: "desc" },
  });
  return c.json(list.map(toDto));
});

/** 模板全量列表(含停用):后台模板库管理页 */
templateRoutes.get("/manage", requirePermission("template:manage"), async (c) => {
  const list = await db.pageTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return c.json(list.map(toDto));
});

async function assertNameFree(name: string, excludeId?: string) {
  const dup = await db.pageTemplate.findFirst({
    where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (dup) throw new HTTPException(409, { message: "已存在同名模板" });
}

/** 新建模板:内容为完整 PageSchema 快照 */
templateRoutes.post("/", requirePermission("template:manage"), async (c) => {
  const input = parseBody(createTemplateInput, await readJson(c));
  await assertNameFree(input.name);

  const created = await db.pageTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      category: input.category,
      thumbnail: input.thumbnail,
      schema: input.schema as object,
    },
  });
  return c.json(toDto(created), 201);
});

/** 更新模板元信息(名称/分类/描述/封面/启停);内容修改请删除重建 */
templateRoutes.put("/:id", requirePermission("template:manage"), async (c) => {
  const id = c.req.param("id");
  const input = parseBody(updateTemplateInput, await readJson(c));
  const exists = await db.pageTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HTTPException(404, { message: "模板不存在" });
  if (input.name !== undefined) await assertNameFree(input.name, id);

  const updated = await db.pageTemplate.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
  });
  return c.json(toDto(updated));
});

/** 删除模板:已用它创建的页面持有的是快照,不受影响 */
templateRoutes.delete("/:id", requirePermission("template:manage"), async (c) => {
  const id = c.req.param("id");
  const exists = await db.pageTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HTTPException(404, { message: "模板不存在" });
  await db.pageTemplate.delete({ where: { id } });
  return c.json({ ok: true });
});
