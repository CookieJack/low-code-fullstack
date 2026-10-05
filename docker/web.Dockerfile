# ---------- 构建 ----------
FROM node:22-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /repo

# 先拷贝 manifest 利用层缓存(workspace 全量依赖)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/schema/package.json packages/schema/
COPY packages/materials/package.json packages/materials/
COPY packages/renderer/package.json packages/renderer/
COPY packages/ui/package.json packages/ui/
RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# 客户端 API 地址在构建期内联:同源部署留空,走 nginx 的 /api
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter web build

# ---------- 运行(Next standalone) ----------
FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
