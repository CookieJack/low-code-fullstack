import { Fragment, type ReactNode } from "react";
import { materialMap } from "@lc/materials";
import type { MaterialContext, MaterialMode } from "@lc/materials";
import type { NodeSchema, PageSchema } from "@lc/schema";

export interface RenderWrapArgs {
  node: NodeSchema;
  index: number;
  total: number;
  children: ReactNode;
}

export interface RendererProps {
  schema: PageSchema;
  mode?: MaterialMode;
  context?: Omit<MaterialContext, "nodeId">;
  /**
   * 编辑器注入的包装层(选中态/拖拽/工具条);
   * 发布页与导出时不传,输出纯净页面。
   */
  renderWrap?: (args: RenderWrapArgs) => ReactNode;
}

/** schema → React 组件树。编辑画布、发布页、静态导出共用此渲染器。 */
export function Renderer({ schema, mode = "static", context, renderWrap }: RendererProps) {
  return (
    <div className="lc-page w-full">
      {schema.nodes.map((node, index) => {
        const def = materialMap.get(node.type);
        let children: ReactNode;
        if (def) {
          children = (
            <def.Component
              props={node.props}
              style={node.style}
              mode={mode}
              context={{ ...context, nodeId: node.id }}
            />
          );
        } else if (mode === "edit") {
          children = (
            <div className="m-4 rounded-xl border-2 border-dashed border-red-300 bg-red-50/60 p-6 text-center text-sm text-red-500">
              未知物料类型「{node.type}」,请删除该区块
            </div>
          );
        } else {
          children = null;
        }
        return (
          <Fragment key={node.id}>
            {renderWrap ? renderWrap({ node, index, total: schema.nodes.length, children }) : children}
          </Fragment>
        );
      })}
    </div>
  );
}
