import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_PERMISSIONS, ROLE_LABELS } from "@lc/schema";
import { landingTemplate, eventTemplate } from "../src/templates";

const db = new PrismaClient();

const SYSTEM_ROLES = ["admin", "editor", "viewer"] as const;

const SYSTEM_ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "内置角色:全部权限,不可修改",
  editor: "内置角色:管理页面并可发布",
  viewer: "内置角色:只读",
};

/** 内置角色幂等 upsert:权限以 @lc/schema 的默认映射为准 */
async function seedRoles() {
  for (const key of SYSTEM_ROLES) {
    await db.role.upsert({
      where: { key },
      create: {
        key,
        name: ROLE_LABELS[key],
        description: SYSTEM_ROLE_DESCRIPTIONS[key],
        permissions: [...DEFAULT_ROLE_PERMISSIONS[key]],
        isSystem: true,
      },
      update: {
        name: ROLE_LABELS[key],
        permissions: key === "admin" ? [...DEFAULT_ROLE_PERMISSIONS.admin] : undefined,
        isSystem: true,
      },
    });
  }
  console.log("内置角色已就绪(admin / editor / viewer)");
}

/** 内置模板:仅在模板库为空时插入(幂等) */
async function seedTemplates() {
  const count = await db.pageTemplate.count();
  if (count > 0) {
    console.log("已存在模板,跳过模板 seed");
    return;
  }
  await db.pageTemplate.createMany({
    data: [
      {
        name: "官网落地页",
        description: "经典官网首页:页头导航 + 首屏大图 + 优势展示 + 联系表单 + 页脚。",
        category: "site",
        schema: landingTemplate("星辰科技 - 一站式数字化解决方案") as object,
      },
      {
        name: "活动报名页",
        description: "活动宣传与报名:首屏议程亮点 + 报名表单,营销场景快速起步。",
        category: "marketing",
        schema: eventTemplate("2026 城市开发者大会 · 报名中") as object,
      },
    ],
  });
  console.log("已内置 2 个模板(官网落地页 / 活动报名页)");
}

async function main() {
  await seedRoles();
  await seedTemplates();

  // 首任管理员:仅当没有任何用户时创建
  const userCount = await db.user.count();
  if (userCount === 0) {
    await db.user.create({
      data: {
        username: "admin",
        passwordHash: await bcrypt.hash("admin123", 10),
        name: "管理员",
        role: "admin",
      },
    });
    console.log("已创建管理员账号 admin / admin123(请尽快在「用户管理」中修改密码)");
  } else {
    console.log("已存在用户,跳过管理员 seed");
  }

  const count = await db.page.count();
  if (count > 0) {
    console.log("已存在页面,跳过 seed");
    return;
  }
  await db.page.create({
    data: {
      name: "官网首页",
      title: "星辰科技 - 一站式数字化解决方案",
      schema: landingTemplate("星辰科技 - 一站式数字化解决方案") as object,
      status: "draft",
    },
  });
  console.log("已创建演示页面「官网首页」(含落地页模板)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
