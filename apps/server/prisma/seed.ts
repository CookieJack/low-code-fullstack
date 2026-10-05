import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { landingTemplate } from "../src/templates";

const db = new PrismaClient();

async function main() {
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
