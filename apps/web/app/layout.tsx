import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppToaster } from "@/components/theme/app-toaster";
import { AuthProvider } from "@/components/auth/auth-provider";

export const metadata: Metadata = {
  title: "低代码建站平台",
  description: "可视化拖拽生成并发布官网页面",
};

// 首屏渲染前同步主题,避免暗色用户看到白色闪烁
const themeInitScript = `(function(){try{var t=localStorage.getItem("lc-theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement.classList;d?r.add("dark"):r.remove("dark");document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
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
