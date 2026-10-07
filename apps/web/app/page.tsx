import { getPublished, HOME_SLUG } from "@/lib/published";
import { PublishedPageView } from "@/components/published-page";
import { HomeGuide } from "@/components/home-guide";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const data = await getPublished(HOME_SLUG);
  return { title: data?.title || "低代码建站平台" };
}

/**
 * 平台域名根路径:渲染已发布首页(slug 为 home 的发布页,/home 亦直达同一页)。
 * 自定义域名的根路径在 middleware 中已被重写为对应发布页,不会走到这里;
 * 还没有已发布首页时显示引导页,按钮进入后台。
 */
export default async function Home() {
  const data = await getPublished(HOME_SLUG);
  if (data) return <PublishedPageView data={data} />;
  return <HomeGuide />;
}
