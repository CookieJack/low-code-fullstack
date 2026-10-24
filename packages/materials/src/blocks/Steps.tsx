import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  items: { title: string; desc: string }[];
};

const DEFAULT_ITEMS = [
  { title: "选择模板", desc: "从模板库挑选一个接近目标的起点。" },
  { title: "拖拽搭建", desc: "把组件拖进画布,像搭积木一样组装页面。" },
  { title: "发布上线", desc: "一键发布,绑定域名即可对外访问。" },
];

function Steps({ props, style }: MaterialComponentProps) {
  const { title = "如何开始", subtitle = "三步搞定,无需任何代码。", items } = props as Partial<Props>;
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#f8fafc" })}>
      <div className="mx-auto max-w-6xl px-6">
        {title ? (
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        {subtitle ? <p className="mt-4 text-center text-lg text-slate-500">{subtitle}</p> : null}
        <ol className="mt-12 grid gap-10 @min-[768px]:grid-cols-3 @min-[768px]:gap-6">
          {list.map((item, i) => (
            <li key={i} className="relative flex flex-col items-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/30">
                {i + 1}
              </span>
              {i < list.length - 1 ? (
                <span className="absolute left-[calc(50%+40px)] top-7 hidden h-0.5 w-[calc(100%-80px)] bg-slate-200 @min-[768px]:block" />
              ) : null}
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title || `步骤 ${i + 1}`}</h3>
              {item.desc ? <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{item.desc}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export const stepsDef: MaterialDef = {
  type: "steps",
  title: "步骤流程",
  icon: "🪜",
  category: "内容",
  description: "流程说明 / 使用步骤",
  defaultProps: {
    title: "如何开始",
    subtitle: "三步搞定,无需任何代码。",
    items: DEFAULT_ITEMS,
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "text", key: "subtitle", label: "副标题" },
    {
      type: "array",
      key: "items",
      label: "步骤",
      itemLabelKey: "title",
      defaultItem: { title: "步骤标题", desc: "步骤说明" },
      fields: [
        { type: "text", key: "title", label: "标题" },
        { type: "textarea", key: "desc", label: "描述", rows: 2 },
      ],
    },
  ],
  Component: Steps,
};
