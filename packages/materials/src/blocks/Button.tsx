import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  text: string;
  href: string;
  variant: "solid" | "outline" | "ghost";
  size: "sm" | "md" | "lg";
  align: "left" | "center" | "right";
};

const SIZE_CLS: Record<Props["size"], string> = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-6 py-2.5 text-base",
  lg: "px-8 py-3 text-lg",
};

const ALIGN_CLS: Record<Props["align"], string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

function ButtonBlock({ props, style }: MaterialComponentProps) {
  const {
    text = "立即开始",
    href = "#",
    variant = "solid",
    size = "md",
    align = "center",
  } = props as Partial<Props>;

  const base =
    "inline-flex items-center rounded-lg font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg";
  const variantCls =
    variant === "outline"
      ? "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
      : variant === "ghost"
        ? "text-indigo-600 hover:bg-indigo-50"
        : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25";

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 24, paddingBottom: 24 })}>
      <div className={`flex px-6 ${ALIGN_CLS[align] ?? ALIGN_CLS.center}`}>
        <a href={href || "#"} className={`${base} ${SIZE_CLS[size] ?? SIZE_CLS.md} ${variantCls}`}>
          {text || "按钮"}
        </a>
      </div>
    </section>
  );
}

export const buttonDef: MaterialDef = {
  type: "button",
  title: "按钮",
  icon: "🔘",
  category: "基础",
  description: "单按钮 / 链接入口",
  defaultProps: {
    text: "立即开始",
    href: "#",
    variant: "solid",
    size: "md",
    align: "center",
  },
  propSchema: [
    { type: "text", key: "text", label: "按钮文字" },
    { type: "text", key: "href", label: "跳转链接" },
    {
      type: "select",
      key: "variant",
      label: "样式",
      options: [
        { label: "实底", value: "solid" },
        { label: "描边", value: "outline" },
        { label: "幽灵", value: "ghost" },
      ],
    },
    {
      type: "select",
      key: "size",
      label: "尺寸",
      options: [
        { label: "小", value: "sm" },
        { label: "中(默认)", value: "md" },
        { label: "大", value: "lg" },
      ],
    },
    {
      type: "select",
      key: "align",
      label: "对齐",
      options: [
        { label: "居左", value: "left" },
        { label: "居中(默认)", value: "center" },
        { label: "居右", value: "right" },
      ],
    },
  ],
  Component: ButtonBlock,
};
