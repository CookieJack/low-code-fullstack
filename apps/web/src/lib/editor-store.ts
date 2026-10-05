"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { NodeSchema, PageSchema } from "@lc/schema";
import { getMaterial } from "@lc/materials";

export type Device = "desktop" | "tablet" | "mobile";

export const DEVICE_WIDTH: Record<Device, number> = {
  desktop: 1280,
  tablet: 834,
  mobile: 390,
};

interface LoadPayload {
  id: string;
  name: string;
  schema: PageSchema;
}

interface EditorState {
  pageId: string | null;
  pageName: string;
  schema: PageSchema;
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
  addNode: (type: string, index?: number) => string;
  updateProps: (id: string, key: string, value: unknown) => void;
  updateStyle: (id: string, patch: Partial<NonNullable<NodeSchema["style"]>>) => void;
  updateTitle: (title: string) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  moveNode: (fromIndex: number, toIndex: number) => void;

  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  setSaving: (v: boolean) => void;
}

const HISTORY_LIMIT = 100;

export const useEditorStore = create<EditorState>((set, get) => ({
  pageId: null,
  pageName: "",
  schema: { version: 1, title: "", nodes: [] },
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
      schema: structuredClone(page.schema),
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

  addNode: (type, index) => {
    const def = getMaterial(type);
    if (!def) return "";
    const node: NodeSchema = {
      id: nanoid(8),
      type,
      props: structuredClone(def.defaultProps),
    };
    const nodes = get().schema.nodes;
    const at = index === undefined ? nodes.length : Math.max(0, Math.min(index, nodes.length));
    get().apply((draft) => {
      draft.nodes.splice(at, 0, node);
    });
    set({ selectedId: node.id });
    return node.id;
  },

  updateProps: (id, key, value) =>
    get().apply((draft) => {
      const node = draft.nodes.find((n) => n.id === id);
      if (node) node.props = { ...node.props, [key]: value };
    }),

  updateStyle: (id, patch) =>
    get().apply((draft) => {
      const node = draft.nodes.find((n) => n.id === id);
      if (node) node.style = { ...node.style, ...patch };
    }),

  updateTitle: (title) =>
    get().apply((draft) => {
      draft.title = title;
    }),

  removeNode: (id) => {
    const { selectedId } = get();
    get().apply((draft) => {
      draft.nodes = draft.nodes.filter((n) => n.id !== id);
    });
    if (selectedId === id) set({ selectedId: null });
  },

  duplicateNode: (id) => {
    const node = get().schema.nodes.find((n) => n.id === id);
    if (!node) return;
    const copy: NodeSchema = {
      ...structuredClone(node),
      id: nanoid(8),
    };
    const index = get().schema.nodes.findIndex((n) => n.id === id);
    get().apply((draft) => {
      draft.nodes.splice(index + 1, 0, copy);
    });
    set({ selectedId: copy.id });
  },

  moveNode: (fromIndex, toIndex) => {
    const nodes = get().schema.nodes;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= nodes.length || toIndex >= nodes.length) return;
    get().apply((draft) => {
      const [moved] = draft.nodes.splice(fromIndex, 1);
      draft.nodes.splice(toIndex, 0, moved);
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
}));
