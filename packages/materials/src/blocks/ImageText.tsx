import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  desc: string;
  imageUrl: string;
  imageSide: "left" | "right";
  buttonText: string;
  buttonHref: string;
};

function ImageText({ props, style }: MaterialComponentProps) {
  const {
    title = "我们是谁",
    desc = "介绍你的团队、理念与优势。一张好图配上一段打动人心的文字,胜过千言万语。",
    imageUrl = "",
    imageSide = "left",
    buttonText = "",
    buttonHref = "#",
  } = props as Partial<Props>;

  const img = (
    <div className="group overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-lg shadow-slate-900/5">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center text-slate-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L3 21" />
          </svg>
        </div>
      )}
    </div>
  );

  const text = (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
      <p className="mt-5 text-lg leading-relaxed text-slate-500">{desc}</p>
      {buttonText ? (
        <a
          href={buttonHref || "#"}
          className="mt-8 inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-md shadow-indigo-600/25 transition duration-300 hover:-translate-y-0.5 hover:bg-indigo-500"
        >
          {buttonText}
        </a>
      ) : null}
    </div>
  );

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#f8fafc" })}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 @min-[768px]:grid-cols-2">
        {imageSide === "left" ? (
          <>
            {img}
            {text}
          </>
        ) : (
          <>
            {text}
            {img}
          </>
        )}
      </div>
    </section>
  );
}

export const imageTextDef: MaterialDef = {
  type: "image-text",
  title: "图文介绍",
  icon: "🖼️",
  category: "基础",
  description: "左图右文 / 右图左文",
  defaultProps: {
    title: "我们是谁",
    desc: "介绍你的团队、理念与优势。一张好图配上一段打动人心的文字,胜过千言万语。",
    imageUrl: "",
    imageSide: "left",
    buttonText: "",
    buttonHref: "#",
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "textarea", key: "desc", label: "描述", rows: 4 },
    { type: "image", key: "imageUrl", label: "图片", placeholder: "https://…" },
    {
      type: "select",
      key: "imageSide",
      label: "图片位置",
      options: [
        { label: "左侧", value: "left" },
        { label: "右侧", value: "right" },
      ],
    },
    { type: "text", key: "buttonText", label: "按钮文字(留空隐藏)" },
    { type: "text", key: "buttonHref", label: "按钮链接" },
  ],
  Component: ImageText,
};
