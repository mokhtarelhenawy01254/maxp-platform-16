// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, renderHook, act, cleanup } from "@testing-library/react";
import {
  resolveEffectiveSectionSettings,
  isPropertyOverridden,
  getPropertyOverrideValue,
  buildSectionStyle,
  generateResponsiveCss,
  PER_BREAKPOINT_PROPERTIES,
  RESPONSIVE_STYLE_FIELDS,
} from "../studio/utils/studioStyleUtils";
import { StorefrontSectionFrame } from "../layout/StorefrontSectionFrame";
import { TreeRenderer } from "../engine/tree/TreeRenderer";
import { resolveContainerSettings } from "../engine/tree/treeUtils";
import { StudioPaddingControl, StudioMarginControl } from "../studio/inspector/StudioDimensionControls";
import { StudioInspectorDesignTab } from "../studio/inspector/StudioInspectorDesignTab";
import { useStorefrontStudioState } from "../studio/hooks/useStorefrontStudioState";
import { SectionNode } from "../studio/StudioTypes";

// Mock ThemeProvider for StorefrontSectionFrame
vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({
    theme: { id: "modern-minimal", name: "Modern Minimal" },
  }),
}));

// Mock useCartStore
vi.mock("../store/useCartStore", async (importOriginal) => {
  const actual = await importOriginal<any>();
  const mockCartState = { items: [], isOpen: false };
  const fn: any = vi.fn((selector) =>
    selector ? selector(mockCartState) : mockCartState
  );
  fn.getState = vi.fn(() => mockCartState);
  fn.setState = vi.fn();
  return {
    ...actual,
    useCartStore: fn,
    DEFAULT_STOREFRONT_CART_STORAGE_NAME: "test-cart",
  };
});

