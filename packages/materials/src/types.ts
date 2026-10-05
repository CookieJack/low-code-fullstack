import type { ComponentType } from "react";
import type { NodeStyle, PropField } from "@lc/schema";

/** 渲染上下文:发布页/导出时注入表单提交所需信息 */
export interface MaterialContext {
  pageId?: string;
  nodeId?: string;
  /** 表单提交 API 绝对地址;空字符串表示同源相对路径 /api */
  formApiUrl?: string;
}

export type MaterialMode = "edit" | "static" | "export";

export interface MaterialComponentProps {
  props: Record<string, any>;
  style?: NodeStyle;
  /** edit=画布内(交互降级) static=预览/发布 export=静态导出(无 JS 表单) */
  mode?: MaterialMode;
  context?: MaterialContext;
}

/** 物料定义:注册表的最小单元,新增物料 = 一个组件 + 一份定义 */
export interface MaterialDef {
  type: string;
  title: string;
  icon: string;
  category: string;
  description?: string;
  defaultProps: Record<string, any>;
  propSchema: PropField[];
  Component: ComponentType<MaterialComponentProps>;
}
