import type { MaterialDef } from "../types";
import Subscribe from "./Subscribe";

export const subscribeDef: MaterialDef = {
  type: "subscribe",
  title: "邮箱订阅",
  icon: "✉️",
  category: "营销",
  description: "订阅表单,收集邮箱线索",
  defaultProps: {
    title: "订阅我们的动态",
    subtitle: "每周一封精选邮件,获取产品更新与建站技巧。",
    placeholder: "输入你的邮箱",
    buttonText: "订阅",
    successText: "订阅成功,欢迎加入!",
    bgColor: "#4f46e5",
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "text", key: "subtitle", label: "副标题" },
    { type: "text", key: "placeholder", label: "输入框占位文字" },
    { type: "text", key: "buttonText", label: "按钮文字" },
    { type: "text", key: "successText", label: "成功提示" },
    { type: "color", key: "bgColor", label: "背景色" },
  ],
  Component: Subscribe,
};
