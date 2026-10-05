"use client";

import { Toaster } from "sonner";
import { useTheme } from "./theme-provider";

/** 跟随平台主题的 toast 容器 */
export function AppToaster() {
  const { resolved } = useTheme();
  return <Toaster position="top-center" richColors theme={resolved} />;
}
