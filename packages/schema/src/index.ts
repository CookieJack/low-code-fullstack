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

/* ------------------------------------------------------------------ */
/* 角色与权限(RBAC)                                                    */
/* ------------------------------------------------------------------ */

export const roleSchema = z.enum(["admin", "editor", "viewer"]);
export type Role = z.infer<typeof roleSchema>;

export const PERMISSIONS = [
  "page:read",
  "page:create",
  "page:update",
  "page:delete",
  "page:publish",
  "page:unpublish",
  "submission:read",
  "user:read",
  "user:create",
  "user:update",
  "user:delete",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [...PERMISSIONS],
  editor: [
    "page:read",
    "page:create",
    "page:update",
    "page:delete",
    "page:publish",
    "page:unpublish",
    "submission:read",
  ],
  viewer: ["page:read", "submission:read"],
};

export const hasPermission = (role: Role, perm: Permission): boolean =>
  ROLE_PERMISSIONS[role].includes(perm);

export const ROLE_LABELS: Record<Role, string> = {
  admin: "管理员",
  editor: "编辑",
  viewer: "访客",
};

/* ------------------------------------------------------------------ */
/* 认证与用户管理契约                                                    */
/* ------------------------------------------------------------------ */

export const userDto = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  role: roleSchema,
  enabled: z.boolean(),
  createdAt: z.string(),
});
export type UserDto = z.infer<typeof userDto>;

export const loginInput = z.object({
  username: z.string().min(1, "请输入用户名").max(50),
  password: z.string().min(1, "请输入密码").max(100),
});

export const refreshInput = z.object({
  refreshToken: z.string().min(1),
});

export const tokenResponseDto = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userDto,
});
export type TokenResponse = z.infer<typeof tokenResponseDto>;

export const createUserInput = z.object({
  username: z
    .string()
    .min(2, "用户名至少 2 个字符")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "仅允许字母、数字、下划线和中划线"),
  password: z.string().min(6, "密码至少 6 位").max(100),
  name: z.string().max(50).default(""),
  role: roleSchema.default("viewer"),
});

export const updateUserInput = z.object({
  name: z.string().max(50).optional(),
  role: roleSchema.optional(),
  enabled: z.boolean().optional(),
  password: z.string().min(6, "密码至少 6 位").max(100).optional(),
});

/** 静态导出输入:浏览器传入页面数据,服务端只做渲染(页面数据需鉴权获取) */
export const exportPageInput = z.object({
  name: z.string().min(1),
  slug: z.string().nullable().default(null),
  title: z.string().default(""),
  schema: pageSchemaSchema,
});
