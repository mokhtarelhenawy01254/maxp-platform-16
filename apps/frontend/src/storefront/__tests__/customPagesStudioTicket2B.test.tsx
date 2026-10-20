// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  STUDIO_PAGE_TEMPLATES,
  createTemplateSections,
} from "../studio/utils/studioPageTemplates";
import { StudioCreatePageModal } from "../studio/StudioCreatePageModal";
import { StudioPageSelector } from "../studio/StudioPageSelector";
import { resolveStorefrontTheme } from "../engine/themeResolver";
import DynamicStorefrontPage from "../pages/DynamicStorefrontPage";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";

vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { id: "comp-1" },
      storefront: { settings: { storeName: "متجر التجربة" } },
    },
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useStorePage", () => ({
  useStorePage: (slug?: string) => {
    if (slug === "rich-text-only") {
      return {
        page: {
          id: "page-1",
          title: "صفحة نصوص فقط",
          slug: "rich-text-only",
          content: "<p>محتوى نصوص غنية قديم</p>",
          pageType: "CUSTOM",
          isActive: true,
          updatedAt: "2026-10-19T10:00:00Z",
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

describe("Storefront Studio Phase 2 / Ticket 2B — Custom Pages & Menu Integration", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. Template Definitions and Generator", () => {
    it("defines the 4 required templates: about, contact, faq, article", () => {
      const templateIds = STUDIO_PAGE_TEMPLATES.map((t) => t.id);
      expect(templateIds).toEqual(["about", "contact", "faq", "article"]);

      const about = STUDIO_PAGE_TEMPLATES.find((t) => t.id === "about")!;
      expect(about.name).toBe("عن المتجر");
      expect(about.pageType).toBe("ABOUT_US");
      expect(about.defaultSlug).toBe("about");

      const contact = STUDIO_PAGE_TEMPLATES.find((t) => t.id === "contact")!;
      expect(contact.name).toBe("تواصل معنا");
      expect(contact.pageType).toBe("CONTACT_US");

      const faq = STUDIO_PAGE_TEMPLATES.find((t) => t.id === "faq")!;
      expect(faq.name).toBe("أسئلة شائعة");
      expect(faq.pageType).toBe("FAQ");

      const article = STUDIO_PAGE_TEMPLATES.find((t) => t.id === "article")!;
      expect(article.name).toBe("مقال / مدونة");
      expect(article.pageType).toBe("CUSTOM");
    });

    it("generates the about template with hero-banner + info-content + features-bar + newsletter", () => {
      const sections = createTemplateSections("about", "عن متجرنا التجريبي");
      expect(sections).toHaveLength(4);
      expect(sections[0].type).toBe("hero-banner");
      expect(sections[0].settings.title).toBe("عن متجرنا التجريبي");
      expect(sections[1].type).toBe("info-content");
      expect(sections[2].type).toBe("features-bar");
      expect(sections[3].type).toBe("newsletter");
    });

    it("generates the article template with hero-banner + richtext + features-bar + newsletter", () => {
      const sections = createTemplateSections("article", "دليل المشتري");
      expect(sections).toHaveLength(4);
      expect(sections[0].type).toBe("hero-banner");
      expect(sections[1].type).toBe("richtext");
      expect(sections[2].type).toBe("features-bar");
      expect(sections[3].type).toBe("newsletter");
    });
  });

  describe("2. StudioCreatePageModal Dialog & Slug Validation", () => {
    it("renders title, latin slug, 4 templates, and menu checkbox", () => {
      render(
        <StudioCreatePageModal
          isOpen={true}
          onClose={vi.fn()}
          existingSlugs={["home", "shop", "about"]}
          onCreatePage={vi.fn()}
        />
      );

      expect(screen.getByText("إنشاء صفحة جديدة من قالب")).toBeDefined();
      expect(screen.getByText("عنوان الصفحة")).toBeDefined();
      expect(screen.getByText("رابط الصفحة اللاتيني (Slug)")).toBeDefined();
      expect(screen.getByText("أضف رابط الصفحة إلى القائمة الرئيسية (المنيو)")).toBeDefined();

      // Check the 4 template cards
      expect(screen.getByText("عن المتجر")).toBeDefined();
      expect(screen.getByText("تواصل معنا")).toBeDefined();
      expect(screen.getByText("أسئلة شائعة")).toBeDefined();
      expect(screen.getByText("مقال / مدونة")).toBeDefined();
    });

    it("enforces uniqueness against existingSlugs and prevents duplicate submission", async () => {
      const onCreate = vi.fn();
      render(
        <StudioCreatePageModal
          isOpen={true}
          onClose={vi.fn()}
          existingSlugs={["home", "shop", "about"]}
          onCreatePage={onCreate}
        />
      );

      const submitButton = screen.getByRole("button", { name: /إنشاء الصفحة وتجهيزها/ });
      // Initially slug is 'about', which is in existingSlugs
      expect(screen.getByText(/الرابط "about" مستخدم بالفعل/)).toBeDefined();
      expect(submitButton).toHaveProperty("disabled", true);

      // Typing a unique slug
      const slugInput = screen.getByPlaceholderText("about");
      fireEvent.change(slugInput, { target: { value: "our-story" } });

      await waitFor(() => {
        expect(screen.queryByText(/مستخدم بالفعل/)).toBeNull();
        expect(submitButton).toHaveProperty("disabled", false);
      });

      fireEvent.click(submitButton);
      expect(onCreate).toHaveBeenCalledWith({
        title: "عن المتجر",
        slug: "our-story",
        template: "about",
        showInMenu: true,
      });
    });
  });

  describe("3. StudioPageSelector with Custom Pages section", () => {
    const customPages = [
      { id: "about", label: "عن المتجر", icon: "📄", description: "/about" },
      { id: "our-values", label: "قيمنا", icon: "📄", description: "/our-values" },
    ];

    it("displays active custom page label on the trigger button", () => {
      render(
        <StudioPageSelector
          activePageKey="about"
          onPageChange={vi.fn()}
          customPages={customPages}
          onOpenCreatePageModal={vi.fn()}
        />
      );

      expect(screen.getByText("عن المتجر")).toBeDefined();
      // Total badge should show 12 + 2 = 14
      expect(screen.getByText("14")).toBeDefined();
    });

    it("renders both standard pages and «صفحاتي» under the dropdown", () => {
      render(
        <StudioPageSelector
          activePageKey="home"
          onPageChange={vi.fn()}
          customPages={customPages}
          onOpenCreatePageModal={vi.fn()}
        />
      );

      // Click trigger to open dropdown
      fireEvent.click(screen.getByRole("button", { name: /تعديل الصفحة/ }));

      expect(screen.getByText("الصفحات الأساسية")).toBeDefined();
      expect(screen.getByText("صفحاتي")).toBeDefined();
      expect(screen.getByText("قيمنا")).toBeDefined();
      expect(screen.getByText("+ صفحة جديدة")).toBeDefined();
    });

    it("triggers onPageChange when clicking a custom page option", () => {
      const onPageChange = vi.fn();
      render(
        <StudioPageSelector
          activePageKey="home"
          onPageChange={onPageChange}
          customPages={customPages}
          onOpenCreatePageModal={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /تعديل الصفحة/ }));
      fireEvent.click(screen.getByText("قيمنا"));

      expect(onPageChange).toHaveBeenCalledWith("our-values");
    });
  });

  describe("4. Theme Resolver & Navigation Menu Integration", () => {
    it("maps designTokens.navigation.menu into theme.header.navigation", () => {
      const theme = resolveStorefrontTheme({
        themeId: "modern-minimal",
        designTokens: {
          navigation: {
            menu: [
              { label: "الرئيسية", url: "/" },
              { label: "كل المنتجات", url: "/shop" },
              { label: "عن المتجر", url: "/about" },
            ],
          },
        },
      });

      expect(theme.header?.navigation).toHaveLength(3);
      expect(theme.header?.navigation?.[2]).toEqual({
        label: "عن المتجر",
        to: "/about",
      });
    });

    it("populates theme.pages[slug] from designTokens.pages[slug] while keeping home intact", () => {
      const aboutSections = createTemplateSections("about", "عن المتجر");
      const theme = resolveStorefrontTheme({
        themeId: "modern-minimal",
        designTokens: {
          pages: {
            about: {
              id: "about",
              title: "عن المتجر",
              sections: aboutSections,
            },
          },
          pageOverrides: {
            about: {
              id: "about",
              title: "عن المتجر",
              sections: aboutSections,
            },
          },
        },
      });

      // Verify custom page about exists in theme.pages with its 4 sections
      expect(theme.pages?.about).toBeDefined();
      expect(theme.pages?.about?.sections).toHaveLength(4);
      expect(theme.pages?.about?.sections?.[0].type).toBe("hero-banner");

      // Verify home page exists and was not altered
      expect(theme.pages?.home).toBeDefined();
      expect(Array.isArray(theme.pages?.home?.sections)).toBe(true);
      expect(theme.pages?.home?.sections.length).toBeGreaterThan(0);
    });
  });

  describe("5. DynamicStorefrontPage Live Render", () => {
    it("renders PageComposer when custom page has sections in theme", async () => {
      const aboutSections = createTemplateSections("about", "عن المتجر الفاخر");
      const themeInput = {
        themeId: "modern-minimal",
        designTokens: {
          pages: {
            about: {
              id: "about",
              title: "عن المتجر الفاخر",
              sections: aboutSections,
            },
          },
          pageOverrides: {
            about: {
              id: "about",
              title: "عن المتجر الفاخر",
              sections: aboutSections,
            },
          },
        },
      };

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/about"]}>
            <StorefrontThemeProvider initialTheme={themeInput}>
              <Routes>
                <Route path="/:pageSlug" element={<DynamicStorefrontPage />} />
              </Routes>
            </StorefrontThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Section containers from the template should be rendered inside PageComposer
      await waitFor(() => {
        expect(document.querySelector(".storefront-page-composer")).toBeTruthy();
        const sections = document.querySelectorAll("[data-storefront-section='true']");
        expect(sections.length).toBe(4);
        expect(sections[0].getAttribute("data-section-type")).toBe("hero-banner");
        expect(sections[1].getAttribute("data-section-type")).toBe("info-content");
        expect(sections[2].getAttribute("data-section-type")).toBe("features-bar");
        expect(sections[3].getAttribute("data-section-type")).toBe("newsletter");
      });
    });

    it("falls back to DB content when page has no sections", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/rich-text-only"]}>
            <StorefrontThemeProvider>
              <Routes>
                <Route path="/:pageSlug" element={<DynamicStorefrontPage />} />
              </Routes>
            </StorefrontThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("صفحة نصوص فقط")).toBeDefined();
        expect(screen.getByText("محتوى نصوص غنية قديم")).toBeDefined();
      });
    });
  });
});
