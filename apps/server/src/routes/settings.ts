import { Hono } from "hono";
import { siteSettingsSchema, updateSiteSettingsInput } from "@lc/schema";
import { parseBody, readJson } from "../lib/http";
import { getSiteSettings, saveSiteSettings } from "../lib/settings";
import { requirePermission, type AuthEnv } from "../middleware/auth";

export const settingsRoutes = new Hono<AuthEnv>();

/** 站点设置(匿名可读:发布页 SSR / 静态导出需要主题色) */
settingsRoutes.get("/site", async (c) => {
  return c.json(await getSiteSettings());
});

/** 更新站点设置(站点设置权限) */
settingsRoutes.put("/site", requirePermission("site:settings"), async (c) => {
  const input = parseBody(updateSiteSettingsInput, await readJson(c));
  // 在既有设置上合并:页头/页尾全局区块不随主题色更新被清空
  const current = await getSiteSettings();
  const value = siteSettingsSchema.parse({ ...current, themePrimary: input.themePrimary });
  await saveSiteSettings(value);
  return c.json(value);
});
