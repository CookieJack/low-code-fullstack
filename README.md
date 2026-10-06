# 低代码可视化建站平台

拖拽生成、一键发布官网页面的低代码平台。三栏可视化编辑器(物料库 / 画布 / 属性面板),页面以 JSON Schema 持久化,支持平台托管发布(`/p/{slug}` 直接访问)与静态 HTML 导出(任意部署),内置联系表单线索收集。

## 功能

- **登录鉴权 + 动态 RBAC**:JWT 双 token(access 2h + refresh 7 天轮换可撤销),角色存于数据库、可自定义(内置 `admin / editor / viewer` 三角色),权限点校验 + 前端按钮显隐与路由守卫;「用户管理」维护账号,「角色权限」页可视化勾选每个角色的权限点
- **页面级协作权限**:页面可设「限制访问」并把任意用户加为该页编辑者/查看者,不受其全局角色限制
- **可视化编辑器**:物料拖入画布(dnd-kit)、画布内拖拽排序、点击选中、属性面板按物料定义自动生成、区块样式(背景/内边距)覆盖
- **所见即所得**:编辑画布、发布页、静态导出共用同一 React 渲染器;物料基于容器查询,设备模拟(桌面/平板/手机)与真实响应一致
- **编辑体验**:撤销/重做(Ctrl+Z / Ctrl+Shift+Z)、防抖 1.5s 自动保存、页面大纲树
- **发布**:发布快照 + 可自定义 slug,`/p/{slug}` SSR 直出(SEO title),Redis 缓存加速;支持下线与重新发布
- **表单收集**:联系表单提交入库(带 IP 限流),后台查看提交数据
- **静态导出**:自包含单文件 HTML(内联 CSS + 表单提交脚本),可部署到任意静态服务器
- **多页面管理**:新建(空白/官网落地页模板)、复制、删除、下线

## 架构

pnpm monorepo:

```
apps/
  web/            Next.js 15 (App Router) + Tailwind v4 + shadcn/ui
                  ├─ /                    页面管理
                  ├─ /editor/[pageId]     三栏编辑器
                  ├─ /p/[slug]            发布页 SSR
                  └─ pages/api/export     静态导出(需 react-dom/server)
  server/         Hono + Prisma + PostgreSQL + Redis
packages/
  schema/         @lc/schema 页面协议(zod)+ API 契约 + 属性控件定义
  materials/      @lc/materials 物料组件 + 注册表定义
  renderer/       @lc/renderer schema → React 渲染器
  ui/             @lc/ui shadcn/ui 风格组件(平台界面用)
docker/           Dockerfiles + nginx 配置
docker-compose.yml  postgres + redis + server + web + nginx
```

**核心枢纽是物料注册表**:每个物料 = `{ type, title, icon, defaultProps, propSchema, Component }`。渲染器按 type 查表渲染;属性面板按 propSchema 自动生成控件。新增物料只需一个组件 + 一份定义。

**层间依赖**:`web、server → schema`;`web → materials、renderer、ui`;`renderer → materials`。物料样式独立于 shadcn,保证发布的网站是"真实网站"的观感。

### 数据模型

- `User`:username(唯一)/ passwordHash(bcrypt)/ name / role(→ Role.key)/ enabled
- `Role`:key(唯一,如 admin|editor|viewer 或自定义)/ name / permissions(权限点数组)/ isSystem(内置角色)
- `RefreshToken`:tokenHash(sha256,唯一)/ userId / expiresAt(登录轮换,登出/改角色即删除)
- `Page`:name / slug(唯一)/ title / schema(草稿)/ publishedSchema(发布快照)/ status / visibility(inherit|restricted)
- `PageMember`:pageId / userId(pageId+userId 唯一)/ level(editor|viewer)
- `FormSubmission`:pageId / componentId / data(JSONB)/ createdAt

### 角色与权限(动态 RBAC)

