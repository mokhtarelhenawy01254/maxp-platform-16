// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";

import { StudioElementsPanel } from "../studio/StudioElementsPanel";
import { StudioSortableSection } from "../studio/StudioSortableSection";
import {
  STUDIO_SECTION_THUMBNAILS,
  getStudioSectionThumbnail,
} from "../studio/StudioSectionThumbnails";
import { useStorefrontStudioState } from "../studio/hooks/useStorefrontStudioState";

describe("Ticket 2C: Storefront Studio DnD Library & Visual Thumbnails", () => {
  describe("StudioSectionThumbnails", () => {
    it("provides high-fidelity SVG visual layout diagrams for all library elements and presets", () => {
      const keys = Object.keys(STUDIO_SECTION_THUMBNAILS);
      expect(keys.length).toBeGreaterThanOrEqual(11);

      // Verify essential section thumbnails exist
      expect(STUDIO_SECTION_THUMBNAILS["richtext"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["hero-banner"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["info-content"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["featured-products"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["promo-strip"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["newsletter"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["preset-products"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["preset-deal"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["preset-hero"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["preset-trust"]).toBeDefined();
      expect(STUDIO_SECTION_THUMBNAILS["preset-reviews"]).toBeDefined();

      // Check data URI structure
      keys.forEach((key) => {
        const uri = STUDIO_SECTION_THUMBNAILS[key];
        expect(uri).toContain("data:image/svg+xml;utf8,");
        expect(uri).toContain("viewBox=%220%200%20240%2080%22");
      });
    });

    it("falls back gracefully for unknown types", () => {
      const fallback = getStudioSectionThumbnail("unknown-custom-type");
      expect(fallback).toContain("data:image/svg+xml;utf8,");
    });
  });

  describe("StudioElementsPanel (DOM & DnD Audit)", () => {
    it("renders draggable items with real visual preview images in DOM (draggable=true >= 11, img >= 11)", () => {
      const onAddSection = vi.fn();
      const onLibraryDragStart = vi.fn();
      const onLibraryDragEnd = vi.fn();

      const { container } = render(
        <StudioElementsPanel
          onAddSection={onAddSection}
          onOpenFullCatalog={vi.fn()}
          onClose={vi.fn()}
          onLibraryDragStart={onLibraryDragStart}
          onLibraryDragEnd={onLibraryDragEnd}
        />
      );

      // 1. Draggable items audit
      const draggableItems = container.querySelectorAll('[draggable="true"]');
      expect(draggableItems.length).toBe(11); // 6 quick elements + 5 presets

      // 2. Visual preview images audit
      const previewImages = container.querySelectorAll("img[data-studio-preview='true']");
      expect(previewImages.length).toBe(11);

      // 3. Size wrapper audit (>= 120x48px styled container)
      const previewWrappers = container.querySelectorAll(".studio-element-preview-wrapper");
      expect(previewWrappers.length).toBe(11);

      // Verify each item has a valid SVG data URI source
      previewImages.forEach((img) => {
        const src = img.getAttribute("src");
        expect(src).toBeTruthy();
        expect(src).toContain("data:image/svg+xml;utf8,");
      });
    });

    it("preserves search filtering functionality", () => {
      const { container } = render(
        <StudioElementsPanel
          onAddSection={vi.fn()}
          onOpenFullCatalog={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText("ابحث عن عنصر أو سيكشن…");
      fireEvent.change(searchInput, { target: { value: "البطل" } });

      // Only "واجهة البطل الرئيسية" should remain visible
      expect(screen.getByText("واجهة البطل الرئيسية")).toBeDefined();
      expect(screen.queryByText("شبكة منتجات")).toBeNull();
      expect(screen.queryByText("آراء وتجارب العملاء")).toBeNull();
    });

    it("supports click-to-add for backward compatibility", () => {
      const onAdd = vi.fn();
      render(
        <StudioElementsPanel
          onAddSection={onAdd}
          onOpenFullCatalog={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const heroPreset = screen.getByText("واجهة البطل الرئيسية");
      fireEvent.click(heroPreset);
      expect(onAdd).toHaveBeenCalledWith("hero-banner");
    });

    it("fires drag start and drag end events with correct section type payload", () => {
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();

      const { container } = render(
        <StudioElementsPanel
          onAddSection={vi.fn()}
          onOpenFullCatalog={vi.fn()}
          onClose={vi.fn()}
          onLibraryDragStart={onDragStart}
          onLibraryDragEnd={onDragEnd}
        />
      );

      const heroElement = container.querySelector('[data-section-type="hero-banner"]');
      expect(heroElement).not.toBeNull();

      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(heroElement!, { dataTransfer });
      expect(onDragStart).toHaveBeenCalledWith("hero-banner", expect.any(String));
      expect(dataTransfer.setData).toHaveBeenCalledWith(
        "application/x-storefront-section",
        "hero-banner"
      );

      fireEvent.dragEnd(heroElement!);
      expect(onDragEnd).toHaveBeenCalled();
    });
  });

  describe("StudioSortableSection Insertion Indicator", () => {
    it("renders the drop indicator at the top when hovering slot matches section index", () => {
      const { container } = render(
        <StudioSortableSection
          id="section-2"
          index={2}
          sectionKey="section-2"
          sectionLabel="المنتجات المميزة"
          sectionType="featured-products"
          selected={false}
          totalSections={7}
          libraryDropSlot={2}
          onSelect={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>محتوى القسم</div>
        </StudioSortableSection>
      );

      const indicator = container.querySelector('[data-studio-drop-indicator="true"]');
      expect(indicator).not.toBeNull();
      expect(indicator?.textContent).toContain("أفلت هنا");
      expect(indicator?.className).toContain("-top-1");
    });

    it("renders the drop indicator at the bottom for the last section when inserting at the end", () => {
      const { container } = render(
        <StudioSortableSection
          id="section-6"
          index={6}
          sectionKey="section-6"
          sectionLabel="النشرة البريدية"
          sectionType="newsletter"
          selected={false}
          totalSections={7}
          libraryDropSlot={7}
          onSelect={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>محتوى القسم</div>
        </StudioSortableSection>
      );

      const indicator = container.querySelector('[data-studio-drop-indicator="true"]');
      expect(indicator).not.toBeNull();
      expect(indicator?.textContent).toContain("أفلت هنا");
      expect(indicator?.className).toContain("-bottom-1");
    });
  });

  describe("Acceptance Scenario 1: Drag 'واجهة البطل الرئيسية' -> Insert at position 3 (between #2 & #3) -> Save & Undo", () => {
    it("inserts at index 2, synchronizes pages and pageOverrides, and supports undo back to 7 sections", () => {
      const initialDesignTokens = {
        pages: {
          home: {
            sections: [
              { type: "promo-strip", key: "promo-1" },
              { type: "hero-banner", key: "hero-1" },
              { type: "features-bar", key: "features-1" },
              { type: "featured-products", key: "products-1" },
              { type: "countdown-banner", key: "deal-1" },
              { type: "reviews", key: "reviews-1" },
              { type: "newsletter", key: "newsletter-1" },
            ],
          },
        },
        pageOverrides: {
          home: {
            sections: [
              { type: "promo-strip", key: "promo-1" },
              { type: "hero-banner", key: "hero-1" },
              { type: "features-bar", key: "features-1" },
              { type: "featured-products", key: "products-1" },
              { type: "countdown-banner", key: "deal-1" },
              { type: "reviews", key: "reviews-1" },
              { type: "newsletter", key: "newsletter-1" },
            ],
          },
        },
      };

      const onChange = vi.fn();
      const onSave = vi.fn();

      const { result } = renderHook(() =>
        useStorefrontStudioState({
          themeId: "modern-minimal",
          externalDesignTokens: initialDesignTokens,
          onChange,
          onSave,
        })
      );

      // Initial state: 7 sections
      expect(result.current.activeSections.length).toBe(7);
      expect(result.current.activeSections[0].type).toBe("promo-strip"); // #1
      expect(result.current.activeSections[1].type).toBe("hero-banner"); // #2
      expect(result.current.activeSections[2].type).toBe("features-bar"); // #3

      // Drag «واجهة البطل الرئيسية» (hero-banner) and drop between Section #2 and Section #3
      // In 0-based array indexing, between index 1 (#2) and index 2 (#3) is insertAtIndex = 2
      act(() => {
        result.current.handleAddSection("hero-banner", 2);
      });

      // Verification Criterion 1:
      // 1. Total sections = 8
      expect(result.current.activeSections.length).toBe(8);

      // 2. New type is at position 3 (index 2)
      expect(result.current.activeSections[2].type).toBe("hero-banner");

      // 3. Other sections maintained their relative ordering
      expect(result.current.activeSections[0].type).toBe("promo-strip");
      expect(result.current.activeSections[1].type).toBe("hero-banner");
      expect(result.current.activeSections[3].type).toBe("features-bar"); // shifted from #3 to #4

      // 4. pages and pageOverrides are both updated and 100% synchronized
      const latestTokens = result.current.currentDesignTokens as any;
      const homePages = latestTokens.pages.home.sections;
      const homeOverrides = latestTokens.pageOverrides.home.sections;

      expect(homePages.length).toBe(8);
      expect(homeOverrides.length).toBe(8);
      expect(homePages[2].type).toBe("hero-banner");
      expect(homeOverrides[2].type).toBe("hero-banner");
      expect(JSON.stringify(homePages)).toBe(JSON.stringify(homeOverrides));

      // 5. Undo cycle: reverts to 7 sections and original state
      expect(result.current.canUndo).toBe(true);
      act(() => {
        result.current.undo();
      });

      expect(result.current.activeSections.length).toBe(7);
      expect(result.current.activeSections[2].type).toBe("features-bar"); // restored original #3
    });
  });
});
