import { cache } from "react";
import type { SiteSettings } from "@lc/schema";

const INTERNAL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

/**
 * 站点设置服务端读取:根布局注入后台品牌色、发布页 SSR 共用。
 * React cache 保证同一请求只发一次;失败按未配置处理(默认品牌色)。
 */
export const fetchSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const res = await fetch(`${INTERNAL}/api/settings/site`, { cache: "no-store" });
    if (!res.ok) return { themePrimary: null, navbarBlock: null, footerBlock: null };
    return (await res.json()) as SiteSettings;
  } catch {
    return { themePrimary: null, navbarBlock: null, footerBlock: null };
  }
});
