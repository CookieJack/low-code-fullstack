"use client";

import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, ChevronRight, ChevronUp, Layers, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { getMaterial, materials } from "@lc/materials";
import type { MaterialDef } from "@lc/materials";
import type { NodeSchema } from "@lc/schema";
import { cn } from "@lc/ui";
import { useEditorStore } from "@/lib/editor-store";
import { findNodeLoc } from "@/lib/tree";
import type { MaterialDragData } from "@/lib/editor-dnd";

function MaterialItem({ def }: { def: MaterialDef }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.type}`,
    data: { kind: "material", type: def.type } satisfies MaterialDragData,
  });
  const addNode = useEditorStore((s) => s.addNode);

  const add = () => {
    // 选中容器 → 追加到容器内;选中普通块 → 插到其后(同容器);未选中 → 根末尾
    const state = useEditorStore.getState();
    const loc = state.selectedId
      ? findNodeLoc(state.schema.nodes, state.selectedId)
      : null;
    if (loc) {
      if (getMaterial(loc.node.type)?.container) {
        state.addNode(def.type, {
          containerId: loc.node.id,
          index: loc.node.children?.length ?? 0,
        });
      } else {
        state.addNode(def.type, { containerId: loc.containerId, index: loc.index + 1 });
      }
    } else {
      state.addNode(def.type);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={add}
      className={cn(
        "flex cursor-grab items-center gap-3 rounded-lg bg-card p-3 shadow-card transition hover:-translate-y-px hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-lg text-accent-foreground">
        {def.icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{def.title}</div>
        <div className="truncate text-xs text-muted-foreground">{def.description}</div>
      </div>
    </div>
  );
}

function OutlineRow({
  node,
  containerId,
  index,
  total,
  depth,
}: {
  node: NodeSchema;
  containerId: string | null;
  index: number;
  total: number;
  depth: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const def = getMaterial(node.type);
  const children = node.children ?? [];
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const removeNode = useEditorStore((s) => s.removeNode);
  const moveNode = useEditorStore((s) => s.moveNode);

  return (
    <>
      <div
        onClick={() => select(node.id)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={cn(
          "group flex cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm transition",
          selectedId === node.id
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )}
      >
        {children.length > 0 ? (
          <button
            title={collapsed ? "展开" : "折叠"}
            className="rounded p-0.5 hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((v) => !v);
            }}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="text-base">
          {def?.icon ?? <TriangleAlert className="h-4 w-4 text-red-400" />}
        </span>
        <span className="flex-1 truncate">{def?.title ?? node.type}</span>
        {children.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">×{children.length}</span>
        ) : null}
        <span className="hidden items-center gap-0.5 group-hover:flex">
          <button
            title="上移"
            disabled={index === 0}
            className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
            onClick={(e) => {
              e.stopPropagation();
              moveNode(containerId, index, index - 1);
            }}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            title="下移"
            disabled={index === total - 1}
            className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
            onClick={(e) => {
              e.stopPropagation();
              moveNode(containerId, index, index + 1);
            }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            title="删除"
            className="rounded p-0.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              removeNode(node.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      {!collapsed &&
        children.map((child, i) => (
          <OutlineRow
            key={child.id}
            node={child}
            containerId={node.id}
            index={i}
            total={children.length}
            depth={depth + 1}
          />
        ))}
    </>
  );
}

function Outline() {
  const nodes = useEditorStore((s) => s.schema.nodes);

  return (
    <div className="space-y-1">
      {nodes.map((node, i) => (
        <OutlineRow key={node.id} node={node} containerId={null} index={i} total={nodes.length} depth={0} />
      ))}
      {nodes.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-muted-foreground">画布为空</p>
      ) : null}
    </div>
  );
}

export function MaterialPanel() {
  const categories = [...new Set(materials.map((m) => m.category))];

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden bg-background">
      <div className="flex-1 space-y-5 overflow-auto p-3">
        {categories.map((cat) => (
          <section key={cat}>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cat}
            </h3>
            <div className="space-y-2">
              {materials
                .filter((m) => m.category === cat)
                .map((def) => (
                  <MaterialItem key={def.type} def={def} />
                ))}
            </div>
          </section>
        ))}
      </div>

      <div className="max-h-64 overflow-auto border-t border-black/5 p-3 dark:border-white/8">
        <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          页面大纲
        </h3>
        <Outline />
      </div>
    </aside>
  );
}
