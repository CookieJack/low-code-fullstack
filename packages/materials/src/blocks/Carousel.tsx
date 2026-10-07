"use client";

import { useEffect, useState } from "react";
import type { MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Slide = { image: string; title: string; subtitle: string; href: string };
type Props = {
  slides: Slide[];
  height: "short" | "medium" | "tall";
  autoplay: boolean;
  interval: number;
  showDots: boolean;
  showArrows: boolean;
  rounded: boolean;
};

const ASPECT: Record<Props["height"], string> = {
  short: "aspect-[16/10] @min-[768px]:aspect-[16/7]",
  medium: "aspect-[4/3] @min-[768px]:aspect-[16/9]",
  tall: "aspect-[4/3]",
};

const DEFAULT_SLIDES: Slide[] = [
  { image: "", title: "新品发布", subtitle: "全新一代产品正式上线", href: "#" },
  { image: "", title: "限时优惠", subtitle: "年度最低价,仅此一月", href: "#" },
  { image: "", title: "客户之声", subtitle: "超过 10,000 家企业的共同选择", href: "#" },
];

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
      {dir === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

function Carousel({ props, style, mode }: MaterialComponentProps) {
  const {
    slides = DEFAULT_SLIDES,
    height = "medium",
    autoplay = true,
    interval = 5,
    showDots = true,
    showArrows = true,
    rounded = true,
  } = props as Partial<Props>;

  const list = slides.length > 0 ? slides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);
  const isCanvas = mode === "edit";
  const isExport = mode === "export";
  // 静态导出无 JS:降级为 scroll-snap 横向滑动;画布内不自动播放
  const playable = !isExport && !isCanvas && autoplay && list.length > 1;

  useEffect(() => {
    if (!playable) return;
    const ms = Math.max(2, interval || 5) * 1000;
    const t = setInterval(() => setCurrent((c) => (c + 1) % list.length), ms);
    return () => clearInterval(t);
  }, [playable, interval, list.length]);

  const idx = Math.min(current, list.length - 1);
  const go = (i: number) => setCurrent((i + list.length) % list.length);

  /* 导出模式:纯 CSS scroll-snap 轮播(原生滚动,无需脚本) */
  if (isExport) {
    return (
      <section className="@container w-full" style={sectionStyle(style)}>
        <div className={`overflow-hidden ${rounded ? "rounded-2xl" : ""}`}>
          <div className={`${ASPECT[height] ?? ASPECT.medium} flex snap-x snap-mandatory overflow-x-auto`}>
            {list.map((s, i) => (
              <div key={i} className="relative w-full shrink-0 snap-center">
                {s.image ? (
                  <img src={s.image} alt={s.title || ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600" />
                )}
                {(s.title || s.subtitle) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 px-6 text-center text-white">
                    {s.title ? <h3 className="text-2xl font-bold @min-[768px]:text-4xl">{s.title}</h3> : null}
                    {s.subtitle ? <p className="mt-2 opacity-80">{s.subtitle}</p> : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="@container w-full" style={sectionStyle(style)}>
      <div className={`group relative w-full overflow-hidden ${rounded ? "rounded-2xl" : ""} ${ASPECT[height] ?? ASPECT.medium}`}>
        {list.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {s.image ? (
              <img src={s.image} alt={s.title || ""} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600" />
            )}
            {(s.title || s.subtitle) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 px-6 text-center text-white">
                {s.title ? <h3 className="text-2xl font-bold @min-[768px]:text-4xl">{s.title}</h3> : null}
                {s.subtitle ? <p className="mt-2 max-w-xl opacity-80">{s.subtitle}</p> : null}
                {!isCanvas && s.href ? (
                  <a
                    href={s.href}
                    className="mt-5 rounded-lg bg-white/95 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
                  >
                    了解更多
                  </a>
                ) : null}
              </div>
            )}
          </div>
        ))}

        {showArrows && list.length > 1 ? (
          <>
            <button
              aria-label="上一张"
              onClick={() => go(idx - 1)}
              className="absolute left-3 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 backdrop-blur transition hover:bg-black/50 focus:opacity-100 group-hover:opacity-100"
            >
              <Arrow dir="left" />
            </button>
            <button
              aria-label="下一张"
              onClick={() => go(idx + 1)}
              className="absolute right-3 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/30 p-2 text-white opacity-0 backdrop-blur transition hover:bg-black/50 focus:opacity-100 group-hover:opacity-100"
            >
              <Arrow dir="right" />
            </button>
          </>
        ) : null}

        {showDots && list.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                aria-label={`第 ${i + 1} 张`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default Carousel;
