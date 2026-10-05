import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Renderer } from "@lc/renderer";
import { pageSchemaSchema } from "@lc/schema";
import type { PageDetail } from "@lc/schema";

/** 静态导出中表单提交指向的公网 API(部署后可访问的平台地址) */
const SITE_API = process.env.SITE_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

/** 服务端回源地址(容器内指向 server 服务) */
const INTERNAL = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

async function fetchPage(pageId: string): Promise<PageDetail | null> {
  try {
    const res = await fetch(`${INTERNAL}/api/pages/${encodeURIComponent(pageId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PageDetail;
    return { ...data, schema: pageSchemaSchema.parse(data.schema) };
  } catch {
    return null;
  }
}

/** 收集 Next 构建产物中的编译后 CSS(Tailwind 已含全部物料类名)。
 *  兼容本地(dev/build 直接运行)与 standalone 容器(cwd 下 apps/web 层级)。 */
function collectCss(): string {
  const seen = new Set<string>();
  const chunks: string[] = [];
  const roots = [
    path.join(process.cwd(), ".next", "static", "css"),
    path.join(process.cwd(), "apps", "web", ".next", "static", "css"),
  ];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (name.endsWith(".css")) {
        const content = readFileSync(full, "utf8");
        if (!seen.has(content)) {
          seen.add(content);
          chunks.push(content);
        }
      }
    }
  };
  roots.forEach(walk);
  return chunks.join("\n");
}

const FORM_SCRIPT = `<script>
document.addEventListener("submit",function(e){
  var f=e.target;
  if(!f||!f.hasAttribute||!f.hasAttribute("data-lc-form"))return;
  e.preventDefault();
  var d={};
  new FormData(f).forEach(function(v,k){d[k]=String(v)});
  var b=f.querySelector("button[type=submit]");
  if(b)b.disabled=true;
  fetch(f.getAttribute("data-lc-form"),{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({pageId:f.getAttribute("data-lc-page"),componentId:f.getAttribute("data-lc-component"),data:d})
  }).then(function(r){
    if(!r.ok)throw new Error(String(r.status));
    f.outerHTML='<div style="padding:14px 16px;border-radius:8px;background:#ecfdf5;color:#047857;font-size:14px">'+(f.getAttribute("data-lc-success")||"提交成功")+"</div>";
  }).catch(function(){
    if(b)b.disabled=false;
    alert("提交失败,请稍后重试");
  });
});
</script>`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pageId = String(req.query.pageId ?? "");
  const page = await fetchPage(pageId);
  if (!page) {
    res.status(404).send("页面不存在");
    return;
  }

  const body = renderToStaticMarkup(
    createElement(Renderer, {
      schema: page.schema,
      mode: "export",
      context: { pageId: page.id, formApiUrl: SITE_API },
    }),
  );

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${page.schema.title || page.name}</title>
<style>${collectCss()}</style>
</head>
<body>
${body}
${FORM_SCRIPT}
</body>
</html>`;

  const filename = `${page.slug || page.name || "page"}.html`.replace(/[^\w.-]/g, "_");
  res
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    .status(200)
    .send(html);
}
