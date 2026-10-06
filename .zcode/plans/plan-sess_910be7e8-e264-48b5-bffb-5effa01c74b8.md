# RBAC 权限 + JWT 认证实现方案

## 方案总览

- **RBAC**:内置三角色 `admin / editor / viewer`,权限点定义为常量(前后端共享),接口级鉴权
- **JWT**:access token(2h,HS256)+ refresh token(7 天,存 PG 可撤销/轮换),Bearer + localStorage
- **公开白名单**:`GET /api/p/:slug`、`POST /api/forms`、`/api/healthz`、`POST /api/auth/login`、`POST /api/auth/refresh`(发布页 SSR、静态导出、表单收集均不受影响)
- **前端**:登录页 + 路由守卫 + 按钮权限显隐 + 用户管理页(仅 admin);api.ts 单点注入 token、401 静默续期
- **默认账号**:seed 创建 `admin / admin123`

权限矩阵:

| 权限点 | admin | editor | viewer |
|---|---|---|---|
| page:read / submission:read | ✓ | ✓ | ✓ |
| page:create / update / delete / publish / unpublish | ✓ | ✓ | — |
| user:read / create / update / delete | ✓ | — | — |

## 1. packages/schema — 契约与权限模型(src/index.ts 追加)

- `roleSchema = z.enum(["admin","editor","viewer"])`、`userDto`(id/username/name/role/enabled/createdAt)
- `PERMISSIONS` 常量数组、`ROLE_PERMISSIONS: Record<Role, Permission[]>`、`hasPermission(role, perm)` 工具
- 输入 DTO:`loginInput`、`refreshInput {refreshToken}`、`logoutInput`、`createUserInput`(username 1-50 / password min6 / name? / role)、`updateUserInput`(name?/role?/enabled?/password?)
- 响应 DTO:`tokenResponseDto { accessToken, refreshToken, user }`

## 2. apps/server — Prisma 模型与迁移

```prisma
enum Role { admin editor viewer }
model User {
  id String @id @default(cuid())
  username String @unique
  passwordHash String
  name String @default("")
  role Role @default(viewer)
  enabled Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  refreshTokens RefreshToken[]
}
model RefreshToken {
  id String @id @default(cuid())
  tokenHash String @unique   // sha256,不存原文
  userId String
  user User @relation(...)
  expiresAt DateTime
  createdAt DateTime @default(now())
  @@index([userId])
}
```

`pnpm db:migrate` 生成迁移。

## 3. apps/server — 认证基础库

- 新增 `src/lib/config.ts`:`JWT_SECRET`(无值时 dev 用固定默认值并警告)、`ACCESS_TOKEN_TTL=2h`、`REFRESH_TOKEN_TTL_DAYS=7`
- 新增依赖 `bcryptjs`(+ `@types/bcryptjs`);JWT 用 Hono 内置 `hono/jwt`(零新依赖)
- 新增 `src/lib/auth.ts`:
  - `hashPassword / verifyPassword`(bcryptjs,10 rounds)
  - `signAccessToken(user)`(payload: sub/username/role/type:"access")、`verifyAccessToken`
  - refresh token:crypto 随机 32B → base64url,存 sha256 哈希;`issueRefreshToken / rotateRefreshToken / revokeRefreshToken`
- 新增 `src/middleware/auth.ts`:
  - `authMiddleware`:挂 `/api/*`,内置公开白名单(集中正则表);解析 `Authorization: Bearer` → `c.set("authUser", …)`;失败 401(保持 `{ error }` 格式)
  - `requirePermission(perm)`:工厂中间件,`hasPermission` 不满足 → 403
- Hono 类型:`type AuthEnv = { Variables: { authUser: AuthUser } }`,各路由 `new Hono<AuthEnv>()`

## 4. apps/server — auth 与 users 路由

新增 `src/routes/auth.ts`:
- `POST /api/auth/login` — 登录限流(复用 `rateLimit`,`login:{ip}` 10次/分)→ 用户名+enabled 校验 → bcrypt 对比 → 签发双 token;失败统一 401「用户名或密码错误」
- `POST /api/auth/refresh` — 校验 refreshToken(哈希查库、未过期、用户 enabled)→ 轮换(删旧建新)→ 新 token 对
- `POST /api/auth/logout` — 撤销 refreshToken
- `GET /api/auth/me` — 返回当前用户(前端挂载时刷新角色)

