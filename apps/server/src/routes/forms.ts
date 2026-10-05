import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { formSubmitInput } from "@lc/schema";
import { db } from "../lib/db";
import { parseBody, readJson } from "../lib/http";
import { rateLimit } from "../lib/rate-limit";

export const formRoutes = new Hono();

/** 官网页面表单提交(IP 限流:5 次/分钟) */
formRoutes.post("/", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown";
  const allowed = await rateLimit(`form:${ip}`, 5, 60);
  if (!allowed) {
    throw new HTTPException(429, { message: "提交过于频繁,请稍后再试" });
  }

  const input = parseBody(formSubmitInput, await readJson(c));
  const page = await db.page.findUnique({
    where: { id: input.pageId },
    select: { id: true },
  });
  if (!page) throw new HTTPException(404, { message: "页面不存在" });

  await db.formSubmission.create({
    data: {
      pageId: input.pageId,
      componentId: input.componentId,
      data: input.data as object,
    },
  });
  return c.json({ ok: true }, 201);
});
