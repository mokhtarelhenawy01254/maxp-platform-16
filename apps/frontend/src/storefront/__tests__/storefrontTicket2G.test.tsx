// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, renderHook, act, cleanup } from "@testing-library/react";
import {
  resolveEffectiveSectionSettings,
  hasDeviceOverrides,
  getDeviceOverridesCount,
  buildSectionStyle,
  RESPONSIVE_STYLE_FIELDS,
} from "../studio/utils/studioStyleUtils";
import { StorefrontSectionFrame } from "../layout/StorefrontSectionFrame";
import { StudioSortableSection } from "../studio/StudioSortableSection";
import { StudioPropertyInspector } from "../studio/StudioPropertyInspector";
import { StudioInspectorAiTab } from "../studio/inspector/StudioInspectorAiTab";
import { useStorefrontStudioState } from "../studio/hooks/useStorefrontStudioState";

// Mock ThemeProvider for StorefrontSectionFrame
vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({
    theme: { id: "modern-minimal", name: "Modern Minimal" },
  }),
}));

describe("Ticket 2G: Real Responsive Overrides per Device", () => {
  afterEach(() => {
    cleanup();
  });
  describe("1. Storage & Resolution Law (resolveEffectiveSectionSettings)", () => {
    it("recognizes all standard responsive style fields", () => {
      expect(RESPONSIVE_STYLE_FIELDS.has("paddingTop")).toBe(true);
      expect(RESPONSIVE_STYLE_FIELDS.has("paddingBottom")).toBe(true);
      expect(RESPONSIVE_STYLE_FIELDS.has("minHeight")).toBe(true);
      expect(RESPONSIVE_STYLE_FIELDS.has("borderRadius")).toBe(true);
      expect(RESPONSIVE_STYLE_FIELDS.has("gap")).toBe(true);
      expect(RESPONSIVE_STYLE_FIELDS.has("shadow")).toBe(true);
      expect(RESPONSIVE_STYLE_FIELDS.has("fontSize")).toBe(true);
    });

    it("keeps desktop base untouched while returning mobile overrides for mobile device", () => {
      const settings = {
        paddingTop: 40,
        paddingBottom: 40,
        minHeight: 500,
        responsive: {
          mobile: {
            paddingTop: 12,
            minHeight: 280,
          },
        },
      };

      // Desktop gets base
      const desktopEffective = resolveEffectiveSectionSettings(settings, "desktop");
      expect(desktopEffective.paddingTop).toBe(40);
      expect(desktopEffective.paddingBottom).toBe(40);
      expect(desktopEffective.minHeight).toBe(500);

      // Mobile gets overrides + falls back to desktop for non-overridden fields
      const mobileEffective = resolveEffectiveSectionSettings(settings, "mobile");
      expect(mobileEffective.paddingTop).toBe(12);
      expect(mobileEffective.minHeight).toBe(280);
      expect(mobileEffective.paddingBottom).toBe(40); // inherited from desktop

      // Tablet gets desktop if no tablet overrides
      const tabletEffective = resolveEffectiveSectionSettings(settings, "tablet");
      expect(tabletEffective.paddingTop).toBe(40);
    });

    it("supports tablet overrides and mobile cascading inheritance", () => {
      const settings = {
        paddingTop: 40,
        borderRadius: 24,
        responsive: {
          tablet: {
            paddingTop: 28,
            borderRadius: 16,
          },
          mobile: {
            paddingTop: 12, // overrides tablet
            // borderRadius is not set on mobile -> inherits from tablet (16)
          },
        },
      };

      const tabletEffective = resolveEffectiveSectionSettings(settings, "tablet");
      expect(tabletEffective.paddingTop).toBe(28);
      expect(tabletEffective.borderRadius).toBe(16);

      const mobileEffective = resolveEffectiveSectionSettings(settings, "mobile");
      expect(mobileEffective.paddingTop).toBe(12);
      expect(mobileEffective.borderRadius).toBe(16); // inherited from tablet
    });

    it("hasDeviceOverrides and getDeviceOverridesCount detect active overrides correctly", () => {
      const settings = {
        paddingTop: 40,
        responsive: {
          mobile: {
            paddingTop: 12,
            minHeight: 300,
          },
        },
      };

      expect(hasDeviceOverrides(settings, "mobile")).toBe(true);
      expect(getDeviceOverridesCount(settings, "mobile")).toBe(2);

      expect(hasDeviceOverrides(settings, "tablet")).toBe(false);
      expect(getDeviceOverridesCount(settings, "tablet")).toBe(0);
    });
  });

  describe("2. Style Computation (buildSectionStyle)", () => {
    it("computes 40px on desktop and 12px on mobile for the exact ticket acceptance criterion", () => {
      const settings = {
        paddingTop: 40,
        paddingBottom: 40,
        responsive: {
          mobile: {
            paddingTop: 12,
          },
        },
      };

      const desktopStyle = buildSectionStyle(settings, undefined, "desktop");
      expect(desktopStyle.paddingTop).toBe("40px");

      const mobileStyle = buildSectionStyle(settings, undefined, "mobile");
      expect(mobileStyle.paddingTop).toBe("12px");
      expect(mobileStyle.paddingBottom).toBe("40px");
    });
  });

  describe("3. Canvas Rendering per Device Mode (StudioSortableSection)", () => {
    const defaultSettings = {
      paddingTop: 40,
      paddingBottom: 30,
      responsive: {
        mobile: {
          paddingTop: 12,
        },
      },
    };

    it("renders with paddingTop: 40px when deviceMode is desktop", () => {
      const { container } = render(
        <StudioSortableSection
          id="test-sec"
          index={0}
          sectionKey="test-sec"
          sectionLabel="بانر رئيسي"
          sectionType="hero-banner"
          selected={false}
          totalSections={1}
          deviceMode="desktop"
          settings={defaultSettings}
          onSelect={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>محتوى القسم</div>
        </StudioSortableSection>
      );

      const sectionEl = container.querySelector('[data-studio-sortable-section="true"]') as HTMLElement;
      expect(sectionEl).toBeTruthy();
      expect(sectionEl.style.paddingTop).toBe("40px");
      expect(sectionEl.getAttribute("data-device-mode")).toBe("desktop");
      expect(sectionEl.getAttribute("data-has-responsive-overrides")).toBeNull();
    });

    it("renders with paddingTop: 12px and shows responsive badge when deviceMode is mobile (Criterion 2)", () => {
      const { container } = render(
        <StudioSortableSection
          id="test-sec"
          index={0}
          sectionKey="test-sec"
          sectionLabel="بانر رئيسي"
          sectionType="hero-banner"
          selected={true}
          totalSections={1}
          deviceMode="mobile"
          settings={defaultSettings}
          onSelect={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        >
          <div>محتوى القسم</div>
        </StudioSortableSection>
      );

      const sectionEl = container.querySelector('[data-studio-sortable-section="true"]') as HTMLElement;
      expect(sectionEl).toBeTruthy();
      // Computed inline style on 375 mobile canvas is 12px!
      expect(sectionEl.style.paddingTop).toBe("12px");
      expect(sectionEl.getAttribute("data-device-mode")).toBe("mobile");
      expect(sectionEl.getAttribute("data-has-responsive-overrides")).toBe("true");

      // Badge indicator displays mobile customization
      expect(screen.getByText(/جوال مخصص/)).toBeTruthy();
    });
  });

  describe("4. Live Storefront Rendering (StorefrontSectionFrame)", () => {
    it("applies responsive mobile padding (12px) when window is mobile (< 768px)", () => {
      // Mock window.innerWidth to mobile 375
      const originalInnerWidth = window.innerWidth;
      try {
        window.innerWidth = 375;
        const sectionEntry = {
          type: "hero-banner",
          settings: {
            paddingTop: 40,
            responsive: {
              mobile: {
                paddingTop: 12,
              },
            },
          },
        };

        const { container } = render(
          <StorefrontSectionFrame
            element={<section>محتوى المتجر الحي</section>}
            index={0}
            sectionEntry={sectionEntry}
            sectionId="hero-banner"
            componentKey="hero-banner"
          />
        );

        const frame = container.querySelector('[data-storefront-section="true"]') as HTMLElement;
        expect(frame).toBeTruthy();
        expect(frame.style.paddingTop).toBe("12px");
        expect(frame.getAttribute("data-device-breakpoint")).toBe("mobile");
        expect(frame.getAttribute("data-has-responsive")).toBe("true");
      } finally {
        window.innerWidth = originalInnerWidth;
      }
    });

    it("applies desktop padding (40px) when window is desktop (>= 1024px)", () => {
      const originalInnerWidth = window.innerWidth;
      try {
        window.innerWidth = 1280;
        const sectionEntry = {
          type: "hero-banner",
          settings: {
            paddingTop: 40,
            responsive: {
              mobile: {
                paddingTop: 12,
              },
            },
          },
        };

        const { container } = render(
          <StorefrontSectionFrame
            element={<section>محتوى المتجر الحي</section>}
            index={0}
            sectionEntry={sectionEntry}
            sectionId="hero-banner"
            componentKey="hero-banner"
          />
        );

        const frame = container.querySelector('[data-storefront-section="true"]') as HTMLElement;
        expect(frame).toBeTruthy();
        expect(frame.style.paddingTop).toBe("40px");
        expect(frame.getAttribute("data-device-breakpoint")).toBe("desktop");
      } finally {
        window.innerWidth = originalInnerWidth;
      }
    });
  });

  describe("5. Inspector Device Awareness & Resetting (StudioPropertyInspector)", () => {
    it("renders device awareness banner when deviceMode is mobile and shows reset button", () => {
      const onResetMock = vi.fn();
      const sectionConfig = {
        type: "hero-banner",
        settings: {
          paddingTop: 40,
          responsive: {
            mobile: {
              paddingTop: 12,
            },
          },
        },
      };

      const { container } = render(
        <StudioPropertyInspector
          selectedSectionKey="hero-0"
          sectionConfig={sectionConfig}
          deviceMode="mobile"
          onClose={vi.fn()}
          onUpdateField={vi.fn()}
          onResetDeviceOverrides={onResetMock}
        />
      );

      // Verify device awareness banner
      expect(screen.getByText(/تعديل الجوال \(375px\)/)).toBeTruthy();
      expect(screen.getByText(/1 overrides نشطة/)).toBeTruthy();

      // Click reset button
      const resetBtn = container.querySelector('[data-action="reset-device-overrides"]');
      expect(resetBtn).toBeTruthy();
      fireEvent.click(resetBtn!);
      expect(onResetMock).toHaveBeenCalledWith("mobile");
    });

    it("displays 'يرث من الديسكتوب' when mobile has no overrides", () => {
      const sectionConfig = {
        type: "hero-banner",
        settings: {
          paddingTop: 40,
        },
      };

      render(
        <StudioPropertyInspector
          selectedSectionKey="hero-0"
          sectionConfig={sectionConfig}
          deviceMode="mobile"
          onClose={vi.fn()}
          onUpdateField={vi.fn()}
        />
      );

      expect(screen.getByText(/تعديل الجوال \(375px\)/)).toBeTruthy();
      expect(screen.getByText(/يرث من الديسكتوب/)).toBeTruthy();
    });
  });

  describe("6. Responsive AI / Management Hub Tab (StudioInspectorAiTab)", () => {
    it("renders active device switches and lists mobile overrides", () => {
      const settings = {
        paddingTop: 40,
        responsive: {
          mobile: {
            paddingTop: 12,
            minHeight: 250,
          },
        },
      };

      const onSwitchMock = vi.fn();
      const onResetMock = vi.fn();

      render(
        <StudioInspectorAiTab
          sectionType="hero-banner"
          settings={settings}
          deviceMode="mobile"
          onUpdateField={vi.fn()}
          onResetDeviceOverrides={onResetMock}
          onSwitchDevice={onSwitchMock}
        />
      );

      expect(screen.getByText(/شاشة الجوال \(< 768px\)/)).toBeTruthy();
      expect(screen.getByText(/2 تخصيص نشط/)).toBeTruthy();
      expect(screen.getByText("paddingTop:")).toBeTruthy();
      expect(screen.getByText("12px")).toBeTruthy();

      // Reset button click
      const resetBtn = screen.getByText(/تصفير قيم الجوال والعودة للوراثة/);
      fireEvent.click(resetBtn);
      expect(onResetMock).toHaveBeenCalledWith("mobile");
    });
  });

  describe("7. useStorefrontStudioState Full State Cycle (Acceptance Criteria 1, 4, 5)", () => {
    const initialDesignTokens = {
      themeId: "modern-minimal",
      pages: {
        home: {
          sections: [
            {
              type: "hero-banner",
              label: "بانر تجريبي",
              paddingTop: 40,
              settings: {
                paddingTop: 40,
                title: "مرحبًا",
              },
            },
          ],
        },
      },
    };

    it("Criterion 1: Desktop paddingTop=40 -> switch to mobile -> edit paddingTop=12 -> server receives responsive.mobile.paddingTop=12 and desktop 40 unchanged", () => {
      let savedTokens: any = null;
      const onChangeMock = vi.fn((next) => {
        savedTokens = next;
      });
      const onSaveMock = vi.fn();

      const { result } = renderHook(() =>
        useStorefrontStudioState({
          themeId: "modern-minimal",
          externalDesignTokens: initialDesignTokens,
          onChange: onChangeMock,
          onSave: onSaveMock,
        })
      );

      const sectionKey = result.current.sectionKeys[0];
      act(() => {
        result.current.setSelectedSectionKey(sectionKey);
      });

      // Update in mobile mode
      act(() => {
        result.current.handleBatchUpdateSectionFields({ paddingTop: 12 }, sectionKey, "mobile");
      });

      // Check current section configuration in state
      const updatedSection: any = result.current.activeSections[0];
      expect(updatedSection).toBeTruthy();

      // Server / Token storage checks:
      // 1. Desktop base paddingTop is STILL 40!
      expect(updatedSection.paddingTop).toBe(40);
      expect(updatedSection.settings.paddingTop).toBe(40);

      // 2. Mobile override is saved under responsive.mobile
      expect(updatedSection.settings.responsive.mobile.paddingTop).toBe(12);
      expect(updatedSection.responsive.mobile.paddingTop).toBe(12);
      expect(updatedSection.config.responsive.mobile.paddingTop).toBe(12);

      // Verify tokens delivered to onChange
      expect(savedTokens).toBeTruthy();
      const savedSection = savedTokens.pages.home.sections[0];
      expect(savedSection.paddingTop).toBe(40);
      expect(savedSection.settings.responsive.mobile.paddingTop).toBe(12);
      expect(savedSection.responsive.mobile.paddingTop).toBe(12);
      expect(savedSection.config.responsive.mobile.paddingTop).toBe(12);
    });

    it("Criterion 4: Resetting mobile values removes responsive.mobile and reverts inheritance back to desktop", () => {
      let savedTokens: any = null;
      const onChangeMock = vi.fn((next) => {
        savedTokens = next;
      });
      const onSaveMock = vi.fn();

      const tokensWithMobile = {
        themeId: "modern-minimal",
        pages: {
          home: {
            sections: [
              {
                type: "hero-banner",
                label: "بانر",
                paddingTop: 40,
                settings: {
                  paddingTop: 40,
                  responsive: {
                    mobile: {
                      paddingTop: 12,
                    },
                  },
                },
                responsive: {
                  mobile: {
                    paddingTop: 12,
                  },
                },
              },
            ],
          },
        },
      };

      const { result } = renderHook(() =>
        useStorefrontStudioState({
          themeId: "modern-minimal",
          externalDesignTokens: tokensWithMobile,
          onChange: onChangeMock,
          onSave: onSaveMock,
        })
      );

      const sectionKey = result.current.sectionKeys[0];

      // Reset mobile overrides
      act(() => {
        result.current.handleResetDeviceOverrides(sectionKey, "mobile");
      });

      const resetSection: any = result.current.activeSections[0];
      expect(resetSection.settings.responsive.mobile).toBeUndefined();
      expect(resetSection.responsive.mobile).toBeUndefined();
      expect(resetSection.config.responsive.mobile).toBeUndefined();

      // Effective settings on mobile now reverts to desktop base (40)
      const effectiveMobile = resolveEffectiveSectionSettings(resetSection.settings, "mobile");
      expect(effectiveMobile.paddingTop).toBe(40);
      expect(onSaveMock).toHaveBeenCalled();
    });

    it("Criterion 5: Zero regression on undo/redo and section ordering", () => {
      const onChangeMock = vi.fn();
      const onSaveMock = vi.fn();

      const { result } = renderHook(() =>
        useStorefrontStudioState({
          themeId: "modern-minimal",
          externalDesignTokens: initialDesignTokens,
          onChange: onChangeMock,
          onSave: onSaveMock,
        })
      );

      const sectionKey = result.current.sectionKeys[0];
      act(() => {
        result.current.setSelectedSectionKey(sectionKey);
      });

      // 1. Modify on mobile
      act(() => {
        result.current.handleBatchUpdateSectionFields({ paddingTop: 16 }, sectionKey, "mobile");
      });
      expect((result.current.activeSections[0] as any).settings.responsive.mobile.paddingTop).toBe(16);
      expect(result.current.canUndo).toBe(true);

      // 2. Undo
      act(() => {
        result.current.undo();
      });
      expect((result.current.activeSections[0] as any).settings.responsive?.mobile?.paddingTop).toBeUndefined();

      // 3. Redo
      act(() => {
        result.current.redo();
      });
      expect((result.current.activeSections[0] as any).settings.responsive.mobile.paddingTop).toBe(16);
    });
  });
});
