import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "低代码建站平台",
  description: "可视化拖拽生成并发布官网页面",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
