import type { TokenResponse, UserDto } from "@lc/schema";
import { API_BASE } from "./api";

/* token 与用户信息存 localStorage(与主题 lc-theme 同一模式);
 * SSR / 服务端导出不经过这里,公开接口在后端白名单中,无需 token */

const ACCESS_KEY = "lc-at";
const REFRESH_KEY = "lc-rt";
const USER_KEY = "lc-user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): UserDto | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserDto) : null;
  } catch {
    return null;
  }
}

export function setAuth(tokens: TokenResponse): void {
  window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
}

export function clearAuth(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** 会话过期时跳登录页,登录后回跳原地址 */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  const redirect = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.href = `/login?redirect=${redirect}`;
}

/* ---------------- 以下接口使用裸 fetch,避免与 api.ts 的 401 拦截互相触发 ---------------- */

export async function login(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string } & TokenResponse;
  if (!res.ok) {
    throw new Error(body.error ?? "登录失败");
  }
  setAuth(body);
  return body;
}

/** 用 refreshToken 换新 token 对;成功则更新本地存储 */
export async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    setAuth((await res.json()) as TokenResponse);
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    /* 服务端撤销失败也不阻塞本地登出 */
  }
  clearAuth();
}
