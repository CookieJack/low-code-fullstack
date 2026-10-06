import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { ACCESS_TOKEN_TTL_SEC, JWT_SECRET, REFRESH_TOKEN_TTL_DAYS } from "./config";

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

/** access token 的 JWT payload(hono/jwt 要求带索引签名) */
interface AccessPayload {
  [key: string]: unknown;
  sub: string;
  username: string;
  role: Role;
  /** token 类型,校验时要求为 access */
  typ: "access";
  exp: number;
  iat: number;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signAccessToken(user: AuthUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    typ: "access",
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SEC,
  };
  return sign(payload, JWT_SECRET);
}

export async function verifyAccessToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    if (payload.typ !== "access" || typeof payload.sub !== "string") return null;
    return { id: payload.sub, username: String(payload.username ?? ""), role: payload.role as Role };
  } catch {
    return null;
  }
}

/* ---------------- refresh token:随机原文仅出现一次,库里只存 sha256 ---------------- */

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

function toPublic(user: {
  id: string;
  username: string;
  name: string;
  role: Role;
  enabled: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    enabled: user.enabled,
    createdAt: user.createdAt.toISOString(),
  };
}

/** 签发一对 token;refresh 原文只在返回值中出现一次,库里存哈希 */
export async function issueTokens(user: {
  id: string;
  username: string;
  name: string;
  role: Role;
  enabled: boolean;
  createdAt: Date;
}) {
  const refreshToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.refreshToken.create({
    data: { tokenHash: sha256(refreshToken), userId: user.id, expiresAt },
  });
  return {
    accessToken: await signAccessToken(user),
    refreshToken,
    user: toPublic(user),
  };
}

/**
 * 校验并轮换 refresh token(一次性:旧 token 立即作废,返回新的一对)。
 * 无效/过期/用户被禁用返回 null。过期 token 顺手清理。
 */
export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = sha256(refreshToken);
  const record = await db.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) return null;

  await db.refreshToken.delete({ where: { id: record.id } });
  if (record.expiresAt < new Date()) return null;
  if (!record.user.enabled) return null;

  return issueTokens(record.user);
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    await db.refreshToken.delete({ where: { tokenHash: sha256(refreshToken) } });
  } catch {
    /* 已不存在,视为撤销成功 */
  }
}