describe("Storefront Ticket 5R — Per-Breakpoint Properties (padding, margin, radius, fontSize, contentAlign)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const dummyLeafRenderer = (node: any) => (
    <div key={node.key || node.type} data-testid={`leaf-${node.key || node.type}`}>
      Leaf {node.key || node.type}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // 1. Target Properties & Metadata Law
  // ─────────────────────────────────────────────────────────────
  it("1. Includes all 9 target per-breakpoint properties in PER_BREAKPOINT_PROPERTIES and RESPONSIVE_STYLE_FIELDS", () => {
    expect(PER_BREAKPOINT_PROPERTIES).toContain("paddingTop");
    expect(PER_BREAKPOINT_PROPERTIES).toContain("paddingBottom");
    expect(PER_BREAKPOINT_PROPERTIES).toContain("paddingLeft");
    expect(PER_BREAKPOINT_PROPERTIES).toContain("paddingRight");
    expect(PER_BREAKPOINT_PROPERTIES).toContain("marginTop");
    expect(PER_BREAKPOINT_PROPERTIES).toContain("marginBottom");
    expect(PER_BREAKPOINT_PROPERTIES).toContain("borderRadius");
    expect(PER_BREAKPOINT_PROPERTIES).toContain("fontSize");
    expect(PER_BREAKPOINT_PROPERTIES).toContain("contentAlign");

    expect(RESPONSIVE_STYLE_FIELDS.has("paddingTop")).toBe(true);
    expect(RESPONSIVE_STYLE_FIELDS.has("paddingBottom")).toBe(true);
    expect(RESPONSIVE_STYLE_FIELDS.has("paddingLeft")).toBe(true);
    expect(RESPONSIVE_STYLE_FIELDS.has("paddingRight")).toBe(true);
    expect(RESPONSIVE_STYLE_FIELDS.has("marginTop")).toBe(true);
    expect(RESPONSIVE_STYLE_FIELDS.has("marginBottom")).toBe(true);
    expect(RESPONSIVE_STYLE_FIELDS.has("borderRadius")).toBe(true);
    expect(RESPONSIVE_STYLE_FIELDS.has("fontSize")).toBe(true);
    expect(RESPONSIVE_STYLE_FIELDS.has("contentAlign")).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Writing Mobile Override Preserves Desktop Base
  // ─────────────────────────────────────────────────────────────
  it("2. Writing mobile override saves to responsive.mobile without touching desktop base", () => {
    const initialDesignTokens = {
      themeId: "modern-minimal",
      pages: {
        home: {
          sections: [
            {
              type: "hero-banner",
              key: "hero-1",
              settings: {
                paddingTop: 48,
                paddingBottom: 48,
                borderRadius: 24,
                marginTop: 20,
                marginBottom: 20,
              },
            },
          ],
        },
      },
    };

    let latestTokens = initialDesignTokens;
    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: initialDesignTokens,
        onChange: (next) => {
          latestTokens = next as any;
        },
        onSave: vi.fn(),
      })
    );

    // Update in mobile mode
    act(() => {
      result.current.handleBatchUpdateSectionFields(
        {
          paddingTop: 16,
          borderRadius: 8,
          marginTop: 5,
        },
        "hero-1",
        "mobile"
      );
    });

    const updatedSection = (latestTokens.pages as any).home.sections[0];

    // Desktop base remains untouched
    expect(updatedSection.settings.paddingTop).toBe(48);
    expect(updatedSection.settings.borderRadius).toBe(24);
    expect(updatedSection.settings.marginTop).toBe(20);

    // Mobile override is persisted in responsive.mobile
    expect(updatedSection.settings.responsive.mobile.paddingTop).toBe(16);
    expect(updatedSection.settings.responsive.mobile.borderRadius).toBe(8);
    expect(updatedSection.settings.responsive.mobile.marginTop).toBe(5);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Tablet Overrides are Isolated and Support Mobile Cascade
  // ─────────────────────────────────────────────────────────────
  it("3. Tablet overrides are isolated and cascade to mobile if mobile override is unset", () => {
    const settings = {
      paddingTop: 64,
      paddingBottom: 64,
      borderRadius: 32,
      fontSize: 20,
      contentAlign: "start",
      responsive: {
        tablet: {
          paddingTop: 36,
          borderRadius: 16,
          fontSize: 18,
          contentAlign: "center",
        },
        mobile: {
          paddingTop: 16,
          // borderRadius, fontSize, contentAlign not set in mobile -> inherit from tablet
        },
      },
    };

    // Desktop gets base
    const desk = resolveEffectiveSectionSettings(settings, "desktop");
    expect(desk.paddingTop).toBe(64);
    expect(desk.borderRadius).toBe(32);
    expect(desk.fontSize).toBe(20);
    expect(desk.contentAlign).toBe("start");

    // Tablet gets tablet overrides
    const tab = resolveEffectiveSectionSettings(settings, "tablet");
    expect(tab.paddingTop).toBe(36);
    expect(tab.borderRadius).toBe(16);
    expect(tab.fontSize).toBe(18);
    expect(tab.contentAlign).toBe("center");

    // Mobile gets mobile override for paddingTop (16) and inherits tablet for the rest
    const mob = resolveEffectiveSectionSettings(settings, "mobile");
    expect(mob.paddingTop).toBe(16);
    expect(mob.borderRadius).toBe(16);
    expect(mob.fontSize).toBe(18);
    expect(mob.contentAlign).toBe("center");
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Resetting Property Override Clears Key & Reverts to Base
  // ─────────────────────────────────────────────────────────────
  it("4. Resetting property override deletes the key and restores base inheritance", () => {
    const initialDesignTokens = {
      themeId: "modern-minimal",
      pages: {
        home: {
          sections: [
            {
              type: "hero-banner",
              key: "hero-1",
              settings: {
                borderRadius: 24,
                paddingTop: 40,
                responsive: {
                  mobile: {
                    borderRadius: 8,
                    paddingTop: 12,
                  },
                },
              },
            },
          ],
        },
      },
    };

    let latestTokens = initialDesignTokens;
    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: initialDesignTokens,
        onChange: (next) => {
          latestTokens = next as any;
        },
        onSave: vi.fn(),
      })
    );

    // Reset only borderRadius on mobile
    act(() => {
      result.current.handleResetPropertyOverride("borderRadius", "mobile", "hero-1");
    });

    const updatedSection = (latestTokens.pages as any).home.sections[0];
    // borderRadius is removed from mobile overrides
    expect(updatedSection.settings.responsive.mobile.borderRadius).toBeUndefined();
    // paddingTop remains preserved in mobile overrides
    expect(updatedSection.settings.responsive.mobile.paddingTop).toBe(12);

    // Effective settings on mobile now fall back to desktop base for borderRadius
    const effectiveMobile = resolveEffectiveSectionSettings(updatedSection.settings, "mobile");
    expect(effectiveMobile.borderRadius).toBe(24);
    expect(effectiveMobile.paddingTop).toBe(12);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. StorefrontSectionFrame Computes Correct Values for Live Breakpoints
  // ─────────────────────────────────────────────────────────────
  it("5. StorefrontSectionFrame applies mobile override on mobile viewport and desktop base on desktop viewport", () => {
    const sectionEntry = {
      type: "featured-products",
      key: "sec-featured",
      settings: {
        paddingTop: 60,
        paddingBottom: 60,
        borderRadius: 20,
        responsive: {
          mobile: {
            paddingTop: 16,
            paddingBottom: 16,
            borderRadius: 8,
          },
        },
      },
    };

    // 1. Mobile viewport @375
    window.innerWidth = 375;
    const { container: mobContainer } = render(
      <StorefrontSectionFrame
        element={<div data-testid="content">Featured Products</div>}
        index={0}
        sectionEntry={sectionEntry as any}
      />
    );

    const mobFrame = mobContainer.querySelector('[data-storefront-section="true"]') as HTMLElement;
    expect(mobFrame.style.paddingTop).toBe("16px");
    expect(mobFrame.style.paddingBottom).toBe("16px");
    expect(mobFrame.style.borderRadius).toBe("8px");

    cleanup();

    // 2. Desktop viewport @1280
    window.innerWidth = 1280;
    const { container: deskContainer } = render(
      <StorefrontSectionFrame
        element={<div data-testid="content">Featured Products</div>}
        index={0}
        sectionEntry={sectionEntry as any}
      />
    );

    const deskFrame = deskContainer.querySelector('[data-storefront-section="true"]') as HTMLElement;
    expect(deskFrame.style.paddingTop).toBe("60px");
    expect(deskFrame.style.paddingBottom).toBe("60px");
    expect(deskFrame.style.borderRadius).toBe("20px");
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Media Query CSS Generation for Live Responsive Display
  // ─────────────────────────────────────────────────────────────
  it("6. generateResponsiveCss generates valid media queries for tablet and mobile overrides", () => {
    const settings = {
      paddingTop: 64,
      paddingBottom: 64,
      borderRadius: 24,
      fontSize: 22,
      contentAlign: "start",
      responsive: {
        tablet: {
          paddingTop: 32,
          borderRadius: 16,
        },
        mobile: {
          paddingTop: 16,
          paddingBottom: 16,
          borderRadius: 8,
          fontSize: 14,
          contentAlign: "center",
        },
      },
    };

    const css = generateResponsiveCss(settings, '[data-section-key="sec-test"]');
    expect(css).toBeTruthy();
    expect(css).toContain("@media (min-width: 768px) and (max-width: 1023.98px)");
    expect(css).toContain("padding-top: 32px !important;");
    expect(css).toContain("border-radius: 16px !important;");

    expect(css).toContain("@media (max-width: 767.98px)");
    expect(css).toContain("padding-top: 16px !important;");
    expect(css).toContain("border-radius: 8px !important;");
    expect(css).toContain("font-size: 14px !important;");
    expect(css).toContain("text-align: center !important;");
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Backward Compatibility with Legacy Settings (No Responsive Object)
  // ─────────────────────────────────────────────────────────────
  it("7. Legacy section settings without responsive object render safely without errors", () => {
    const legacySection = {
      type: "rich-text",
      key: "legacy-sec",
      settings: {
        paddingTop: 40,
        paddingBottom: 40,
        borderRadius: 12,
      },
    };

    // Style generation returns base safely
    const style = buildSectionStyle(legacySection.settings, undefined, "mobile");
    expect(style.paddingTop).toBe("40px");
    expect(style.paddingBottom).toBe("40px");
    expect(style.borderRadius).toBe("12px");

    // CSS generator returns null without errors
    const css = generateResponsiveCss(legacySection.settings, "#legacy");
    expect(css).toBeNull();

    // Renders safely without throwing
    const { container } = render(
      <StorefrontSectionFrame
        element={<div>Legacy Content</div>}
        index={0}
        sectionEntry={legacySection as any}
      />
    );
    expect(container.querySelector('[data-storefront-section="true"]')).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────
  // 8. 3-Level Depth Tree Support for Per-Breakpoint Properties
  // ─────────────────────────────────────────────────────────────
  it("8. Modifying per-breakpoint properties on a 3-level deep nested container cascades correctly", () => {
    const treeTokens = {
      themeId: "modern-minimal",
      pages: {
        home: {
          sections: [
            {
              type: "container",
              key: "level-1",
              settings: { direction: "column" },
              children: [
                {
                  type: "container",
                  key: "level-2",
                  settings: { direction: "row" },
                  children: [
                    {
                      type: "container",
                      key: "level-3",
                      settings: {
                        paddingTop: 50,
                        borderRadius: 20,
                        marginTop: 10,
                      },
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    let currentTokens = treeTokens;
    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: treeTokens,
        onChange: (next) => {
          currentTokens = next as any;
        },
        onSave: vi.fn(),
      })
    );

    // Modify deep child at level 3 in mobile mode
    act(() => {
      result.current.handleBatchUpdateSectionFields(
        {
          paddingTop: 12,
          borderRadius: 4,
        },
        "level-3",
        "mobile"
      );
    });

    const level1 = (currentTokens.pages as any).home.sections[0];
    const level2 = level1.children[0];
    const level3 = level2.children[0];

    // Desktop base preserved at depth 3
    expect(level3.settings.paddingTop).toBe(50);
    expect(level3.settings.borderRadius).toBe(20);

    // Mobile override stored at depth 3
    expect(level3.settings.responsive.mobile.paddingTop).toBe(12);
    expect(level3.settings.responsive.mobile.borderRadius).toBe(4);

    // Resetting at depth 3
    act(() => {
      result.current.handleResetPropertyOverride("paddingTop", "mobile", "level-3");
    });

    const level3AfterReset = (currentTokens.pages as any).home.sections[0].children[0].children[0];
    expect(level3AfterReset.settings.responsive.mobile.paddingTop).toBeUndefined();
    expect(level3AfterReset.settings.responsive.mobile.borderRadius).toBe(4);
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Inspector UI Renders Badge «مُخصص للجوال» & Button «إرجاع للأساسي»
  // ─────────────────────────────────────────────────────────────
  it("9. Inspector UI displays «مُخصص للجوال» badge and «إرجاع للأساسي» button when property is overridden", () => {
    const onResetFieldMock = vi.fn();
    const onUpdateFieldMock = vi.fn();

    const settingsWithMobileOverride = {
      paddingTop: 48,
      paddingBottom: 48,
      paddingLeft: 32,
      paddingRight: 32,
      responsive: {
        mobile: {
          paddingTop: 16,
        },
      },
    };

    render(
      <StudioPaddingControl
        settings={settingsWithMobileOverride}
        deviceMode="mobile"
        rawSettings={settingsWithMobileOverride}
        onUpdateField={onUpdateFieldMock}
        onResetField={onResetFieldMock}
      />
    );

    // Badge «مُخصص للجوال» must be visible
    const [badge] = screen.getAllByTestId("badge-customized-padding");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("مُخصص للجوال");

    // Button «إرجاع للأساسي» must be clickable
    const [resetBtn] = screen.getAllByRole("button", { name: /إرجاع للأساسي/i });
    expect(resetBtn).toBeTruthy();

    fireEvent.click(resetBtn);
    expect(onResetFieldMock).toHaveBeenCalledWith("paddingTop");
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Inspector Design Tab Corners & Typography Responsive Controls
  // ─────────────────────────────────────────────────────────────
  it("10. Inspector Design Tab displays responsive badge for borderRadius and contentAlign in mobile mode", () => {
    const onResetFieldMock = vi.fn();
    const onUpdateFieldMock = vi.fn();

    const settings = {
      borderRadius: 24,
      fontSize: 20,
      contentAlign: "start",
      responsive: {
        mobile: {
          borderRadius: 8,
          fontSize: 14,
          contentAlign: "center",
        },
      },
    };

    render(
      <StudioInspectorDesignTab
        sectionType="hero-banner"
        settings={resolveEffectiveSectionSettings(settings, "mobile")}
        rawSettings={settings}
        deviceMode="mobile"
        onUpdateField={onUpdateFieldMock}
        onResetField={onResetFieldMock}
      />
    );

    // Radius badge
    const [radiusBadge] = screen.getAllByTestId("badge-customized-borderRadius");
    expect(radiusBadge).toBeTruthy();
    expect(radiusBadge.textContent).toContain("مُخصص للجوال");

    // Clicking reset on radius triggers reset
    const resetRadiusBtn = radiusBadge.nextElementSibling as HTMLButtonElement;
    expect(resetRadiusBtn).toBeTruthy();
    fireEvent.click(resetRadiusBtn);
    expect(onResetFieldMock).toHaveBeenCalledWith("borderRadius");
  });
});
