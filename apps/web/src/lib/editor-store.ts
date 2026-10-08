"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { NodeSchema, PageSchema } from "@lc/schema";
import { getMaterial } from "@lc/materials";
import {
  cloneWithNewIds,
  ensureChildList,
  findNode,
  findNodeLoc,
  isInsideSubtree,
  listByContainer,
  type DropTarget,
} from "./tree";

export type Device = "desktop" | "tablet" | "mobile";

export const DEVICE_WIDTH: Record<Device, number> = {
  desktop: 1280,
  tablet: 834,
  mobile: 390,
};

interface LoadPayload {
  id: string;
  name: string;
  slug: string | null;
  /** 页面发布状态;已发布时【发布】按钮直接同步更新 */
  status?: "draft" | "published";
  schema: PageSchema;
  /** 当前用户对该页的访问级别;viewer 时编辑器进入只读模式 */
  access?: "editor" | "viewer" | "none";
}

interface EditorState {
  pageId: string | null;
  pageName: string;
  pageSlug: string | null;
  pageStatus: "draft" | "published";
  schema: PageSchema;
  /** 当前用户对该页面的访问级别(null = 未加载) */
  access: "editor" | "viewer" | "none" | null;
  selectedId: string | null;
  past: PageSchema[];
  future: PageSchema[];
  dirty: boolean;
  saving: boolean;
  lastSavedAt: number | null;
  device: Device;
  previewMode: boolean;

  load: (page: LoadPayload) => void;
  setDevice: (d: Device) => void;
  setPreviewMode: (v: boolean) => void;
  select: (id: string | null) => void;

  /** 所有变更的唯一入口:克隆 → 变更 → 入历史栈 → 标脏 */
  apply: (fn: (draft: PageSchema) => void) => void;
  /** 新增物料:target 缺省 = 根末尾 */
  addNode: (type: string, target?: DropTarget) => string;
  updateProps: (id: string, key: string, value: unknown) => void;
  updateStyle: (id: string, patch: Partial<NonNullable<NodeSchema["style"]>>) => void;
  updateTitle: (title: string) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  /** 同一容器内上移/下移 */
  moveNode: (containerId: string | null, fromIndex: number, toIndex: number) => void;
  /** 移动节点(支持跨容器);目标落在自身子树内时忽略 */
  moveNodeTo: (id: string, target: DropTarget) => void;

  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  setSaving: (v: boolean) => void;
  /** 发布成功后同步 store 中的路径与状态(再次点【发布】即直接同步更新) */
  markPublished: (slug: string) => void;
}

const HISTORY_LIMIT = 100;

