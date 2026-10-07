import { z } from "zod";

/* ------------------------------------------------------------------ */
/* 站点主题色:全局品牌色,驱动物料品牌色系(indigo/violet/fuchsia)整体换肤    */
/* ------------------------------------------------------------------ */

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/* ---------------- 品牌调色板推导 ---------------- */

/** Tailwind 明度阶梯相对 600 的偏移(以 indigo 阶梯为基准),仅用作分布权重 */
const SHADE_OFFSETS: Record<string, number> = {
  50: 0.483,
  100: 0.449,
  200: 0.382,
  300: 0.284,
  400: 0.177,
  500: 0.071,
  600: 0,
  700: -0.082,
  800: -0.151,
  900: -0.204,
  950: -0.312,
};
export const THEME_SHADES = Object.keys(SHADE_OFFSETS);

/** 明/暗两端的目标明度边界:浅端趋白、深端保留色相的近黑 */
const LIGHTEST = 0.97;
const DARKEST = 0.05;
const MAX_LIGHT_OFFSET = SHADE_OFFSETS[50];
const MAX_DARK_OFFSET = -SHADE_OFFSETS[950];

/**
 * 品牌色族:主色落在 indigo 族;violet/fuchsia 供渐变第二、三站
 * (from-indigo via-violet to-fuchsia)使用,做小幅色相偏移保持渐变层次。
 * Features 物料的多彩图标点缀刻意不在此列,不随主题变化。
 */
const THEME_FAMILIES: [string, number][] = [
  ["indigo", 0],
  ["violet", 16],
  ["fuchsia", 32],
];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * 由主色推导完整品牌调色板。主色即 600 档(按钮/强调色):
 * 浅于 600 的档位在主色与近白间按阶梯插值,深于 600 的在主色与近黑间插值,
 * 保证无论主色深浅,50/950 都不会溢出为纯白/纯黑且保留色相。
 */
export function buildBrandPalette(primary: string): Record<string, string> {
  const { h, s, l } = hexToHsl(primary);
  const out: Record<string, string> = {};
  for (const [family, hueShift] of THEME_FAMILIES) {
    for (const [shade, offset] of Object.entries(SHADE_OFFSETS)) {
      let target: number;
      if (offset > 0) {
        target = l + (offset / MAX_LIGHT_OFFSET) * (LIGHTEST - l);
      } else if (offset < 0) {
        target = l + (-offset / MAX_DARK_OFFSET) * (DARKEST - l);
      } else {
        target = l;
      }
      out[`--color-${family}-${shade}`] = hslToHex((h + hueShift) % 360, s, clamp01(target));
    }
  }
  return out;
}

/** 主色对应的 CSS 变量集合(空值返回空对象,渲染器不注入任何样式) */
export function themeCssVars(themePrimary: string | null | undefined): Record<string, string> {
  if (!themePrimary || !HEX_COLOR_RE.test(themePrimary)) return {};
  return buildBrandPalette(themePrimary);
}

/* ---------------- 页面域名绑定 ---------------- */

export const pageDomainDto = z.object({
  id: z.string(),
  domain: z.string(),
  createdAt: z.string(),
});
export type PageDomain = z.infer<typeof pageDomainDto>;

/** 域名:小写字母/数字/中划线与点,不支持端口与通配符(绑定的是解析到平台的具体域名) */
export const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

export const bindPageDomainInput = z.object({
  domain: z
    .string()
    .min(3, "请输入域名")
    .max(253)
    .transform((v) => v.trim().toLowerCase().replace(/\.$/, ""))
    .refine((v) => DOMAIN_RE.test(v), "域名格式无效(示例:www.example.com)"),
});

/** 匿名解析接口响应(middleware 用):host → 已发布页 slug */
export const domainResolveDto = z.object({ slug: z.string() });
export type DomainResolve = z.infer<typeof domainResolveDto>;
