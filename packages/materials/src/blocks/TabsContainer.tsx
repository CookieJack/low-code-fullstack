"use client";

import { Children, useState } from "react";
import type { MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  tabTitles: { title: string }[];
};

/**
 * 标签页容器:子区块按顺序成为页签内容,标题在 tabTitles 中配置。
 * 编辑模式渲染编辑器注入的原始子节点(可拆分),空容器时渲染放置区;
 * 静态导出无 JS,展示全部内容。
 * 注意:def 必须放在独立文件(见 tabs-container-def.ts),"use client" 模块的
 * 对象导出在服务端(RSC)不可用,会导致发布页查不到物料。
 */
export default function TabsContainer({
  props,
  style,
  children,
  mode,
  rawChildren,
}: MaterialComponentProps) {
  const { tabTitles } = props as Partial<Props>;
  const childArr = Children.toArray(rawChildren ?? children);
  const [active, setActive] = useState(0);
  const idx = Math.min(Math.max(0, active), Math.max(0, childArr.length - 1));
  const showAll = mode === "export";

  // 编辑器空容器:保留编辑器注入的放置区(可拖入子块)
  if (mode === "edit" && childArr.length === 0) {
    return (
      <section className="@container w-full" style={sectionStyle(style, { paddingTop: 64, paddingBottom: 64 })}>
        <div className="mx-auto max-w-6xl px-6">{children}</div>
      </section>
    );
  }

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 64, paddingBottom: 64 })}>
      <div className="mx-auto max-w-6xl px-6">
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
          {childArr.map((_, i) => {
            const label = tabTitles?.[i]?.title || `页签 ${i + 1}`;
            const current = showAll || i === idx;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === idx}
                onClick={() => setActive(i)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                  current
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="pt-6">
          {childArr.map((child, i) => (
            <div key={i} style={{ display: showAll || i === idx ? undefined : "none" }}>
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
