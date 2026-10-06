-- 动态角色:内置三角色入库;页面协作:PageMember + Page.visibility
-- 注意:旧枚举类型 "Role" 与新表 "Role" 同名,必须先把列转为 text 并删除枚举,再建表。

-- 1. User.role 枚举 → text
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
DROP TYPE "Role";

-- 2. Role 表(内置角色随即回填,供下面的外键引用)
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

INSERT INTO "Role" ("id", "key", "name", "description", "permissions", "isSystem", "createdAt", "updatedAt") VALUES
  (
    'role_admin', 'admin', '管理员', '内置角色:全部权限,不可修改',
    ARRAY[
      'page:read','page:create','page:update','page:delete','page:publish','page:unpublish','page:share',
      'submission:read',
      'user:read','user:create','user:update','user:delete',
      'role:read','role:create','role:update','role:delete'
    ]::TEXT[],
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'role_editor', 'editor', '编辑', '内置角色:管理页面并可发布',
    ARRAY[
      'page:read','page:create','page:update','page:delete','page:publish','page:unpublish','page:share',
      'submission:read'
    ]::TEXT[],
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'role_viewer', 'viewer', '访客', '内置角色:只读',
    ARRAY['page:read','submission:read']::TEXT[],
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'viewer';
ALTER TABLE "User" ADD CONSTRAINT "User_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("key") ON UPDATE RESTRICT ON DELETE RESTRICT;

-- 3. 页面可见性
ALTER TABLE "Page" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'inherit';

-- 4. 页面协作成员
CREATE TABLE "PageMember" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageMember_pageId_userId_key" ON "PageMember"("pageId", "userId");
CREATE INDEX "PageMember_userId_idx" ON "PageMember"("userId");

ALTER TABLE "PageMember" ADD CONSTRAINT "PageMember_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageMember" ADD CONSTRAINT "PageMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
