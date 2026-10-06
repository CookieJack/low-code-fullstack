import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { landingTemplate } from "../src/templates";

const db = new PrismaClient();

async function main() {
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
