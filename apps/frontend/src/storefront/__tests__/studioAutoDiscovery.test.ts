/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  STOREFRONT_SECTION_MANIFEST,
  isStorefrontSectionKnown,
  resolveStorefrontSectionCategory,
  getStorefrontSectionManifest,
} from "../sections/manifest";
import { STOREFRONT_SECTION_COMPONENT_MAP } from "../engine/sectionComponentMap";
import {
  STUDIO_PAGES,
  STUDIO_SECTION_CATEGORIES,
  type StudioSectionCategoryId,
} from "../studio/StudioTypes";
import { StudioSectionCatalogModal } from "../studio/StudioSectionCatalogModal";
import { getStudioSectionThumbnail } from "../studio/StudioSectionThumbnails";
import { getAllAppPresetSections } from "../presets/appSectionPresets";

describe("Storefront Studio 2026: Zero-Touch Component Auto-Discovery", () => {
  afterEach(() => {
    cleanup();
  });
  describe("1. Engine & Manifest Auto-Discovery Guard", () => {
    it("ensures isStorefrontSectionKnown returns true for all sections in STOREFRONT_SECTION_COMPONENT_MAP", () => {
      const allComponentMapKeys = Object.keys(STOREFRONT_SECTION_COMPONENT_MAP);
      expect(allComponentMapKeys.length).toBeGreaterThanOrEqual(109);

      allComponentMapKeys.forEach((key) => {
        const isKnown = isStorefrontSectionKnown(key);
        expect(isKnown, `Section "${key}" must be recognized by isStorefrontSectionKnown`).toBe(true);
      });
    });

    it("registers 'dental-sample-kit' in sectionComponentMap and STOREFRONT_SECTION_MANIFEST with proper metadata", () => {
      expect(STOREFRONT_SECTION_COMPONENT_MAP["dental-sample-kit"]).toBe("dental-sample-kit");

      const entry = getStorefrontSectionManifest("dental-sample-kit");
      expect(entry).toBeDefined();
      expect(entry?.component).toBe("dental-sample-kit");
      expect(entry?.label).toContain("طقم عينات الأسنان");
      expect(entry?.icon).toBe("🦷");
      expect(entry?.category).toBe("specialized");
      expect(isStorefrontSectionKnown("dental-sample-kit")).toBe(true);
    });

    it("verifies resolveStorefrontSectionCategory correctly categorizes all sections", () => {
      const allKeys = Object.keys(STOREFRONT_SECTION_COMPONENT_MAP);
      const validCategories: StudioSectionCategoryId[] = [
        "all",
        "hero",
        "products",
        "promotions",
        "trust",
        "content",
        "navigation",
        "pdp",
        "checkout",
        "elements",
        "specialized",
      ];

      allKeys.forEach((type) => {
        const cat = resolveStorefrontSectionCategory(type);
        expect(validCategories).toContain(cat);
      });

      expect(resolveStorefrontSectionCategory("dental-sample-kit")).toBe("specialized");
      expect(resolveStorefrontSectionCategory("dental-3d-showcase")).toBe("pdp");
      expect(resolveStorefrontSectionCategory("whatsapp-cta")).toBe("elements");
      expect(resolveStorefrontSectionCategory("cart-items")).toBe("checkout");
      expect(resolveStorefrontSectionCategory("hero-banner")).toBe("hero");
    });
  });

  describe("2. Standard 14 E-commerce Pages", () => {
    it("includes all 14 standard e-commerce pages in STUDIO_PAGES", () => {
      const requiredPageIds = [
        "home",
        "shop",
        "pdp",
        "cart",
        "checkout",
        "thank-you",
        "collections",
        "sale",
        "shipping",
        "returns",
        "contact",
        "privacy",
        "terms",
        "registration",
      ];

      expect(STUDIO_PAGES.length).toBe(14);

      requiredPageIds.forEach((requiredId) => {
        const page = STUDIO_PAGES.find((p) => p.id === requiredId);
        expect(page, `Expected STUDIO_PAGES to include standard page "${requiredId}"`).toBeDefined();
        expect(page?.label).toBeTruthy();
        expect(page?.icon).toBeTruthy();
        expect(page?.description).toBeTruthy();
      });

      // Specific checks on the newly added 2026 pages
      const returnsPage = STUDIO_PAGES.find((p) => p.id === "returns");
      expect(returnsPage?.label).toBe("سياسة الاستبدال والاسترجاع");
      expect(returnsPage?.icon).toBe("🔄");

      const contactPage = STUDIO_PAGES.find((p) => p.id === "contact");
      expect(contactPage?.label).toBe("تواصل معنا");
      expect(contactPage?.icon).toBe("📞");

      const regPage = STUDIO_PAGES.find((p) => p.id === "registration");
      expect(regPage?.label).toBe("تسجيل حساب");
      expect(regPage?.icon).toBe("👤");
    });
  });

  describe("3. Section Catalog Modal & Zero-Touch Discoverability", () => {
    it("renders category 'all' and displays all non-legacy sections from manifest", () => {
      const onAddSection = vi.fn();
      const onClose = vi.fn();

      render(
        React.createElement(StudioSectionCatalogModal, {
          isOpen: true,
          onClose,
          onAddSection,
        })
      );

      const nonLegacyEntries = Object.entries(STOREFRONT_SECTION_MANIFEST).filter(
        ([_, manifest]) => !manifest.legacy
      );
      expect(nonLegacyEntries.length).toBeGreaterThanOrEqual(106);

      // Verify that cards are rendered in the catalog
      const cards = screen.getAllByTestId("section-catalog-card");
      expect(cards.length).toBe(nonLegacyEntries.length);

      // Verify specialized section 'dental-sample-kit' is discoverable
      expect(screen.getByText(/طقم عينات الأسنان/)).toBeDefined();
    });

    it("allows switching categories and finds categorized sections", () => {
      const onAddSection = vi.fn();
      const onClose = vi.fn();

      render(
        React.createElement(StudioSectionCatalogModal, {
          isOpen: true,
          onClose,
          onAddSection,
        })
      );

      // Click on "specialized" category button
      const catBtn = screen.getByTestId("category-btn-specialized");
      fireEvent.click(catBtn);

      // Check specialized sections appear
      expect(screen.getByText(/طقم عينات الأسنان/)).toBeDefined();
      expect(screen.getByText(/مطابقة موديل السيارة/)).toBeDefined();
    });
  });

  describe("4. Preservation of Initial Settings on Section Insertion", () => {
    it("preserves initial settings when adding an app preset section", () => {
      const appPresets = getAllAppPresetSections();
      expect(appPresets.length).toBeGreaterThan(0);

      const targetPreset = appPresets.find(
        (p) => p.settings && Object.keys(p.settings).length > 0
      ) || appPresets[0];

      const onAddSection = vi.fn();
      const onClose = vi.fn();

      render(
        React.createElement(StudioSectionCatalogModal, {
          isOpen: true,
          onClose,
          onAddSection,
        })
      );

      // Switch to apps tab
      const appsTab = screen.getByTestId("tab-app-presets");
      fireEvent.click(appsTab);

      // Search for our preset
      const searchInput = screen.getByTestId("section-catalog-search-input");
      fireEvent.change(searchInput, { target: { value: targetPreset.label } });

      // Find the insert button for this preset card
      const insertButtons = screen.getAllByTestId("insert-section-btn");
      expect(insertButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(insertButtons[0]);

      // Verify onAddSection was called with the preset's type AND initialSettings preserved
      expect(onAddSection).toHaveBeenCalledWith(
        targetPreset.type,
        targetPreset.settings
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("5. Visual Thumbnail Resilience", () => {
    it("ensures crisp, valid SVG data URIs for Egypt elements and specialized sections", () => {
      const testTypes = [
        "whatsapp-cta",
        "cod-badge",
        "shipping-partners",
        "payment-methods",
        "dental-sample-kit",
        "dental-3d-showcase",
        "car-model-matcher",
        "automotive-bento",
        "shoe-fit-finder",
        "shop-the-look",
        "look-mosaic",
        "look-planner",
        "look-progress",
        "combined-listing",
        "cart-items",
        "cart-totals",
        "checkout-button",
        "coupon",
      ];

      testTypes.forEach((type) => {
        const thumb = getStudioSectionThumbnail(type);
        expect(thumb, `Thumbnail for "${type}" must be a valid SVG data URI`).toMatch(/^data:image\/svg\+xml;utf8,/);
        expect(thumb.length).toBeGreaterThan(100);
      });
    });

    it("never returns empty or null for any section in the manifest", () => {
      const allKeys = Object.keys(STOREFRONT_SECTION_MANIFEST);
      allKeys.forEach((key) => {
        const thumb = getStudioSectionThumbnail(key);
        expect(thumb).toBeTruthy();
        expect(thumb).toMatch(/^data:image\/svg\+xml;utf8,/);
      });
    });
  });
});
