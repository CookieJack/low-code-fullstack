import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  embedUrl: string;
  height: number;
  rounded: boolean;
};

const DEFAULT_EMBED =
  "https://www.openstreetmap.org/export/embed.html?bbox=116.2808%2C39.8640%2C116.5296%2C40.0290&layer=mapnik";

function Map({ props, style }: MaterialComponentProps) {
  const { embedUrl = DEFAULT_EMBED, height = 420, rounded = true } = props as Partial<Props>;
  const h = Math.max(120, Math.min(960, Number(height) || 420));

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 48, paddingBottom: 48 })}>
      <div className="mx-auto max-w-6xl px-6">
        <iframe
          src={embedUrl || DEFAULT_EMBED}
          title="地图"
          loading="lazy"
          className={`w-full border-0 ${rounded ? "rounded-2xl" : ""}`}
          style={{ height: `${h}px` }}
        />
      </div>
    </section>
  );
}

export const mapDef: MaterialDef = {
  type: "map",
  title: "地图",
  icon: "🗺️",
  category: "媒体",
  description: "嵌入在线地图(iframe)",
  defaultProps: {
    embedUrl: DEFAULT_EMBED,
    height: 420,
    rounded: true,
  },
  propSchema: [
    {
      type: "text",
      key: "embedUrl",
      label: "嵌入地址",
      placeholder: "地图分享页的嵌入 iframe 地址",
    },
    { type: "number", key: "height", label: "高度(px)", min: 120, max: 960, step: 20 },
    { type: "boolean", key: "rounded", label: "圆角" },
  ],
  Component: Map,
};