export const useEditorStore = create<EditorState>((set, get) => ({
  pageId: null,
  pageName: "",
  pageSlug: null,
  pageStatus: "draft",
  schema: { version: 1, title: "", nodes: [] },
  access: null,
  selectedId: null,
  past: [],
  future: [],
  dirty: false,
  saving: false,
  lastSavedAt: null,
  device: "desktop",
  previewMode: false,

  load: (page) =>
    set({
      pageId: page.id,
      pageName: page.name,
      pageSlug: page.slug,
      pageStatus: page.status ?? "draft",
      schema: structuredClone(page.schema),
      access: page.access ?? "editor",
      // 只读访问:强制预览模式(隐藏物料/属性面板与拖拽把手)
      previewMode: page.access === "viewer",
      selectedId: null,
      past: [],
      future: [],
      dirty: false,
      lastSavedAt: Date.now(),
    }),

  setDevice: (device) => set({ device }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  select: (selectedId) => set({ selectedId }),

  apply: (fn) => {
    const { schema, past } = get();
    const draft = structuredClone(schema);
    fn(draft);
    set({
      schema: draft,
      past: [...past, schema].slice(-HISTORY_LIMIT),
      future: [],
      dirty: true,
    });
  },

  addNode: (type, target) => {
    const def = getMaterial(type);
    if (!def) return "";
    const containerId = target?.containerId ?? null;
    if (containerId !== null && !findNode(get().schema.nodes, containerId)) return "";
    const node: NodeSchema = {
      id: nanoid(8),
      type,
      props: structuredClone(def.defaultProps),
    };
    get().apply((draft) => {
      const list = ensureChildList(draft.nodes, containerId)!;
      const at =
        target === undefined
          ? list.length
          : Math.max(0, Math.min(target.index, list.length));
      list.splice(at, 0, node);
    });
    set({ selectedId: node.id });
    return node.id;
  },

  updateProps: (id, key, value) =>
    get().apply((draft) => {
      const node = findNode(draft.nodes, id);
      if (node) node.props = { ...node.props, [key]: value };
    }),

  updateStyle: (id, patch) =>
    get().apply((draft) => {
      const node = findNode(draft.nodes, id);
      if (node) node.style = { ...node.style, ...patch };
    }),

  updateTitle: (title) =>
    get().apply((draft) => {
      draft.title = title;
    }),

  removeNode: (id) => {
    const { selectedId } = get();
    get().apply((draft) => {
      const loc = findNodeLoc(draft.nodes, id);
      if (loc) loc.list.splice(loc.index, 1);
    });
    if (selectedId === id) set({ selectedId: null });
  },

  duplicateNode: (id) => {
    const loc = findNodeLoc(get().schema.nodes, id);
    if (!loc) return;
    const copy = cloneWithNewIds(loc.node);
    get().apply((draft) => {
      const target = findNodeLoc(draft.nodes, id);
      if (!target) return;
      target.list.splice(target.index + 1, 0, copy);
    });
    set({ selectedId: copy.id });
  },

  moveNode: (containerId, fromIndex, toIndex) => {
    const list = listByContainer(get().schema.nodes, containerId);
    if (!list) return;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= list.length || toIndex >= list.length) return;
    get().apply((draft) => {
      const l = ensureChildList(draft.nodes, containerId)!;
      const [moved] = l.splice(fromIndex, 1);
      l.splice(toIndex, 0, moved);
    });
  },

  moveNodeTo: (id, target) => {
    const { nodes } = get().schema;
    // 目标容器不能是自己或自己的子树
    if (
      target.containerId !== null &&
      (target.containerId === id || isInsideSubtree(nodes, id, target.containerId))
    ) {
      return;
    }
    const src = findNodeLoc(nodes, id);
    if (!src) return;
    if ((src.containerId ?? null) === (target.containerId ?? null)) {
      let to = Math.max(0, Math.min(target.index, src.list.length));
      if (src.index < to) to -= 1; // 先移除再插入
      if (to === src.index) return;
    } else if (
      target.containerId !== null &&
      !findNode(nodes, target.containerId)
    ) {
      return;
    }
    get().apply((draft) => {
      const srcLoc = findNodeLoc(draft.nodes, id);
      if (!srcLoc) return;
      if ((srcLoc.containerId ?? null) === (target.containerId ?? null)) {
        let to = Math.max(0, Math.min(target.index, srcLoc.list.length));
        if (srcLoc.index < to) to -= 1;
        if (to === srcLoc.index) return;
        const [moved] = srcLoc.list.splice(srcLoc.index, 1);
        srcLoc.list.splice(to, 0, moved);
      } else {
        const dst = ensureChildList(draft.nodes, target.containerId);
        if (!dst) return;
        const [moved] = srcLoc.list.splice(srcLoc.index, 1);
        dst.splice(Math.max(0, Math.min(target.index, dst.length)), 0, moved);
      }
    });
  },

  undo: () => {
    const { past, future, schema } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      schema: prev,
      past: past.slice(0, -1),
      future: [schema, ...future].slice(0, HISTORY_LIMIT),
      dirty: true,
    });
  },

  redo: () => {
    const { past, future, schema } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      schema: next,
      past: [...past, schema].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false, saving: false, lastSavedAt: Date.now() }),
  setSaving: (saving) => set({ saving }),
  markPublished: (slug) => set({ pageSlug: slug, pageStatus: "published" }),
}));

export { findNode };
