// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import {
  normalizeArabicDigits,
  parseFreeNumber,
  buildBoxShadowString,
  resolveBorderRadius,
  buildSectionStyle,
} from "../studio/utils/studioStyleUtils";
import { StudioSpacingOverlay } from "../studio/StudioSpacingOverlay";
import {
  StudioPaddingControl,
  StudioMarginControl,
  StudioDimensionsLayoutControl,
  FreeNumberInput,
} from "../studio/inspector/StudioDimensionControls";
import { StudioShadowControls } from "../studio/inspector/StudioShadowControls";
import { StudioInspectorDesignTab } from "../studio/inspector/StudioInspectorDesignTab";
import { StudioInspectorLayoutTab } from "../studio/inspector/StudioInspectorLayoutTab";
import { StudioSortableSection } from "../studio/StudioSortableSection";
import { StorefrontSectionFrame } from "../layout/StorefrontSectionFrame";

// Mock ThemeProvider for StorefrontSectionFrame
vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({ theme: { id: "clean-standard", direction: "rtl" } }),
  StorefrontThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock @dnd-kit/sortable for StudioSortableSection
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: (el: any) => el,
    transform: null,
    transition: null,
    isDragging: false,
    isOver: false,
    active: null,
  }),
}));

describe("Ticket 2E: Real Inspector Free-Values & Real Spacing Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. Utility & Normalization (Arabic numerals, LTR, Shadow, Radius)", () => {
    it("normalizes Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to standard Latin digits", () => {
      expect(normalizeArabicDigits("٣٢")).toBe("32");
      expect(normalizeArabicDigits("١٠٠")).toBe("100");
      expect(normalizeArabicDigits("٠.٢٥")).toBe("0.25");
      expect(normalizeArabicDigits("")).toBe("");
    });

    it("parses free numbers safely from both Arabic and Latin strings", () => {
      expect(parseFreeNumber("٣٢")).toBe(32);
      expect(parseFreeNumber("48")).toBe(48);
      expect(parseFreeNumber("", 16)).toBe(16);
      expect(parseFreeNumber(null, 24)).toBe(24);
    });

    it("resolves border-radius to px values correctly", () => {
      expect(resolveBorderRadius(24)).toBe("24px");
      expect(resolveBorderRadius("24")).toBe("24px");
      expect(resolveBorderRadius("large")).toBe("24px");
      expect(resolveBorderRadius("medium")).toBe("16px");
      expect(resolveBorderRadius("small")).toBe("8px");
      expect(resolveBorderRadius("none")).toBe("0px");
      expect(resolveBorderRadius(0)).toBe("0px");
    });

    it("builds custom box-shadow strings matching CSS standards", () => {
      const customSettings = {
        shadow: "custom",
        shadowX: 0,
        shadowY: 12,
        shadowBlur: 30,
        shadowSpread: 0,
        shadowOpacity: 0.25,
        shadowColor: "#000000",
      };
      const shadowStr = buildBoxShadowString(customSettings);
      expect(shadowStr).toBe("0px 12px 30px 0px rgba(0, 0, 0, 0.25)");
    });

    it("computes complete section styles with all free-values", () => {
      const settings = {
        paddingTop: 32,
        paddingBottom: 24,
        paddingRight: 40,
        paddingLeft: 40,
        marginTop: 16,
        marginBottom: 20,
        minHeight: 500,
        borderRadius: 24,
        shadow: "custom",
        shadowX: 0,
        shadowY: 12,
        shadowBlur: 30,
        shadowSpread: 0,
        shadowOpacity: 0.25,
        shadowColor: "#000000",
        backgroundColor: "#fdfbf7",
        gap: 16,
      };

      const style = buildSectionStyle(settings);
      expect(style.paddingTop).toBe("32px");
      expect(style.paddingBottom).toBe("24px");
      expect(style.paddingRight).toBe("40px");
      expect(style.paddingLeft).toBe("40px");
      expect(style.marginTop).toBe("16px");
      expect(style.marginBottom).toBe("20px");
      expect(style.minHeight).toBe("500px");
      expect(style.borderRadius).toBe("24px");
      expect(style.boxShadow).toBe("0px 12px 30px 0px rgba(0, 0, 0, 0.25)");
      expect(style.backgroundColor).toBe("#fdfbf7");
      expect(style.gap).toBe("16px");
    });
  });

  describe("2. Free-Value Dimension Controls in Inspector", () => {
    it("renders numeric input fields with LTR direction and tabular numbers", () => {
      const handleUpdate = vi.fn();
      render(
        <FreeNumberInput
          label="حشوة علوية"
          value={32}
          onChange={handleUpdate}
        />
      );

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe("32");
      expect(input.getAttribute("dir")).toBe("ltr");
    });

    it("supports uniform linked padding updates across all 4 directions", () => {
      const handleUpdateField = vi.fn();
      const handleBatchUpdate = vi.fn();

      render(
        <StudioPaddingControl
          settings={{ paddingTop: 24, paddingBottom: 24, paddingLinked: true }}
          onUpdateField={handleUpdateField}
          onBatchUpdateFields={handleBatchUpdate}
        />
      );

      // Verify link toggle button is present
      const toggleBtn = screen.getByRole("button", { name: /قيم موحدة/i });
      expect(toggleBtn).toBeDefined();

      // Change uniform value
      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "32" } });

      expect(handleBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          paddingTop: 32,
          paddingBottom: 32,
          paddingRight: 32,
          paddingLeft: 32,
          padding: 32,
        })
      );
    });

    it("unlinks padding to allow individual direction control (top/bottom/right/left)", () => {
      const handleUpdateField = vi.fn();
      render(
        <StudioPaddingControl
          settings={{ paddingTop: 24, paddingBottom: 24, paddingLinked: false }}
          onUpdateField={handleUpdateField}
        />
      );

      // In unlinked mode, 4 inputs are rendered (أعلى, أسفل, يمين, يسار)
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs.length).toBe(4);

      // Change top padding
      fireEvent.change(inputs[0], { target: { value: "32" } });
      expect(handleUpdateField).toHaveBeenCalledWith("paddingTop", 32);
    });

    it("renders margin and min-height free inputs", () => {
      const handleUpdate = vi.fn();
      render(
        <div>
          <StudioMarginControl
            settings={{ marginTop: 16, marginBottom: 16 }}
            onUpdateField={handleUpdate}
          />
          <StudioDimensionsLayoutControl
            settings={{ minHeight: 400, gap: 16 }}
            onUpdateField={handleUpdate}
          />
        </div>
      );

      const inputs = screen.getAllByRole("spinbutton");
      // inputs: marginTop, marginBottom, minHeight, gap
      expect(inputs.length).toBe(4);

      // Change min-height (index 2)
      fireEvent.change(inputs[2], { target: { value: "600" } });
      expect(handleUpdate).toHaveBeenCalledWith("minHeight", 600);
    });
  });

  describe("3. Custom Shadow Inspector Controls", () => {
    it("renders custom shadow inputs (X, Y, Blur, Spread, Opacity, Color) and updates them", () => {
      const handleUpdate = vi.fn();
      const handleBatch = vi.fn();

      render(
        <StudioShadowControls
          settings={{
            shadow: "custom",
            shadowX: 0,
            shadowY: 12,
            shadowBlur: 30,
            shadowSpread: 0,
            shadowOpacity: 0.25,
            shadowColor: "#000000",
          }}
          onUpdateField={handleUpdate}
          onBatchUpdateFields={handleBatch}
        />
      );

      // Check numeric inputs for X, Y, Blur, Spread
      const spinbuttons = screen.getAllByRole("spinbutton");
      expect(spinbuttons.length).toBe(4);

      // Check Opacity slider
      const slider = screen.getByRole("slider");
      expect(slider).toBeDefined();
      expect((slider as HTMLInputElement).value).toBe("0.25");

      // Check HEX input
      const hexInputs = screen.getAllByDisplayValue("#000000");
      expect(hexInputs.length).toBe(2);

      // Change blur to 40
      fireEvent.change(spinbuttons[2], { target: { value: "40" } });
      expect(handleBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          shadow: "custom",
          shadowBlur: 40,
        })
      );
    });
  });

  describe("4. Inspector Accordion Groups (Layout Tab & Design Tab)", () => {
    it("renders Layout tab with accordion groups for Spacing and Layout", () => {
      const handleUpdate = vi.fn();
      render(
        <StudioInspectorLayoutTab
          settings={{ paddingTop: 32, minHeight: 400 }}
          onUpdateField={handleUpdate}
        />
      );

      expect(screen.getByText(/المسافات والحشوات/i)).toBeDefined();
      expect(screen.getByText(/التخطيط والمقاسات/i)).toBeDefined();
    });

    it("renders Design tab with full accordion groups (خلفية, استدارة, ظلال, مسافات, تخطيط, طباعة, CSS)", () => {
      const handleUpdate = vi.fn();
      render(
        <StudioInspectorDesignTab
          sectionType="hero-banner"
          settings={{
            backgroundColor: "#ffffff",
            borderRadius: 24,
            shadow: "custom",
          }}
          onUpdateField={handleUpdate}
        />
      );

      expect(screen.getByText(/خلفية القسم/i)).toBeDefined();
      expect(screen.getByText(/حدود واستدارة الزوايا/i)).toBeDefined();
      expect(screen.getByText(/تأثيرات وظلال مخصصة/i)).toBeDefined();
      expect(screen.getByText(/المسافات والحشوة/i)).toBeDefined();
      expect(screen.getByText(/التخطيط والمقاسات/i)).toBeDefined();
      expect(screen.getByText(/طباعة ونصوص/i)).toBeDefined();
      expect(screen.getByText(/تخصيص CSS مباشر/i)).toBeDefined();

      // Free-value radius input accepts 24
      const radiusInputs = screen.getAllByRole("spinbutton");
      expect(radiusInputs.length).toBeGreaterThan(0);
    });
  });

  describe("5. Real Spacing Tool (Overlay & Escape)", () => {
    it("renders real spacing overlay with color-coded bars, badges, and element count > 0", () => {
      const { container } = render(
        <StudioSpacingOverlay
          settings={{
            paddingTop: 32,
            paddingBottom: 24,
            paddingRight: 40,
            paddingLeft: 40,
            marginTop: 16,
            marginBottom: 20,
            borderRadius: "24px",
          }}
          sectionLabel="بانر ترويجي"
        />
      );

      // Overlay container must be present
      const overlay = container.querySelector('[data-studio-spacing-overlay="true"]');
      expect(overlay).not.toBeNull();

      // Bars must be present
      const paddingBars = container.querySelectorAll('[data-spacing-bar^="padding-"]');
      expect(paddingBars.length).toBe(4);

      const marginBars = container.querySelectorAll('[data-spacing-bar^="margin-"]');
      expect(marginBars.length).toBe(2);

      // Readable dimension chip must be present
      const centerChip = container.querySelector('[data-spacing-dimension="center"]');
      expect(centerChip).not.toBeNull();
      expect(centerChip?.textContent).toContain("32px");

      // Total overlay elements count > 0
      const overlayElements = container.querySelectorAll(
        '[data-spacing-bar], [data-spacing-dimension]'
      );
      expect(overlayElements.length).toBeGreaterThanOrEqual(5);
    });

    it("applies computed styles directly to StudioSortableSection container", () => {
      const handleSelect = vi.fn();
      const { container } = render(
        <StudioSortableSection
          id="test-section-0"
          index={0}
          sectionKey="hero-banner-0"
          sectionLabel="البانر الرئيسي"
          sectionType="hero-banner"
          selected={true}
          totalSections={1}
          showSpacingOverlay={true}
          settings={{
            paddingTop: 32,
            paddingBottom: 24,
            borderRadius: 24,
            shadow: "custom",
            shadowX: 0,
            shadowY: 12,
            shadowBlur: 30,
            shadowSpread: 0,
            shadowOpacity: 0.25,
            shadowColor: "#000000",
          }}
          onSelect={handleSelect}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div data-testid="section-content">محتوى القسم</div>
        </StudioSortableSection>
      );

      const sectionEl = container.querySelector('[data-studio-sortable-section="true"]') as HTMLElement;
      expect(sectionEl).not.toBeNull();

      // Style check: inline styles are applied
      expect(sectionEl.style.paddingTop).toBe("32px");
      expect(sectionEl.style.paddingBottom).toBe("24px");
      expect(sectionEl.style.borderRadius).toBe("24px");
      expect(sectionEl.style.boxShadow).toBe("0px 12px 30px 0px rgba(0, 0, 0, 0.25)");

      // Real spacing overlay is rendered inside selected section
      const overlay = container.querySelector('[data-studio-spacing-overlay="true"]');
      expect(overlay).not.toBeNull();
    });

    it("applies computed styles in live storefront frame (StorefrontSectionFrame)", () => {
      const { container } = render(
        <StorefrontSectionFrame
          index={0}
          sectionId="hero-banner"
          componentKey="hero-banner"
          sectionEntry={{
            type: "hero-banner",
            settings: {
              paddingTop: 32,
              borderRadius: 24,
              backgroundColor: "#fdfbf7",
            },
          }}
          element={<div data-testid="live-hero">لايف هيرو</div>}
        />
      );

      const liveFrame = container.querySelector('[data-storefront-section="true"]') as HTMLElement;
      expect(liveFrame).not.toBeNull();
      expect(liveFrame.style.paddingTop).toBe("32px");
      expect(liveFrame.style.borderRadius).toBe("24px");
      expect(liveFrame.style.backgroundColor).toBe("rgb(253, 251, 247)");
    });
  });

  describe("6. RTL Input Acceptance & Zero Regression", () => {
    it("accepts Arabic digits and correctly parses them into numerical values", () => {
      const handleUpdate = vi.fn();
      render(
        <FreeNumberInput
          label="الارتفاع"
          value={0}
          onChange={handleUpdate}
        />
      );

      const input = screen.getByRole("spinbutton");
      // Simulate typing Arabic numeral '٣' via keydown
      fireEvent.keyDown(input, { key: "٣" });
      expect(handleUpdate).toHaveBeenCalledWith(3);
    });

    it("accepts HEX values with '#' and lowercase letters", () => {
      const handleUpdate = vi.fn();
      render(
        <StudioInspectorDesignTab
          sectionType="rich-text"
          settings={{ backgroundColor: "#ffffff" }}
          onUpdateField={handleUpdate}
        />
      );

      const hexInput = screen.getByPlaceholderText("#ffffff");
      fireEvent.change(hexInput, { target: { value: "#ff0000" } });
      expect(handleUpdate).toHaveBeenCalledWith("backgroundColor", "#ff0000");
    });
  });
});
