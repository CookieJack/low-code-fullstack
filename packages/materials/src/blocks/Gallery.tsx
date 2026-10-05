import type { MaterialDef, MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  columns: "2" | "3" | "4";
  images: { url: string; alt: string }[];
};

const COLS: Record<string, string> = {
  "2": "@min-[640px]:grid-cols-2",
  "3": "@min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3",
  "4": "@min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4",
};

function Gallery({ props, style }: MaterialComponentProps) {
  const {
    title = "作品展示",
    columns = "3",
    images = [
      { url: "", alt: "作品一" },
      { url: "", alt: "作品二" },
      { url: "", alt: "作品三" },
    ],
  } = props as Partial<Props>;

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#ffffff" })}>
      <div className="mx-auto max-w-6xl px-6">
        {title ? (
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 @min-[768px]:text-4xl">{title}</h2>
        ) : null}
        <div className={`mt-12 grid gap-4 ${COLS[columns] ?? COLS["3"]}`}>
          {images.map((img, i) => (
            <div key={i} className="group overflow-hidden rounded-xl bg-slate-100">
              {img.url ? (
                <img
                  src={img.url}
                  alt={img.alt || ""}
                  className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-sm text-slate-400">
                  {img.alt || "图片"}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const galleryDef: MaterialDef = {
  type: "gallery",
  title: "图片画廊",
  icon: "📸",
  category: "基础",
  description: "响应式图片网格",
  defaultProps: {
    title: "作品展示",
    columns: "3",
    images: [
      { url: "", alt: "作品一" },
      { url: "", alt: "作品二" },
      { url: "", alt: "作品三" },
    ],
  },
  propSchema: [
    { type: "text", key: "title", label: "标题(留空隐藏)" },
    {
      type: "select",
      key: "columns",
      label: "列数",
      options: [
        { label: "2 列", value: "2" },
        { label: "3 列", value: "3" },
        { label: "4 列", value: "4" },
      ],
    },
    {
      type: "array",
      key: "images",
      label: "图片",
      itemLabelKey: "alt",
      defaultItem: { url: "", alt: "新图片" },
      fields: [
        { type: "url", key: "url", label: "图片地址" },
        { type: "text", key: "alt", label: "替代文字" },
      ],
    },
  ],
  Component: Gallery,
};
