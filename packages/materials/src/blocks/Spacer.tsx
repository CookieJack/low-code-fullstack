import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  height: number;
};

function Spacer({ props, style, mode }: MaterialComponentProps) {
  const { height = 64 } = props as Partial<Props>;
  const h = Math.max(8, Math.min(480, Number(height) || 64));

  return (
    <section className="@container w-full" style={sectionStyle(style)}>
      <div
        aria-hidden
        style={{ height: `${h}px` }}
        className={
          mode === "edit"
            ? "flex items-center justify-center bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(99,102,241,0.06)_8px,rgba(99,102,241,0.06)_16px)] text-xs text-slate-400"
            : undefined
        }
      >
        {mode === "edit" ? `占位 ${h}px` : null}
      </div>
    </section>
  );
}

export const spacerDef: MaterialDef = {
  type: "spacer",
  title: "间距占位",
  icon: "⬜",
  category: "基础",
  description: "调整区块间的留白",
  defaultProps: {
    height: 64,
  },
  propSchema: [{ type: "number", key: "height", label: "高度(px)", min: 8, max: 480, step: 8 }],
  Component: Spacer,
};
