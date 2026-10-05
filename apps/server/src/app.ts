import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { healthRoutes } from "./routes/health";
import { pagesRoutes } from "./routes/pages";
import { publicRoutes } from "./routes/public";
import { formRoutes } from "./routes/forms";

export const app = new Hono();

app.use("*", cors());

app.route("/", healthRoutes);
app.route("/api", healthRoutes);
app.route("/api/pages", pagesRoutes);
app.route("/api/p", publicRoutes);
app.route("/api/forms", formRoutes);

app.notFound((c) => c.json({ error: "接口不存在" }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[server] unhandled error:", err);
  return c.json({ error: "服务器内部错误" }, 500);
});
