import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  items: { time: string; title: string; desc: string }[];
};

const DEFAULT_ITEMS = [
  { time: "2023.06", title: "项目启动", desc: "确定产品方向,完成核心团队组建。" },
  { time: "2023.12", title: "首个版本上线", desc: "拖拽编辑器与发布流程跑通,首批种子用户接入。" },
  { time: "2024.08", title: "用户破万", desc: "上线协作与模板市场,单月新增页面超过 5 万个。" },
  { time: "2025.05", title: "全面开放", desc: "开放 API 与生态插件,服务更多行业客户。" },
];

function Timeline({ props, style }: MaterialComponentProps) {
  const { title = "发展历程", items } = props as Partial<Props>;
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#ffffff" })}>
      <div className="mx-auto max-w-3xl px-6">
        {title ? (
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        <ol className="relative mt-12 space-y-10 border-l-2 border-slate-200 pl-8">
          {list.map((item, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[41px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-indigo-500 bg-white">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              {item.time ? (
                <div className="text-sm font-semibold tracking-wide text-indigo-600">{item.time}</div>
              ) : null}
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.title || "节点标题"}</h3>
              {item.desc ? <p className="mt-1.5 leading-relaxed text-slate-500">{item.desc}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export const timelineDef: MaterialDef = {
  type: "timeline",
  title: "时间线",
  icon: "🕐",
  category: "内容",
  description: "发展历程 / 节点列表",
  defaultProps: {
    title: "发展历程",
    items: DEFAULT_ITEMS,
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    {
      type: "array",
      key: "items",
      label: "节点",
      itemLabelKey: "title",
      defaultItem: { time: "2025.01", title: "节点标题", desc: "节点描述" },
      fields: [
        { type: "text", key: "time", label: "时间" },
        { type: "text", key: "title", label: "标题" },
        { type: "textarea", key: "desc", label: "描述", rows: 2 },
      ],
    },
  ],
  Component: Timeline,
};
