import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  maxWidth: "full" | "wide" | "narrow";
  gap: "none" | "sm" | "md" | "lg";
  padding: "none" | "sm" | "md" | "lg";
};

const MAX_W: Record<Props["maxWidth"], string> = {
  full: "max-w-full",
  wide: "max-w-6xl",
  narrow: "max-w-3xl",
};

const GAP: Record<Props["gap"], string> = {
  none: "gap-0",
  sm: "gap-4",
  md: "gap-8",
  lg: "gap-14",
};

const PADDING: Record<Props["padding"], number> = {
  none: 0,
  sm: 40,
  md: 72,
  lg: 112,
};

function Container({ props, style, children }: MaterialComponentProps) {
  const { maxWidth = "wide", gap = "md", padding = "md" } = props as Partial<Props>;

  return (
    <section
      className="@container w-full"
      style={sectionStyle(style, { paddingTop: PADDING[padding] ?? 72, paddingBottom: PADDING[padding] ?? 72 })}
    >
      <div
        className={`mx-auto flex w-full flex-col px-6 ${MAX_W[maxWidth] ?? MAX_W.wide} ${GAP[gap] ?? GAP.md}`}
      >
        {children}
      </div>
    </section>
  );
}

export const containerDef: MaterialDef = {
  type: "container",
  title: "区块容器",
  icon: "🧩",
  category: "布局",
  description: "可嵌套任意子区块的通用容器",
  container: true,
  defaultProps: {
    maxWidth: "wide",
    gap: "md",
    padding: "md",
  },
  propSchema: [
    {
      type: "select",
      key: "maxWidth",
      label: "内容宽度",
      options: [
        { label: "一整行", value: "full" },
        { label: "宽(默认)", value: "wide" },
        { label: "窄", value: "narrow" },
      ],
    },
    {
      type: "select",
      key: "gap",
      label: "子块间距",
      options: [
        { label: "无", value: "none" },
        { label: "小", value: "sm" },
        { label: "中(默认)", value: "md" },
        { label: "大", value: "lg" },
      ],
    },
    {
      type: "select",
      key: "padding",
      label: "区块留白",
      options: [
        { label: "无", value: "none" },
        { label: "小", value: "sm" },
        { label: "中(默认)", value: "md" },
        { label: "大", value: "lg" },
      ],
    },
  ],
  Component: Container,
};
