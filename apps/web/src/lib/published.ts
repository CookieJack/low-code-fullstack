import { cache } from "react";
import type { PublishedPage } from "@lc/schema";

const INTERNAL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

/** 约定:slug 为 home 的已发布页面即站点首页,直接挂在平台根路径 / */
export const HOME_SLUG = "home";

export const getPublished = cache(async (slug: string): Promise<PublishedPage | null> => {
  try {
    const res = await fetch(`${INTERNAL}/api/p/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublishedPage;
  } catch {
    return null;
  }
});
