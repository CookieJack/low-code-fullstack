import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  items: { q: string; a: string }[];
};

const DEFAULT_ITEMS = [
  { q: "是否支持免费试用?", a: "支持。注册即可免费试用全部功能 14 天,无需绑定支付方式,到期后可继续使用免费版。" },
  { q: "可以随时取消订阅吗?", a: "可以。订阅按月计费,随时可在账户设置中取消,取消后服务将持续到当前计费周期结束。" },
  { q: "数据安全如何保障?", a: "全链路 HTTPS 加密传输,数据多重异地备份,支持私有化部署以满足合规要求。" },
];

function Faq({ props, style, mode }: MaterialComponentProps) {
  const {
    title = "常见问题",
    subtitle = "没有找到答案?欢迎随时联系我们。",
    items = DEFAULT_ITEMS,
  } = props as Partial<Props>;

  const list = items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#ffffff" })}>
      <div className="mx-auto max-w-3xl px-6">
        {title ? (
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        {subtitle ? <p className="mt-4 text-center text-lg text-slate-500">{subtitle}</p> : null}
        <div className="mt-10 space-y-3">
          {list.map((item, i) => (
            <details
              key={i}
              open={mode === "edit" || undefined}
              className="group rounded-xl border border-slate-200 bg-white px-5 transition hover:border-slate-300 open:shadow-md open:shadow-slate-900/5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.q || "问题"}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg leading-none text-slate-500 transition-transform duration-200 group-open:rotate-45 group-open:bg-indigo-50 group-open:text-indigo-600">
                  +
                </span>
              </summary>
              <p className="whitespace-pre-line pb-4 leading-relaxed text-slate-500">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export const faqDef: MaterialDef = {
  type: "faq",
  title: "常见问题",
  icon: "❓",
  category: "基础",
  description: "可折叠的问答列表",
  defaultProps: {
    title: "常见问题",
    subtitle: "没有找到答案?欢迎随时联系我们。",
    items: DEFAULT_ITEMS,
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "text", key: "subtitle", label: "副标题" },
    {
      type: "array",
      key: "items",
      label: "问答",
      itemLabelKey: "q",
      defaultItem: { q: "新问题", a: "答案" },
      fields: [
        { type: "text", key: "q", label: "问题" },
        { type: "textarea", key: "a", label: "答案", rows: 3 },
      ],
    },
  ],
  Component: Faq,
};
