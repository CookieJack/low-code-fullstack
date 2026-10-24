import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  lineStyle: "solid" | "dashed" | "dotted";
  thickness: number;
  color: string;
  maxWidth: "full" | "wide" | "narrow";
};

const MAX_W: Record<Props["maxWidth"], string> = {
  full: "max-w-full",
  wide: "max-w-6xl",
  narrow: "max-w-3xl",
};

function Divider({ props, style }: MaterialComponentProps) {
  const {
    lineStyle = "solid",
    thickness = 1,
    color = "#e2e8f0",
    maxWidth = "wide",
  } = props as Partial<Props>;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 24, paddingBottom: 24 })}>
      <div className={`px-6 ${MAX_W[maxWidth] ?? MAX_W.wide}`}>
        <div
          role="separator"
          style={{
            borderTopStyle: lineStyle,
            borderTopWidth: `${Math.max(1, Number(thickness) || 1)}px`,
            borderTopColor: color,
          }}
        />
      </div>
    </section>
  );
}

export const dividerDef: MaterialDef = {
  type: "divider",
  title: "分隔线",
  icon: "➖",
  category: "基础",
  description: "内容分区装饰线",
  defaultProps: {
    lineStyle: "solid",
    thickness: 1,
    color: "#e2e8f0",
    maxWidth: "wide",
  },
  propSchema: [
    {
      type: "select",
      key: "lineStyle",
      label: "线型",
      options: [
        { label: "实线(默认)", value: "solid" },
        { label: "虚线", value: "dashed" },
        { label: "点线", value: "dotted" },
      ],
    },
    { type: "number", key: "thickness", label: "粗细(px)", min: 1, max: 12, step: 1 },
    { type: "color", key: "color", label: "颜色" },
    {
      type: "select",
      key: "maxWidth",
      label: "宽度",
      options: [
        { label: "一整行", value: "full" },
        { label: "宽(默认)", value: "wide" },
        { label: "窄", value: "narrow" },
      ],
    },
  ],
  Component: Divider,
};
