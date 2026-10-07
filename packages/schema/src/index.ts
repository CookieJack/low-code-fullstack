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

/**
 * 页面节点树:容器物料(type 为 container 类)通过 children 嵌套子节点。
 * TS 类型手写(递归引用无法推断),schema 用 z.lazy 递归校验;
 * children 可选 —— 旧数据没有该字段,读取后按无子节点处理。
 */
export interface NodeStyle {
  paddingTop?: string;
  paddingBottom?: string;
  background?: string;
}

export interface NodeSchema {
  id: string;
  type: string;
  props: Record<string, unknown>;
  style?: NodeStyle;
  children?: NodeSchema[];
}

const nodeSchemaInner: z.ZodType<NodeSchema> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    props: z.record(z.string(), z.unknown()).default({}),
    style: nodeStyleSchema.optional(),
    children: z.array(nodeSchemaInner).optional(),
  }),
);

export const nodeSchema = nodeSchemaInner;

export const pageSchemaSchema = z.object({
  version: z.literal(1),
  title: z.string().default(""),
  nodes: z.array(nodeSchema).default([]),
});

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
  /** 图片属性:URL 输入 + 平台内上传(值仍为 URL 字符串,与 url 控件数据兼容) */
  | { type: "image"; key: string; label: string; placeholder?: string }
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

/** 当前用户对该页面的有效访问级别(全局角色与协作成员取高者) */
export const pageAccessSchema = z.enum(["editor", "viewer", "none"]);
export type PageAccess = z.infer<typeof pageAccessSchema>;

export const pageVisibilitySchema = z.enum(["inherit", "restricted"]);
export type PageVisibility = z.infer<typeof pageVisibilitySchema>;

export const pageMetaDto = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  title: z.string(),
  status: z.enum(["draft", "published"]),
  visibility: pageVisibilitySchema.default("inherit"),
  /** 当前用户对该页面的访问级别 */
  access: pageAccessSchema.default("none"),
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
  visibility: pageVisibilitySchema.optional(),
});

/** 页面协作成员级别:editor 可编辑并发布该页,viewer 只读 */
export const pageMemberLevelSchema = z.enum(["editor", "viewer"]);
export type PageMemberLevel = z.infer<typeof pageMemberLevelSchema>;

export const pageMemberDto = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  name: z.string(),
  level: pageMemberLevelSchema,
});
export type PageMember = z.infer<typeof pageMemberDto>;

export const upsertPageMemberInput = z.object({
  userId: z.string().min(1),
  level: pageMemberLevelSchema.default("viewer"),
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

/**
 * 角色存储在数据库(Role 表),可自定义;此处仅保留内置三角色的
 * 默认权限映射,作为 seed 数据与 DB 缺失时的兜底。
 */
export type Role = string;

export const PERMISSIONS = [
  "page:read",
  "page:create",
  "page:update",
  "page:delete",
  "page:publish",
  "page:unpublish",
  "page:share",
  "submission:read",
  "user:read",
  "user:create",
  "user:update",
  "user:delete",
  "role:read",
  "role:create",
  "role:update",
  "role:delete",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** 权限点中文名(角色编辑界面按前缀分组展示) */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "page:read": "查看页面",
  "page:create": "新建/复制页面",
  "page:update": "编辑全部页面",
  "page:delete": "删除页面",
  "page:publish": "发布页面",
  "page:unpublish": "下线页面",
  "page:share": "管理页面协作成员",
  "submission:read": "查看表单提交",
  "user:read": "查看用户",
  "user:create": "新建用户",
  "user:update": "编辑用户",
  "user:delete": "删除用户",
  "role:read": "查看角色",
  "role:create": "新建角色",
  "role:update": "编辑角色",
  "role:delete": "删除角色",
};

/** 权限点分组(角色编辑界面展示顺序) */
export const PERMISSION_GROUPS: { label: string; prefix: string }[] = [
  { label: "页面", prefix: "page:" },
  { label: "表单", prefix: "submission:" },
  { label: "用户", prefix: "user:" },
  { label: "角色", prefix: "role:" },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  admin: [...PERMISSIONS],
  editor: [
    "page:read",
    "page:create",
    "page:update",
    "page:delete",
    "page:publish",
    "page:unpublish",
    "page:share",
    "submission:read",
  ],
  viewer: ["page:read", "submission:read"],
};

/** 内置角色 key(数据库中 isSystem = true,不可删除;admin 权限锁定为全量) */
export const SYSTEM_ROLES = ["admin", "editor", "viewer"] as const;

export const hasPermission = (role: Role, perm: Permission): boolean =>
  DEFAULT_ROLE_PERMISSIONS[role]?.includes(perm) ?? false;

export const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  editor: "编辑",
  viewer: "访客",
};

/* ---------------- 角色管理契约 ---------------- */

export const roleDto = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
  isSystem: z.boolean(),
  userCount: z.number().default(0),
  createdAt: z.string(),
});
export type RoleDto = z.infer<typeof roleDto>;

export const createRoleInput = z.object({
  key: z
    .string()
    .min(2, "角色标识至少 2 个字符")
    .max(30)
    .regex(/^[a-z][a-z0-9-]*$/, "仅允许小写字母、数字和中划线,以字母开头"),
  name: z.string().min(1, "请输入角色名称").max(30),
  description: z.string().max(100).default(""),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});

export const updateRoleInput = z.object({
  name: z.string().min(1).max(30).optional(),
  description: z.string().max(100).optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
});

/* ------------------------------------------------------------------ */
/* 认证与用户管理契约                                                    */
/* ------------------------------------------------------------------ */

export const userDto = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  /** 角色 key(动态角色,存于 Role 表) */
  role: z.string(),
  /** 角色显示名(服务端联表填充;旧缓存对象可能没有) */
  roleName: z.string().optional(),
  /** 当前用户持有的权限点(仅登录/me/刷新响应中填充) */
  permissions: z.array(z.string()).optional(),
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
  role: z.string().min(1).default("viewer"),
});

export const updateUserInput = z.object({
  name: z.string().max(50).optional(),
  role: z.string().min(1).optional(),
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
