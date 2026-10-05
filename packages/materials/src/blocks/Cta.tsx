import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
  bgColor: string;
};

function Cta({ props, style }: MaterialComponentProps) {
  const {
    title = "准备好开始了吗?",
    subtitle = "立即创建你的品牌官网,只需几分钟。",
    buttonText = "立即开始",
    buttonHref = "#",
    bgColor = "#4f46e5",
  } = props as Partial<Props>;

  return (
    <section
      className="@container relative w-full overflow-hidden"
      style={sectionStyle(style, { paddingTop: 80, paddingBottom: 80, background: bgColor })}
    >
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-black/15 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-6 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight @min-[768px]:text-4xl">{title}</h2>
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed" style={{ opacity: 0.85 }}>
            {subtitle}
          </p>
        ) : null}
        {buttonText ? (
          <a
            href={buttonHref || "#"}
            className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl"
          >
            {buttonText}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export const ctaDef: MaterialDef = {
  type: "cta",
  title: "CTA 横幅",
  icon: "📣",
  category: "营销",
  description: "行动号召横幅",
  defaultProps: {
    title: "准备好开始了吗?",
    subtitle: "立即创建你的品牌官网,只需几分钟。",
    buttonText: "立即开始",
    buttonHref: "#",
    bgColor: "#4f46e5",
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "textarea", key: "subtitle", label: "副标题" },
    { type: "text", key: "buttonText", label: "按钮文字" },
    { type: "text", key: "buttonHref", label: "按钮链接" },
    { type: "color", key: "bgColor", label: "背景色" },
  ],
  Component: Cta,
};
