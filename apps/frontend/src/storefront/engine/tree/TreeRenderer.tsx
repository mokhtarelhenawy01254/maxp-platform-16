import React from "react";
import { StorefrontSectionConfig } from "../../types/theme.types";
import { SectionNode, ContainerSettings } from "../../studio/StudioTypes";
import { normalizeSectionNode, isContainerNode } from "./treeUtils";
import type { RenderSectionFrameArgs } from "../PageComposer";

export interface TreeRendererProps {
  nodes: Array<string | StorefrontSectionConfig | SectionNode>;
  renderLeafSection: (
    node: string | StorefrontSectionConfig | SectionNode,
    index: number,
    parentKey?: string
  ) => React.ReactNode;
  renderSectionFrame?: (args: RenderSectionFrameArgs) => React.ReactNode;
  depth?: number;
  parentKey?: string;
  isEditor?: boolean;
}

export const TreeRenderer: React.FC<TreeRendererProps> = ({
  nodes,
  renderLeafSection,
  renderSectionFrame,
  depth = 0,
  parentKey,
  isEditor = false,
}) => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return null;
  }

  return (
    <>
      {nodes.map((rawNode, index) => {
        const node = normalizeSectionNode(rawNode as any, index, parentKey);
        const nodeKey = node.key || `node-${depth}-${index}`;

        // Container Node Rendering
        if (isContainerNode(node)) {
          const settings = (node.settings || {}) as ContainerSettings;
          const direction = settings.direction === "row" ? "row" : "column";
          const isRow = direction === "row";
          const isGrid = Boolean(isRow && settings.columns && settings.columns > 1);
          const gapVal = typeof settings.gap === "number" ? `${settings.gap}px` : settings.gap || "12px";

          const containerStyle: React.CSSProperties = {
            display: isGrid ? "grid" : "flex",
            flexDirection: isGrid ? undefined : isRow ? "row" : "column",
            flexWrap: settings.wrap ? "wrap" : "nowrap",
            gridTemplateColumns: isGrid ? `repeat(${settings.columns}, minmax(0, 1fr))` : undefined,
            gap: gapVal,
            alignItems:
              settings.align === "start"
                ? "flex-start"
                : settings.align === "end"
                ? "flex-end"
                : settings.align === "center"
                ? "center"
                : "stretch",
            paddingTop:
              typeof settings.paddingTop === "number"
                ? `${settings.paddingTop}px`
                : settings.paddingTop,
            paddingBottom:
              typeof settings.paddingBottom === "number"
                ? `${settings.paddingBottom}px`
                : settings.paddingBottom,
            width: "100%",
          };

          const childrenList = Array.isArray(node.children) ? node.children : [];
          const hasChildren = childrenList.length > 0;

          const containerElement = (
            <div
              key={nodeKey}
              data-storefront-container="true"
              data-container-key={nodeKey}
              data-direction={direction}
              className="storefront-container relative w-full"
              style={containerStyle}
            >
              {hasChildren ? (
                <TreeRenderer
                  nodes={childrenList}
                  renderLeafSection={renderLeafSection}
                  renderSectionFrame={renderSectionFrame}
                  depth={depth + 1}
                  parentKey={nodeKey}
                  isEditor={isEditor}
                />
              ) : isEditor ? (
                <div
                  data-studio-empty-container="true"
                  className="flex min-h-[72px] w-full items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-xs font-semibold text-primary/70"
                >
                  حاوية فارغة — اسحب الأقسام هنا للإضافة
                </div>
              ) : null}
            </div>
          );

          if (!renderSectionFrame) {
            return containerElement;
          }

          return (
            <React.Fragment key={nodeKey}>
              {renderSectionFrame({
                element: containerElement,
                index,
                sectionEntry: node as unknown as StorefrontSectionConfig,
                sectionId: "container",
                componentKey: "container",
              })}
            </React.Fragment>
          );
        }

        // Leaf Section Rendering
        const leafElement = renderLeafSection(node as any, index, parentKey);

        return (
          <React.Fragment key={nodeKey}>
            {leafElement}
          </React.Fragment>
        );
      })}
    </>
  );
};
