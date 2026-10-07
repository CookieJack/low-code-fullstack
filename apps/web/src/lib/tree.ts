import { nanoid } from "nanoid";
import type { NodeSchema } from "@lc/schema";

/**
 * 页面节点树工具:节点可以嵌套在容器物料的 children 中,
 * 所有按 id 的查找/定位/复制都在这里实现。
 */

/** 节点位置:list 是包含该节点的数组引用(仅在 apply 草稿内操作时有效) */
export interface NodeLocation {
  node: NodeSchema;
  list: NodeSchema[];
  index: number;
  /** 所在容器 id(null = 页面根) */
  containerId: string | null;
}

/** 在节点树中按 id 查找位置(深度优先) */
export function findNodeLoc(
  nodes: NodeSchema[],
  id: string,
  containerId: string | null = null,
): NodeLocation | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === id) return { node, list: nodes, index: i, containerId };
    if (node.children?.length) {
      const hit = findNodeLoc(node.children, id, node.id);
      if (hit) return hit;
    }
  }
  return null;
}

export function findNode(nodes: NodeSchema[], id: string | null): NodeSchema | null {
  if (!id) return null;
  return findNodeLoc(nodes, id)?.node ?? null;
}

/** 检查 targetId 是否位于 ancestorId 的子树内(不含 ancestor 自身) */
export function isInsideSubtree(
  nodes: NodeSchema[],
  ancestorId: string,
  targetId: string,
): boolean {
  const ancestor = findNode(nodes, ancestorId);
  if (!ancestor?.children?.length) return false;
  return findNodeLoc(ancestor.children, targetId) !== null;
}

/** 深拷贝节点并为整棵子树重新生成 id */
export function cloneWithNewIds(node: NodeSchema): NodeSchema {
  const copy = structuredClone(node);
  copy.id = nanoid(8);
  if (copy.children?.length) copy.children = copy.children.map(cloneWithNewIds);
  return copy;
}

/** 放置目标:容器 id(null = 根)+ 插入下标 */
export interface DropTarget {
  containerId: string | null;
  index: number;
}

/** 取目标容器在树中的节点数组;目标不存在时返回 null(调用方应放弃操作) */
export function listByContainer(
  nodes: NodeSchema[],
  containerId: string | null,
): NodeSchema[] | null {
  if (containerId === null) return nodes;
  return findNode(nodes, containerId)?.children ?? null;
}

/**
 * 取目标容器的子节点数组,不存在则就地初始化为空数组(变更操作用)。
 * 仅可在 apply 的草稿内调用;目标容器不存在时返回 null。
 */
export function ensureChildList(
  nodes: NodeSchema[],
  containerId: string | null,
): NodeSchema[] | null {
  if (containerId === null) return nodes;
  const node = findNode(nodes, containerId);
  if (!node) return null;
  node.children ??= [];
  return node.children;
}
