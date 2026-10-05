import Link from "next/link";
import { Globe } from "lucide-react";
import { Button } from "@lc/ui";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-500/10 to-transparent" />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand">
        <Globe className="h-7 w-7 text-white" />
      </div>
      <div className="text-center">
        <p className="text-brand-gradient text-7xl font-bold tracking-tight">404</p>
        <h1 className="mt-4 text-lg font-semibold">页面不存在</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          你访问的页面可能已被删除或从未发布
        </p>
      </div>
      <Button asChild>
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  );
}
