# 模板库(PageTemplate)实现方案

## 需求(已确认)
- **管理员统一管理**:仅 admin(实际是拥有 `template:manage` 权限的角色)能创建/编辑/删除模板;普通用户只能在新建页面时选用
- **使用范围**:仅新建页面弹窗(编辑器不加入口)
- **缩略图**:从页面导入模板时用 html-to-image 自动截图 + S3/本地上传,后台可手动替换
- **后台能力**:启用/停用开关、固定枚举分类筛选、使用次数统计
- **内置模板迁移**:现有硬编码 landing 模板迁入模板库,seed 内置 2 个模板

## 数据模型
`apps/server/prisma/schema.prisma` 新增(独立 migration):

```prisma
model PageTemplate {
  id          String   @id @default(cuid())
  name        String
  description String   @default("")
  category    String   @default("other")   // 固定枚举,见 packages/schema
  thumbnail   String?                      // 封面图 URL(上传接口返回)
  schema      Json                         // 完整 PageSchema,与 Page.schema 同构
  enabled     Boolean  @default(true)
  useCount    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

与 Page 无外键关联(实例化时是 JSON 快照拷贝,删模板不影响已建页面)。

## 契约层 `packages/schema/src/index.ts`
- `TEMPLATE_CATEGORIES`:固定枚举 `marketing/营销页、site/官网、form/表单页、event/活动页、other/其他` + label 映射
- `templateDto`、`createTemplateInput`(name/description/category/schema/thumbnail?)、`updateTemplateInput`(全部 optional,含 enabled)
- `createPageInput`:`template: z.enum(["blank","landing"])` 改为 `templateId: z.string().optional()`(空 = 空白页)
- 权限点:新增 `template:manage`(标签"管理模板库"),新增权限分组 `{ label: "模板", prefix: "template:" }`;admin 自动全量,editor/viewer 默认不含

## 后端 `apps/server`
1. **新路由 `src/routes/templates.ts`**(沿用 users.ts 套路:requirePermission + parseBody + toDto):
   - `GET /api/templates` — 仅 enabled,权限 `page:create`(供新建页面弹窗)
   - `GET /api/templates/manage` — 全量,权限 `template:manage`(后台管理页)
   - `POST /` / `PUT /:id` / `DELETE /:id` — 权限 `template:manage`;schema 用现有 `pageSchemaSchema` 校验
2. **实例化**:`src/routes/pages.ts` 的 POST `/` 移除 landing 特判,改为:有 `templateId` 时查 enabled 模板 → 深拷贝 schema + 递归重生成节点 id(新写小工具,参照前端 `cloneWithNewIds`;id 用 templates.ts 现有 `id()` 风格,不引新依赖)→ `title` 设为新页面名 → 建页,同时 `useCount: { increment: 1 }`;模板不存在/已停用返回 404。**navbar/footer 节点保留不剥离**(applyGlobalBlocks 只覆盖不插入,保留才与现有 landing 行为一致)
3. **`src/app.ts`** 挂载 `app.route("/api/templates", templateRoutes)`
4. **`prisma/seed.ts`**:幂等 seed 内置模板(count 为 0 时才插入):「官网落地页」(复用 `landingTemplate()`,分类 site)、「活动报名页」(hero+features+contact-form 简单组合,分类 marketing);`src/templates.ts` 保留作 seed 数据源

## 前端 `apps/web`
1. **`src/lib/api.ts`**:`listTemplates()`(enabled)、`listTemplatesManage()`、`createTemplate`、`updateTemplate`、`deleteTemplate`;`createPage(name, templateId?)` 改签名;缩略图上传复用现有 multipart 上传函数
2. **新增依赖** `html-to-image`(仅 apps/web)
3. **新增后台管理页 `app/dashboard/templates/page.tsx`**(仿 users/page.tsx:useRequireAuth + `can("template:manage")` 守卫):
   - 卡片网格:封面图(无封面用品牌渐变占位)、名称、分类 Badge、描述、`使用 N 次`、启用/停用 Switch(即改即存)、编辑/删除
   - **新建模板弹窗**:名称/分类/描述 + 从现有页面下拉选择(listPages)→ 选中后在屏外容器(`Renderer mode="static"`,settings 页已有同款用法)渲染页面,html-to-image 截图 → 上传 → 预览封面;支持手动重传封面。已知限制:跨域外链图片可能截图失败,降级为无封面
   - 编辑弹窗:改名称/分类/描述/封面(手动上传);schema 不在弹窗改(需要改就删除重建)
4. **导航入口 `src/components/auth/user-menu.tsx`**:`can("template:manage")` 时显示「模板库」(LayoutTemplate 图标)
5. **新建页面弹窗 `app/dashboard/page.tsx`**:`起始模板` Select 改为卡片选择器(空白页 + 模板列表,带封面缩略图和分类,dialog 放宽到 max-w-lg),提交时传 `templateId`

## 明确不做(本次范围外)
编辑器"存为模板"入口、区块级模板插入、审核流、分类管理表、模板排序/搜索

## 验证步骤
1. 起 docker 栈(PG 5432/Redis 6379,以实际为准)→ `prisma migrate dev` → `seed`
2. 重启 dev(避免 dev/build 冲突坑:验证期间不跑 build)
3. 浏览器 GUI 验证(只用自建测试数据,不动演示页):admin 从演示页导入模板 → 列表出现 → 新建弹窗选模板建页 → 编辑器内 schema 正确、节点 id 已重生成 → 停用后弹窗不再出现、useCount 递增 → 删除
4. 权限验证:editor 角色登录看不到「模板库」入口、manage 接口 403;未登录列表接口 401
5. 更新 README 功能说明