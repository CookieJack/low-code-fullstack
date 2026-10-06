import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAnyPermission, type AuthEnv } from "../middleware/auth";
import {
  ACCEPTED_IMAGE_TYPES,
  STORAGE_DRIVER,
  UPLOAD_MAX_BYTES,
  buildUploadKey,
  putUpload,
  readUpload,
  uploadPublicUrl,
} from "../lib/storage";

export const uploadRoutes = new Hono<AuthEnv>();

/**
 * 上传图片(multipart,字段名 file)。
 * 权限复用页面编辑权限:能编辑/新建页面的人才需要向平台写入文件;
 * 页面级协作编辑者仍可粘贴外部 URL。
 */
uploadRoutes.post("/", requireAnyPermission(["page:create", "page:update"]), async (c) => {
  const declaredLength = Number(c.req.header("content-length") ?? 0);
  if (declaredLength > UPLOAD_MAX_BYTES + 64 * 1024) {
    throw new HTTPException(413, {
      message: `图片不能超过 ${Math.floor(UPLOAD_MAX_BYTES / 1024 / 1024)}MB`,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    throw new HTTPException(400, { message: "请求必须是 multipart/form-data" });
  }
  const file = body.file;
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: '缺少文件字段 "file"' });
  }
  if (file.size === 0) {
    throw new HTTPException(400, { message: "文件为空" });
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new HTTPException(413, {
      message: `图片不能超过 ${Math.floor(UPLOAD_MAX_BYTES / 1024 / 1024)}MB`,
    });
  }

  const built = buildUploadKey(file.name, file.type);
  if (!built) {
    throw new HTTPException(415, { message: `仅支持图片格式:${ACCEPTED_IMAGE_TYPES}` });
  }

  const data = Buffer.from(await file.arrayBuffer());
  await putUpload(built.key, data, built.contentType);
  return c.json(
    { url: uploadPublicUrl(built.key), key: built.key, contentType: built.contentType, size: file.size },
    201,
  );
});

/** 读取本地存储的图片:发布页/静态站匿名可见,内容类型由扩展名白名单决定 */
if (STORAGE_DRIVER === "local") {
  uploadRoutes.get("/:key{.+}", async (c) => {
    const hit = await readUpload(c.req.param("key"));
    if (!hit) throw new HTTPException(404, { message: "文件不存在" });
    return c.body(new Uint8Array(hit.data), 200, {
      "Content-Type": hit.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // 直接访问 svg 等文件时禁掉脚本执行(页面内 <img> 引用不受影响)
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    });
  });
}
