import { HTTPException } from "hono/http-exception";
import type { ZodType } from "zod";

/** zod 校验失败 → 400(取第一条错误信息) */
export function parseBody<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? "参数错误";
    throw new HTTPException(400, { message: msg });
  }
  return result.data;
}

export async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "请求体必须是合法 JSON" });
  }
}