角色存储在 `Role` 表,admin 可在「角色权限」页新建自定义角色并勾选权限点;权限点定义在 `@lc/schema`(`PERMISSIONS` + 中文 `PERMISSION_LABELS`),内置三角色的默认映射(`DEFAULT_ROLE_PERMISSIONS`)同时作为 seed 数据与 DB 缺失时的兜底。

| 权限点 | admin | editor | viewer |
|---|---|---|---|
| page:read / submission:read | ✓ | ✓ | ✓ |
| page:create / update / delete / publish / unpublish / **page:share** | ✓ | ✓ | — |
| user:read / create / update / delete | ✓ | — | — |
| role:read / create / update / delete | ✓ | — | — |

规则:内置角色不可删除;「管理员」权限锁定为全量;在用角色不可删除;最后一个启用中的 admin 不可降级/停用。服务端 `requirePermission` 每次请求按角色实时解析权限(进程内 15s 缓存,角色变更立即失效);登录/`/me` 响应携带 `permissions` 数组,前端 `can()` 直接判定。

**页面级协作**:`page.visibility = inherit`(默认)时按全局角色访问;`restricted` 时仅协作成员与全局持有 `page:update` 的用户可见。`PageMember` 把单个用户加为某页的 `editor`(编辑草稿 + 发布/下线该页)或 `viewer`(只读),与全局权限取高者;成员管理需全局 `page:share`。页面列表接口按上述规则过滤,无访问一律 404 不泄露存在性。

匿名可访问:`GET /api/p/:slug`、`POST /api/forms`、`GET /api/healthz`、登录与刷新接口。

### Redis 职责

① 发布 schema 缓存(publish 时失效,SSR 回源 PG);② 表单提交 IP 限流(5 次/分钟)。均带降级:Redis 不可用不阻塞主流程。

## 快速开始(本地开发)

要求:Node 20+,pnpm 10+,Docker(提供数据库)。

```bash
# 1. 启动数据库(本机 5432/6379 被占用时,根目录 .env 已错开为 5433/6380)
docker compose up -d postgres redis

# 2. 安装依赖 + 建表
pnpm install
pnpm db:migrate        # prisma migrate dev
pnpm --filter server seed   # 可选:创建管理员 admin / admin123 + 演示页面「官网首页」

# 3. 启动前后端(并行)
pnpm dev               # web http://localhost:3000  server http://localhost:3001
```

打开 http://localhost:3000 会先进入登录页,默认账号 `admin / admin123`(请在「用户管理」中尽快修改密码)。

### 环境变量

- `apps/server/.env`:`DATABASE_URL`、`REDIS_URL`、`PORT`、`JWT_SECRET`(生产必配随机长密钥)
- `apps/web/.env.development`:`NEXT_PUBLIC_API_URL=http://localhost:3001`(浏览器直连 server)
- 根 `.env`:docker compose 变量(端口、数据库凭据、`JWT_SECRET`)

## Docker 部署

```bash
docker compose up -d --build
# nginx 监听 80:/ → web,/api → server(表单接口另有限流)
```

容器内约定:web 客户端 `NEXT_PUBLIC_API_URL=""`(同源相对路径 /api 经 nginx 分流);web 服务端 `API_INTERNAL_URL=http://server:3001`(SSR/导出回源);`SITE_API_URL` 为静态导出 HTML 中表单提交指向的公网地址。生产部署请修改 `docker-compose.yml` 中的环境变量与 nginx `server_name`,并配置 HTTPS。

## 使用流程

1. 打开首页 → 登录(默认 admin / admin123)
2. 「新建页面」→ 选官网落地页模板或空白
3. 编辑器:左侧拖入物料(或点击添加)→ 画布点击选中 → 右侧改属性 → 顶部预览/切换设备宽度
4. 「发布」→ 设置 slug → 获得 `/p/{slug}` 访问链接(匿名可访问);再次发布更新线上内容
5. 「导出 HTML」→ 下载自包含静态文件;表单提交会回传平台 API(需保证 `SITE_API_URL` 可达)
6. 首页「··· → 提交数据」查看联系表单收集的线索;「··· → 协作成员」可把任意用户加为该页编辑者/查看者并开启「限制访问」
7. 右上角用户菜单 → 「用户管理」维护账号;「角色权限」新建自定义角色并勾选权限点

