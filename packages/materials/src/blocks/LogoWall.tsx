import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  items: { name: string; logo: string }[];
};

const DEFAULT_ITEMS = [
  { name: "星河科技", logo: "" },
  { name: "云端传媒", logo: "" },
  { name: "远航资本", logo: "" },
  { name: "极光工作室", logo: "" },
  { name: "白杨教育", logo: "" },
  { name: "青柠生活", logo: "" },
];

function LogoWall({ props, style }: MaterialComponentProps) {
  const { title = "他们都在使用", items } = props as Partial<Props>;
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 64, paddingBottom: 64, background: "#ffffff" })}>
      <div className="mx-auto max-w-6xl px-6">
        {title ? <p className="text-center text-sm font-medium uppercase tracking-widest text-slate-400">{title}</p> : null}
        <div className="mt-8 grid grid-cols-2 gap-4 @min-[640px]:grid-cols-3 @min-[1024px]:grid-cols-6">
          {list.map((item, i) => (
            <div
              key={i}
              className="flex h-20 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-4 transition hover:border-slate-200 hover:bg-white hover:shadow-sm"
            >
              {item.logo ? (
                <img src={item.logo} alt={item.name || "合作伙伴"} className="max-h-10 max-w-full object-contain opacity-70 transition hover:opacity-100" />
              ) : (
                <span className="truncate text-sm font-semibold text-slate-400">{item.name || "Logo"}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const logoWallDef: MaterialDef = {
  type: "logo-wall",
  title: "合作伙伴",
  icon: "🏢",
  category: "内容",
  description: "Logo 墙 / 客户展示",
  defaultProps: {
    title: "他们都在使用",
    items: DEFAULT_ITEMS,
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    {
      type: "array",
      key: "items",
      label: "合作伙伴",
      itemLabelKey: "name",
      defaultItem: { name: "公司名称", logo: "" },
      fields: [
        { type: "text", key: "name", label: "名称" },
        { type: "image", key: "logo", label: "Logo 图片(留空显示名称)" },
      ],
    },
  ],
  Component: LogoWall,
};
