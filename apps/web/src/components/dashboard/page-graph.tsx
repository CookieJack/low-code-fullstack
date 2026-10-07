"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { ExternalLink, Link2Off, UsersRound } from "lucide-react";
import { Badge } from "@lc/ui";
import type { PageGraph, PageMeta } from "@lc/schema";
import { getPageGraph } from "@/lib/api";
import { useTheme } from "@/components/theme/theme-provider";

type PageNodeData = { page: PageMeta };
type PlaceholderNodeData = { href: string };
type PageNode = Node<PageNodeData, "page">;
type PlaceholderNode = Node<PlaceholderNodeData, "placeholder">;
type GraphNode = PageNode | PlaceholderNode;

/* 与布局共用的节点尺寸(卡片 w-60,高度按内容估算) */
const NODE_W = 240;
const NODE_H = 92;

const EDGE_COLOR = "#818cf8";
const DEAD_EDGE_COLOR = "#94a3b8";

/* 节点两侧的隐形锚点:只读视图不画出来,让连线吸附到卡片左右边缘 */
function HiddenHandle({ type }: { type: "source" | "target" }) {
  return (
    <Handle
      type={type}
      position={type === "source" ? Position.Right : Position.Left}
      className="!h-1.5 !w-1.5 !border-0 !bg-transparent opacity-0"
    />
  );
}

function PageNodeView({ data }: NodeProps<PageNode>) {
  const { page } = data;
  return (
    <div className="relative w-60 cursor-pointer rounded-xl bg-card p-3 shadow-card ring-1 ring-black/5 transition-shadow hover:shadow-lg hover:shadow-indigo-500/10 dark:ring-white/10">
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold">{page.name}</h3>
        {page.visibility === "restricted" ? (
          <Badge variant="outline" className="shrink-0 gap-1 px-1.5 text-[10px]">
            <UsersRound className="h-3 w-3" />
            协作
          </Badge>
        ) : null}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Badge variant={page.status === "published" ? "success" : "secondary"} className="text-[10px]">
          <span
            className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
              page.status === "published" ? "bg-emerald-500" : "bg-muted-foreground/60"
            }`}
          />
          {page.status === "published" ? "已发布" : "草稿"}
        </Badge>
        {page.status === "published" && page.slug ? (
          <a
            href={`/${page.slug}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            /{page.slug}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">未发布</span>
        )}
      </div>
      <HiddenHandle type="target" />
      <HiddenHandle type="source" />
    </div>
  );
}

function PlaceholderNodeView({ data }: NodeProps<PlaceholderNode>) {
  return (
    <div className="relative w-60 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link2Off className="h-3.5 w-3.5" />
        未创建的页面
      </div>
      <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">{data.href}</p>
      <HiddenHandle type="target" />
    </div>
  );
}

const nodeTypes = { page: PageNodeView, placeholder: PlaceholderNodeView };

/* dagre 左→右分层自动布局 */
function layout(nodes: GraphNode[], edges: Edge[]): GraphNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 48, ranksep: 140, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) g.setNode(node.id, { width: NODE_W, height: NODE_H });
  for (const edge of edges) g.setEdge(edge.source, edge.target);
  dagre.layout(g);
  return nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

function toFlowElements(graph: PageGraph): { nodes: GraphNode[]; edges: Edge[] } {
  const nodes: GraphNode[] = graph.pages.map(
    (page): PageNode => ({
      id: page.id,
      type: "page",
      position: { x: 0, y: 0 },
      data: { page },
      draggable: false,
      selectable: false,
    }),
  );
  for (const ph of graph.placeholders) {
    nodes.push({
      id: ph.id,
      type: "placeholder",
      position: { x: 0, y: 0 },
      data: { href: ph.href },
      draggable: false,
      selectable: false,
    });
  }

  const edges: Edge[] = graph.edges.map((e, i) => {
    const dead = e.target.startsWith("placeholder:");
    const color = dead ? DEAD_EDGE_COLOR : EDGE_COLOR;
    return {
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      style: { stroke: color, strokeWidth: 1.5, ...(dead ? { strokeDasharray: "6 4" } : {}) },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
    };
  });

  return { nodes: layout(nodes, edges), edges };
}

const miniMapColor = (node: GraphNode) =>
  node.type === "placeholder" ? DEAD_EDGE_COLOR : EDGE_COLOR;

export default function PageGraphView() {
  const router = useRouter();
  const { resolved } = useTheme();
  const [graph, setGraph] = useState<PageGraph | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getPageGraph()
      .then((g) => {
        if (alive) setGraph(g);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "加载页面关系图失败");
      });
    return () => {
      alive = false;
    };
  }, []);

  const elements = useMemo(() => (graph ? toFlowElements(graph) : null), [graph]);

  if (error) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-card text-sm text-destructive shadow-card">
        {error}
      </div>
    );
  }
  if (!elements) {
    return <div className="h-[calc(100vh-360px)] min-h-[460px] animate-pulse rounded-xl bg-card shadow-card" />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        连线由页面内按钮、菜单的跳转链接自动推导；虚线指向未创建的页面（死链）。点击节点进入编辑器。
      </p>
      <div className="h-[calc(100vh-360px)] min-h-[460px] overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-black/5 dark:ring-white/10">
        <ReactFlow
          nodes={elements.nodes}
          edges={elements.edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          colorMode={resolved}
          onNodeClick={(_, node) => {
            if (node.type === "page") router.push(`/dashboard/editor/${node.id}`);
          }}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
          minZoom={0.15}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
          <MiniMap pannable zoomable nodeColor={miniMapColor} className="!bottom-3 !right-3" />
          <Controls showInteractive={false} className="!bottom-3 !left-3" />
        </ReactFlow>
      </div>
    </div>
  );
}
