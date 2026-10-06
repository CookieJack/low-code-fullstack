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
import type { NodeSchema } from "@lc/schema";
import { TriangleAlert } from "lucide-react";
import { getPage } from "@/lib/api";
import { saveNow } from "@/lib/editor-save";
import { useEditorStore } from "@/lib/editor-store";
import { useRequireAuth } from "@/components/auth/auth-provider";
import { Canvas } from "./canvas";
import { MaterialPanel } from "./material-panel";
import { PropertyPanel } from "./property-panel";
import { Topbar } from "./topbar";

function resolveIndex(nodes: NodeSchema[], overId: string): number {
  if (overId === "canvas-end" || overId === "canvas-empty") return nodes.length;
  const i = nodes.findIndex((n) => n.id === overId);
  return i === -1 ? nodes.length : i;
}

export function EditorClient({ pageId }: { pageId: string }) {
  const { loading: authLoading } = useRequireAuth();
  const load = useEditorStore((s) => s.load);
  const schema = useEditorStore((s) => s.schema);
  const dirty = useEditorStore((s) => s.dirty);
  const previewMode = useEditorStore((s) => s.previewMode);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await getPage(pageId);
        if (!cancelled) load({ id: page.id, name: page.name, slug: page.slug, schema: page.schema });
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

  // 自动保存:变更后防抖 1.5s
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void saveNow(), 1500);
    return () => clearTimeout(t);
  }, [schema, dirty]);

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
    const data = event.active.data.current as { kind?: string; type?: string } | undefined;
    if (data?.kind === "material" && data.type) {
      setActiveLabel(getMaterial(data.type)?.title ?? "组件");
    } else if (data?.kind === "node") {
      setActiveLabel("移动区块");
    }
  }, []);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over) return;
    const store = useEditorStore.getState();
    const nodes = store.schema.nodes;
    const activeData = active.data.current as { kind?: string; type?: string } | undefined;
    const overId = String(over.id);

    if (activeData?.kind === "material" && activeData.type) {
      store.addNode(activeData.type, resolveIndex(nodes, overId));
    } else if (activeData?.kind === "node") {
      const fromIndex = nodes.findIndex((n) => n.id === active.id);
      const toIndex = Math.min(resolveIndex(nodes, overId), nodes.length - 1);
      if (fromIndex >= 0) store.moveNode(fromIndex, toIndex);
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
        <a href="/" className="text-sm font-medium text-primary hover:underline">
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
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveLabel(null)}
      >
        <div className="flex min-h-0 flex-1">
          {!previewMode && <MaterialPanel />}
          <Canvas />
          {!previewMode && <PropertyPanel />}
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
