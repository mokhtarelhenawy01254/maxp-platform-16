import { useStudioHistory } from "../studio/hooks/useStudioHistory";
import { useStorefrontStudioState } from "../studio/hooks/useStorefrontStudioState";
import { renderHook, act } from "@testing-library/react";
// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import {
  StudioSortableSection,
  detectElementUnderCursor,
} from "../studio/StudioSortableSection";
import { StudioPropertyInspector } from "../studio/StudioPropertyInspector";
import type { StudioSelectedElement } from "../studio/StudioTypes";

describe("Ticket 2D: Storefront Studio Inline Editing & Element Selection", () => {
  afterEach(() => {
    cleanup();
  });
  describe("detectElementUnderCursor", () => {
    it("detects CTA button or link as type button with label 'زر'", () => {
      const container = document.createElement("div");
      container.innerHTML = `<a href="/shop" class="btn"><span>تسوق الآن</span></a>`;
      const anchor = container.querySelector("span") as HTMLElement;

      const detected = detectElementUnderCursor(anchor, {
        ctaText: "تسوق الآن",
        ctaLink: "/shop",
      });

      expect(detected).not.toBeNull();
      expect(detected?.type).toBe("button");
      expect(detected?.label).toBe("زر");
      expect(detected?.field).toBe("ctaText");
      expect(detected?.linkField).toBe("ctaLink");
      expect(detected?.currentText).toBe("تسوق الآن");
      expect(detected?.currentLink).toBe("/shop");
    });

    it("detects heading tags h1-h6 as type heading with label 'العنوان'", () => {
      const container = document.createElement("div");
      container.innerHTML = `<h1><span>عنوان رئيسي مبهر</span></h1>`;
      const span = container.querySelector("span") as HTMLElement;

      const detected = detectElementUnderCursor(span, {
        title: "عنوان رئيسي مبهر",
      });

      expect(detected).not.toBeNull();
      expect(detected?.type).toBe("heading");
      expect(detected?.label).toBe("العنوان");
      expect(detected?.field).toBe("title");
      expect(detected?.currentText).toBe("عنوان رئيسي مبهر");
    });

    it("detects paragraph / subtitle as type subtitle with label 'الوصف'", () => {
      const container = document.createElement("div");
      container.innerHTML = `<p>تفاصيل العرض الموسمي الحصري</p>`;
      const p = container.querySelector("p") as HTMLElement;

      const detected = detectElementUnderCursor(p, {
        subtitle: "تفاصيل العرض الموسمي الحصري",
      });

      expect(detected).not.toBeNull();
      expect(detected?.type).toBe("subtitle");
      expect(detected?.label).toBe("الوصف");
      expect(detected?.field).toBe("subtitle");
      expect(detected?.currentText).toBe("تفاصيل العرض الموسمي الحصري");
    });

    it("detects image elements as type image with label 'صورة'", () => {
      const container = document.createElement("div");
      container.innerHTML = `<img src="/banner.jpg" alt="بانر رئيسي" />`;
      const img = container.querySelector("img") as HTMLElement;

      const detected = detectElementUnderCursor(img, {
        image: "/banner.jpg",
      });

      expect(detected).not.toBeNull();
      expect(detected?.type).toBe("image");
      expect(detected?.label).toBe("صورة");
      expect(detected?.field).toBe("image");
    });

    it("returns null for clicks on chrome or floating action bars", () => {
      const container = document.createElement("div");
      container.innerHTML = `<div data-studio-floating-bar="true"><button>drag</button></div>`;
      const btn = container.querySelector("button") as HTMLElement;

      const detected = detectElementUnderCursor(btn);
      expect(detected).toBeNull();
    });
  });

  describe("StudioSortableSection (DOM Interaction & Inline Editing)", () => {
    it("renders element breadcrumb when selectedElement is present", () => {
      const selectedElement: StudioSelectedElement = {
        sectionKey: "hero-1",
        type: "button",
        label: "زر",
        field: "ctaText",
        linkField: "ctaLink",
        currentText: "تسوق الآن",
        currentLink: "/shop",
      };

      const { container } = render(
        <StudioSortableSection
          id="hero-1"
          index={0}
          sectionKey="hero-1"
          sectionLabel="البنر الرئيسي"
          sectionType="hero-banner"
          selected={true}
          totalSections={1}
          selectedElement={selectedElement}
          onSelect={vi.fn()}
          onSelectElement={vi.fn()}
          onClearSelectedElement={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>
            <h1>مرحباً بكم</h1>
            <a href="/shop">تسوق الآن</a>
          </div>
        </StudioSortableSection>
      );

      // Verify breadcrumb in action bar and badge
      const badge = container.querySelector("[data-studio-badge='true']");
      expect(badge?.textContent).toContain("البنر الرئيسي › زر");

      const floatingBar = container.querySelector("[data-studio-floating-bar='true']");
      expect(floatingBar?.textContent).toContain("البنر الرئيسي");
      expect(floatingBar?.textContent).toContain("زر");
    });

    it("activates contenteditable and outline on double click on text element", () => {
      const onSelect = vi.fn();
      const onSelectElement = vi.fn();
      const onUpdateField = vi.fn();
      const onSave = vi.fn();

      const { container } = render(
        <StudioSortableSection
          id="hero-1"
          index={0}
          sectionKey="hero-1"
          sectionLabel="البنر الرئيسي"
          sectionType="hero-banner"
          selected={true}
          totalSections={1}
          settings={{ title: "عنوان الهيرو القديم" }}
          onSelect={onSelect}
          onSelectElement={onSelectElement}
          onClearSelectedElement={vi.fn()}
          onUpdateField={onUpdateField}
          onSave={onSave}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>
            <h1 data-testid="hero-heading">عنوان الهيرو القديم</h1>
          </div>
        </StudioSortableSection>
      );

      const heading = screen.getByTestId("hero-heading");

      // Double click on heading
      fireEvent.doubleClick(heading);

      // contenteditable should be "true"
      expect(heading.getAttribute("contenteditable")).toBe("true");
      expect(heading.getAttribute("data-studio-inline-editing")).toBe("true");

      // Floating edit badge should appear
      const editBadge = container.querySelector("[data-studio-inline-badge='true']");
      expect(editBadge).not.toBeNull();
      expect(editBadge?.textContent).toContain("تحرير: العنوان");
      expect(editBadge?.textContent).toContain("Ctrl+Enter للحفظ • Esc للإلغاء");

      // Edit text and blur -> saves
      heading.innerText = "مرحبا بالعالم";
      fireEvent.blur(heading);

      expect(onUpdateField).toHaveBeenCalledWith("title", "مرحبا بالعالم");
      expect(onSave).toHaveBeenCalled();
    });

    it("reverts text on Escape key during inline editing without saving", () => {
      const onUpdateField = vi.fn();
      const onSave = vi.fn();

      render(
        <StudioSortableSection
          id="hero-1"
          index={0}
          sectionKey="hero-1"
          sectionLabel="البنر الرئيسي"
          sectionType="hero-banner"
          selected={true}
          totalSections={1}
          settings={{ title: "عنوان أصلي" }}
          onSelect={vi.fn()}
          onSelectElement={vi.fn()}
          onClearSelectedElement={vi.fn()}
          onUpdateField={onUpdateField}
          onSave={onSave}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>
            <h1 data-testid="esc-heading">عنوان أصلي</h1>
          </div>
        </StudioSortableSection>
      );

      const heading = screen.getByTestId("esc-heading");
      fireEvent.doubleClick(heading);

      heading.innerText = "نص ملغي";
      fireEvent.keyDown(heading, { key: "Escape" });

      expect(heading.innerText).toBe("عنوان أصلي");
      expect(heading.getAttribute("contenteditable")).toBe("false");
      expect(onUpdateField).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("StudioPropertyInspector (Element Properties & Breadcrumb)", () => {
    it("renders element inspector with editable link when a CTA button is selected", () => {
      const onUpdateField = vi.fn();
      const onSave = vi.fn();
      const onClearSelectedElement = vi.fn();

      const selectedElement: StudioSelectedElement = {
        sectionKey: "hero-1",
        type: "button",
        label: "زر",
        field: "ctaText",
        linkField: "ctaLink",
        currentText: "تسوق الآن",
        currentLink: "/shop",
      };

      render(
        <StudioPropertyInspector
          selectedSectionKey="hero-1"
          sectionConfig={{
            type: "hero-banner",
            settings: { ctaText: "تسوق الآن", ctaLink: "/shop" },
          }}
          selectedElement={selectedElement}
          onClearSelectedElement={onClearSelectedElement}
          onClose={vi.fn()}
          onUpdateField={onUpdateField}
          onSave={onSave}
        />
      );

      // 1. Breadcrumb in Header
      expect(screen.getAllByText("البنر الرئيسي")[0]).toBeDefined();
      expect(screen.getAllByText("زر")[0]).toBeDefined();

      // 2. Button link input is editable
      const linkInput = screen.getByDisplayValue("/shop") as HTMLInputElement;
      expect(linkInput).toBeDefined();

      fireEvent.change(linkInput, { target: { value: "/collections/sale" } });
      expect(onUpdateField).toHaveBeenCalledWith("ctaLink", "/collections/sale");

      fireEvent.blur(linkInput);
      expect(onSave).toHaveBeenCalled();

      // 3. Button to return to full section settings
      const returnBtn = screen.getByText("الرجوع إلى إعدادات القسم بالكامل");
      fireEvent.click(returnBtn);
      expect(onClearSelectedElement).toHaveBeenCalled();
    });

    it("renders heading element inspector with editable title", () => {
      const onUpdateField = vi.fn();
      const onSave = vi.fn();

      const selectedElement: StudioSelectedElement = {
        sectionKey: "hero-1",
        type: "heading",
        label: "العنوان",
        field: "title",
        currentText: "مرحبا بالعالم",
      };

      render(
        <StudioPropertyInspector
          selectedSectionKey="hero-1"
          sectionConfig={{
            type: "hero-banner",
            settings: { title: "مرحبا بالعالم" },
          }}
          selectedElement={selectedElement}
          onClearSelectedElement={vi.fn()}
          onClose={vi.fn()}
          onUpdateField={onUpdateField}
          onSave={onSave}
        />
      );

      const titleInput = screen.getByDisplayValue("مرحبا بالعالم");
      expect(titleInput).toBeDefined();

      fireEvent.change(titleInput, { target: { value: "العنوان الجديد" } });
      expect(onUpdateField).toHaveBeenCalledWith("title", "العنوان الجديد");
      expect(onUpdateField).toHaveBeenCalledWith("heading", "العنوان الجديد");

      fireEvent.blur(titleInput);
      expect(onSave).toHaveBeenCalled();
    });
   });

  describe("Ticket 2D.1: Undo/Redo & Save Integration", () => {
    it("preserves undo history when server save response echoes tokens with themeId", () => {
      const initialTokens = {
        pages: {
          home: {
            sections: [{ type: "hero-banner", title: "Original Title", ctaLink: "/shop" }],
          },
        },
      };

      const { result, rerender } = renderHook(
        ({ tokens }) => useStudioHistory(tokens, { maxHistory: 30, coalesceMs: 0 }),
        { initialProps: { tokens: initialTokens } }
      );

      expect(result.current.canUndo).toBe(false);

      // 1. User updates section title
      act(() => {
        result.current.set({
          pages: {
            home: {
              sections: [{ type: "hero-banner", title: "اختبار تراجع 2D.1", ctaLink: "/shop" }],
            },
          },
        });
      });

      expect(result.current.canUndo).toBe(true);

      // 2. Server save completes, echoing tokens with themeId added
      rerender({
        tokens: {
          pages: {
            home: {
              sections: [{ type: "hero-banner", title: "اختبار تراجع 2D.1", ctaLink: "/shop" }],
            },
          },
          themeId: "modern-minimal",
        },
      });

      // Crucial: Undo button MUST remain enabled after server save!
      expect(result.current.canUndo).toBe(true);

      // 3. User clicks Undo -> reverts to Original Title
      act(() => {
        result.current.undo();
      });

      const restoredPages = (result.current.state as any)?.pages?.home?.sections;
      expect(restoredPages[0].title).toBe("Original Title");
      expect(result.current.canRedo).toBe(true);
    });

    it("useStorefrontStudioState undo immediately triggers onSave and reverts state", () => {
      const onSave = vi.fn();
      const onChange = vi.fn();
      const initialTokens = {
        pages: {
          home: {
            sections: [
              {
                type: "hero-banner",
                key: "hero-1",
                settings: { title: "العنوان الأصلي", ctaLink: "/shop" },
              },
            ],
          },
        },
      };

      const { result } = renderHook(() =>
        useStorefrontStudioState({
          themeId: "modern-minimal",
          externalDesignTokens: initialTokens,
          onChange,
          onSave,
        })
      );

      // Initial state
      expect(result.current.canUndo).toBe(false);

      // 1. Update field via batch update
      act(() => {
        result.current.handleBatchUpdateSectionFields(
          { title: "عنوان معدل 2D.1", heading: "عنوان معدل 2D.1" },
          "hero-1"
        );
      });

      expect(result.current.canUndo).toBe(true);

      // 2. Click Undo -> restores previous state AND triggers onSave immediately
      act(() => {
        result.current.undo();
      });

      expect(onSave).toHaveBeenCalled();
      const restored = result.current.activeSections[0] as any;
      expect(restored.settings.title).toBe("العنوان الأصلي");
      expect(result.current.canRedo).toBe(true);

      // 3. Click Redo -> reapplies updated state AND triggers onSave immediately
      act(() => {
        result.current.redo();
      });

      expect(onSave).toHaveBeenCalledTimes(2);
      const redone = result.current.activeSections[0] as any;
      expect(redone.settings.title).toBe("عنوان معدل 2D.1");
    });

    it("StudioSortableSection inline edit calls onBatchUpdateFields with all alias fields and triggers onSave", () => {
      const onBatchUpdateFields = vi.fn();
      const onUpdateField = vi.fn();
      const onSave = vi.fn();

      const { container } = render(
        <StudioSortableSection
          id="hero-1"
          index={0}
          sectionKey="hero-1"
          sectionLabel="البنر الرئيسي"
          sectionType="hero-banner"
          selected={true}
          totalSections={1}
          settings={{ title: "عنوان أصلي" }}
          onSelect={vi.fn()}
          onSelectElement={vi.fn()}
          onClearSelectedElement={vi.fn()}
          onUpdateField={onUpdateField}
          onBatchUpdateFields={onBatchUpdateFields}
          onSave={onSave}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>
            <h1 data-testid="inline-h1">عنوان أصلي</h1>
          </div>
        </StudioSortableSection>
      );

      const heading = screen.getByTestId("inline-h1");
      fireEvent.doubleClick(heading);

      heading.innerText = "اختبار تراجع 2D.1";
      fireEvent.blur(heading);

      expect(onBatchUpdateFields).toHaveBeenCalledWith({
        title: "اختبار تراجع 2D.1",
        heading: "اختبار تراجع 2D.1",
      });
      expect(onSave).toHaveBeenCalled();
    });

    it("StudioPropertyInspector button link edit calls onBatchUpdateFields with ctaLink, primaryHref, buttonUrl", () => {
      const onBatchUpdateFields = vi.fn();
      const onUpdateField = vi.fn();
      const onSave = vi.fn();

      const selectedElement: StudioSelectedElement = {
        sectionKey: "hero-1",
        type: "button",
        label: "زر",
        field: "ctaText",
        linkField: "ctaLink",
        currentText: "تسوق الآن",
        currentLink: "/shop",
      };

      render(
        <StudioPropertyInspector
          selectedSectionKey="hero-1"
          sectionConfig={{
            type: "hero-banner",
            settings: { ctaText: "تسوق الآن", ctaLink: "/shop" },
          }}
          selectedElement={selectedElement}
          onClearSelectedElement={vi.fn()}
          onClose={vi.fn()}
          onUpdateField={onUpdateField}
          onBatchUpdateFields={onBatchUpdateFields}
          onSave={onSave}
        />
      );

      const linkInput = screen.getByDisplayValue("/shop") as HTMLInputElement;
      fireEvent.change(linkInput, { target: { value: "/shop?undo=1" } });

      expect(onBatchUpdateFields).toHaveBeenCalledWith({
        ctaLink: "/shop?undo=1",
        primaryHref: "/shop?undo=1",
        buttonUrl: "/shop?undo=1",
      });

      fireEvent.blur(linkInput);
      expect(onSave).toHaveBeenCalled();
    });
  });
});