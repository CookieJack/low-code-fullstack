import { siteSettingsSchema, extractGlobalBlocks, type SiteSettings, type PageSchema } from "@lc/schema";
import { db } from "./db";

/* 站点设置:单行 KV,进程内短 TTL 缓存(发布页 SSR 每请求读取,避免逐次查库) */
const CACHE_TTL_MS = 15_000;
let cache: { value: SiteSettings; expiresAt: number } | null = null;

export const SITE_SETTING_KEY = "site";

export async function getSiteSettings(): Promise<SiteSettings> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const row = await db.siteSetting.findUnique({ where: { key: SITE_SETTING_KEY } });
  const value = siteSettingsSchema.parse(row?.value ?? {});
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function saveSiteSettings(value: SiteSettings): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: SITE_SETTING_KEY },
    create: { key: SITE_SETTING_KEY, value: value as object },
    update: { value: value as object },
  });
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
}

/**
 * 页面保存时同步站点级页头/页尾:页面内第一个 navbar/footer 节点的配置
 * 即为全站配置;内容未变化时不写库(编辑器自动保存高频触发)。
 */
export async function syncGlobalBlocks(schema: PageSchema): Promise<void> {
  const extracted = extractGlobalBlocks(schema);
  const current = await getSiteSettings();
  const navbarBlock = extracted.navbarBlock ?? current.navbarBlock;
  const footerBlock = extracted.footerBlock ?? current.footerBlock;
  if (
    JSON.stringify(navbarBlock) === JSON.stringify(current.navbarBlock) &&
    JSON.stringify(footerBlock) === JSON.stringify(current.footerBlock)
  ) {
    return;
  }
  await saveSiteSettings({ ...current, navbarBlock, footerBlock });
}
