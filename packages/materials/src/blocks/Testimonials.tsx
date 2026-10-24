import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  items: { name: string; role: string; avatar: string; text: string; rating: number }[];
};

const DEFAULT_ITEMS = [
  {
    name: "王小雅",
    role: "某电商创始人",
    avatar: "",
    text: "从想法到上线只用了两天,官网转化率提升了 40%,团队再也不用等排期改页面了。",
    rating: 5,
  },
  {
    name: "李成",
    role: "产品经理",
    avatar: "",
    text: "组件丰富、样式可控,运营同学自己就能搭落地页,我们的迭代速度快了一个量级。",
    rating: 5,
  },
  {
    name: "陈思远",
    role: "独立开发者",
    avatar: "",
    text: "发布流程顺滑,绑定域名即可访问,导出的静态页性能也非常好,强烈推荐。",
    rating: 4,
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label={`${rating} 星`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ opacity: i < rating ? 1 : 0.25 }}>
          ★
        </span>
      ))}
    </div>
  );
}

function Testimonials({ props, style }: MaterialComponentProps) {
  const { title = "用户评价", subtitle = "来看看他们是怎么说的。", items } = props as Partial<Props>;
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#f8fafc" })}>
      <div className="mx-auto max-w-6xl px-6">
        {title ? (
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        {subtitle ? <p className="mt-4 text-center text-lg text-slate-500">{subtitle}</p> : null}
        <div className="mt-12 grid gap-6 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3">
          {list.map((item, i) => (
            <figure
              key={i}
              className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <Stars rating={Number(item.rating) || 5} />
              <blockquote className="mt-4 flex-1 leading-relaxed text-slate-600">
                {item.text || "这条评价还没有内容。"}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.name || "用户头像"} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                    {(item.name || "用").slice(0, 1)}
                  </span>
                )}
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.name || "匿名用户"}</div>
                  {item.role ? <div className="text-xs text-slate-500">{item.role}</div> : null}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export const testimonialsDef: MaterialDef = {
  type: "testimonials",
  title: "用户评价",
  icon: "⭐",
  category: "内容",
  description: "客户评价卡片墙",
  defaultProps: {
    title: "用户评价",
    subtitle: "来看看他们是怎么说的。",
    items: DEFAULT_ITEMS,
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "text", key: "subtitle", label: "副标题" },
    {
      type: "array",
      key: "items",
      label: "评价",
      itemLabelKey: "name",
      defaultItem: { name: "用户姓名", role: "职位/公司", avatar: "", text: "评价内容", rating: 5 },
      fields: [
        { type: "text", key: "name", label: "姓名" },
        { type: "text", key: "role", label: "职位/公司" },
        { type: "image", key: "avatar", label: "头像(留空用首字母)" },
        { type: "textarea", key: "text", label: "评价内容", rows: 3 },
        { type: "number", key: "rating", label: "星级", min: 1, max: 5, step: 1 },
      ],
    },
  ],
  Component: Testimonials,
};
