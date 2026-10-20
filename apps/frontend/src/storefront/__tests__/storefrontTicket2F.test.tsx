// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, renderHook, act } from "@testing-library/react";

import { StudioSortableLayerRow } from "../studio/StudioSortableLayerRow";
import { StudioLayersDrawer } from "../studio/StudioLayersDrawer";
import { StudioSortableSection } from "../studio/StudioSortableSection";
import { PageComposer } from "../engine/PageComposer";
import { StorefrontSectionFrame } from "../layout/StorefrontSectionFrame";
import { useStorefrontStudioState } from "../studio/hooks/useStorefrontStudioState";

// Mock ThemeProvider for StorefrontSectionFrame
vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({ theme: { id: "clean-standard", direction: "rtl" } }),
  StorefrontThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock ComponentRegistry for PageComposer
vi.mock("../engine/ComponentRegistry", () => {
  const createMock = (id: string) => {
    const Comp = () => <div data-section-type={id}>{id}</div>;
    return Comp;
  };
  return {
    ComponentRegistry: {
      "hero-banner": createMock("hero-banner"),
      "promo-strip": createMock("promo-strip"),
      "product-grid": createMock("product-grid"),
      "featured-products": createMock("featured-products"),
      "newsletter": createMock("newsletter"),
    },
  };
});

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock @dnd-kit/sortable
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: ({ disabled }: { disabled?: boolean }) => ({
    attributes: {},
    listeners: disabled ? {} : { onPointerDown: vi.fn() },
    setNodeRef: (el: any) => el,
    transform: null,
    transition: null,
    isDragging: false,
    isOver: false,
    active: null,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  arrayMove: <T,>(arr: T[], from: number, to: number): T[] => {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    if (item !== undefined) copy.splice(to, 0, item);
    return copy;
  },
}));

