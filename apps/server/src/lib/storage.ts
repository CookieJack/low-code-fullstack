/**
 * 图片存储抽象:local(本地磁盘,默认,零配置)/ s3(S3 兼容对象存储:
 * AWS S3 / 阿里云 OSS / 腾讯云 COS / MinIO 等,通过 S3_ENDPOINT 指向)。
 *
 * 本地驱动对外暴露相对路径 /api/uploads/:key,由 uploads 路由匿名读取;
 * S3 驱动直接返回公网绝对地址(建议配置 S3_PUBLIC_BASE_URL 走 CDN)。
 */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type StorageDriver = "local" | "s3";

export const STORAGE_DRIVER: StorageDriver =
  process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";

export const UPLOAD_MAX_BYTES =
  Math.max(1, Number(process.env.UPLOAD_MAX_MB ?? 10)) * 1024 * 1024;

const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads"),
);

/* ---------------- 图片类型白名单(扩展名 → MIME,存储时以此为准,不信任请求头) ---------------- */

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
};

const EXT_BY_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_BY_EXT).map(([ext, mime]) => [mime, ext]),
);

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXT_BY_MIME).join(", ");

/** 生成上传 key:20261006/<随机id>-<文件名 slug>.<ext>;同时决定存储用的 MIME */
export function buildUploadKey(
  filename: string,
  declaredMime: string,
): { key: string; contentType: string } | null {
  const rawExt = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  const ext = MIME_BY_EXT[rawExt] ? rawExt : EXT_BY_MIME[declaredMime];
  if (!ext) return null;

  const base =
    filename
      .slice(0, filename.length - (rawExt ? rawExt.length + 1 : 0))
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "image";

  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return {
    key: `${day}/${randomBytes(6).toString("hex")}-${base}.${ext}`,
    contentType: MIME_BY_EXT[ext],
  };
}

/** 读取 key 的合法形态(防目录穿越),并解析出 MIME */
function parseStoredKey(key: string): { safePath: string; contentType: string } | null {
  if (!/^\d{8}\/[0-9a-z][0-9a-z._-]{0,120}$/.test(key)) return null;
  const ext = key.split(".").pop() ?? "";
  const contentType = MIME_BY_EXT[ext];
  if (!contentType) return null;
  const safePath = path.join(UPLOAD_DIR, key);
  if (!safePath.startsWith(UPLOAD_DIR + path.sep)) return null;
  return { safePath, contentType };
}

/* ---------------- S3 客户端(惰性初始化,local 驱动不加载) ---------------- */

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  const bucket = process.env.S3_BUCKET;
  if (!bucket || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error(
      "S3 存储驱动缺少配置:需要 S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY",
    );
  }
  const endpoint = process.env.S3_ENDPOINT;
  s3Client = new S3Client({
    ...(endpoint ? { endpoint } : {}),
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    // MinIO / OSS 等自建端点默认 path-style,AWS 走虚拟主机式
    forcePathStyle: endpoint
      ? process.env.S3_FORCE_PATH_STYLE !== "false"
      : process.env.S3_FORCE_PATH_STYLE === "true",
  });
  s3Bucket = bucket;
  return s3Client;
}

let s3Bucket = "";

function s3PublicBase(): string {
  const explicit = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/+$/, "");
  if (endpoint) return `${endpoint}/${s3Bucket}`;
  return `https://${s3Bucket}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com`;
}

/* ---------------- 对外 API ---------------- */

export async function putUpload(key: string, data: Buffer, contentType: string): Promise<void> {
  if (STORAGE_DRIVER === "s3") {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return;
  }
  const full = path.join(UPLOAD_DIR, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

/** 上传后的对外地址:local 相对路径(同源/nginx 分流),S3 公网绝对地址 */
export function uploadPublicUrl(key: string): string {
  if (STORAGE_DRIVER === "s3") return `${s3PublicBase()}/${key}`;
  return `/api/uploads/${key}`;
}

/** 读取本地存储的图片(仅 local 驱动;找不到或 key 非法返回 null) */
export async function readUpload(
  key: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const parsed = parseStoredKey(key);
  if (!parsed) return null;
  try {
    return { data: await readFile(parsed.safePath), contentType: parsed.contentType };
  } catch {
    return null;
  }
}

if (STORAGE_DRIVER === "local") {
  console.info(`[storage] driver=local dir=${UPLOAD_DIR}`);
} else {
  console.info(
    `[storage] driver=s3 bucket=${process.env.S3_BUCKET ?? "(未配置!)"} region=${process.env.S3_REGION || "us-east-1"}`,
  );
}
