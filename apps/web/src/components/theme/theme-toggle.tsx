"use client";

import { Check, Contrast, Monitor, Moon, Sun } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lc/ui";
import { useTheme } from "./theme-provider";

/** 主题菜单项:当前偏好打勾 */
function ThemeItem({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <DropdownMenuItem onClick={onClick}>
      {icon}
      {label}
      {selected ? <Check className="ml-auto" /> : null}
    </DropdownMenuItem>
  );
}

/** 主题切换:亮色/暗色/跟随系统 三选一,附全灰色模式开关(与亮暗叠加) */
export function ThemeToggle() {
  const { theme, resolved, setTheme, grayscale, setGrayscale } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="主题" aria-label="主题设置">
          {theme === "system" ? (
            <Monitor className="h-4 w-4" />
          ) : resolved === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <ThemeItem selected={theme === "light"} onClick={() => setTheme("light")} icon={<Sun />} label="亮色" />
        <ThemeItem selected={theme === "dark"} onClick={() => setTheme("dark")} icon={<Moon />} label="暗色" />
        <ThemeItem
          selected={theme === "system"}
          onClick={() => setTheme("system")}
          icon={<Monitor />}
          label="跟随系统"
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setGrayscale(!grayscale)} title="去除全部色彩,可叠加亮/暗色使用">
          <Contrast />
          全灰色模式
          {grayscale ? <Check className="ml-auto" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
