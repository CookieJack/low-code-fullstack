import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { themeCssVars } from "@lc/schema";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppToaster } from "@/components/theme/app-toaster";
import { AuthProvider } from "@/components/auth/auth-provider";
import { fetchSiteSettings } from "@/lib/settings-server";

export const metadata: Metadata = {
  title: "低代码建站平台",
  description: "可视化拖拽生成并发布官网页面",
};

// 首屏渲染前同步主题,避免暗色用户看到白色闪烁
const themeInitScript = `(function(){try{var t=localStorage.getItem("lc-theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement.classList;d?r.add("dark"):r.remove("dark");document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 品牌调色板注入 <html>:后台界面(globals.css 语义色引用 --color-* 变量)
  // 与页面物料一同跟随站点主题色换肤;色阶值亮暗模式一致,内联在根元素即可。
  const settings = await fetchSiteSettings();
  const themeStyle = themeCssVars(settings.themePrimary) as CSSProperties;

  return (
    <html lang="zh-CN" suppressHydrationWarning style={themeStyle}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <AppToaster />
      </body>
    </html>
  );
}
