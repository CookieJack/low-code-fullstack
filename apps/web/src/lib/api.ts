import type { PageDetail, PageMeta, PublishedPage, Role, UserDto } from "@lc/schema";
import { clearAuth, getAccessToken, redirectToLogin, refreshSession } from "./auth-client";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/* 登录/刷新本身走 auth-client 的裸 fetch,这里跳过刷新逻辑避免死循环 */
const isAuthPath = (path: string) =>
  path.startsWith("/api/auth/login") || path.startsWith("/api/auth/refresh");

/* 并发 401 时共享同一次刷新,避免多个请求同时打 /api/auth/refresh */
let refreshing: Promise<boolean> | null = null;
function refreshOnce(): Promise<boolean> {
  refreshing ??= refreshSession().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function buildRequest(path: string, init?: RequestInit): Promise<RequestInit> {
  const { headers, ...rest } = init ?? {};
  const token = getAccessToken();
  return {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((headers as Record<string, string> | undefined) ?? {}),
    },
  };
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await fetch(`${API_BASE}${path}`, await buildRequest(path, init));

  // access token 过期:静默刷新后重试一次;刷新失败视为会话结束
  if (res.status === 401 && !isAuthPath(path) && getAccessToken()) {
    if (await refreshOnce()) {
      res = await fetch(`${API_BASE}${path}`, await buildRequest(path, init));
    } else {
      clearAndRedirect();
      throw new ApiError(401, "登录已失效，请重新登录");
    }
  }

  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* 非 JSON 响应 */
    }
    if (res.status === 401) {
      clearAndRedirect();
    }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

function clearAndRedirect() {
  clearAuth();
  redirectToLogin();
}

export const listPages = () => api<PageMeta[]>("/api/pages");
export const getPage = (id: string) => api<PageDetail>(`/api/pages/${id}`);
export const createPage = (name: string, template: "blank" | "landing") =>
  api<PageDetail>("/api/pages", { method: "POST", body: JSON.stringify({ name, template }) });
export const updatePage = (
  id: string,
  data: { name?: string; title?: string; schema?: unknown },
) => api<PageDetail>(`/api/pages/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deletePage = (id: string) =>
  api<{ ok: true }>(`/api/pages/${id}`, { method: "DELETE" });
export const duplicatePage = (id: string) =>
  api<PageDetail>(`/api/pages/${id}/duplicate`, { method: "POST" });
export const publishPage = (id: string, slug: string) =>
  api<{ ok: true; slug: string; url: string }>(`/api/pages/${id}/publish`, {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
export const unpublishPage = (id: string) =>
  api<{ ok: true }>(`/api/pages/${id}/unpublish`, { method: "POST" });
export const getSubmissions = (id: string) =>
  api<{ id: string; componentId: string; data: Record<string, string>; createdAt: string }[]>(
    `/api/pages/${id}/submissions`,
  );
export const getMe = () => api<UserDto>("/api/auth/me");
export const listUsers = () => api<UserDto[]>("/api/users");
export const createUser = (data: {
  username: string;
  password: string;
  name?: string;
  role: Role;
}) => api<UserDto>("/api/users", { method: "POST", body: JSON.stringify(data) });
export const updateUser = (
  id: string,
  data: { name?: string; role?: Role; enabled?: boolean; password?: string },
) => api<UserDto>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteUser = (id: string) =>
  api<{ ok: true }>(`/api/users/${id}`, { method: "DELETE" });
export type { PageDetail, PageMeta, PublishedPage };
