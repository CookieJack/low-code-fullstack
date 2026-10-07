import { useId, type CSSProperties } from "react";
import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

/** 菜单项:children 可选,最多三层(一级 → 二级 → 三级) */
type NavLink = {
  label: string;
  href: string;
  children?: NavLink[];
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** 兜底:剔除脏数据;children 为空数组视为无子菜单(降级为普通链接) */
function normalizeLinks(value: unknown): NavLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
    .map((l) => {
      const label = typeof l.label === "string" ? l.label : "";
      const href = typeof l.href === "string" ? l.href : "#";
      const children = normalizeLinks(l.children);
      return { label, href, ...(children.length > 0 ? { children } : {}) };
    });
}

/** 品牌展示模式:名称 + Logo / 仅名称 / 仅 Logo */
type BrandMode = "both" | "name" | "logo";

/** 当前菜单项高亮:仅比较站内绝对路径(锚点、外链不参与) */
function normalizePath(href: string): string | null {
  if (!href.startsWith("/")) return null;
  const path = href.split("#")[0].split("?")[0];
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function isPathActive(href: string, currentPath: string): boolean {
  const path = normalizePath(href);
  if (!path || !currentPath) return false;
  if (path === "/") return currentPath === "/";
  return currentPath === path || currentPath.startsWith(`${path}/`);
}

/** 菜单项自身或任一子孙命中当前路径(父级随子级联动高亮) */
function linkActive(link: NavLink, currentPath: string): boolean {
  return (
    isPathActive(link.href, currentPath) ||
    (link.children ?? []).some((c) => linkActive(c, currentPath))
  );
}

const TOP_ACTIVE =
  "relative font-semibold text-indigo-600 after:absolute after:-bottom-2 after:left-1/2 after:h-0.5 after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-indigo-600 after:content-['']";
const TOP_IDLE = "font-medium text-slate-600 transition hover:text-indigo-600";

function leafLinkClass(active: boolean) {
  return active
    ? "block rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600"
    : "block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-indigo-600";
}

/** 桌面端一级菜单:有子菜单时悬停/聚焦展开二级面板 */
function DesktopLink({ link, currentPath }: { link: NavLink; currentPath: string }) {
  const active = linkActive(link, currentPath);
  const children = link.children ?? [];
  if (children.length === 0) {
    return (
      <a href={link.href || "#"} className={`text-sm ${active ? TOP_ACTIVE : TOP_IDLE}`}>
        {link.label}
      </a>
    );
  }
  return (
    <div className="group/root relative">
      <a
        href={link.href || "#"}
        className={`flex items-center gap-1 text-sm ${active ? TOP_ACTIVE : TOP_IDLE}`}
      >
        {link.label}
        <ChevronDownIcon className="transition group-hover/root:rotate-180" />
      </a>
      {/* pt-2 撑出悬停桥,鼠标移向面板时 group-hover 不中断 */}
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover/root:visible group-hover/root:opacity-100 group-focus-within/root:visible group-focus-within/root:opacity-100">
        <div className="w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {children.map((c, i) => (
            <DesktopSubLink key={i} link={c} currentPath={currentPath} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 桌面端二级菜单:若有三级子菜单,向右飞出 */
function DesktopSubLink({ link, currentPath }: { link: NavLink; currentPath: string }) {
  const active = linkActive(link, currentPath);
  const children = link.children ?? [];
  if (children.length === 0) {
    return (
      <a href={link.href || "#"} className={leafLinkClass(active)}>
        {link.label}
      </a>
    );
  }
  return (
    <div className="group/sub relative">
      <a
        href={link.href || "#"}
        className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${
          active
            ? "bg-indigo-50 font-medium text-indigo-600"
            : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
        }`}
      >
        {link.label}
        <ChevronRightIcon className="text-slate-400" />
      </a>
      {/* pl-1.5 为横向悬停桥 */}
      <div className="invisible absolute left-full top-0 z-50 pl-1.5 opacity-0 transition group-hover/sub:visible group-hover/sub:opacity-100 group-focus-within/sub:visible group-focus-within/sub:opacity-100">
        <div className="w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {children.map((c, i) => (
            <a key={i} href={c.href || "#"} className={leafLinkClass(isPathActive(c.href, currentPath))}>
              {c.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 移动端全屏抽屉菜单项:子菜单用嵌套 details 手风琴展开(无 JS) */
function MobileLink({
  link,
  depth = 0,
  currentPath,
}: {
  link: NavLink;
  depth?: number;
  currentPath: string;
}) {
  const children = link.children ?? [];
  const active = linkActive(link, currentPath);
  const rowClass =
    depth === 0
      ? `rounded-lg px-3 py-3 text-[15px] font-medium ${
          active ? "bg-indigo-50 text-indigo-600" : "text-slate-800 hover:bg-slate-50 hover:text-indigo-600"
        }`
      : `rounded-lg px-3 py-2.5 text-sm ${
          active
            ? "bg-indigo-50 font-medium text-indigo-600"
            : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
        }`;
  if (children.length === 0) {
    return (
      <a href={link.href || "#"} className={`block ${rowClass}`}>
        {link.label}
      </a>
    );
  }
  return (
    <details className="group/m">
      <summary className={`flex cursor-pointer list-none items-center justify-between ${rowClass}`}>
        {link.label}
        <ChevronDownIcon className="transition group-open/m:rotate-180" />
      </summary>
      <div className="ml-3 border-l border-slate-100">
        {children.map((c, i) => (
          <MobileLink key={i} link={c} depth={depth + 1} currentPath={currentPath} />
        ))}
      </div>
    </details>
  );
}

function Navbar({ props, style, context }: MaterialComponentProps) {
  const {
    brand = "我的品牌",
    logoUrl = "",
    brandMode: rawBrandMode,
    links: rawLinks = [
      { label: "首页", href: "#" },
      { label: "产品", href: "#" },
      { label: "关于我们", href: "#" },
    ],
    ctaText = "联系我们",
    ctaHref = "#",
  } = props as Partial<Props>;
  // 旧数据无该字段或取值非法时回退为「名称 + Logo」
  const brandMode: BrandMode =
    rawBrandMode === "name" || rawBrandMode === "logo" ? rawBrandMode : "both";
  const links = normalizeLinks(rawLinks);
  const currentPath = context?.currentPath ?? "";
  const menuId = `lc-nav-${useId().replace(/\W/g, "")}`;
  const { background, ...frameStyle } = sectionStyle(style, {
    background: "rgba(255,255,255,0.92)",
  }) as CSSProperties;

  // 仅 Logo 但未配置图片时回退为名称,避免品牌位空缺
  const showLogo = Boolean(logoUrl) && brandMode !== "name";
  const showName =
    brandMode === "both" || brandMode === "name" || (brandMode === "logo" && !logoUrl);

  const brandMark = (
    <>
      {showLogo ? <img src={logoUrl} alt={brand} className="h-8 w-auto" /> : null}
      {showName ? (
        <span className="text-lg font-bold tracking-tight text-slate-900">{brand}</span>
      ) : null}
    </>
  );

  return (
    <header
      className="@container sticky top-0 z-40 w-full border-b border-black/5"
      style={frameStyle}
    >
      {/* 磨砂层独立成子层:backdrop-filter 会让自身子树的 fixed 失去视口基准,遮罩不能挂在其下 */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 backdrop-blur-md"
        style={background ? { background } : undefined}
      />

      {/* 移动端菜单开关:纯 CSS checkbox 方案,导出静态页同样可用 */}
      <input id={menuId} type="checkbox" className="peer/menu sr-only" />

      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <a href="#" className="flex items-center gap-2.5">
          {brandMark}
        </a>

        <nav className="hidden items-center gap-8 @min-[768px]:flex">
          {links.map((l, i) => (
            <DesktopLink key={i} link={l} currentPath={currentPath} />
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
          <label
            htmlFor={menuId}
            aria-label="打开菜单"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 @min-[768px]:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
        </div>
      </div>

      {/* 移动端全屏遮罩 + 全高抽屉;容器查询保证桌面端永不出现 */}
      <div className="invisible fixed inset-0 z-50 opacity-0 transition-[opacity,visibility] duration-200 @max-[767px]:peer-checked/menu:visible @max-[767px]:peer-checked/menu:opacity-100">
        <label
          htmlFor={menuId}
          aria-label="关闭菜单"
          className="absolute inset-0 cursor-pointer bg-slate-900/50 backdrop-blur-sm"
        />
        <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/5 px-5">
            {brandMark}
            <label
              htmlFor={menuId}
              aria-label="关闭菜单"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </label>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {links.map((l, i) => (
              <MobileLink key={i} link={l} currentPath={currentPath} />
            ))}
          </nav>
          {ctaText ? (
            <div className="shrink-0 border-t border-black/5 p-4">
              <a
                href={ctaHref || "#"}
                className="block rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500"
              >
                {ctaText}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

type Props = {
  brand: string;
  logoUrl: string;
  brandMode: BrandMode;
  links: NavLink[];
  ctaText: string;
  ctaHref: string;
};

export const navbarDef: MaterialDef = {
  type: "navbar",
  title: "导航栏",
  icon: "🧭",
  category: "基础",
  description: "品牌展示、多级下拉菜单、当前页高亮与行动按钮",
  defaultProps: {
    brand: "我的品牌",
    logoUrl: "",
    brandMode: "both",
    links: [
      { label: "首页", href: "#" },
      {
        label: "产品",
        href: "#",
        children: [
          { label: "产品概览", href: "#" },
          {
            label: "解决方案",
            href: "#",
            children: [
              { label: "电商行业", href: "#" },
              { label: "教育行业", href: "#" },
            ],
          },
          { label: "更新日志", href: "#" },
        ],
      },
      { label: "关于我们", href: "#" },
    ],
    ctaText: "联系我们",
    ctaHref: "#",
  },
  propSchema: [
    { type: "text", key: "brand", label: "品牌名称" },
    { type: "image", key: "logoUrl", label: "Logo 图片", placeholder: "https://…" },
    {
      type: "select",
      key: "brandMode",
      label: "品牌展示",
      options: [
        { label: "名称 + Logo", value: "both" },
        { label: "仅名称", value: "name" },
        { label: "仅 Logo", value: "logo" },
      ],
    },
    {
      type: "array",
      key: "links",
      label: "菜单项(一级)",
      itemLabelKey: "label",
      defaultItem: { label: "新菜单", href: "#" },
      fields: [
        { type: "text", key: "label", label: "名称" },
        { type: "text", key: "href", label: "链接" },
        {
          type: "array",
          key: "children",
          label: "子菜单(二级)",
          itemLabelKey: "label",
          defaultItem: { label: "新子菜单", href: "#" },
          fields: [
            { type: "text", key: "label", label: "名称" },
            { type: "text", key: "href", label: "链接" },
            {
              type: "array",
              key: "children",
              label: "子菜单(三级)",
              itemLabelKey: "label",
              defaultItem: { label: "新菜单项", href: "#" },
              fields: [
                { type: "text", key: "label", label: "名称" },
                { type: "text", key: "href", label: "链接" },
              ],
            },
          ],
        },
      ],
    },
    { type: "text", key: "ctaText", label: "按钮文字" },
    { type: "text", key: "ctaHref", label: "按钮链接" },
  ],
  Component: Navbar,
};
