import { Fragment, useMemo, type CSSProperties, type ReactNode } from "react";
import { materialMap } from "@lc/materials";
import type { MaterialContext, MaterialMode } from "@lc/materials";
import { themeCssVars, type NodeSchema, type PageSchema } from "@lc/schema";

export interface RenderWrapArgs {
  node: NodeSchema;
  index: number;
  total: number;
  /** 节点所在容器 id(null = 页面根);编辑器据此注册嵌套拖拽 */
  containerId: string | null;
  children: ReactNode;
}

export interface RenderChildrenArgs {
  /** 容器节点 */
  node: NodeSchema;
  /** 已递归渲染完成的子节点列表 */
  children: ReactNode;
}

export interface RendererProps {
  schema: PageSchema;
  mode?: MaterialMode;
  context?: Omit<MaterialContext, "nodeId">;
  /** 站点主题色(#rrggbb):由其推导的品牌 CSS 变量注入页面根节点,整页换肤 */
  themePrimary?: string | null;
  /**
   * 编辑器注入的包装层(选中态/拖拽/工具条),对每一层节点(含容器子节点)生效;
   * 发布页与导出时不传,输出纯净页面。
   */
  renderWrap?: (args: RenderWrapArgs) => ReactNode;
  /** 编辑器注入:包装容器物料的子节点列表(嵌套 SortableContext / 放置区) */
  renderChildren?: (args: RenderChildrenArgs) => ReactNode;
}

function renderNodeList(
  nodes: NodeSchema[],
  containerId: string | null,
  mode: MaterialMode,
  context: RendererProps["context"],
  renderWrap: RendererProps["renderWrap"],
  renderChildren: RendererProps["renderChildren"],
): ReactNode[] {
  return nodes.map((node, index) => {
    const def = materialMap.get(node.type);
    let content: ReactNode;
    if (def) {
      let childList: ReactNode | undefined;
      if (def.container) {
        const rendered = renderNodeList(
          node.children ?? [],
          node.id,
          mode,
          context,
          renderWrap,
          renderChildren,
        );
        // 编辑器:空容器也经 renderChildren 生成放置目标;发布/导出:仅在有子节点时传入
        childList = renderChildren
          ? renderChildren({ node, children: rendered })
          : node.children?.length
            ? rendered
            : undefined;
      }
      content = (
        <def.Component
          props={node.props}
          style={node.style}
          mode={mode}
          context={{ ...context, nodeId: node.id }}
        >
          {childList}
        </def.Component>
      );
    } else if (mode === "edit") {
      content = (
        <div className="m-4 rounded-xl border-2 border-dashed border-red-300 bg-red-50/60 p-6 text-center text-sm text-red-500">
          未知物料类型「{node.type}」,请删除该区块
        </div>
      );
    } else {
      content = null;
    }
    const wrapped = renderWrap
      ? renderWrap({ node, index, total: nodes.length, containerId, children: content })
      : content;
    return <Fragment key={node.id}>{wrapped}</Fragment>;
  });
}

/** schema → React 组件树。编辑画布、发布页、静态导出共用此渲染器。 */
export function Renderer({
  schema,
  mode = "static",
  context,
  themePrimary,
  renderWrap,
  renderChildren,
}: RendererProps) {
  // 品牌色变量注入 .lc-page 根节点:Tailwind v4 工具类引用 --color-* 变量,
  // 覆盖后页面内所有物料(indigo/violet/fuchsia 系)整体跟随主题色。
  const themeStyle = useMemo(
    () => themeCssVars(themePrimary) as CSSProperties,
    [themePrimary],
  );
  return (
    <div className="lc-page w-full" style={themeStyle}>
      {renderNodeList(schema.nodes, null, mode, context, renderWrap, renderChildren)}
    </div>
  );
}
