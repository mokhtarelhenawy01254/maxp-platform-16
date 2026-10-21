// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { TreeRenderer } from "../engine/tree/TreeRenderer";
import {
  resolveContainerSettings,
  normalizeSectionNode,
  normalizeSectionTree,
  isContainerNode,
} from "../engine/tree/treeUtils";
import { StudioContainerControls } from "../studio/inspector/StudioContainerControls";
import { StudioPropertyInspector } from "../studio/StudioPropertyInspector";
import {
  SectionNode,
  ContainerSettings,
  DEFAULT_CONTAINER_SETTINGS,
} from "../studio/StudioTypes";

// Mock minimal dependencies
vi.mock("../store/useCartStore", () => ({
  useCartStore: vi.fn((selector) =>
    selector ? selector({ items: [] }) : { items: [] }
  ),
  DEFAULT_STOREFRONT_CART_STORAGE_NAME: "test-cart",
}));

describe("Storefront Phase 5 / Ticket 5B — Container Controls (Flex/Grid) + Responsive", () => {
  afterEach(() => {
    cleanup();
  });

  const dummyLeafRenderer = (node: any) => (
    <div key={node.key || node.type} data-testid={`leaf-${node.key || node.type}`}>
      Leaf {node.key || node.type}
    </div>
  );

  describe("1. Direction (row vs column)", () => {
    it("renders flex row container with child elements side by side", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-row",
          settings: { direction: "row" },
          children: [
            { type: "richtext", key: "child-1" },
            { type: "promo-strip", key: "child-2" },
          ],
        },
      ];

      const { container } = render(
        <TreeRenderer nodes={nodes} renderLeafSection={dummyLeafRenderer} />
      );

      const el = container.querySelector('[data-storefront-container="true"]');
      expect(el).toBeTruthy();
      expect(el?.getAttribute("data-direction")).toBe("row");

      const htmlEl = el as HTMLElement;
      expect(htmlEl.style.display).toBe("flex");
      expect(htmlEl.style.flexDirection).toBe("row");
      expect(screen.getByTestId("leaf-child-1")).toBeTruthy();
      expect(screen.getByTestId("leaf-child-2")).toBeTruthy();
    });

    it("renders flex column container with child elements stacked vertically", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-col",
          settings: { direction: "column" },
          children: [
            { type: "hero-banner", key: "child-1" },
            { type: "newsletter", key: "child-2" },
          ],
        },
      ];

      const { container } = render(
        <TreeRenderer nodes={nodes} renderLeafSection={dummyLeafRenderer} />
      );

      const el = container.querySelector('[data-storefront-container="true"]');
      expect(el).toBeTruthy();
      expect(el?.getAttribute("data-direction")).toBe("column");

      const htmlEl = el as HTMLElement;
      expect(htmlEl.style.display).toBe("flex");
      expect(htmlEl.style.flexDirection).toBe("column");
    });
  });

  describe("2. Columns generate CSS Grid (الأعمدة تولّد grid)", () => {
    it("generates CSS grid with repeat(2, minmax(0, 1fr)) when columns=2", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-grid-2",
          settings: { columns: 2, gap: 16 },
          children: [
            { type: "item-1", key: "col-1" },
            { type: "item-2", key: "col-2" },
          ],
        },
      ];

      const { container } = render(
        <TreeRenderer nodes={nodes} renderLeafSection={dummyLeafRenderer} />
      );

      const el = container.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.style.display).toBe("grid");
      expect(el.style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
      expect(el.getAttribute("data-columns")).toBe("2");
    });

    it("generates CSS grid with repeat(4, minmax(0, 1fr)) for 4 columns", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-grid-4",
          settings: { columns: 4 },
          children: [],
        },
      ];

      const { container } = render(
        <TreeRenderer nodes={nodes} renderLeafSection={dummyLeafRenderer} />
      );

      const el = container.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(el.style.display).toBe("grid");
      expect(el.style.gridTemplateColumns).toBe("repeat(4, minmax(0, 1fr))");
    });
  });

  describe("3. Gap Application (الفجوة تُطبق)", () => {
    it("applies numeric gap accurately in pixels", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-gap-24",
          settings: { gap: 24 },
          children: [],
        },
      ];

      const { container } = render(
        <TreeRenderer nodes={nodes} renderLeafSection={dummyLeafRenderer} />
      );

      const el = container.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(el.style.gap).toBe("24px");
    });
  });

  describe("4. Alignment (المحاذاة start/center/end/stretch)", () => {
    it("applies start, center, end, and stretch to alignItems style correctly", () => {
      const testCases: Array<{ align: "start" | "center" | "end" | "stretch"; expected: string }> = [
        { align: "start", expected: "flex-start" },
        { align: "center", expected: "center" },
        { align: "end", expected: "flex-end" },
        { align: "stretch", expected: "stretch" },
      ];

      testCases.forEach(({ align, expected }) => {
        const nodes: SectionNode[] = [
          {
            type: "container",
            key: `c-align-${align}`,
            settings: { align },
            children: [],
          },
        ];

        const { container } = render(
          <TreeRenderer nodes={nodes} renderLeafSection={dummyLeafRenderer} />
        );

        const el = container.querySelector('[data-storefront-container="true"]') as HTMLElement;
        expect(el.style.alignItems).toBe(expected);
        expect(el.getAttribute("data-align")).toBe(align);
        cleanup();
      });
    });
  });

  describe("5. Padding (top/bottom/left/right)", () => {
    it("applies all 4 padding values to container element", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-padding",
          settings: {
            paddingTop: 48,
            paddingBottom: 36,
            paddingLeft: 24,
            paddingRight: 20,
          },
          children: [],
        },
      ];

      const { container } = render(
        <TreeRenderer nodes={nodes} renderLeafSection={dummyLeafRenderer} />
      );

      const el = container.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(el.style.paddingTop).toBe("48px");
      expect(el.style.paddingBottom).toBe("36px");
      expect(el.style.paddingLeft).toBe("24px");
      expect(el.style.paddingRight).toBe("20px");
    });
  });

  describe("6. Flex Wrap (التفاف العناصر)", () => {
    it("applies wrap or nowrap according to settings", () => {
      const nodesWrap: SectionNode[] = [
        {
          type: "container",
          key: "c-wrap-true",
          settings: { wrap: true },
          children: [],
        },
      ];

      const { container: c1 } = render(
        <TreeRenderer nodes={nodesWrap} renderLeafSection={dummyLeafRenderer} />
      );
      const elWrap = c1.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(elWrap.style.flexWrap).toBe("wrap");
      expect(elWrap.getAttribute("data-wrap")).toBe("true");

      cleanup();

      const nodesNoWrap: SectionNode[] = [
        {
          type: "container",
          key: "c-wrap-false",
          settings: { wrap: false },
          children: [],
        },
      ];

      const { container: c2 } = render(
        <TreeRenderer nodes={nodesNoWrap} renderLeafSection={dummyLeafRenderer} />
      );
      const elNoWrap = c2.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(elNoWrap.style.flexWrap).toBe("nowrap");
      expect(elNoWrap.getAttribute("data-wrap")).toBe("false");
    });
  });

  describe("7. Responsive Mobile Overrides Desktop (responsive mobile يغلب الديسكتوب)", () => {
    it("mobile overrides direction, columns, and gap over desktop base", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-responsive",
          settings: {
            direction: "row",
            columns: 3,
            gap: 32,
            responsive: {
              mobile: {
                direction: "column",
                columns: 1,
                gap: 8,
              },
            },
          },
          children: [
            { type: "item-1", key: "c1" },
            { type: "item-2", key: "c2" },
          ],
        },
      ];

      // 1. Desktop render: grid 3 columns, gap 32
      const { container: deskContainer } = render(
        <TreeRenderer
          nodes={nodes}
          renderLeafSection={dummyLeafRenderer}
          deviceMode="desktop"
        />
      );

      const deskEl = deskContainer.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(deskEl.style.display).toBe("grid");
      expect(deskEl.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
      expect(deskEl.style.gap).toBe("32px");

      cleanup();

      // 2. Mobile render: mobile overrides win (direction column, 1 col = flex, gap 8)
      const { container: mobContainer } = render(
        <TreeRenderer
          nodes={nodes}
          renderLeafSection={dummyLeafRenderer}
          deviceMode="mobile"
        />
      );

      const mobEl = mobContainer.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(mobEl.style.display).toBe("flex");
      expect(mobEl.style.flexDirection).toBe("column");
      expect(mobEl.style.gap).toBe("8px");
      expect(mobEl.getAttribute("data-direction")).toBe("column");
      expect(mobEl.getAttribute("data-columns")).toBe("1");
    });

    it("resolves tablet and mobile cascade correctly using resolveContainerSettings", () => {
      const settings: ContainerSettings = {
        direction: "row",
        columns: 4,
        gap: 24,
        responsive: {
          tablet: {
            columns: 2,
            gap: 16,
          },
          mobile: {
            columns: 1,
            direction: "column",
            gap: 8,
          },
        },
      };

      const desk = resolveContainerSettings(settings, "desktop");
      expect(desk.columns).toBe(4);
      expect(desk.direction).toBe("row");
      expect(desk.gap).toBe(24);

      const tab = resolveContainerSettings(settings, "tablet");
      expect(tab.columns).toBe(2);
      expect(tab.direction).toBe("row");
      expect(tab.gap).toBe(16);

      const mob = resolveContainerSettings(settings, "mobile");
      expect(mob.columns).toBe(1);
      expect(mob.direction).toBe("column");
      expect(mob.gap).toBe(8);
    });
  });

  describe("8. Empty Container (الحاوية الفاضية)", () => {
    it("renders empty placeholder in editor mode", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-empty",
          settings: { direction: "column" },
          children: [],
        },
      ];

      render(
        <TreeRenderer
          nodes={nodes}
          renderLeafSection={dummyLeafRenderer}
          isEditor={true}
        />
      );

      const placeholder = screen.getByText(/حاوية فارغة/);
      expect(placeholder).toBeTruthy();
    });

    it("does not render editor empty placeholder in live storefront mode", () => {
      const nodes: SectionNode[] = [
        {
          type: "container",
          key: "c-empty-live",
          settings: { direction: "column" },
          children: [],
        },
      ];

      render(
        <TreeRenderer
          nodes={nodes}
          renderLeafSection={dummyLeafRenderer}
          isEditor={false}
        />
      );

      expect(screen.queryByText(/حاوية فارغة/)).toBeNull();
    });
  });

  describe("9. Default Settings (غياب الإعدادات = default column/gap 12)", () => {
    it("defaults to column direction and gap 12 when settings are omitted", () => {
      const emptySettingsNode = normalizeSectionNode(
        { type: "container", key: "c-defaults" },
        0
      );

      expect(emptySettingsNode.settings?.direction).toBe("column");
      expect(emptySettingsNode.settings?.gap).toBe(12);
      expect(emptySettingsNode.settings?.columns).toBe(1);
      expect(emptySettingsNode.settings?.align).toBe("stretch");

      const { container } = render(
        <TreeRenderer nodes={[emptySettingsNode]} renderLeafSection={dummyLeafRenderer} />
      );

      const el = container.querySelector('[data-storefront-container="true"]') as HTMLElement;
      expect(el.style.display).toBe("flex");
      expect(el.style.flexDirection).toBe("column");
      expect(el.style.gap).toBe("12px");
      expect(el.style.alignItems).toBe("stretch");
    });
  });

  describe("10. StudioContainerControls Interactions (الفاحص والتعديلات)", () => {
    it("triggers onUpdateField when direction segmented button is clicked", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioContainerControls
          settings={{ direction: "column", gap: 12 }}
          deviceMode="desktop"
          onUpdateField={onUpdateField}
        />
      );

      const rowBtn = screen.getByRole("button", { name: /أفقي/i });
      fireEvent.click(rowBtn);
      expect(onUpdateField).toHaveBeenCalledWith("direction", "row");
    });

    it("triggers onUpdateField when columns stepper is modified", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioContainerControls
          settings={{ columns: 2 }}
          deviceMode="desktop"
          onUpdateField={onUpdateField}
        />
      );

      // Increment
      const incBtn = screen.getByText("+");
      fireEvent.click(incBtn);
      expect(onUpdateField).toHaveBeenCalledWith("columns", 3);

      // Direct button
      const col4Btn = screen.getByRole("button", { name: "4" });
      fireEvent.click(col4Btn);
      expect(onUpdateField).toHaveBeenCalledWith("columns", 4);
    });

    it("triggers onUpdateField when wrap toggle is toggled", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioContainerControls
          settings={{ wrap: false }}
          deviceMode="desktop"
          onUpdateField={onUpdateField}
        />
      );

      const wrapSwitch = screen.getByRole("switch");
      expect(wrapSwitch.getAttribute("aria-checked")).toBe("false");

      fireEvent.click(wrapSwitch);
      expect(onUpdateField).toHaveBeenCalledWith("wrap", true);
    });

    it("triggers onUpdateField when alignment option is clicked", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioContainerControls
          settings={{ align: "stretch" }}
          deviceMode="desktop"
          onUpdateField={onUpdateField}
        />
      );

      const centerBtn = screen.getByRole("button", { name: "توسيط" });
      fireEvent.click(centerBtn);
      expect(onUpdateField).toHaveBeenCalledWith("align", "center");
    });
  });

  describe("11. Device Mode Awareness (تعديل الجوال يحفظ في responsive.mobile فقط)", () => {
    it("writes to responsive.mobile when deviceMode is mobile", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioContainerControls
          settings={{
            direction: "row",
            columns: 3,
            responsive: {},
          }}
          deviceMode="mobile"
          onUpdateField={onUpdateField}
        />
      );

      // Verify mobile notice is visible
      expect(screen.getByTestId("container-responsive-notice")).toBeTruthy();
      expect(screen.getByTestId("container-override-badge")).toBeTruthy();

      // Change direction to column in mobile
      const colBtn = screen.getByRole("button", { name: /عمودي/i });
      fireEvent.click(colBtn);

      expect(onUpdateField).toHaveBeenCalledWith(
        "responsive",
        expect.objectContaining({
          mobile: expect.objectContaining({ direction: "column" }),
        })
      );
    });
  });

  describe("12. StudioPropertyInspector Integration for Container", () => {
    it("renders StudioContainerControls when section.type === 'container' in layout tab", () => {
      const { container } = render(
        <StudioPropertyInspector
          selectedSectionKey="c-test"
          sectionConfig={{
            type: "container",
            settings: { direction: "row", gap: 16 },
          }}
          initialTab="layout"
          onClose={vi.fn()}
          onUpdateField={vi.fn()}
        />
      );

      expect(container.querySelector('[data-studio-container-controls="true"]')).toBeTruthy();
      expect(screen.getByText(/اتجاه وتدفق الحاوية/)).toBeTruthy();
      expect(screen.getByText(/الأعمدة والشبكة/)).toBeTruthy();
    });

    it("does not render StudioContainerControls for non-container sections", () => {
      const { container } = render(
        <StudioPropertyInspector
          selectedSectionKey="hero-test"
          sectionConfig={{
            type: "hero-banner",
            settings: { title: "مرحبا" },
          }}
          initialTab="layout"
          onClose={vi.fn()}
          onUpdateField={vi.fn()}
        />
      );

      expect(container.querySelector('[data-studio-container-controls="true"]')).toBeNull();
    });
  });
});
