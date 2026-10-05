import { z } from "zod";

/* ------------------------------------------------------------------ */
/* 页面协议:Node / PageSchema                                          */
/* ------------------------------------------------------------------ */

export const nodeStyleSchema = z
  .object({
    paddingTop: z.string().optional(),
    paddingBottom: z.string().optional(),
    background: z.string().optional(),
  })
  .strict();

export const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
  style: nodeStyleSchema.optional(),
});

export const pageSchemaSchema = z.object({
  version: z.literal(1),
  title: z.string().default(""),
  nodes: z.array(nodeSchema).default([]),
});

export type NodeStyle = z.infer<typeof nodeStyleSchema>;
export type NodeSchema = z.infer<typeof nodeSchema>;
export type PageSchema = z.infer<typeof pageSchemaSchema>;

export const createEmptyPageSchema = (title = ""): PageSchema => ({
  version: 1,
  title,
  nodes: [],
});

/* ------------------------------------------------------------------ */
/* 属性面板控件定义(propSchema):驱动属性面板自动生成表单                  */
/* ------------------------------------------------------------------ */

export type PropField =
  | { type: "text"; key: string; label: string; placeholder?: string }
  | { type: "textarea"; key: string; label: string; placeholder?: string; rows?: number }
  | { type: "url"; key: string; label: string; placeholder?: string }
  | { type: "color"; key: string; label: string }
  | { type: "number"; key: string; label: string; min?: number; max?: number; step?: number }
  | { type: "boolean"; key: string; label: string }
  | { type: "select"; key: string; label: string; options: { label: string; value: string }[] }
  /** 对象数组编辑器:每行按 fields 渲染一组控件 */
  | {
      type: "array";
      key: string;
      label: string;
      itemLabelKey: string;
      fields: PropField[];
      defaultItem: Record<string, unknown>;
      maxItems?: number;
    };

export const styleFields: PropField[] = [
  { type: "color", key: "background", label: "背景色" },
];

/* ------------------------------------------------------------------ */
/* API 契约                                                             */
/* ------------------------------------------------------------------ */

export const pageMetaDto = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  title: z.string(),
  status: z.enum(["draft", "published"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PageMeta = z.infer<typeof pageMetaDto>;

export const pageDetailDto = pageMetaDto.extend({
  schema: pageSchemaSchema,
  publishedSchema: pageSchemaSchema.nullable(),
});
export type PageDetail = z.infer<typeof pageDetailDto>;

export const createPageInput = z.object({
  name: z.string().min(1).max(50),
  template: z.enum(["blank", "landing"]).default("blank"),
});

export const updatePageInput = z.object({
  name: z.string().min(1).max(50).optional(),
  title: z.string().max(100).optional(),
  schema: pageSchemaSchema.optional(),
});

export const publishInput = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "仅允许小写字母、数字和中划线"),
});

export const formSubmitInput = z.object({
  pageId: z.string().min(1),
  componentId: z.string().min(1),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const publishedPageDto = z.object({
  pageId: z.string(),
  slug: z.string(),
  title: z.string(),
  schema: pageSchemaSchema,
});
export type PublishedPage = z.infer<typeof publishedPageDto>;
