import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  items: { value: string; suffix: string; label: string }[];
};

const DEFAULT_ITEMS = [
  { value: "50,000", suffix: "+", label: "创建的页面" },
  { value: "99.9", suffix: "%", label: "服务可用性" },
  { value: "120", suffix: "ms", label: "平均响应" },
  { value: "3,000", suffix: "+", label: "企业客户" },
];

function Stats({ props, style }: MaterialComponentProps) {
  const { items } = props as Partial<Props>;
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 64, paddingBottom: 64, background: "#0f172a" })}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 @min-[768px]:grid-cols-4">
        {list.map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl font-bold tracking-tight text-white @min-[768px]:text-4xl">
              {item.value || "0"}
              <span className="text-indigo-400">{item.suffix || ""}</span>
            </div>
            <div className="mt-2 text-sm text-slate-400">{item.label || "指标"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export const statsDef: MaterialDef = {
  type: "stats",
  title: "统计数字",
  icon: "📊",
  category: "内容",
  description: "关键数据指标展示",
  defaultProps: {
    items: DEFAULT_ITEMS,
  },
  propSchema: [
    {
      type: "array",
      key: "items",
      label: "指标",
      itemLabelKey: "label",
      defaultItem: { value: "100", suffix: "+", label: "指标名称" },
      maxItems: 6,
      fields: [
        { type: "text", key: "value", label: "数值" },
        { type: "text", key: "suffix", label: "单位/后缀" },
        { type: "text", key: "label", label: "说明" },
      ],
    },
  ],
  Component: Stats,
};
