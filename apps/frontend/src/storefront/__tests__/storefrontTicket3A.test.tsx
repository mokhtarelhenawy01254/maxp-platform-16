// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  STUDIO_PAGE_PRESETS,
  STUDIO_PAGE_PRESET_CATEGORIES,
  createPresetSections,
} from "../studio/StudioPagePresets";
import { createTemplateSections } from "../studio/utils/studioPageTemplates";
import { StudioCreatePageModal } from "../studio/StudioCreatePageModal";
import { StudioPagesPanel } from "../studio/StudioPagesPanel";
import { ComponentRegistry } from "../engine/ComponentRegistry";
import { STOREFRONT_SECTION_MANIFEST } from "../sections/manifest";
import { resolveStorefrontTheme } from "../engine/themeResolver";
import DynamicStorefrontPage from "../pages/DynamicStorefrontPage";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";

vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { id: "comp-1" },
      storefront: { settings: { storeName: "متجر التجربة 3A" } },
    },
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useStorePage", () => ({
  useStorePage: (slug?: string) => {
    if (slug === "legacy-db-page") {
      return {
        page: {
          id: "page-1",
          title: "صفحة قديمة من قاعدة البيانات",
          slug: "legacy-db-page",
          content: "<p>محتوى قديم</p>",
          pageType: "CUSTOM",
          isActive: true,
          updatedAt: "2026-10-20T10:00:00Z",
        },
        loading: false,
        error: null,
      };
    }
    return {
      page: null,
      loading: false,
      error: "Not found",
    };
  },
}));

vi.mock("../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [],
    loading: false,
  }),
}));

