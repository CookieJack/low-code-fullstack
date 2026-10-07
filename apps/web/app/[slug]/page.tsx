import { notFound } from "next/navigation";
import { getPublished } from "@/lib/published";
import { PublishedPageView } from "@/components/published-page";

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
  const data = await getPublished(slug);
  if (!data) notFound();
  return <PublishedPageView data={data} />;
}
