import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { healthRoutes } from "./routes/health";
import { pagesRoutes } from "./routes/pages";
import { publicRoutes } from "./routes/public";
import { formRoutes } from "./routes/forms";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { roleRoutes } from "./routes/roles";
import { settingsRoutes } from "./routes/settings";
import { domainRoutes } from "./routes/domains";
import { uploadRoutes } from "./routes/uploads";
import { authMiddleware, type AuthEnv } from "./middleware/auth";

export const app = new Hono<AuthEnv>();

app.use("*", cors());
// 鉴权中间件:内置匿名白名单(发布页 / 表单提交 / 健康检查 / 登录与刷新)
app.use("/api/*", authMiddleware);

app.route("/", healthRoutes);
app.route("/api", healthRoutes);
app.route("/api/pages", pagesRoutes);
app.route("/api/p", publicRoutes);
app.route("/api/forms", formRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/roles", roleRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/domains", domainRoutes);
app.route("/api/uploads", uploadRoutes);

app.notFound((c) => c.json({ error: "接口不存在" }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[server] unhandled error:", err);
  return c.json({ error: "服务器内部错误" }, 500);
});
