import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  url: string;
  cover: string;
  title: string;
  aspect: "16:9" | "4:3" | "1:1";
  width: "full" | "wide" | "narrow";
  rounded: boolean;
};

const WIDTH: Record<Props["width"], string> = {
  full: "max-w-full",
  wide: "max-w-6xl",
  narrow: "max-w-3xl",
};

const ASPECT: Record<Props["aspect"], string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
};

type Embed = { kind: "file" | "iframe"; src: string } | null;

/** 解析视频地址:识别 B 站 / YouTube / Vimeo 与直链文件,其余按 iframe 地址直接嵌入 */
function resolveEmbed(url: string): Embed {
  const t = (url ?? "").trim();
  if (!t) return null;

  const bv = /bilibili\.com\/video\/(BV\w+)/i.exec(t);
  if (bv) {
    return {
      kind: "iframe",
      src: `https://player.bilibili.com/player.html?bvid=${bv[1]}&autoplay=0&danmaku=0&high_quality=1`,
    };
  }
  const yt = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)(\w[\w-]{5,})/i.exec(t);
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vm = /vimeo\.com\/(\d+)/i.exec(t);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(t)) return { kind: "file", src: t };
  return { kind: "iframe", src: t };
}

function Video({ props, style, mode }: MaterialComponentProps) {
  const {
    url = "",
    cover = "",
    title = "",
    aspect = "16:9",
    width = "wide",
    rounded = true,
  } = props as Partial<Props>;

  const embed = resolveEmbed(url);

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 72, paddingBottom: 72, background: "#ffffff" })}>
      <div className={`mx-auto px-6 ${WIDTH[width] ?? WIDTH.wide}`}>
        {title ? (
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        <div
          className={`overflow-hidden bg-slate-100 shadow-lg shadow-slate-900/10 ${rounded ? "rounded-2xl" : ""} ${ASPECT[aspect] ?? ASPECT["16:9"]}`}
        >
          {embed?.kind === "file" ? (
            <video src={embed.src} poster={cover || undefined} controls playsInline className="h-full w-full object-cover" />
          ) : embed?.kind === "iframe" ? (
            <iframe
              src={embed.src}
              title={title || "视频"}
              loading="lazy"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              className="h-full w-full border-0"
            />
          ) : mode === "edit" ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 opacity-50">
                <path d="M8 5.5v13l11-6.5-11-6.5z" />
              </svg>
              <p className="text-sm">在右侧属性面板粘贴视频地址</p>
              <p className="text-xs">支持 B 站 / YouTube / Vimeo 链接或 mp4 直链</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const videoDef: MaterialDef = {
  type: "video",
  title: "视频",
  icon: "🎬",
  category: "媒体",
  description: "嵌入 B 站 / YouTube / Vimeo 或直链视频",
  defaultProps: {
    url: "",
    cover: "",
    title: "",
    aspect: "16:9",
    width: "wide",
    rounded: true,
  },
  propSchema: [
    { type: "url", key: "url", label: "视频地址", placeholder: "B 站/YouTube/Vimeo 链接或 mp4 直链" },
    { type: "image", key: "cover", label: "封面图(直链视频生效)" },
    { type: "text", key: "title", label: "标题(留空隐藏)" },
    {
      type: "select",
      key: "aspect",
      label: "画面比例",
      options: [
        { label: "16:9", value: "16:9" },
        { label: "4:3", value: "4:3" },
        { label: "1:1", value: "1:1" },
      ],
    },
    {
      type: "select",
      key: "width",
      label: "内容宽度",
      options: [
        { label: "一整行", value: "full" },
        { label: "宽(默认)", value: "wide" },
        { label: "窄", value: "narrow" },
      ],
    },
    { type: "boolean", key: "rounded", label: "圆角" },
  ],
  Component: Video,
};
