import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Plan = {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string;
  buttonText: string;
  buttonHref: string;
  highlight: boolean;
};

type Props = {
  title: string;
  subtitle: string;
  plans: Plan[];
  columns: "2" | "3" | "4";
};

const COLS: Record<string, string> = {
  "2": "@min-[640px]:grid-cols-2",
  "3": "@min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3",
  "4": "@min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4",
};

const DEFAULT_PLANS: Plan[] = [
  {
    name: "免费版",
    price: "¥0",
    period: "/月",
    desc: "个人与小型项目起步之选。",
    features: "基础组件库\n单页面发布\n社区支持",
    buttonText: "免费开始",
    buttonHref: "#",
    highlight: false,
  },
  {
    name: "专业版",
    price: "¥199",
    period: "/月",
    desc: "成长型团队的全功能方案。",
    features: "全部组件与模板\n多页面与自定义域名\n协作成员管理\n优先技术支持",
    buttonText: "立即订阅",
    buttonHref: "#",
    highlight: true,
  },
  {
    name: "企业版",
    price: "联系我们",
    period: "",
    desc: "专属部署与定制化服务。",
    features: "私有化部署\nSSO 单点登录\n专属客户成功经理\nSLA 保障",
    buttonText: "预约演示",
    buttonHref: "#",
    highlight: false,
  },
];

function Pricing({ props, style }: MaterialComponentProps) {
  const {
    title = "选择适合你的方案",
    subtitle = "随时升级或降级,无隐藏费用。",
    plans = DEFAULT_PLANS,
    columns = "3",
  } = props as Partial<Props>;

  const list = plans.length > 0 ? plans : DEFAULT_PLANS;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#f8fafc" })}>
      <div className="mx-auto max-w-6xl px-6">
        {title ? (
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-500">{subtitle}</p> : null}
        <div className={`mt-12 grid gap-6 ${COLS[columns] ?? COLS["3"]}`}>
          {list.map((plan, i) => {
            const features = (plan.features ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
            const highlight = plan.highlight === true;
            return (
              <div
                key={i}
                className={
                  highlight
                    ? "relative -translate-y-2 rounded-2xl bg-white p-8 shadow-xl shadow-indigo-500/15 ring-2 ring-indigo-500"
                    : "relative rounded-2xl bg-white p-8 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                }
              >
                {highlight ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white shadow">
                    最受欢迎
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">{plan.price}</span>
                  {plan.period ? <span className="text-sm text-slate-400">{plan.period}</span> : null}
                </div>
                {plan.desc ? <p className="mt-3 text-sm leading-relaxed text-slate-500">{plan.desc}</p> : null}
                <ul className="mt-6 space-y-2.5">
                  {features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500">
                        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.buttonHref || "#"}
                  className={
                    highlight
                      ? "mt-8 block rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:shadow-xl"
                      : "mt-8 block rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600"
                  }
                >
                  {plan.buttonText || "选择"}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const pricingDef: MaterialDef = {
  type: "pricing",
  title: "价格表",
  icon: "💰",
  category: "营销",
  description: "多档价格方案对比卡片",
  defaultProps: {
    title: "选择适合你的方案",
    subtitle: "随时升级或降级,无隐藏费用。",
    columns: "3",
    plans: DEFAULT_PLANS,
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "textarea", key: "subtitle", label: "副标题", rows: 2 },
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
      key: "plans",
      label: "价格方案",
      itemLabelKey: "name",
      defaultItem: {
        name: "新方案",
        price: "¥0",
        period: "/月",
        desc: "",
        features: "特性一\n特性二",
        buttonText: "立即购买",
        buttonHref: "#",
        highlight: false,
      },
      maxItems: 4,
      fields: [
        { type: "text", key: "name", label: "方案名" },
        { type: "text", key: "price", label: "价格" },
        { type: "text", key: "period", label: "计费周期" },
        { type: "textarea", key: "desc", label: "方案简介", rows: 2 },
        { type: "textarea", key: "features", label: "特性清单(每行一条)", rows: 4 },
        { type: "text", key: "buttonText", label: "按钮文字" },
        { type: "text", key: "buttonHref", label: "按钮链接" },
        { type: "boolean", key: "highlight", label: "高亮推荐" },
      ],
    },
  ],
  Component: Pricing,
};
