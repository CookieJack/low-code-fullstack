import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = { html: string };

function RichText({ props, style }: MaterialComponentProps) {
  const {
    html = "<h2>关于我们</h2><p>在这里输入任意 HTML 内容:标题、段落、列表、引用等,都会以优雅的排版呈现。</p><ul><li>支持常见 HTML 标签</li><li>自动适配移动端</li></ul>",
  } = props as Partial<Props>;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#ffffff" })}>
      <div
        className="prose prose-slate mx-auto max-w-3xl px-6 prose-headings:tracking-tight prose-a:font-medium prose-a:text-indigo-600 prose-li:marker:text-indigo-400"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export const richTextDef: MaterialDef = {
  type: "rich-text",
  title: "富文本段落",
  icon: "📝",
  category: "基础",
  description: "自由排版的内容区",
  defaultProps: {
    html: "<h2>关于我们</h2><p>在这里输入任意 HTML 内容:标题、段落、列表、引用等,都会以优雅的排版呈现。</p><ul><li>支持常见 HTML 标签</li><li>自动适配移动端</li></ul>",
  },
  propSchema: [
    { type: "textarea", key: "html", label: "HTML 内容", rows: 10 },
  ],
  Component: RichText,
};
