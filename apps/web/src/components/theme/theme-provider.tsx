"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "lc-theme";
const COLOR_MODE_KEY = "lc-color-mode";

type ThemeContextValue = {
  /** 用户偏好(可能为 system) */
  theme: Theme;
  /** 实际生效的主题 */
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
  /** 全灰色模式:独立于亮暗的开关,可叠加;仅 admin 角色可见可用 */
  grayscale: boolean;
  setGrayscale: (grayscale: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
  grayscale: false,
  setGrayscale: () => {},
});

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** 把主题应用到 html 元素上 */
export function applyTheme(theme: Theme): "light" | "dark" {
  const resolved = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  return resolved;
}

/** 把全灰色模式应用到 html 元素上(着色见 globals.css 的 html.grayscale 变量块) */
export function applyGrayscale(grayscale: boolean): void {
  document.documentElement.classList.toggle("grayscale", grayscale);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 无闪烁脚本已在 hydration 前设置好 class,这里读回真实状态
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [grayscale, setGrayscaleState] = useState(false);
  // 灰度仅 admin 生效;登录态就绪后按角色校正(设置存 localStorage,需防止同浏览器其他角色被波及)
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    setResolved(applyTheme(stored));
  }, []);

  // 灰度跟随角色:登录态就绪后,非 admin(含未登录)一律不生效;
  // 存储偏好保留,admin 再登录同浏览器时自动恢复
  useEffect(() => {
    if (loading) return;
    const active = isAdmin && localStorage.getItem(COLOR_MODE_KEY) === "grayscale";
    setGrayscaleState(active);
    applyGrayscale(active);
  }, [loading, isAdmin]);

  // 跟随系统切换(仅 system 模式)
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    setResolved(applyTheme(next));
  }, []);

  const setGrayscale = useCallback((next: boolean) => {
    setGrayscaleState(next);
    localStorage.setItem(COLOR_MODE_KEY, next ? "grayscale" : "color");
    applyGrayscale(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, grayscale, setGrayscale }),
    [theme, resolved, setTheme, grayscale, setGrayscale],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
