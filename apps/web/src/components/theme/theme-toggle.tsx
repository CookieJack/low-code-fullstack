"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@lc/ui";
import { useTheme } from "./theme-provider";

/** 亮/暗切换按钮:按当前生效主题取反 */
export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      title={resolved === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