## 新增物料指南

以「价格表」为例:

1. `packages/materials/src/blocks/Pricing.tsx` — 组件:props 解构 + 兜底默认值,外层 `<section className="@container w-full">`(容器查询保证画布设备模拟精确);有状态交互的文件需加 `"use client"`
2. `packages/materials/src/blocks/pricing-def.ts` — 定义:defaultProps(首拖即好看)+ propSchema(支持的控件:`text` `textarea` `url` `color` `number` `boolean` `select` `array` 嵌套字段)
3. `packages/materials/src/index.ts` — 注册到 `materials` 数组

无需改动编辑器/渲染器/属性面板,物料自动出现在左侧面板并全部可用。

> 注意:带 `"use client"` 的组件文件只导出组件,def 定义放独立文件 —— 否则 RSC 下注册表条目会变成客户端引用,服务端渲染时物料会被跳过。

## API 一览(Hono)

鉴权:除标注「匿名」外均需 `Authorization: Bearer <accessToken>`;错误统一 `{ error }` 格式。

```
POST   /api/auth/login             登录 {username, password} → {accessToken, refreshToken, user}(匿名,IP 限流)
POST   /api/auth/refresh           刷新 {refreshToken} → 新 token 对(匿名,一次性轮换)
POST   /api/auth/logout            登出 {refreshToken}(撤销)
GET    /api/auth/me                当前用户信息

GET    /api/users                  用户列表(user:read 或 page:share)
POST   /api/users                  新建 {username, password, name?, role}(user:create)
PUT    /api/users/:id              更新 {name?, role?, enabled?, password?}(user:update)
DELETE /api/users/:id              删除(user:delete,不能删自己)

GET    /api/roles                  角色列表(role:read)
POST   /api/roles                  新建 {key, name, description?, permissions}(role:create)
PUT    /api/roles/:id              更新 {name?, description?, permissions?}(role:update,admin 锁定)
DELETE /api/roles/:id              删除(role:delete,仅自定义角色且无用户使用)

GET    /api/pages              页面列表(按全局角色 + 协作成员过滤,含 access/visibility)
POST   /api/pages              新建 {name, template: blank|landing}(page:create)
GET    /api/pages/:id          详情(含 schema;无访问 404)
PUT    /api/pages/:id          更新 {name?, title?, schema?, visibility?}(编辑级访问;visibility 需 page:share)
DELETE /api/pages/:id          删除(page:delete)
POST   /api/pages/:id/duplicate    复制(page:create + 源页可读)
POST   /api/pages/:id/publish      发布 {slug}(page:publish 或该页编辑级成员)
POST   /api/pages/:id/unpublish    下线(page:unpublish 或该页编辑级成员)
GET    /api/pages/:id/members      协作成员列表(page:share)
POST   /api/pages/:id/members      添加/更新成员 {userId, level: editor|viewer}(page:share)
DELETE /api/pages/:id/members/:userId  移除成员(page:share)
GET    /api/pages/:id/submissions  表单提交列表(submission:read 或该页成员)
GET    /api/p/:slug            已发布 schema(Redis 缓存)(匿名)
POST   /api/forms              表单提交 {pageId, componentId, data}(匿名,限流)
GET    /api/healthz            健康检查(db/redis)(匿名)
```

## 后续可扩展

- 图片上传(OSS/S3),当前物料图片以 URL 引用
- 更多物料(轮播、视频、价格表、FAQ 等)、区块容器嵌套
- 主题色全局配置、自定义域名绑定