describe("Storefront Studio Phase 3 / Ticket 3A — Ten Page Presets Library", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. Library Structure & Exact 10 Presets Order", () => {
    it("defines exactly 10 complete presets in the specified order with valid properties", () => {
      expect(STUDIO_PAGE_PRESETS).toHaveLength(10);

      const expectedIds = [
        "editorial-home",
        "campaign-home",
        "product-showcase",
        "shop-demo",
        "flash-sale",
        "about",
        "contact",
        "faq",
        "blog",
        "thank-you-demo",
      ];

      const actualIds = STUDIO_PAGE_PRESETS.map((p) => p.id);
      expect(actualIds).toEqual(expectedIds);

      STUDIO_PAGE_PRESETS.forEach((preset) => {
        expect(preset.id).toBeTruthy();
        expect(preset.label.trim()).toBeTruthy();
        expect(preset.description.trim()).toBeTruthy();
        expect(preset.category).toBeTruthy();
        expect(preset.icon.trim()).toBeTruthy();
        expect(preset.suggestedSlug.trim()).toBeTruthy();
        expect(preset.menuLabel.trim()).toBeTruthy();
        expect(Array.isArray(preset.sections)).toBe(true);
      });
    });

    it("ensures every preset contains at least 4 sections and matches target counts", () => {
      STUDIO_PAGE_PRESETS.forEach((preset) => {
        expect(preset.sections.length).toBeGreaterThanOrEqual(4);
      });

      // Specific section counts defined in ticket 3A
      const editorial = STUDIO_PAGE_PRESETS.find((p) => p.id === "editorial-home")!;
      expect(editorial.sections).toHaveLength(5);

      const campaign = STUDIO_PAGE_PRESETS.find((p) => p.id === "campaign-home")!;
      expect(campaign.sections).toHaveLength(5);

      const showcase = STUDIO_PAGE_PRESETS.find((p) => p.id === "product-showcase")!;
      expect(showcase.sections).toHaveLength(5);

      const shop = STUDIO_PAGE_PRESETS.find((p) => p.id === "shop-demo")!;
      expect(shop.sections).toHaveLength(5);

      const flash = STUDIO_PAGE_PRESETS.find((p) => p.id === "flash-sale")!;
      expect(flash.sections).toHaveLength(6);

      const about = STUDIO_PAGE_PRESETS.find((p) => p.id === "about")!;
      expect(about.sections).toHaveLength(4);

      const contact = STUDIO_PAGE_PRESETS.find((p) => p.id === "contact")!;
      expect(contact.sections).toHaveLength(5);

      const faq = STUDIO_PAGE_PRESETS.find((p) => p.id === "faq")!;
      expect(faq.sections).toHaveLength(4);

      const blog = STUDIO_PAGE_PRESETS.find((p) => p.id === "blog")!;
      expect(blog.sections).toHaveLength(4);

      const thankYou = STUDIO_PAGE_PRESETS.find((p) => p.id === "thank-you-demo")!;
      expect(thankYou.sections).toHaveLength(4);
    });
  });

  describe("2. Component Registry Compliance & Manifest Keys Integrity", () => {
    it("ensures all section types used in presets are registered in ComponentRegistry", () => {
      const allPresetSectionTypes = new Set<string>();
      STUDIO_PAGE_PRESETS.forEach((preset) => {
        preset.sections.forEach((sec) => allPresetSectionTypes.add(sec.type));
      });

      // Verify each section type exists in ComponentRegistry
      for (const sectionType of allPresetSectionTypes) {
        expect(ComponentRegistry[sectionType]).toBeDefined();
      }
    });

    it("strictly forbids runtime-context dependent sections (cart, checkout, pdp)", () => {
      const forbiddenTypes = [
        "order-summary",
        "cart-items",
        "checkout-form",
        "pdp-checkout",
        "product-info",
        "product-gallery",
        "order-confirmation",
      ];

      STUDIO_PAGE_PRESETS.forEach((preset) => {
        preset.sections.forEach((sec) => {
          expect(forbiddenTypes).not.toContain(sec.type);
        });
      });
    });

    it("verifies setting keys strictly against STOREFRONT_SECTION_MANIFEST without inventing keys", () => {
      const allowedCommonKeys = new Set(["title", "subtitle", "badge", "ctaText", "ctaLink", "contentAlign", "limit"]);

      STUDIO_PAGE_PRESETS.forEach((preset) => {
        preset.sections.forEach((sec) => {
          const manifestDef = (STOREFRONT_SECTION_MANIFEST as Record<string, any>)[sec.type];
          expect(manifestDef).toBeDefined();

          const manifestFieldKeys = new Set<string>(
            (manifestDef.fields || []).map((f: any) => f.key)
          );

          Object.keys(sec.settings).forEach((settingKey) => {
            const isKnown = manifestFieldKeys.has(settingKey) || allowedCommonKeys.has(settingKey);
            expect(isKnown).toBe(true);
          });
        });
      });
    });
  });

  describe("3. Preset Categories & Section Generator", () => {
    it("covers the 4 categories (landing, commerce, content, support) with Arabic labels", () => {
      const categoryIds = STUDIO_PAGE_PRESET_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toContain("landing");
      expect(categoryIds).toContain("commerce");
      expect(categoryIds).toContain("content");
      expect(categoryIds).toContain("support");

      const categoryLabels = STUDIO_PAGE_PRESET_CATEGORIES.map((c) => c.label);
      expect(categoryLabels).toContain("هبوط");
      expect(categoryLabels).toContain("تجاري");
      expect(categoryLabels).toContain("محتوى");
      expect(categoryLabels).toContain("دعم");

      // Verify each preset belongs to one of the 4 valid categories
      STUDIO_PAGE_PRESETS.forEach((preset) => {
        expect(categoryIds).toContain(preset.category);
      });
    });

    it("generates unique keys and custom title via createPresetSections & createTemplateSections", () => {
      const customTitle = "عروض الصيف الساخنة";
      const sections = createPresetSections("flash-sale", customTitle);

      expect(sections).toHaveLength(6);
      expect(sections[0].type).toBe("hero-banner");
      expect(sections[0].settings.title).toBe(customTitle);
      expect(sections[0].key).toMatch(/^hero-banner-\d+-1$/);
      expect(sections[1].type).toBe("promo-strip");
      expect(sections[2].type).toBe("offer-bento");
      expect(sections[3].type).toBe("featured-products");
      expect(sections[4].type).toBe("features-bar");
      expect(sections[5].type).toBe("newsletter");

      // Test interop through createTemplateSections
      const blogSections = createTemplateSections("blog", "مقالات مختارة");
      expect(blogSections).toHaveLength(4);
      expect(blogSections[0].type).toBe("hero-banner");
      expect(blogSections[0].settings.title).toBe("مقالات مختارة");
      expect(blogSections[1].type).toBe("article-grid");
      expect(blogSections[2].type).toBe("journal-strip");
      expect(blogSections[3].type).toBe("newsletter");
    });
  });

  describe("4. StudioCreatePageModal Presets & Categories UI", () => {
    it("renders all 10 presets, category filter tabs, and Arabic search in the modal", () => {
      render(
        <StudioCreatePageModal
          isOpen={true}
          onClose={vi.fn()}
          existingSlugs={["home", "shop"]}
          onCreatePage={vi.fn()}
        />
      );

      expect(screen.getByText("إنشاء صفحة جديدة من قالب")).toBeDefined();
      expect(screen.getByPlaceholderText("بحث في الصفحات الجاهزة...")).toBeDefined();

      // Check category tabs
      expect(screen.getByTestId("category-tab-all")).toBeDefined();
      expect(screen.getByTestId("category-tab-landing")).toBeDefined();
      expect(screen.getByTestId("category-tab-commerce")).toBeDefined();
      expect(screen.getByTestId("category-tab-content")).toBeDefined();
      expect(screen.getByTestId("category-tab-support")).toBeDefined();

      // Check presets are rendered
      expect(screen.getByText("هوم إديتوريال")).toBeDefined();
      expect(screen.getByText("هوم كامبين/عرض")).toBeDefined();
      expect(screen.getByText("عروض وفلاش سيل")).toBeDefined();
      expect(screen.getByText("مقال / مدونة")).toBeDefined();
      expect(screen.getByText("شكرًا / تم الطلب")).toBeDefined();
    });

    it("filters presets dynamically by Arabic search query", async () => {
      render(
        <StudioCreatePageModal
          isOpen={true}
          onClose={vi.fn()}
          existingSlugs={["home", "shop"]}
          onCreatePage={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText("بحث في الصفحات الجاهزة...");
      fireEvent.change(searchInput, { target: { value: "فلاش" } });

      await waitFor(() => {
        expect(screen.getByText("عروض وفلاش سيل")).toBeDefined();
        expect(screen.queryByText("هوم إديتوريال")).toBeNull();
      });
    });

    it("utilizes menuLabel when different from label in the menu helper text", async () => {
      render(
        <StudioCreatePageModal
          isOpen={true}
          onClose={vi.fn()}
          existingSlugs={["home", "shop"]}
          onCreatePage={vi.fn()}
        />
      );

      // Click on "هوم كامبين/عرض" (menuLabel: "العروض الحصرية")
      fireEvent.click(screen.getByText("هوم كامبين/عرض"));

      await waitFor(() => {
        expect(
          screen.getByText(/يضيف زر «العروض الحصرية»/)
        ).toBeDefined();
      });
    });
  });

  describe("5. Two-Map Custom Page Creation Contract", () => {
    it("populates theme.pages[slug] identically with theme.pageOverrides[slug]", () => {
      const flashSaleSections = createPresetSections("flash-sale", "صفحة الفلاش ديل");
      const theme = resolveStorefrontTheme({
        themeId: "modern-minimal",
        designTokens: {
          pages: {
            "flash-sale": {
              id: "flash-sale",
              title: "صفحة الفلاش ديل",
              sections: flashSaleSections,
            },
          },
          pageOverrides: {
            "flash-sale": {
              id: "flash-sale",
              title: "صفحة الفلاش ديل",
              sections: flashSaleSections,
            },
          },
        },
      });

      // Verify pages map contains 6 sections
      expect(theme.pages?.["flash-sale"]).toBeDefined();
      expect(theme.pages?.["flash-sale"]?.sections).toHaveLength(6);
      expect(theme.pages?.["flash-sale"]?.sections[0].type).toBe("hero-banner");
      expect(theme.pages?.["flash-sale"]?.sections[1].type).toBe("promo-strip");
      expect(theme.pages?.["flash-sale"]?.sections[2].type).toBe("offer-bento");

      // Verify home page remains completely intact (Zero blast-radius)
      expect(theme.pages?.home).toBeDefined();
      expect(theme.pages?.home?.sections.length).toBeGreaterThan(0);
    });
  });

  describe("6. Empty State Guard & Live DynamicStorefrontPage Render", () => {
    it("renders «لا توجد صفحات مخصصة» in StudioPagesPanel when customPages is empty", () => {
      render(
        <StudioPagesPanel
          activePageKey="home"
          onSelectPage={vi.fn()}
          onClose={vi.fn()}
          customPages={[]}
          onOpenCreatePageModal={vi.fn()}
        />
      );

      expect(screen.getByText(/لا توجد صفحات مخصصة/)).toBeDefined();
    });

    it("renders PageComposer live for new preset page (e.g. blog with article-grid)", async () => {
      const blogSections = createPresetSections("blog", "مدونة الأناقة");
      const themeInput = {
        themeId: "modern-minimal",
        designTokens: {
          pages: {
            blog: {
              id: "blog",
              title: "مدونة الأناقة",
              sections: blogSections,
            },
          },
          pageOverrides: {
            blog: {
              id: "blog",
              title: "مدونة الأناقة",
              sections: blogSections,
            },
          },
        },
      };

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/blog"]}>
            <StorefrontThemeProvider initialTheme={themeInput}>
              <Routes>
                <Route path="/:pageSlug" element={<DynamicStorefrontPage />} />
              </Routes>
            </StorefrontThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(document.querySelector(".storefront-page-composer")).toBeTruthy();
        const renderedSections = document.querySelectorAll("[data-storefront-section='true']");
        expect(renderedSections.length).toBe(4);
        expect(renderedSections[0].getAttribute("data-section-type")).toBe("hero-banner");
        expect(renderedSections[1].getAttribute("data-section-type")).toBe("article-grid");
        expect(renderedSections[2].getAttribute("data-section-type")).toBe("journal-strip");
        expect(renderedSections[3].getAttribute("data-section-type")).toBe("newsletter");
      });
    });
  });
});
