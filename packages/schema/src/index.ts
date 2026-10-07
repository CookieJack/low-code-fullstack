import { z } from "zod";

import { HEX_COLOR_RE } from "./theme";

export * from "./theme";

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
/* 站点级页头/页尾:全局区块配置                                          */
/* ------------------------------------------------------------------ */

/**
 * 站点级区块状态:整份 props + 可选样式。页面内的 navbar/footer 节点只是
 * 「引用位」——保存任一页面时其第一个 navbar/footer 节点的配置同步为全站
 * 配置,读取(编辑器/发布页/导出)时统一覆盖回各页面,实现实时共享。
 */
export interface GlobalBlockState {
  props: Record<string, unknown>;
  style?: NodeStyle;
}

export const globalBlockStateSchema = z.object({
  props: z.record(z.string(), z.unknown()).default({}),
  style: nodeStyleSchema.optional(),
});

/** 脏数据或缺省一律按未配置(null)处理,不让历史值阻塞站点设置读取 */
const siteBlockField = globalBlockStateSchema.nullable().catch(null).default(null);

export const siteSettingsSchema = z.object({
  /** 品牌主色(#rrggbb);null = 未配置,物料使用默认 indigo */
  themePrimary: z.string().regex(HEX_COLOR_RE).nullable().default(null),
  /** 站点级页头导航配置;null = 尚未由任何页面同步 */
  navbarBlock: siteBlockField,
  /** 站点级页脚配置;null = 尚未由任何页面同步 */
  footerBlock: siteBlockField,
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const updateSiteSettingsInput = z.object({
  themePrimary: z.string().regex(HEX_COLOR_RE, "请输入 #rrggbb 格式的颜色").nullable(),
});

/** 深度优先查找第一个指定类型的节点(含容器子节点) */
export function findNodeOfType(nodes: NodeSchema[], type: string): NodeSchema | null {
  for (const node of nodes) {
    if (node.type === type) return node;
    if (node.children?.length) {
      const hit = findNodeOfType(node.children, type);
      if (hit) return hit;
    }
  }
  return null;
}

/** 从页面 schema 提取页头/页尾配置(保存页面时同步到站点设置) */
export function extractGlobalBlocks(schema: PageSchema): {
  navbarBlock: GlobalBlockState | null;
  footerBlock: GlobalBlockState | null;
} {
  const toState = (node: NodeSchema | null): GlobalBlockState | null =>
    node ? { props: node.props, ...(node.style ? { style: node.style } : {}) } : null;
  return {
    navbarBlock: toState(findNodeOfType(schema.nodes, "navbar")),
    footerBlock: toState(findNodeOfType(schema.nodes, "footer")),
  };
}

/**
 * 读取路径:站点级页头/页尾覆盖页面内同类型节点的 props 与样式
 * (站点未配置或页面未放该区块时原样保留)。
 */
export function applyGlobalBlocks(
  schema: PageSchema,
  blocks: { navbarBlock?: GlobalBlockState | null; footerBlock?: GlobalBlockState | null },
): PageSchema {
  const override = (node: NodeSchema): NodeSchema => {
    const block =
      node.type === "navbar"
        ? blocks.navbarBlock ?? null
        : node.type === "footer"
          ? blocks.footerBlock ?? null
          : null;
    const replaced = block ? { ...node, props: block.props, style: block.style ?? node.style } : node;
    return replaced.children?.length
      ? { ...replaced, children: replaced.children.map(override) }
      : replaced;
  };
  return { ...schema, nodes: schema.nodes.map(override) };
}

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
  "site:settings",
  "site:domain",
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
  "site:settings": "站点设置(主题色)",
  "site:domain": "绑定自定义域名",
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
  { label: "站点", prefix: "site:" },
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
