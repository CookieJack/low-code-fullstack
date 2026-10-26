import { notFound } from "next/navigation";
import { getPublished } from "@/lib/published";
import { PublishedPageView } from "@/components/published-page";

export const dynamic = "force-dynamic";

/** catch-all 承接多级发布路径(如 /product/preview);/dashboard 等静态路由优先级更高,不受影响 */
export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");
  const data = await getPublished(path);
  if (!data) notFound();
  return <PublishedPageView data={data} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const data = await getPublished(slug.join("/"));
  return {
    title: data?.title || "页面",
  };
}
