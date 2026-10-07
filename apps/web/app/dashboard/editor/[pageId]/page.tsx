import { EditorClient } from "@/components/editor/editor-client";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  return <EditorClient pageId={pageId} />;
}
