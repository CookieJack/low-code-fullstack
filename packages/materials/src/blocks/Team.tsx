import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  items: { name: string; role: string; avatar: string; bio: string }[];
};

const DEFAULT_ITEMS = [
  { name: "林一舟", role: "创始人 / CEO", avatar: "", bio: "连续创业者,专注产品与增长。" },
  { name: "苏晚晴", role: "设计负责人", avatar: "", bio: "相信好的设计是看不见的。" },
  { name: "周北辰", role: "技术负责人", avatar: "", bio: "把复杂留给系统,把简单留给用户。" },
  { name: "何雨桐", role: "增长运营", avatar: "", bio: "让每一次发布都被看见。" },
];

function Team({ props, style }: MaterialComponentProps) {
  const { title = "我们的团队", subtitle = "一群把事情做好的人。", items } = props as Partial<Props>;
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#ffffff" })}>
      <div className="mx-auto max-w-6xl px-6">
        {title ? (
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        {subtitle ? <p className="mt-4 text-center text-lg text-slate-500">{subtitle}</p> : null}
        <div className="mt-12 grid grid-cols-2 gap-8 @min-[768px]:grid-cols-4">
          {list.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              {item.avatar ? (
                <img
                  src={item.avatar}
                  alt={item.name || "成员头像"}
                  className="h-24 w-24 rounded-full object-cover shadow-lg shadow-slate-900/10"
                />
              ) : (
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-semibold text-white shadow-lg shadow-indigo-500/25">
                  {(item.name || "成").slice(0, 1)}
                </span>
              )}
              <div className="mt-4 text-base font-semibold text-slate-900">{item.name || "成员"}</div>
              {item.role ? <div className="mt-0.5 text-sm text-indigo-600">{item.role}</div> : null}
              {item.bio ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.bio}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const teamDef: MaterialDef = {
  type: "team",
  title: "团队介绍",
  icon: "👥",
  category: "内容",
  description: "成员头像与简介",
  defaultProps: {
    title: "我们的团队",
    subtitle: "一群把事情做好的人。",
    items: DEFAULT_ITEMS,
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "text", key: "subtitle", label: "副标题" },
    {
      type: "array",
      key: "items",
      label: "成员",
      itemLabelKey: "name",
      defaultItem: { name: "成员姓名", role: "职位", avatar: "", bio: "一句话介绍" },
      fields: [
        { type: "text", key: "name", label: "姓名" },
        { type: "text", key: "role", label: "职位" },
        { type: "image", key: "avatar", label: "头像(留空用首字母)" },
        { type: "text", key: "bio", label: "一句话介绍" },
      ],
    },
  ],
  Component: Team,
};
