import type { MaterialDef } from "../types";
import TabsContainer from "./TabsContainer";

/** def 放在无 "use client" 的独立文件:RSC 下 client 模块的对象导出不可用 */
export const tabsContainerDef: MaterialDef = {
  type: "tabs-container",
  title: "标签页容器",
  icon: "🗂️",
  category: "布局",
  description: "子区块按顺序变为可切换页签",
  container: true,
  defaultProps: {
    tabTitles: [{ title: "页签 1" }, { title: "页签 2" }],
  },
  propSchema: [
    {
      type: "array",
      key: "tabTitles",
      label: "页签标题(按子区块顺序)",
      itemLabelKey: "title",
      defaultItem: { title: "新页签" },
      fields: [{ type: "text", key: "title", label: "标题" }],
    },
  ],
  Component: TabsContainer,
};
