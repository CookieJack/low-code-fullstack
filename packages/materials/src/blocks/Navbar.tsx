import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  brand: string;
  logoUrl: string;
  links: { label: string; href: string }[];
  ctaText: string;
  ctaHref: string;
};

function Navbar({ props, style }: MaterialComponentProps) {
  const {
    brand = "我的品牌",
    logoUrl = "",
    links = [
      { label: "首页", href: "#" },
      { label: "产品", href: "#" },
      { label: "关于我们", href: "#" },
    ],
    ctaText = "联系我们",
    ctaHref = "#",
  } = props as Partial<Props>;

  return (
    <header
      className="@container sticky top-0 z-40 w-full border-b border-black/5 backdrop-blur-md"
      style={sectionStyle(style, { background: "rgba(255,255,255,0.92)" })}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <a href="#" className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={brand} className="h-8 w-auto" />
          ) : (
            <span className="text-lg font-bold tracking-tight text-slate-900">{brand}</span>
          )}
        </a>

        <nav className="hidden items-center gap-8 @min-[768px]:flex">
          {links.map((l, i) => (
            <a
              key={i}
              href={l.href || "#"}
              className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {ctaText ? (
            <a
              href={ctaHref || "#"}
              className="hidden rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 @min-[640px]:inline-block"
            >
              {ctaText}
            </a>
          ) : null}
          <details className="relative @max-[767px]:block @min-[768px]:hidden">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {links.map((l, i) => (
                <a key={i} href={l.href || "#"} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  {l.label}
                </a>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export const navbarDef: MaterialDef = {
  type: "navbar",
  title: "导航栏",
  icon: "🧭",
  category: "基础",
  description: "Logo、菜单与行动按钮",
  defaultProps: {
    brand: "我的品牌",
    logoUrl: "",
    links: [
      { label: "首页", href: "#" },
      { label: "产品", href: "#" },
      { label: "关于我们", href: "#" },
    ],
    ctaText: "联系我们",
    ctaHref: "#",
  },
  propSchema: [
    { type: "text", key: "brand", label: "品牌名称" },
    { type: "url", key: "logoUrl", label: "Logo 图片地址", placeholder: "https://…" },
    {
      type: "array",
      key: "links",
      label: "菜单项",
      itemLabelKey: "label",
      defaultItem: { label: "新菜单", href: "#" },
      fields: [
        { type: "text", key: "label", label: "名称" },
        { type: "text", key: "href", label: "链接" },
      ],
    },
    { type: "text", key: "ctaText", label: "按钮文字" },
    { type: "text", key: "ctaHref", label: "按钮链接" },
  ],
  Component: Navbar,
};
