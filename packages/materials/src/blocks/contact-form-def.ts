import type { MaterialDef } from "../types";
import ContactForm from "./ContactForm";

/** 物料定义与组件分离:组件文件带 "use client",定义文件保持服务端可用,
 *  否则 RSC 下注册表中的 def 会整体变成客户端引用,服务端查不到该物料。 */
export const contactFormDef: MaterialDef = {
  type: "contact-form",
  title: "联系表单",
  icon: "📮",
  category: "营销",
  description: "收集访客留言线索",
  defaultProps: {
    title: "联系我们",
    subtitle: "留下你的信息,我们会尽快与你取得联系。",
    showName: true,
    showEmail: true,
    showPhone: false,
    showMessage: true,
    submitText: "提交",
    successText: "提交成功,感谢你的留言!",
  },
  propSchema: [
    { type: "text", key: "title", label: "标题" },
    { type: "textarea", key: "subtitle", label: "副标题" },
    { type: "boolean", key: "showName", label: "显示姓名字段" },
    { type: "boolean", key: "showEmail", label: "显示邮箱字段" },
    { type: "boolean", key: "showPhone", label: "显示电话字段" },
    { type: "boolean", key: "showMessage", label: "显示留言字段" },
    { type: "text", key: "submitText", label: "提交按钮文字" },
    { type: "text", key: "successText", label: "成功提示文字" },
  ],
  Component: ContactForm,
};