describe("Ticket 2F: Full Layers Tree & Canvas Synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. Layer Row Actions: Rename (تسمية)", () => {
    it("renders custom label and shows inline input on double-click or pencil click", () => {
      const onRenameMock = vi.fn();
      render(
        <StudioSortableLayerRow
          index={0}
          sectionKey="hero-0"
          sectionType="hero-banner"
          label="البنر الرئيسي"
          isHidden={false}
          isLocked={false}
          isSelected={false}
          totalSections={3}
          onSelect={vi.fn()}
          onRename={onRenameMock}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("البنر الرئيسي")).toBeDefined();

      // Double-click to edit
      const titleEl = screen.getByText("البنر الرئيسي");
      fireEvent.doubleClick(titleEl);

      // Input appears
      const input = screen.getByRole("textbox", { name: "تعديل اسم القسم" }) as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe("البنر الرئيسي");

      // Type new name and press Enter
      fireEvent.change(input, { target: { value: "هيرو العيد" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onRenameMock).toHaveBeenCalledWith("هيرو العيد");
    });

    it("cancels rename on Escape key without calling onRename", () => {
      const onRenameMock = vi.fn();
      render(
        <StudioSortableLayerRow
          index={0}
          sectionKey="hero-0"
          sectionType="hero-banner"
          label="البنر الرئيسي"
          isHidden={false}
          isLocked={false}
          isSelected={false}
          totalSections={3}
          onSelect={vi.fn()}
          onRename={onRenameMock}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const titleEl = screen.getByText("البنر الرئيسي");
      fireEvent.doubleClick(titleEl);

      const input = screen.getByRole("textbox", { name: "تعديل اسم القسم" }) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "اسم مؤقت" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onRenameMock).not.toHaveBeenCalled();
      expect(screen.getByText("البنر الرئيسي")).toBeDefined();
    });
  });

  describe("2. Layer Row Actions: Visibility (إخفاء/إظهار)", () => {
    it("toggles visibility when eye button is clicked and shows eye slash icon when hidden", () => {
      const onToggleVisMock = vi.fn();
      const { rerender } = render(
        <StudioSortableLayerRow
          index={0}
          sectionKey="hero-0"
          sectionType="hero-banner"
          label="البنر الرئيسي"
          isHidden={false}
          isLocked={false}
          isSelected={false}
          totalSections={3}
          onSelect={vi.fn()}
          onRename={vi.fn()}
          onToggleVisibility={onToggleVisMock}
          onToggleLock={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const eyeBtn = screen.getByRole("button", { name: "إخفاء من المتجر" });
      fireEvent.click(eyeBtn);
      expect(onToggleVisMock).toHaveBeenCalledTimes(1);

      // Rerender as hidden
      rerender(
        <StudioSortableLayerRow
          index={0}
          sectionKey="hero-0"
          sectionType="hero-banner"
          label="البنر الرئيسي"
          isHidden={true}
          isLocked={false}
          isSelected={false}
          totalSections={3}
          onSelect={vi.fn()}
          onRename={vi.fn()}
          onToggleVisibility={onToggleVisMock}
          onToggleLock={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: "إظهار في المتجر والكانفس" })).toBeDefined();
      expect(screen.getByText("مخفي")).toBeDefined();
    });
  });

  describe("3. Layer Row Actions: Lock (قفل)", () => {
    it("toggles lock when lock button is clicked and shows lock badge and disables move buttons", () => {
      const onToggleLockMock = vi.fn();
      render(
        <StudioSortableLayerRow
          index={1}
          sectionKey="promo-1"
          sectionType="promo-strip"
          label="شريط العروض"
          isHidden={false}
          isLocked={true}
          isSelected={false}
          totalSections={3}
          onSelect={vi.fn()}
          onRename={vi.fn()}
          onToggleVisibility={vi.fn()}
          onToggleLock={onToggleLockMock}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("مقفل")).toBeDefined();
      const unlockBtn = screen.getByRole("button", { name: "فك قفل القسم" });
      fireEvent.click(unlockBtn);
      expect(onToggleLockMock).toHaveBeenCalledTimes(1);

      // Move buttons are disabled when locked
      const moveUpBtn = screen.getByTitle("تحريك لأعلى");
      expect(moveUpBtn.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("4. Canvas Behavior for Hidden and Locked Sections", () => {
    it("renders dimmed opacity, hidden badge, and quick unhide action on canvas when section is hidden", () => {
      const onToggleVisMock = vi.fn();
      render(
        <StudioSortableSection
          id="hero-0"
          index={0}
          sectionKey="hero-0"
          sectionLabel="هيرو العيد"
          sectionType="hero-banner"
          selected={true}
          totalSections={2}
          hidden={true}
          locked={false}
          onSelect={vi.fn()}
          onToggleVisibility={onToggleVisMock}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>محتوى الهيرو</div>
        </StudioSortableSection>
      );

      // Hidden badge exists
      expect(screen.getByText("مخفي (لن يظهر في المتجر الحي)")).toBeDefined();

      // Quick unhide in floating bar
      const unhideBtn = screen.getByRole("button", { name: "إظهار في المتجر" });
      fireEvent.click(unhideBtn);
      expect(onToggleVisMock).toHaveBeenCalledTimes(1);
    });

    it("rejects canvas click and double-click when section is locked and shows locked indicator", () => {
      const onSelectMock = vi.fn();
      render(
        <StudioSortableSection
          id="hero-0"
          index={0}
          sectionKey="hero-0"
          sectionLabel="هيرو العيد"
          sectionType="hero-banner"
          selected={false}
          totalSections={2}
          hidden={false}
          locked={true}
          onSelect={onSelectMock}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>محتوى الهيرو</div>
        </StudioSortableSection>
      );

      // Locked badge exists
      expect(screen.getByText("مقفل")).toBeDefined();

      // Attempt click on canvas
      const contentEl = screen.getByText("محتوى الهيرو");
      fireEvent.click(contentEl);

      // onSelect should NOT be called because it is locked
      expect(onSelectMock).not.toHaveBeenCalled();
    });
  });

  describe("5. Live Storefront Filtering vs Studio Editor Canvas", () => {
    const samplePageConfig: any = {
      sections: [
        { key: "hero-0", type: "hero-banner", settings: { title: "Hero" } },
        { key: "promo-1", type: "promo-strip", hidden: true, settings: { hidden: true, message: "Promo" } },
        { key: "grid-2", type: "product-grid", settings: { title: "Grid" } },
      ],
    };

    it("filters out hidden section completely in live store (when renderSectionFrame is omitted)", () => {
      const { container } = render(
        <PageComposer pageConfig={samplePageConfig} />
      );

      // Live store should render hero and grid, but NOT promo
      const sections = container.querySelectorAll("[data-section-type]");
      const sectionTypes = Array.from(sections).map((el) => el.getAttribute("data-section-type"));

      expect(sectionTypes).toContain("hero-banner");
      expect(sectionTypes).toContain("product-grid");
      expect(sectionTypes).not.toContain("promo-strip");
    });

    it("StorefrontSectionFrame returns null if sectionEntry has hidden=true", () => {
      const { container } = render(
        <StorefrontSectionFrame
          element={<div>محتوى</div>}
          index={0}
          sectionEntry={{ type: "promo-strip", hidden: true }}
          sectionId="promo-strip"
          componentKey="promo-strip"
        />
      );

      expect(container.innerHTML).toBe("");
    });

    it("keeps hidden sections in editor canvas when renderSectionFrame is provided", () => {
      const frameMock = vi.fn(({ sectionEntry, index }) => (
        <div key={index} data-editor-frame="true" data-type={sectionEntry.type}>
          Frame
        </div>
      ));

      render(
        <PageComposer
          pageConfig={samplePageConfig}
          renderSectionFrame={frameMock}
        />
      );

      expect(frameMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("6. useStorefrontStudioState: Rename, Visibility, Lock, DnD Dual Map Saves", () => {
    it("handles rename, visibility toggle, lock toggle, and reorder with dual-map updates (pages and pageOverrides)", () => {
      const onChangeMock = vi.fn();
      const onSaveMock = vi.fn();

      const initialTokens: any = {
        themeId: "khemet-luxe-eg",
        pages: {
          home: {
            sections: [
              { key: "hero-0", type: "hero-banner", settings: { title: "Hero" } },
              { key: "promo-1", type: "promo-strip", settings: { message: "Promo" } },
            ],
          },
        },
      };

      const { result } = renderHook(() =>
        useStorefrontStudioState({
          themeId: "khemet-luxe-eg",
          externalDesignTokens: initialTokens,
          onChange: onChangeMock,
          onSave: onSaveMock,
        })
      );

      // 1. Rename hero-0 to "هيرو العيد"
      act(() => {
        result.current.handleRenameSection("hero-0", "هيرو العيد");
      });

      expect(onSaveMock).toHaveBeenCalled();
      const updatedAfterRename = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0];
      const renamedHero = updatedAfterRename.pages.home.sections[0];
      expect(renamedHero.label).toBe("هيرو العيد");
      expect(renamedHero.settings.label).toBe("هيرو العيد");
      expect(updatedAfterRename.pageOverrides.home.sections[0].label).toBe("هيرو العيد");

      // 2. Toggle visibility on promo-1 -> hidden: true
      act(() => {
        result.current.handleToggleSectionVisibility("promo-1");
      });

      const updatedAfterHide = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0];
      const hiddenPromo = updatedAfterHide.pages.home.sections[1];
      expect(hiddenPromo.hidden).toBe(true);
      expect(hiddenPromo.settings.hidden).toBe(true);
      expect(updatedAfterHide.pageOverrides.home.sections[1].hidden).toBe(true);

      // 3. Toggle lock on hero-0 -> locked: true
      act(() => {
        result.current.handleToggleSectionLock("hero-0");
      });

      const updatedAfterLock = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0];
      const lockedHero = updatedAfterLock.pages.home.sections[0];
      expect(lockedHero.locked).toBe(true);
      expect(lockedHero.settings.locked).toBe(true);
      expect(updatedAfterLock.pageOverrides.home.sections[0].locked).toBe(true);

      // 4. DragEnd on locked section should be rejected
      act(() => {
        result.current.handleDragEnd({
          active: { id: "hero-0" } as any,
          over: { id: "promo-1" } as any,
        });
      });

      // hero-0 order unchanged
      const currentSecs = result.current.activeSections;
      expect(currentSecs[0].key).toBe("hero-0");
    });
  });
});