新增 `src/routes/users.ts`(全部 `requirePermission("user:*")`):
- `GET /api/users` 列表(不含 passwordHash)、`POST /api/users` 创建、`PUT /api/users/:id`(name/role/enabled/password)、`DELETE /api/users/:id`
- 保护:不能删除自己;不能禁用或降级最后一个可用 admin(防锁死)

## 5. apps/server — 接入现有路由

- `src/app.ts`:`app.use("/api/*", authMiddleware)`(cors 之后)+ 挂载 auth/users 路由
- `src/routes/pages.ts`:GET 列表/详情/提交数据 → `page:read`;POST 新建/复制 → `page:create`;PUT → `page:update`;DELETE → `page:delete`;publish/unpublish → 对应权限
- `routes/public.ts`、`routes/forms.ts`、`routes/health.ts` 不动(白名单放行)

## 6. apps/server — seed 与环境变量

- `prisma/seed.ts`:User 表为空时创建 `admin / admin123`(role: admin)
- `apps/server/.env`、根 `.env.example`、`docker-compose.yml`(server 服务):补 `JWT_SECRET`

## 7. apps/web — API 层改造(src/lib/api.ts + 新 auth-client.ts)

- 新增 `src/lib/auth-client.ts`:localStorage 存取(`lc-at` / `lc-rt` / `lc-user`,与 `lc-theme` 模式一致)、`clearAuth()`、`getStoredUser()`
- `api.ts` 改造:
  - 自动注入 `Authorization: Bearer`
  - 收到 401 且有 refreshToken → 单飞(全局共享一个 refresh promise,防并发风暴)调 `/api/auth/refresh` → 更新存储 → 重试原请求一次;刷新失败 → `clearAuth()` → 跳 `/login?redirect=…`
  - 登录/刷新接口本身用裸 fetch,防死循环
- 新增 `src/components/auth/auth-provider.tsx`:React Context 存当前用户,挂载时调 `/api/auth/me` 刷新;提供 `useAuth()`(user、hasPermission、logout)

## 8. apps/web — 登录页与守卫

- 新增 `app/login/page.tsx`:Card + Input + Button(@lc/ui),品牌渐变背景;已登录则跳回;成功后跳 `redirect` 参数或 `/`
- `app/page.tsx`(管理页)与 `src/components/editor/editor-client.tsx`:未登录跳登录页

## 9. apps/web — 权限 UI 与用户管理页

- `app/page.tsx`:header 加用户 DropdownMenu(用户名/角色徽章、退出登录);admin 显示「用户管理」入口;新建/发布/删除等按钮按 `hasPermission` 显隐(viewer 纯只读)
- `src/components/editor/topbar.tsx`:加用户菜单(退出);发布按钮按权限显隐
- 新增 `app/users/page.tsx`(仅 admin,非 admin 跳回):用户列表、新建 Dialog、编辑 Dialog(名称/角色/启用/重置密码)、删除确认

## 10. apps/web — 导出接口去回源化(消除鉴权依赖)

- `pages/api/export/[pageId].ts`:GET→POST,接收 body `{ name, slug, title, schema }` 直接渲染,删除对 `GET /api/pages/:id` 的服务端回源
- `src/components/editor/topbar.tsx`:`<a href>` 改为按钮,fetch POST → blob → 触发下载(浏览器自带 token)

## 11. 文档

- README:功能列表、API 一览(auth/users 端点)、快速开始加默认账号与 JWT_SECRET 说明

## 验证步骤

1. `pnpm db:migrate` + `pnpm --filter server seed`(出 admin 账号)→ `pnpm dev`
2. curl 验证:无 token 访问 `/api/pages` 返回 401;登录得 token 后 200;viewer 角色调删除返回 403;`/api/p/:slug` 与 `POST /api/forms` 匿名可用
3. 浏览器走查:登录/登出、token 过期静默续期、viewer 只读(按钮隐藏)、admin 用户管理 CRUD、导出 HTML、发布页匿名访问
4. `pnpm build` 全仓编译通过
