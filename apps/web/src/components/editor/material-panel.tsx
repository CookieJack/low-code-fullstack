"use client";

import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, ChevronRight, ChevronUp, Layers, LayoutGrid, List, Search, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getMaterial, materials } from "@lc/materials";
import type { MaterialDef } from "@lc/materials";
import type { NodeSchema } from "@lc/schema";
import { cn, Input } from "@lc/ui";
import { useEditorStore } from "@/lib/editor-store";
import { findNodeLoc } from "@/lib/tree";
import type { MaterialDragData } from "@/lib/editor-dnd";

type ViewMode = "list" | "grid";

const VIEW_KEY = "lc-material-view";
const COLLAPSED_KEY = "lc-material-collapsed";

function MaterialItem({ def, view }: { def: MaterialDef; view: ViewMode }) {
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
        "cursor-grab rounded-lg bg-card shadow-card transition hover:-translate-y-px hover:shadow-md active:cursor-grabbing",
        view === "grid"
          ? "flex flex-col items-center gap-2 p-3 text-center"
          : "flex items-center gap-3 p-3",
        isDragging && "opacity-40",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground",
          view === "grid" ? "h-11 w-11 text-2xl" : "h-9 w-9 text-lg",
        )}
      >
        {def.icon}
      </span>
      <div className="min-w-0">
        <div className={cn("font-medium", view === "grid" ? "text-xs" : "text-sm")}>{def.title}</div>
        {view === "list" ? (
          <div className="truncate text-xs text-muted-foreground">{def.description}</div>
        ) : null}
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
  const [view, setView] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);

  // 视图与折叠状态持久化(localStorage;挂载后恢复避免 SSR 水合不一致)
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "grid") setView("grid");
      const raw = localStorage.getItem(COLLAPSED_KEY);
      if (raw) setCollapsed(JSON.parse(raw) as string[]);
    } catch {
      /* 忽略损坏的本地存储 */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {}
  }, [view]);
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? materials.filter((m) =>
        [m.title, m.description ?? "", m.category].some((s) => s.toLowerCase().includes(q)),
      )
    : materials;
  const categories = [...new Set(filtered.map((m) => m.category))];
  const isCollapsed = (cat: string) => !q && collapsed.includes(cat);
  const toggleCat = (cat: string) =>
    setCollapsed((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-1.5 border-b border-black/5 p-3 dark:border-white/8">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="搜索组件…"
            className="h-8 pr-7 pl-8 text-xs"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              title="清空"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 rounded-lg bg-muted p-0.5">
          <button
            title="列表视图"
            aria-pressed={view === "list"}
            className={cn(
              "rounded-md p-1.5 transition",
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setView("list")}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            title="网格视图"
            aria-pressed={view === "grid"}
            className={cn(
              "rounded-md p-1.5 transition",
              view === "grid"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-auto p-3">
        {categories.map((cat) => {
          const list = filtered.filter((m) => m.category === cat);
          const folded = isCollapsed(cat);
          return (
            <section key={cat}>
              <button
                className="mb-2 flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
                onClick={() => toggleCat(cat)}
              >
                {folded ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {cat}
                <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-normal">
                  {list.length}
                </span>
              </button>
              {!folded ? (
                <div className={view === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                  {list.map((def) => (
                    <MaterialItem key={def.type} def={def} view={view} />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
        {categories.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs leading-relaxed text-muted-foreground">
            未找到与「{query.trim()}」匹配的组件
          </p>
        ) : null}
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
