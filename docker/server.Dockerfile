# ---------- 构建 ----------
FROM node:22-alpine AS build
RUN apk add --no-cache libc6-compat openssl
WORKDIR /repo

# 先拷贝 manifest 利用层缓存
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/schema/package.json packages/schema/
RUN corepack enable && pnpm install --frozen-lockfile --filter server...

COPY tsconfig.base.json ./
COPY packages/schema packages/schema
COPY apps/server apps/server

# tsup 打包(external: prisma 系)
RUN pnpm --filter server build

# 裁剪出生产依赖(含 prisma CLI / @prisma/client)
RUN pnpm --filter server deploy --prod --ignore-scripts --legacy /deployed

# ---------- 运行 ----------
FROM node:22-alpine
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /deployed ./

# deploy --ignore-scripts 跳过了 client 的 postinstall,这里显式生成客户端
RUN node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma

EXPOSE 3001
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/index.js"]
