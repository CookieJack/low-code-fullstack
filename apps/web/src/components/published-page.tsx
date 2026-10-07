import { Renderer } from "@lc/renderer";
import { applyGlobalBlocks, type PublishedPage } from "@lc/schema";
import { fetchSiteSettings } from "@/lib/settings-server";

/** 发布页正文:站点设置换肤 + 静态渲染;currentPath 用规范路径 /{slug},导航栏据此高亮当前菜单项 */
export async function PublishedPageView({ data }: { data: PublishedPage }) {
  const settings = await fetchSiteSettings();
  return (
    <Renderer
      schema={applyGlobalBlocks(data.schema, settings)}
      mode="static"
      themePrimary={settings.themePrimary}
      context={{
        pageId: data.pageId,
        formApiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
        currentPath: `/${data.slug}`,
      }}
    />
  );
}
