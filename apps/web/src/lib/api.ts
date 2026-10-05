import type { PageDetail, PageMeta, PublishedPage } from "@lc/schema";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* 非 JSON 响应 */
    }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
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
export type { PageDetail, PageMeta, PublishedPage };
