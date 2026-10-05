"use client";

import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, ChevronUp, Layers, Trash2, TriangleAlert } from "lucide-react";
import { materials } from "@lc/materials";
import type { MaterialDef } from "@lc/materials";
import { cn } from "@lc/ui";
import { useEditorStore } from "@/lib/editor-store";

function MaterialItem({ def }: { def: MaterialDef }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.type}`,
    data: { kind: "material", type: def.type },
  });
  const addNode = useEditorStore((s) => s.addNode);
  const selectedId = useEditorStore((s) => s.selectedId);
  const nodes = useEditorStore((s) => s.schema.nodes);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => {
        const idx = nodes.findIndex((n) => n.id === selectedId);
        addNode(def.type, idx === -1 ? undefined : idx + 1);
      }}
      className={cn(
        "flex cursor-grab items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition hover:border-indigo-300 hover:shadow active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
        {def.icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{def.title}</div>
        <div className="truncate text-xs text-muted-foreground">{def.description}</div>
      </div>
    </div>
  );
}

function Outline() {
  const nodes = useEditorStore((s) => s.schema.nodes);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const removeNode = useEditorStore((s) => s.removeNode);
  const moveNode = useEditorStore((s) => s.moveNode);

  return (
    <div className="space-y-1">
      {nodes.map((node, i) => {
        const def = materials.find((m) => m.type === node.type);
        return (
          <div
            key={node.id}
            onClick={() => select(node.id)}
            className={cn(
              "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
              selectedId === node.id
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <span className="text-base">{def?.icon ?? <TriangleAlert className="h-4 w-4 text-red-400" />}</span>
            <span className="flex-1 truncate">{def?.title ?? node.type}</span>
            <span className="hidden items-center gap-0.5 group-hover:flex">
              <button
                title="上移"
                disabled={i === 0}
                className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  moveNode(i, i - 1);
                }}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                title="下移"
                disabled={i === nodes.length - 1}
                className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  moveNode(i, i + 1);
                }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                title="删除"
                className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNode(node.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        );
      })}
      {nodes.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-muted-foreground">画布为空</p>
      ) : null}
    </div>
  );
}

export function MaterialPanel() {
  const categories = [...new Set(materials.map((m) => m.category))];

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r bg-card">
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

      <div className="max-h-64 overflow-auto border-t p-3">
        <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          页面大纲
        </h3>
        <Outline />
      </div>
    </aside>
  );
}
