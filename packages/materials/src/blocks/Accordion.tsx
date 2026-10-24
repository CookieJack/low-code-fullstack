import { Children } from "react";
import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  titles: { title: string }[];
};

/**
 * 折叠面板容器:每个子区块为一个条目,标题在 titles 中配置。
 * 编辑模式默认全部展开便于编辑;发布页用原生 details 交互(无 JS 依赖);
 * 空容器时渲染编辑器放置区。
 */
function Accordion({ props, style, children, mode, rawChildren }: MaterialComponentProps) {
  const { titles } = props as Partial<Props>;
  const childArr = Children.toArray(rawChildren ?? children);
  const openInEdit = mode === "edit" || undefined;

  // 编辑器空容器:保留编辑器注入的放置区(可拖入子块)
  if (mode === "edit" && childArr.length === 0) {
    return (
      <section className="@container w-full" style={sectionStyle(style, { paddingTop: 64, paddingBottom: 64 })}>
        <div className="mx-auto max-w-4xl px-6">{children}</div>
      </section>
    );
  }

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 64, paddingBottom: 64 })}>
      <div className="mx-auto max-w-4xl space-y-3 px-6">
        {childArr.map((child, i) => (
          <details
            key={i}
            open={openInEdit}
            className="group rounded-xl border border-slate-200 bg-white transition open:shadow-md open:shadow-slate-900/5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
              {titles?.[i]?.title || `条目 ${i + 1}`}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg leading-none text-slate-500 transition-transform duration-200 group-open:rotate-45 group-open:bg-indigo-50 group-open:text-indigo-600">
                +
              </span>
            </summary>
            <div className="px-2 pb-2">{child}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

export const accordionDef: MaterialDef = {
  type: "accordion",
  title: "折叠面板",
  icon: "📑",
  category: "布局",
  description: "子区块逐个折叠展示",
  container: true,
  defaultProps: {
    titles: [{ title: "第一条目" }, { title: "第二条目" }],
  },
  propSchema: [
    {
      type: "array",
      key: "titles",
      label: "条目标题(按子区块顺序)",
      itemLabelKey: "title",
      defaultItem: { title: "新条目" },
      fields: [{ type: "text", key: "title", label: "标题" }],
    },
  ],
  Component: Accordion,
};
