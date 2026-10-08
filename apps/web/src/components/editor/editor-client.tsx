"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { getMaterial } from "@lc/materials";
import { TriangleAlert } from "lucide-react";
import { getPage, getSiteSettings } from "@/lib/api";
import { saveNow } from "@/lib/editor-save";
import { useEditorStore } from "@/lib/editor-store";
import {
  nestedCollisionDetection,
  resolveDropTarget,
  type DragData,
} from "@/lib/editor-dnd";
import { useRequireAuth } from "@/components/auth/auth-provider";
import { Canvas } from "./canvas";
import { MaterialPanel } from "./material-panel";
import { PropertyPanel } from "./property-panel";
import { Topbar } from "./topbar";

export function EditorClient({ pageId }: { pageId: string }) {
  const { loading: authLoading } = useRequireAuth();
  const load = useEditorStore((s) => s.load);
  const schema = useEditorStore((s) => s.schema);
  const dirty = useEditorStore((s) => s.dirty);
  const previewMode = useEditorStore((s) => s.previewMode);
  const access = useEditorStore((s) => s.access);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  // 站点主题色:画布预览与发布页观感一致(失败按默认品牌色)
  const [themePrimary, setThemePrimary] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [page] = await Promise.all([
          getPage(pageId),
          // 设置接口失败不影响编辑器打开,仅回退默认品牌色
          getSiteSettings()
            .then((s) => setThemePrimary(s.themePrimary))
            .catch(() => {}),
        ]);
        if (!cancelled) {
          load({
            id: page.id,
            name: page.name,
            slug: page.slug,
            status: page.status,
            schema: page.schema,
            access: page.access,
          });
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageId, load]);

  // 自动保存:变更后防抖 1.5s(只读访问不保存)
  useEffect(() => {
    if (!dirty || access === "viewer" || access === "none") return;
    const t = setTimeout(() => void saveNow(), 1500);
    return () => clearTimeout(t);
  }, [schema, dirty, access]);

  // 快捷键:撤销 / 重做 / 保存
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) useEditorStore.getState().redo();
        else useEditorStore.getState().undo();
      } else if (key === "y") {
        e.preventDefault();
        useEditorStore.getState().redo();
      } else if (key === "s") {
        e.preventDefault();
        void saveNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data?.kind === "material" && data.type) {
      setActiveLabel(getMaterial(data.type)?.title ?? "组件");
    } else {
      setActiveLabel("移动区块");
    }
  }, []);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over) return;
    const store = useEditorStore.getState();
    const activeData = active.data.current as DragData | undefined;
    const target = resolveDropTarget(store.schema.nodes, over);

    if (activeData?.kind === "material" && activeData.type) {
      store.addNode(activeData.type, target);
    } else if (activeData?.kind === "node") {
      store.moveNodeTo(String(active.id), target);
    }
  }, []);

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
          <TriangleAlert className="h-7 w-7 text-red-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold">页面加载失败</p>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        </div>
        <a href="/dashboard" className="text-sm font-medium text-primary hover:underline">
          返回页面列表
        </a>
      </div>
    );
  }

  if (authLoading || !ready) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        </div>
        <p className="text-sm text-muted-foreground">正在加载编辑器…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar />
      <DndContext
        sensors={sensors}
        collisionDetection={nestedCollisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveLabel(null)}
      >
        <div className="flex min-h-0 flex-1">
          {!previewMode && access !== "viewer" && <MaterialPanel />}
          <Canvas themePrimary={themePrimary} />
          {!previewMode && access !== "viewer" && <PropertyPanel />}
        </div>
        <DragOverlay>{activeLabel ? (
          <div className="rounded-md bg-brand-gradient px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            {activeLabel}
          </div>
        ) : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
