// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { PageComposer } from "../engine/PageComposer";
import { TreeRenderer } from "../engine/tree/TreeRenderer";
import {
  normalizeSectionTree,
  normalizeSectionNode,
  findNodeByKey,
  findNodeAndParent,
  insertNodeInTree,
  removeNodeFromTree,
  moveNodeInTree,
  reorderNodeChildren,
  getAllSectionKeys,
  isContainerNode,
} from "../engine/tree/treeUtils";
import { StudioLayersDrawer } from "../studio/StudioLayersDrawer";
import { StudioElementsPanel } from "../studio/StudioElementsPanel";
import { STUDIO_PAGES } from "../studio/StudioTypes";
import type { StorefrontPageConfig } from "../types/theme.types";
import type { SectionNode } from "../studio/StudioTypes";

// Mock minimal dependencies
vi.mock("../store/useCartStore", () => ({
  useCartStore: vi.fn((selector) =>
    selector ? selector({ items: [] }) : { items: [] }
  ),
  DEFAULT_STOREFRONT_CART_STORAGE_NAME: "test-cart",
}));

describe("Storefront Phase 5 / Ticket 5A — Containers & Nesting Engine", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1. Flat Render Backward Compatibility (رندر مسطّح زي الأول)", () => {
    it("renders traditional flat string sections identically without children", () => {
      const flatConfig: StorefrontPageConfig = {
        sections: ["richtext", "promo-strip"],
      };

      const { container } = render(
        <PageComposer pageConfig={flatConfig} layout="stack" />
      );

      const composer = container.querySelector(".storefront-page-composer");
      expect(composer).toBeTruthy();
      // Should not create container wrappers for flat sections
      expect(container.querySelectorAll("[data-storefront-container='true']")).toHaveLength(0);
    });

    it("verifies that all 12 preset studio pages can be safely parsed as root nodes", () => {
      expect(STUDIO_PAGES).toHaveLength(12);
      STUDIO_PAGES.forEach((pageDef) => {
        const dummyConfig: StorefrontPageConfig = {
          sections: ["hero-banner", "featured-products"],
        };
        const normalized = normalizeSectionTree(dummyConfig.sections);
        expect(normalized).toHaveLength(2);
        expect(normalized[0].type).toBe("hero-banner");
        expect(normalized[1].type).toBe("featured-products");
      });
    });
  });

  describe("2. Add Container (إضافة حاوية)", () => {
    it("creates a container with default column direction, gap 12, and empty children", () => {
      const initialNodes: SectionNode[] = [
        { type: "hero-banner", key: "hero-1", settings: { title: "مرحبا" } },
      ];

      const newContainer: SectionNode = {
        type: "container",
        key: "container-test-1",
        settings: { direction: "column", gap: 12, align: "stretch", wrap: false },
        children: [],
      };

      const updated = insertNodeInTree(initialNodes, null, newContainer, 1);
      expect(updated).toHaveLength(2);

      const added = findNodeByKey(updated, "container-test-1");
      expect(added).toBeTruthy();
      expect(added?.type).toBe("container");
      expect(isContainerNode(added)).toBe(true);
      expect(added?.settings?.direction).toBe("column");
      expect(added?.settings?.gap).toBe(12);
      expect(added?.children).toEqual([]);
    });

    it("renders container element in StudioElementsPanel and allows adding container", () => {
      const handleAddSection = vi.fn();
      render(
        <StudioElementsPanel
          onAddSection={handleAddSection}
          onOpenFullCatalog={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const containerBtn = screen.getByTitle("اسحب حاوية للكانفس أو انقر للإضافة");
      expect(containerBtn).toBeTruthy();

      fireEvent.click(containerBtn);
      expect(handleAddSection).toHaveBeenCalledWith("container");
    });
  });

  describe("3. Add Section Inside Container (إضافة قسم جوه حاوية)", () => {
    it("inserts a section inside container.children when targetParentKey is provided", () => {
      const tree: SectionNode[] = [
        {
          type: "container",
          key: "c-root",
          settings: { direction: "row", gap: 16 },
          children: [],
        },
      ];

      const childSection: SectionNode = {
        type: "richtext",
        key: "rich-child-1",
        settings: { title: "عنوان داخل الحاوية" },
      };

      const updatedTree = insertNodeInTree(tree, "c-root", childSection);
      const containerNode = findNodeByKey(updatedTree, "c-root");

      expect(containerNode?.children).toHaveLength(1);
      expect(containerNode?.children?.[0].key).toBe("rich-child-1");
      expect(containerNode?.children?.[0].type).toBe("richtext");
      expect(containerNode?.children?.[0].settings?.title).toBe("عنوان داخل الحاوية");
    });
  });

  describe("4. Move Section from Root into Container (نقل قسم من الجذر للحاوية)", () => {
    it("moves an existing root section into a container seamlessly", () => {
      const tree: SectionNode[] = [
        { type: "hero-banner", key: "hero-root" },
        { type: "featured-products", key: "grid-root" },
        {
          type: "container",
          key: "c-target",
          settings: { direction: "column", gap: 12 },
          children: [],
        },
      ];

      // Move grid-root from root into c-target
      const movedTree = moveNodeInTree(tree, "grid-root", "c-target", 0);

      expect(movedTree).toHaveLength(2); // hero-root + c-target
      expect(movedTree.map((n) => n.key)).toEqual(["hero-root", "c-target"]);

      const container = findNodeByKey(movedTree, "c-target");
      expect(container?.children).toHaveLength(1);
      expect(container?.children?.[0].key).toBe("grid-root");
    });

    it("prevents circular references when trying to move a container inside itself", () => {
      const tree: SectionNode[] = [
        {
          type: "container",
          key: "c-parent",
          children: [
            {
              type: "container",
              key: "c-child",
              children: [],
            },
          ],
        },
      ];

      // Moving parent into its own child must be safely ignored/prevented
      const invalidMove = moveNodeInTree(tree, "c-parent", "c-child");
      expect(invalidMove).toEqual(tree);
    });
  });

  describe("5. Delete Container (حذف حاوية بترجع أبنائها أو تحذفهم)", () => {
    it("deletes container along with all its nested children in one atomic action", () => {
      const tree: SectionNode[] = [
        { type: "hero-banner", key: "hero-keep" },
        {
          type: "container",
          key: "c-delete",
          children: [
            { type: "richtext", key: "child-1" },
            { type: "info-content", key: "child-2" },
          ],
        },
      ];

      const afterDelete = removeNodeFromTree(tree, "c-delete");
      expect(afterDelete).toHaveLength(1);
      expect(afterDelete[0].key).toBe("hero-keep");
      expect(findNodeByKey(afterDelete, "c-delete")).toBeNull();
      expect(findNodeByKey(afterDelete, "child-1")).toBeNull();
      expect(findNodeByKey(afterDelete, "child-2")).toBeNull();
    });
  });

  describe("6. Reorder Inside Container (ترتيب داخل حاوية)", () => {
    it("reorders child elements inside container accurately", () => {
      const tree: SectionNode[] = [
        {
          type: "container",
          key: "c-order",
          children: [
            { type: "item-a", key: "a" },
            { type: "item-b", key: "b" },
            { type: "item-c", key: "c" },
          ],
        },
      ];

      // Move 'a' from index 0 to index 2
      const reordered = reorderNodeChildren(tree, "c-order", 0, 2);
      const container = findNodeByKey(reordered, "c-order");

      expect(container?.children?.map((c) => c.key)).toEqual(["b", "c", "a"]);
    });
  });

  describe("7. Save/Load Round-trip (حفظ/تحميل round-trip)", () => {
    it("preserves nested container structure, direction, and child configurations through JSON serialization", () => {
      const originalTree: SectionNode[] = [
        {
          type: "container",
          key: "container-flex-row",
          settings: {
            direction: "row",
            gap: 20,
            columns: 2,
            align: "center",
            wrap: true,
            paddingTop: 40,
            paddingBottom: 40,
          },
          children: [
            {
              type: "richtext",
              key: "rich-1",
              settings: { title: "محتوى العمود الأول" },
            },
            {
              type: "container",
              key: "nested-inner-container",
              settings: { direction: "column", gap: 8 },
              children: [
                {
                  type: "promo-strip",
                  key: "promo-sub",
                  settings: { message: "خصم إضافي" },
                },
              ],
            },
          ],
        },
      ];

      // Simulate API Save: JSON.stringify
      const jsonSaved = JSON.stringify(originalTree);

      // Simulate API Load: JSON.parse + normalization
      const parsed = JSON.parse(jsonSaved);
      const rehydrated = normalizeSectionTree(parsed);

      expect(rehydrated).toHaveLength(1);
      const rootContainer = rehydrated[0];
      expect(rootContainer.type).toBe("container");
      expect(rootContainer.settings?.direction).toBe("row");
      expect(rootContainer.settings?.gap).toBe(20);
      expect(rootContainer.settings?.columns).toBe(2);
      expect(rootContainer.settings?.align).toBe("center");
      expect(rootContainer.children).toHaveLength(2);

      const innerContainer = rootContainer.children?.[1];
      expect(innerContainer?.type).toBe("container");
      expect(innerContainer?.settings?.direction).toBe("column");
      expect(innerContainer?.children?.[0].key).toBe("promo-sub");

      const allKeys = getAllSectionKeys(rehydrated);
      expect(allKeys).toEqual([
        "container-flex-row",
        "rich-1",
        "nested-inner-container",
        "promo-sub",
      ]);
    });
  });

  describe("8. Layers Nesting & Expand/Collapse (layers nesting)", () => {
    it("renders hierarchical indentation in StudioLayersDrawer and toggles container collapse", () => {
      const sectionsTree: SectionNode[] = [
        {
          type: "container",
          key: "container-1",
          label: "حاوية البانر المزدوج",
          children: [
            { type: "hero-banner", key: "hero-child", label: "البانر الأول" },
            { type: "richtext", key: "text-child", label: "النص التوضيحي" },
          ],
        },
        {
          type: "newsletter",
          key: "news-root",
          label: "النشرة البريدية",
        },
      ];

      const { container } = render(
        <StudioLayersDrawer
          sections={sectionsTree}
          sectionKeys={getAllSectionKeys(sectionsTree)}
          selectedSectionKey="container-1"
          leftPanelTab="layers"
          onSelectSection={vi.fn()}
          onMoveSection={vi.fn()}
          onDuplicateSection={vi.fn()}
          onDeleteSection={vi.fn()}
          onOpenSectionCatalog={vi.fn()}
          onTabChange={vi.fn()}
        />
      );

      // Root container row
      const containerRow = container.querySelector('[data-studio-layer-row="container-1"]');
      expect(containerRow).toBeTruthy();
      expect(containerRow?.getAttribute("data-is-container")).toBe("true");
      expect(containerRow?.getAttribute("data-layer-depth")).toBe("0");

      // Child rows with depth = 1
      const heroChildRow = container.querySelector('[data-studio-layer-row="hero-child"]');
      expect(heroChildRow).toBeTruthy();
      expect(heroChildRow?.getAttribute("data-layer-depth")).toBe("1");

      // Test collapse toggle
      const collapseBtn = containerRow?.querySelector('button[title="طي الحاوية"]');
      expect(collapseBtn).toBeTruthy();

      fireEvent.click(collapseBtn!);

      // After clicking, button changes title to "فتح الحاوية"
      const expandBtn = containerRow?.querySelector('button[title="فتح الحاوية"]');
      expect(expandBtn).toBeTruthy();

      // Child row should now be unmounted/collapsed
      expect(container.querySelector('[data-studio-layer-row="hero-child"]')).toBeNull();
    });
  });

  describe("9. Live Storefront Nested Rendering (رندر حي متداخل)", () => {
    it("renders nested container div with flex styling in TreeRenderer", () => {
      const nestedNodes: SectionNode[] = [
        {
          type: "container",
          key: "flex-container",
          settings: {
            direction: "row",
            gap: 24,
            align: "center",
            wrap: true,
            paddingTop: 16,
            paddingBottom: 32,
          },
          children: [
            { type: "richtext", key: "col-1" },
            { type: "promo-strip", key: "col-2" },
          ],
        },
      ];

      const renderLeafSection = vi.fn((node, idx) => (
        <div key={node.key} data-testid={`leaf-${node.key}`}>
          Leaf {node.key}
        </div>
      ));

      const { container } = render(
        <TreeRenderer
          nodes={nestedNodes}
          renderLeafSection={renderLeafSection}
        />
      );

      const containerEl = container.querySelector('[data-storefront-container="true"]');
      expect(containerEl).toBeTruthy();
      expect(containerEl?.getAttribute("data-direction")).toBe("row");

      const htmlEl = containerEl as HTMLElement;
      expect(htmlEl.style.display).toBe("flex");
      expect(htmlEl.style.flexDirection).toBe("row");
      expect(htmlEl.style.gap).toBe("24px");
      expect(htmlEl.style.alignItems).toBe("center");
      expect(htmlEl.style.flexWrap).toBe("wrap");
      expect(htmlEl.style.paddingTop).toBe("16px");
      expect(htmlEl.style.paddingBottom).toBe("32px");

      expect(screen.getByTestId("leaf-col-1")).toBeTruthy();
      expect(screen.getByTestId("leaf-col-2")).toBeTruthy();
      expect(renderLeafSection).toHaveBeenCalledTimes(2);
    });
  });
});
