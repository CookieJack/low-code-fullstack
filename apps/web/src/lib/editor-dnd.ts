import { pointerWithin, rectIntersection } from "@dnd-kit/core";
import type { CollisionDetection } from "@dnd-kit/core";
import type { NodeSchema } from "@lc/schema";
import type { DropTarget } from "./tree";

/**
 * 画布拖拽数据契约:
 * - palette 物料:MaterialDragData
 * - 画布节点(任意层级):NodeDragData
 * - 容器内容放置区 / 画布首尾放置区:ZoneDragData / CanvasEndData / CanvasEmptyData
 */
export type MaterialDragData = { kind: "material"; type: string };
export type NodeDragData = {
  kind: "node";
  id: string;
  /** 所在容器 id(null = 根) */
  containerId: string | null;
  index: number;
  isContainer: boolean;
  childCount: number;
};
export type ZoneDragData = { kind: "zone"; containerId: string; childCount: number };
export type CanvasEndData = { kind: "canvas-end" };
export type CanvasEmptyData = { kind: "canvas-empty" };
export type DragData =
  | MaterialDragData
  | NodeDragData
  | ZoneDragData
  | CanvasEndData
  | CanvasEmptyData;

/**
 * 嵌套容器碰撞检测:指针命中的目标里选矩形面积最小(最深层、最具体)的,
 * 保证「悬停子块 → 插到子块处;悬停容器空白 → 追加到容器末尾」。
 */
export const nestedCollisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  if (within.length > 0) {
    const areaOf = (id: unknown) => {
      const rect = args.droppableContainers.find((c) => c.id === id)?.rect.current;
      return rect ? rect.width * rect.height : Number.MAX_SAFE_INTEGER;
    };
    return [...within].sort((a, b) => areaOf(a.id) - areaOf(b.id));
  }
  return rectIntersection(args);
};

/** 由 over 目标解析插入位置(容器 + 下标) */
export function resolveDropTarget(
  nodes: NodeSchema[],
  over: { id: string | number; data: { current?: Record<string, any> } | null },
): DropTarget {
  const data = over.data?.current as DragData | undefined;
  if (data?.kind === "zone") {
    return { containerId: data.containerId, index: data.childCount };
  }
  if (data?.kind === "node") {
    // 悬停容器本体 → 放入容器末尾;悬停普通块 → 插到它前面
    if (data.isContainer) return { containerId: data.id, index: data.childCount };
    return { containerId: data.containerId, index: data.index };
  }
  if (data?.kind === "canvas-empty") return { containerId: null, index: 0 };
  // canvas-end 与未知兜底:根末尾
  return { containerId: null, index: nodes.length };
}
