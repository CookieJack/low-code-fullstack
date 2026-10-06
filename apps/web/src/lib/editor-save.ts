"use client";

import { toast } from "sonner";
import { updatePage } from "./api";
import { useEditorStore } from "./editor-store";

/** 立即把当前 schema 持久化(脏时);只读访问直接跳过。返回是否可用 */
export async function saveNow(): Promise<boolean> {
  const { pageId, access, schema, dirty, setSaving, markSaved } = useEditorStore.getState();
  if (!pageId || access === "viewer" || access === "none") return true;
  if (!dirty) return true;
  setSaving(true);
  try {
    await updatePage(pageId, { schema });
    markSaved();
    return true;
  } catch (e) {
    setSaving(false);
    toast.error(e instanceof Error ? e.message : "保存失败");
    return false;
  }
}
