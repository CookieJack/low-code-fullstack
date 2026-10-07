import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Renderer } from "@lc/renderer";
import { applyGlobalBlocks, exportPageInput } from "@lc/schema";
import type { PageSchema, SiteSettings } from "@lc/schema";

/** 静态导出中表单提交指向的公网 API(部署后可访问的平台地址) */
const SITE_API = process.env.SITE_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

/** 服务端回源地址(SSR / 导出时读取站点设置) */
const INTERNAL_API = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

/** 导出的静态文件部署在任意外部域名,页内相对引用的上传图片需补全为平台绝对地址 */
function absolutizeUploads(html: string): string {
  if (!SITE_API) return html;
  return html
    .replaceAll('src="/api/uploads/', `src="${SITE_API}/api/uploads/`)
    .replaceAll("url(/api/uploads/", `url(${SITE_API}/api/uploads/`);
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

/** 页面数据由浏览器随请求传入(页面接口已纳入 JWT 鉴权,服务端回源不再可行),这里只负责渲染 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("方法不允许");
    return;
  }

  const parsed = exportPageInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).send("导出数据无效");
    return;
  }
  const page = parsed.data;
  const schema: PageSchema = page.schema;

  // 站点设置(失败按未配置处理):导出 HTML 与发布页观感一致
  let settings: SiteSettings = { themePrimary: null, navbarBlock: null, footerBlock: null };
  try {
    const settingsRes = await fetch(`${INTERNAL_API}/api/settings/site`, {
      signal: AbortSignal.timeout(3000),
    });
    if (settingsRes.ok) {
      settings = (await settingsRes.json()) as SiteSettings;
    }
  } catch {
    /* 站点设置获取失败不阻塞导出 */
  }

  const body = renderToStaticMarkup(
    createElement(Renderer, {
      schema: applyGlobalBlocks(schema, settings),
      mode: "export",
      themePrimary: settings.themePrimary,
      context: { pageId: String(req.query.pageId ?? ""), formApiUrl: SITE_API },
    }),
  );

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${schema.title || page.name}</title>
<style>${collectCss()}</style>
</head>
<body>
${absolutizeUploads(body)}
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
