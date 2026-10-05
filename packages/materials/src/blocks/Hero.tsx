import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle, textColorFor } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  align: "center" | "left";
  bgColor: string;
  bgImage: string;
  height: "compact" | "standard" | "tall";
  buttonText: string;
  buttonHref: string;
  secondaryText: string;
  secondaryHref: string;
  gradientTitle: boolean;
};

const PADDING: Record<Props["height"], number> = {
  compact: 64,
  standard: 112,
  tall: 176,
};

function Hero({ props, style }: MaterialComponentProps) {
  const {
    title = "为你的品牌打造出色的官网",
    subtitle = "拖拽组件、实时预览、一键发布。用最低的成本,搭建专业的品牌门户。",
    align = "center",
    bgColor = "#111827",
    bgImage = "",
    height = "standard",
    buttonText = "免费开始",
    buttonHref = "#",
    secondaryText = "了解更多",
    secondaryHref = "#",
    gradientTitle = false,
  } = props as Partial<Props>;

  const text = bgImage ? "#ffffff" : textColorFor(bgColor);
  const hasImage = Boolean(bgImage);
  const onDark = text === "#ffffff";
  const gradientCls = onDark
    ? "from-indigo-400 via-violet-400 to-fuchsia-400"
    : "from-indigo-600 via-violet-600 to-fuchsia-600";

  return (
    <section
      className="@container relative w-full overflow-hidden"
      style={sectionStyle(style, { paddingTop: PADDING[height] ?? 112, paddingBottom: PADDING[height] ?? 112, background: bgColor })}
    >
      {!hasImage && (
        <>
          <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 right-[12%] h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        </>
      )}
      {hasImage && (
        <>
          <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}
      <div
        className={`relative mx-auto max-w-6xl px-6 ${align === "center" ? "text-center" : "text-left"}`}
        style={{ color: text }}
      >
        <h1
          className={`mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight @min-[768px]:text-6xl ${gradientTitle ? `bg-gradient-to-r ${gradientCls} bg-clip-text text-transparent` : ""}`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={`mt-6 max-w-2xl text-lg leading-relaxed @min-[768px]:text-xl ${align === "center" ? "mx-auto" : ""}`}
            style={{ opacity: 0.75 }}
          >
            {subtitle}
          </p>
        ) : null}
        <div className={`mt-10 flex flex-wrap gap-4 ${align === "center" ? "justify-center" : ""}`}>
          {buttonText ? (
            <a
              href={buttonHref || "#"}
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-950/30 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-950/40"
            >
              {buttonText}
            </a>
          ) : null}
          {secondaryText ? (
            <a
              href={secondaryHref || "#"}
              className="inline-flex items-center rounded-lg border px-6 py-3 text-base font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/10"
              style={{ borderColor: "currentColor", opacity: 0.85 }}
            >
              {secondaryText}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const heroDef: MaterialDef = {
  type: "hero",
  title: "Hero 首屏",
  icon: "🚀",
  category: "基础",
  description: "大标题 + 副标题 + 行动按钮",
  defaultProps: {
    title: "为你的品牌打造出色的官网",
    subtitle: "拖拽组件、实时预览、一键发布。用最低的成本,搭建专业的品牌门户。",
    align: "center",
    bgColor: "#111827",
    bgImage: "",
    height: "standard",
    buttonText: "免费开始",
    buttonHref: "#",
    secondaryText: "了解更多",
    secondaryHref: "#",
    gradientTitle: true,
  },
  propSchema: [
    { type: "textarea", key: "title", label: "主标题", rows: 2 },
    { type: "textarea", key: "subtitle", label: "副标题", rows: 3 },
    {
      type: "select",
      key: "align",
      label: "对齐方式",
      options: [
        { label: "居中", value: "center" },
        { label: "居左", value: "left" },
      ],
    },
    { type: "color", key: "bgColor", label: "背景色" },
    { type: "url", key: "bgImage", label: "背景图地址", placeholder: "https://…(可选)" },
    {
      type: "select",
      key: "height",
      label: "区块高度",
      options: [
        { label: "紧凑", value: "compact" },
        { label: "标准", value: "standard" },
        { label: "高挑", value: "tall" },
      ],
    },
    { type: "text", key: "buttonText", label: "主按钮文字" },
    { type: "text", key: "buttonHref", label: "主按钮链接" },
    { type: "text", key: "secondaryText", label: "次按钮文字" },
    { type: "text", key: "secondaryHref", label: "次按钮链接" },
    { type: "boolean", key: "gradientTitle", label: "渐变标题" },
  ],
  Component: Hero,
};
