import React from "react";
import { StorefrontSectionConfig } from "../../types/theme.types";
import { SectionNode, ContainerSettings, StudioDeviceMode } from "../../studio/StudioTypes";
import { normalizeSectionNode, isContainerNode, resolveContainerSettings } from "./treeUtils";
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
  deviceMode?: StudioDeviceMode;
}

export const TreeRenderer: React.FC<TreeRendererProps> = ({
  nodes,
  renderLeafSection,
  renderSectionFrame,
  depth = 0,
  parentKey,
  isEditor = false,
  deviceMode,
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
          const rawSettings = (node.settings || {}) as ContainerSettings;
          const activeDeviceMode =
            deviceMode ||
            (typeof window !== "undefined" && window.innerWidth < 640
              ? "mobile"
              : typeof window !== "undefined" && window.innerWidth < 1024
              ? "tablet"
              : "desktop");
          const settings = resolveContainerSettings(rawSettings, activeDeviceMode);

          const isGrid = Boolean(settings.columns && settings.columns > 1);
          const direction = isGrid ? undefined : (settings.direction === "row" ? "row" : "column");
          const isRow = !isGrid && direction === "row";
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
            paddingLeft:
              typeof settings.paddingLeft === "number"
                ? `${settings.paddingLeft}px`
                : settings.paddingLeft,
            paddingRight:
              typeof settings.paddingRight === "number"
                ? `${settings.paddingRight}px`
                : settings.paddingRight,
            width: "100%",
          };

          const childrenList = Array.isArray(node.children) ? node.children : [];
          const hasChildren = childrenList.length > 0;

          // Responsive CSS for dynamic window resizing in live storefront
          let responsiveCss: string | null = null;
          if (rawSettings.responsive?.mobile || rawSettings.responsive?.tablet) {
            const rules: string[] = [];
            if (rawSettings.responsive?.tablet) {
              const tab = resolveContainerSettings(rawSettings, "tablet");
              const tabIsGrid = Boolean(tab.columns && tab.columns > 1);
              const tabGap = typeof tab.gap === "number" ? `${tab.gap}px` : tab.gap;
              rules.push(`
                @media (min-width: 640px) and (max-width: 1023.98px) {
                  [data-container-key="${nodeKey}"] {
                    ${tabIsGrid ? `display: grid !important; grid-template-columns: repeat(${tab.columns}, minmax(0, 1fr)) !important;` : `display: flex !important; flex-direction: ${tab.direction === "row" ? "row" : "column"} !important;`}
                    ${tab.wrap !== undefined ? `flex-wrap: ${tab.wrap ? "wrap" : "nowrap"} !important;` : ""}
                    ${tabGap ? `gap: ${tabGap} !important;` : ""}
                    ${tab.align ? `align-items: ${tab.align === "start" ? "flex-start" : tab.align === "end" ? "flex-end" : tab.align === "center" ? "center" : "stretch"} !important;` : ""}
                    ${tab.paddingTop !== undefined ? `padding-top: ${typeof tab.paddingTop === "number" ? `${tab.paddingTop}px` : tab.paddingTop} !important;` : ""}
                    ${tab.paddingBottom !== undefined ? `padding-bottom: ${typeof tab.paddingBottom === "number" ? `${tab.paddingBottom}px` : tab.paddingBottom} !important;` : ""}
                    ${tab.paddingLeft !== undefined ? `padding-left: ${typeof tab.paddingLeft === "number" ? `${tab.paddingLeft}px` : tab.paddingLeft} !important;` : ""}
                    ${tab.paddingRight !== undefined ? `padding-right: ${typeof tab.paddingRight === "number" ? `${tab.paddingRight}px` : tab.paddingRight} !important;` : ""}
                  }
                }
              `);
            }
            if (rawSettings.responsive?.mobile) {
              const mob = resolveContainerSettings(rawSettings, "mobile");
              const mobIsGrid = Boolean(mob.columns && mob.columns > 1);
              const mobGap = typeof mob.gap === "number" ? `${mob.gap}px` : mob.gap;
              rules.push(`
                @media (max-width: 639.98px) {
                  [data-container-key="${nodeKey}"] {
                    ${mobIsGrid ? `display: grid !important; grid-template-columns: repeat(${mob.columns}, minmax(0, 1fr)) !important;` : `display: flex !important; flex-direction: ${mob.direction === "row" ? "row" : "column"} !important;`}
                    ${mob.wrap !== undefined ? `flex-wrap: ${mob.wrap ? "wrap" : "nowrap"} !important;` : ""}
                    ${mobGap ? `gap: ${mobGap} !important;` : ""}
                    ${mob.align ? `align-items: ${mob.align === "start" ? "flex-start" : mob.align === "end" ? "flex-end" : mob.align === "center" ? "center" : "stretch"} !important;` : ""}
                    ${mob.paddingTop !== undefined ? `padding-top: ${typeof mob.paddingTop === "number" ? `${mob.paddingTop}px` : mob.paddingTop} !important;` : ""}
                    ${mob.paddingBottom !== undefined ? `padding-bottom: ${typeof mob.paddingBottom === "number" ? `${mob.paddingBottom}px` : mob.paddingBottom} !important;` : ""}
                    ${mob.paddingLeft !== undefined ? `padding-left: ${typeof mob.paddingLeft === "number" ? `${mob.paddingLeft}px` : mob.paddingLeft} !important;` : ""}
                    ${mob.paddingRight !== undefined ? `padding-right: ${typeof mob.paddingRight === "number" ? `${mob.paddingRight}px` : mob.paddingRight} !important;` : ""}
                  }
                }
              `);
            }
            responsiveCss = rules.join("\n");
          }

          const containerElement = (
            <div
              key={nodeKey}
              data-storefront-container="true"
              data-container-key={nodeKey}
              data-direction={settings.direction}
              data-columns={settings.columns || 1}
              data-align={settings.align}
              data-wrap={settings.wrap ? "true" : "false"}
              className="storefront-container relative w-full"
              style={containerStyle}
            >
              {responsiveCss && (
                <style
                  data-container-style={nodeKey}
                  dangerouslySetInnerHTML={{ __html: responsiveCss }}
                />
              )}
              {hasChildren ? (
                <TreeRenderer
                  nodes={childrenList}
                  renderLeafSection={renderLeafSection}
                  renderSectionFrame={renderSectionFrame}
                  depth={depth + 1}
                  parentKey={nodeKey}
                  isEditor={isEditor}
                  deviceMode={deviceMode}
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
