import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  text: string;
  href: string;
  buttonText: string;
  bgColor: string;
  textColor: string;
};

function Announcement({ props, style }: MaterialComponentProps) {
  const {
    text = "🎉 新版本上线:可视化主题编辑器正式发布",
    href = "#",
    buttonText = "查看详情",
    bgColor = "#0f172a",
    textColor = "#ffffff",
  } = props as Partial<Props>;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 12, paddingBottom: 12, background: bgColor })}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-1 text-center">
        <span className="text-sm font-medium" style={{ color: textColor }}>
          {text || "公告内容"}
        </span>
        {buttonText ? (
          <a
            href={href || "#"}
            className="rounded-full px-3 py-1 text-xs font-semibold underline-offset-4 transition hover:underline"
            style={{ color: textColor, backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            {buttonText}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export const announcementDef: MaterialDef = {
  type: "announcement",
  title: "公告条",
  icon: "📢",
  category: "基础",
  description: "页面顶部通知横条",
  defaultProps: {
    text: "🎉 新版本上线:可视化主题编辑器正式发布",
    href: "#",
    buttonText: "查看详情",
    bgColor: "#0f172a",
    textColor: "#ffffff",
  },
  propSchema: [
    { type: "text", key: "text", label: "公告文字" },
    { type: "text", key: "href", label: "跳转链接" },
    { type: "text", key: "buttonText", label: "按钮文字(留空隐藏)" },
    { type: "color", key: "bgColor", label: "背景色" },
    { type: "color", key: "textColor", label: "文字颜色" },
  ],
  Component: Announcement,
};
