import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  columns: "2" | "3" | "4";
  items: { icon: string; title: string; desc: string }[];
};

const COLS: Record<string, string> = {
  "2": "@min-[640px]:grid-cols-2",
  "3": "@min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3",
  "4": "@min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4",
};

function Features({ props, style }: MaterialComponentProps) {
  const {
    title = "为什么选择我们",
    subtitle = "从性能到服务,我们为每一个细节投入心血。",
    columns = "3",
    items = [
      { icon: "⚡", title: "极速性能", desc: "全球加速节点,页面毫秒级打开。" },
      { icon: "🔒", title: "安全可靠", desc: "全链路加密,数据多重备份。" },
      { icon: "💬", title: "贴心服务", desc: "7×24 小时专属客服支持。" },
    ],
  } = props as Partial<Props>;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#ffffff" })}>
      <div className="mx-auto max-w-6xl px-6">
        {title ? (
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-500">{subtitle}</p> : null}
        <div className={`mt-12 grid gap-6 ${COLS[columns] ?? COLS["3"]}`}>
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                {item.icon || "✨"}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const featuresDef: MaterialDef = {
  type: "features",
  title: "特性网格",
  icon: "✨",
  category: "基础",
  description: "图标 + 标题 + 描述的卡片网格",
  defaultProps: {
    title: "为什么选择我们",
    subtitle: "从性能到服务,我们为每一个细节投入心血。",
    columns: "3",
    items: [
      { icon: "⚡", title: "极速性能", desc: "全球加速节点,页面毫秒级打开。" },
      { icon: "🔒", title: "安全可靠", desc: "全链路加密,数据多重备份。" },
      { icon: "💬", title: "贴心服务", desc: "7×24 小时专属客服支持。" },
    ],
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "textarea", key: "subtitle", label: "副标题" },
    {
      type: "select",
      key: "columns",
      label: "列数",
      options: [
        { label: "2 列", value: "2" },
        { label: "3 列", value: "3" },
        { label: "4 列", value: "4" },
      ],
    },
    {
      type: "array",
      key: "items",
      label: "特性项",
      itemLabelKey: "title",
      defaultItem: { icon: "✨", title: "新特性", desc: "特性描述" },
      fields: [
        { type: "text", key: "icon", label: "图标(emoji)" },
        { type: "text", key: "title", label: "标题" },
        { type: "textarea", key: "desc", label: "描述", rows: 2 },
      ],
    },
  ],
  Component: Features,
};
