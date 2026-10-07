import type { MaterialDef } from "../types";
import Carousel from "./Carousel";

/** 组件文件带 "use client",定义保持独立(见 contact-form-def.ts 说明) */
export const carouselDef: MaterialDef = {
  type: "carousel",
  title: "轮播图",
  icon: "🎞️",
  category: "媒体",
  description: "多图轮播,支持自动播放",
  defaultProps: {
    slides: [
      { image: "", title: "新品发布", subtitle: "全新一代产品正式上线", href: "#" },
      { image: "", title: "限时优惠", subtitle: "年度最低价,仅此一月", href: "#" },
      { image: "", title: "客户之声", subtitle: "超过 10,000 家企业的共同选择", href: "#" },
    ],
    height: "medium",
    autoplay: true,
    interval: 5,
    showDots: true,
    showArrows: true,
    rounded: true,
  },
  propSchema: [
    {
      type: "array",
      key: "slides",
      label: "轮播页",
      itemLabelKey: "title",
      defaultItem: { image: "", title: "新轮播页", subtitle: "", href: "#" },
      maxItems: 10,
      fields: [
        { type: "image", key: "image", label: "图片(留空用渐变底)" },
        { type: "text", key: "title", label: "标题" },
        { type: "text", key: "subtitle", label: "副标题" },
        { type: "url", key: "href", label: "跳转链接(可选)" },
      ],
    },
    {
      type: "select",
      key: "height",
      label: "高度",
      options: [
        { label: "矮(宽幅)", value: "short" },
        { label: "标准(16:9)", value: "medium" },
        { label: "高(4:3)", value: "tall" },
      ],
    },
    { type: "boolean", key: "autoplay", label: "自动播放" },
    { type: "number", key: "interval", label: "切换间隔(秒)", min: 2, max: 30, step: 1 },
    { type: "boolean", key: "showDots", label: "显示圆点指示器" },
    { type: "boolean", key: "showArrows", label: "显示左右箭头" },
    { type: "boolean", key: "rounded", label: "圆角" },
  ],
  Component: Carousel,
};
