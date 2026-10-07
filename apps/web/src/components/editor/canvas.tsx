"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, Copy, GripVertical, Inbox, Trash2 } from "lucide-react";
import { useState } from "react";
import { getMaterial } from "@lc/materials";
import { Renderer } from "@lc/renderer";
import type { NodeSchema } from "@lc/schema";
import { cn } from "@lc/ui";
import { API_BASE } from "@/lib/api";
import { DEVICE_WIDTH, useEditorStore } from "@/lib/editor-store";
import type { CanvasEmptyData, NodeDragData, ZoneDragData } from "@/lib/editor-dnd";

function SortableNode({
  node,
  index,
  total,
  containerId,
  children,
}: {
  node: NodeSchema;
  index: number;
  total: number;
  containerId: string | null;
  children: React.ReactNode;
}) {
  const def = getMaterial(node.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: {
      kind: "node",
      id: node.id,
      containerId,
      index,
      isContainer: def?.container ?? false,
      childCount: node.children?.length ?? 0,
    } satisfies NodeDragData,
  });
  const selected = useEditorStore((s) => s.selectedId === node.id);
  const previewMode = useEditorStore((s) => s.previewMode);
  const select = useEditorStore((s) => s.select);
  const removeNode = useEditorStore((s) => s.removeNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const moveNode = useEditorStore((s) => s.moveNode);
  const [hover, setHover] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="relative"
      onClick={(e) => {
        e.stopPropagation();
        select(node.id);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[5] transition",
          selected
            ? "z-[6] ring-2 ring-inset ring-primary"
            : hover
              ? "ring-2 ring-inset ring-primary/40"
              : "",
        )}
      />
      {(selected || hover) && !previewMode ? (
        <div
          className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg bg-popover/95 px-1.5 py-1 shadow-lg backdrop-blur"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="px-1 text-xs font-medium text-muted-foreground">
            {def?.icon} {def?.title}
          </span>
          <span className="mx-0.5 h-4 w-px bg-border" />
          <button
            title="拖拽排序"
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            title="上移"
            disabled={index === 0}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
            onClick={() => moveNode(containerId, index, index - 1)}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            title="下移"
            disabled={index === total - 1}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
            onClick={() => moveNode(containerId, index, index + 1)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            title="复制"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => duplicateNode(node.id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            title="删除"
            className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
            onClick={() => removeNode(node.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** 容器内容放置区:编辑器为每个容器物料注入,承担子块排序上下文与空态提示 */
function ContainerZone({ node, children }: { node: NodeSchema; children: React.ReactNode }) {
  const count = node.children?.length ?? 0;
  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${node.id}`,
    data: { kind: "zone", containerId: node.id, childCount: count } satisfies ZoneDragData,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ gap: "inherit" }}
      className={cn(
        "flex w-full flex-col rounded-xl transition",
        count === 0 &&
          "min-h-28 items-center justify-center border-2 border-dashed border-slate-300/80 text-sm text-slate-400",
        isOver && "bg-primary/5 ring-2 ring-inset ring-primary/50",
      )}
    >
      {count === 0 ? "从左侧拖入子区块,点击可添加到容器" : children}
    </div>
  );
}

function EmptyDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-empty",
    data: { kind: "canvas-empty" } satisfies CanvasEmptyData,
  });
  return (
    <div ref={setNodeRef} className="flex h-[70vh] items-center justify-center p-8">
      <div
        className={cn(
          "flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-card/60 p-12 text-center transition",
          isOver
            ? "border-primary shadow-lg shadow-indigo-500/10"
            : "border-black/15 dark:border-white/20",
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
          <Inbox className="h-6 w-6 text-accent-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">把左侧组件拖到这里</p>
        <p className="text-xs text-muted-foreground">或点击左侧组件直接添加</p>
      </div>
    </div>
  );
}

export function Canvas() {
  const schema = useEditorStore((s) => s.schema);
  const device = useEditorStore((s) => s.device);
  const previewMode = useEditorStore((s) => s.previewMode);
  const pageId = useEditorStore((s) => s.pageId);

  const { setNodeRef, isOver: endOver } = useDroppable({ id: "canvas-end", data: { kind: "canvas-end" } });
  const nodes = schema.nodes;

  return (
    <div
      className="lc-canvas flex-1 overflow-auto bg-dot-grid bg-background p-4 md:p-8"
      onClick={() => useEditorStore.getState().select(null)}
    >
      <div
        className="mx-auto transition-[width] duration-300"
        style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
      >
        <div className="min-h-[70vh] overflow-hidden rounded-xl bg-white shadow-2xl">
          {nodes.length === 0 && !previewMode ? (
            <EmptyDropZone />
          ) : (
            <SortableContext
              items={nodes.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <Renderer
                schema={schema}
                mode="edit"
                context={{ pageId: pageId ?? undefined, formApiUrl: API_BASE }}
                renderWrap={
                  previewMode
                    ? undefined
                    : ({ node, index, total, containerId, children }) => (
                        <SortableNode
                          key={node.id}
                          node={node}
                          index={index}
                          total={total}
                          containerId={containerId}
                        >
                          {children}
                        </SortableNode>
                      )
                }
                renderChildren={
                  previewMode
                    ? undefined
                    : ({ node, children }) => (
                        <SortableContext
                          items={(node.children ?? []).map((c) => c.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <ContainerZone node={node}>{children}</ContainerZone>
                        </SortableContext>
                      )
                }
              />
            </SortableContext>
          )}
          {nodes.length > 0 && !previewMode ? (
            <div
              ref={setNodeRef}
              className={cn(
                "flex h-14 items-center justify-center text-xs transition",
                endOver
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground/60 hover:text-muted-foreground",
              )}
            >
              拖到这里添加到末尾
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
