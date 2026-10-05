"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@lc/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-red-500/10 to-transparent" />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
        <TriangleAlert className="h-7 w-7 text-red-500" />
      </div>
      <div className="text-center">
        <h1 className="text-lg font-semibold">页面出错了</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {error.message || "发生了意外错误，请重试"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" asChild>
          <a href="/">返回首页</a>
        </Button>
        <Button onClick={reset}>重试</Button>
      </div>
    </div>
  );
}
