import { Globe } from "lucide-react";
import { Button } from "@lc/ui";

/** 根路径引导页:站点还没有已发布首页时,给访客一句话和进入后台的按钮 */
export function HomeGuide() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand">
        <Globe className="h-7 w-7 text-white" />
      </div>
      <p className="text-lg text-muted-foreground">该站点还没有发布首页</p>
      <Button asChild>
        <a href="/dashboard">进入后台</a>
      </Button>
    </div>
  );
}
