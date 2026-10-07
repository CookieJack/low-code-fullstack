import { notFound } from "next/navigation";
import { cache } from "react";
import { Renderer } from "@lc/renderer";
import { applyGlobalBlocks, type PublishedPage } from "@lc/schema";
import { fetchSiteSettings } from "@/lib/settings-server";

const INTERNAL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

const getPublished = cache(async (slug: string): Promise<PublishedPage | null> => {
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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublished(slug);
  return {
    title: data?.title || "页面",
  };
}

export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [data, settings] = await Promise.all([getPublished(slug), fetchSiteSettings()]);
  if (!data) notFound();

  return (
    <Renderer
      schema={applyGlobalBlocks(data.schema, settings)}
      mode="static"
      themePrimary={settings.themePrimary}
      context={{
        pageId: data.pageId,
        formApiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
        // 站点内跳转统一使用 /p/{slug} 规范路径,导航栏据此高亮当前菜单项
        currentPath: `/p/${slug}`,
      }}
    />
  );
}
