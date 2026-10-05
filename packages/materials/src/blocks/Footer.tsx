import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  brand: string;
  tagline: string;
  links: { label: string; href: string }[];
  copyright: string;
};

function Footer({ props, style }: MaterialComponentProps) {
  const {
    brand = "我的品牌",
    tagline = "用心做好每一件事。",
    links = [
      { label: "首页", href: "#" },
      { label: "产品", href: "#" },
      { label: "联系我们", href: "#" },
    ],
    copyright = "© 2026 我的品牌. 保留所有权利.",
  } = props as Partial<Props>;

  return (
    <footer
      className="@container w-full text-slate-300"
      style={sectionStyle(style, { paddingTop: 64, paddingBottom: 64, background: "#0f172a" })}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-8 @min-[768px]:flex-row">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
                {brand.trim().charAt(0) || "•"}
              </span>
              <span className="text-lg font-bold text-white">{brand}</span>
            </div>
            {tagline ? <p className="mt-2 max-w-xs text-sm" style={{ opacity: 0.65 }}>{tagline}</p> : null}
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {links.map((l, i) => (
              <a key={i} href={l.href || "#"} className="text-sm transition hover:text-white" style={{ opacity: 0.75 }}>
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-10 border-t pt-6 text-xs" style={{ borderColor: "rgba(255,255,255,0.1)", opacity: 0.5 }}>
          {copyright}
        </div>
      </div>
    </footer>
  );
}

export const footerDef: MaterialDef = {
  type: "footer",
  title: "页脚",
  icon: "🔻",
  category: "基础",
  description: "品牌信息与链接",
  defaultProps: {
    brand: "我的品牌",
    tagline: "用心做好每一件事。",
    links: [
      { label: "首页", href: "#" },
      { label: "产品", href: "#" },
      { label: "联系我们", href: "#" },
    ],
    copyright: "© 2026 我的品牌. 保留所有权利.",
  },
  propSchema: [
    { type: "text", key: "brand", label: "品牌名称" },
    { type: "textarea", key: "tagline", label: "一句话介绍" },
    {
      type: "array",
      key: "links",
      label: "链接",
      itemLabelKey: "label",
      defaultItem: { label: "新链接", href: "#" },
      fields: [
        { type: "text", key: "label", label: "名称" },
        { type: "text", key: "href", label: "链接" },
      ],
    },
    { type: "text", key: "copyright", label: "版权信息" },
  ],
  Component: Footer,
};
