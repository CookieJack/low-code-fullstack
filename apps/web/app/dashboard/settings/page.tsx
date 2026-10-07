"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Palette, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Input, Label, Skeleton } from "@lc/ui";
import { getMaterial } from "@lc/materials";
import { Renderer } from "@lc/renderer";
import { themeCssVars, type PageSchema, type SiteSettings } from "@lc/schema";
import { getSiteSettings, updateSiteSettings } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/components/auth/auth-provider";
import { UserMenu } from "@/components/auth/user-menu";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** 调色板全部变量名(#000000 仅为枚举键位,与色值无关) */
const ALL_THEME_VARS = Object.keys(themeCssVars("#000000"));

/** 保存后把品牌调色板即时写入 <html>,后台界面无需刷新即换肤 */
function applyThemeToRoot(primary: string | null) {
  const vars = themeCssVars(primary);
  const style = document.documentElement.style;
  for (const key of ALL_THEME_VARS) {
    const value = vars[key];
    if (value) style.setProperty(key, value);
    else style.removeProperty(key);
  }
}

/** 预设品牌色(与物料默认观感协调的一组常用主色) */
const PRESETS: { name: string; value: string }[] = [
  { name: "靛蓝", value: "#4f46e5" },
  { name: "宝蓝", value: "#2563eb" },
  { name: "青碧", value: "#0891b2" },
  { name: "翠绿", value: "#059669" },
  { name: "紫罗兰", value: "#7c3aed" },
  { name: "玫红", value: "#db2777" },
  { name: "暖橙", value: "#ea580c" },
  { name: "石墨", value: "#334155" },
];

/** 预览页面:Hero(品牌渐变按钮/标题)+ CTA(品牌底色),换色即时生效 */
function buildPreviewSchema(): PageSchema {
  const node = (id: string, type: string, overrides: Record<string, unknown> = {}) => ({
    id,
    type,
    props: { ...getMaterial(type)!.defaultProps, ...overrides },
  });
  return {
    version: 1,
    title: "主题预览",
    nodes: [
      node("pv-hero", "hero", {
        title: "品牌主题色预览",
        subtitle: "按钮、渐变与强调色将随主题色整体变化,发布页与导出 HTML 同步生效。",
        gradientTitle: true,
        height: "compact",
      }),
      node("pv-cta", "cta", { bgColor: "var(--color-indigo-600)" }),
    ],
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const { can } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SiteSettings | null>(null);
  const [themePrimary, setThemePrimary] = useState<string | null>(null);
  const [customHex, setCustomHex] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !can("site:settings")) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, can, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSiteSettings();
        if (!cancelled) {
          setSaved(s);
          setThemePrimary(s.themePrimary);
          setCustomHex(s.themePrimary ?? "");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "加载站点设置失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewSchema = useMemo(buildPreviewSchema, []);
  const dirty = themePrimary !== (saved?.themePrimary ?? null);
  const effective = themePrimary && HEX_RE.test(themePrimary) ? themePrimary : null;
  const adminPreviewStyle = themeCssVars(effective) as CSSProperties;

  function pick(value: string | null) {
    setThemePrimary(value);
    setCustomHex(value ?? "");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const next = await updateSiteSettings({ themePrimary: effective });
      setSaved(next);
      setThemePrimary(next.themePrimary);
      setCustomHex(next.themePrimary ?? "");
      applyThemeToRoot(next.themePrimary);
      toast.success("站点主题色已保存,后台界面与发布页即时生效");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const guardSkeleton = (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <Skeleton className="h-11 w-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  if (authLoading || (user && !can("site:settings"))) return guardSkeleton;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-500/10 via-indigo-500/[0.04] to-transparent" />

      <div className="relative mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" variant="ghost" title="返回页面列表">
              <a href="/dashboard">
                <ArrowLeft />
              </a>
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">站点设置</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                全局主题色:后台界面、编辑预览、发布页与静态导出统一换肤
              </p>
            </div>
          </div>
          <UserMenu />
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
          {/* 主题色配置 */}
          <section className="space-y-5 rounded-xl bg-card p-6 shadow-card">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-brand">
                <Palette className="h-4 w-4 text-white" />
              </span>
              <h2 className="font-semibold">主题色</h2>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>预设颜色</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {PRESETS.map((p) => {
                      const active = themePrimary?.toLowerCase() === p.value.toLowerCase();
                      return (
                        <button
                          key={p.value}
                          type="button"
                          title={p.name}
                          onClick={() => pick(p.value)}
                          className={`relative flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition hover:scale-105 ${
                            active ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : ""
                          }`}
                          style={{ background: p.value }}
                        >
                          {active ? <Check className="h-4 w-4 text-white" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme-hex">自定义颜色</Label>
                  <div className="flex items-center gap-2">
                    <label
                      title="点击取色"
                      className="relative block h-9 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md shadow-sm transition hover:ring-2 hover:ring-ring/30"
                    >
                      <span
                        className="absolute inset-0"
                        style={{ background: effective ?? "#4f46e5" }}
                      />
                      <input
                        type="color"
                        value={effective ?? "#4f46e5"}
                        onChange={(e) => pick(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                    <Input
                      id="theme-hex"
                      value={customHex}
                      placeholder="#rrggbb"
                      onChange={(e) => {
                        const v = e.target.value;
                        setCustomHex(v);
                        setThemePrimary(HEX_RE.test(v) ? v.toLowerCase() : null);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    主色即按钮/强调色(600 档),其余深浅由平台自动推导;后台界面与页面物料一并换肤,不配置则使用默认品牌色。
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button onClick={() => void handleSave()} disabled={!dirty || saving}>
                    <Save />
                    {saving ? "保存中…" : "保存"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!themePrimary || saving}
                    onClick={() => pick(null)}
                  >
                    <RotateCcw />
                    恢复默认
                  </Button>
                </div>
              </>
            )}
          </section>

          {/* 实时预览:页面物料 + 后台界面 */}
          <div className="space-y-6">
            <section className="overflow-hidden rounded-xl bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-black/5 px-5 py-3 dark:border-white/10">
                <h2 className="text-sm font-semibold">页面物料预览</h2>
                <span className="text-xs text-muted-foreground">
                  {effective ? `当前:${effective}` : "默认品牌色"}
                </span>
              </div>
              <Renderer schema={previewSchema} themePrimary={effective} mode="static" />
            </section>

            {/* theme-scope + 内联调色板:未保存的颜色也能局部预览后台控件换肤 */}
            <section
              className="theme-scope overflow-hidden rounded-xl bg-card shadow-card"
              style={adminPreviewStyle}
            >
              <div className="flex items-center justify-between border-b border-black/5 px-5 py-3 dark:border-white/10">
                <h2 className="text-sm font-semibold">后台界面预览</h2>
                <span className="text-xs text-muted-foreground">
                  按钮、徽标与输入框同步换肤
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <Button size="sm">
                  <Check />
                  主操作
                </Button>
                <Button size="sm" variant="outline">
                  次要操作
                </Button>
                <Input placeholder="输入框" className="h-8 w-36 text-xs" />
                <Badge>品牌徽标</Badge>
                <Badge variant="secondary">中性徽标</Badge>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
