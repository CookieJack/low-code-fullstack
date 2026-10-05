import type { CSSProperties } from "react";
import type { NodeStyle } from "@lc/schema";

/** 合并物料通用样式覆盖(背景/上下内边距)与物料自身默认样式 */
export function sectionStyle(
  style: NodeStyle | undefined,
  defaults: CSSProperties = {},
): CSSProperties {
  const s: CSSProperties = { ...defaults };
  if (style?.background) s.background = style.background;
  if (style?.paddingTop) s.paddingTop = style.paddingTop;
  if (style?.paddingBottom) s.paddingBottom = style.paddingBottom;
  return s;
}

/** 根据背景色亮度挑选可读的文字颜色 */
export function textColorFor(bg: string | undefined, fallback = "#ffffff"): string {
  const m = /^#([0-9a-f]{6})$/i.exec((bg ?? "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.65 ? "#0f172a" : "#ffffff";
}
