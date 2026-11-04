// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  hslTripletToHex,
  hexToHslTriplet,
  computeContrastingForeground,
  isValidHslTriplet,
} from "../studio/utils/hslColorBridge";
import {
  exportFullStorefrontTheme,
  validateFullStorefrontThemeJSON,
  createBlankStorefrontTheme,
  STANDARD_THEME_PAGES,
  MANDATORY_THEME_ROOT_KEYS,
  MANDATORY_PAGE_KEYS,
} from "../studio/utils/studioThemeSerializer";
import { validateThemeObject } from "../scripts/validate-theme-file";
import { isStorefrontSectionKnown } from "../sections/manifest";
import { StudioExportImportModal } from "../studio/StudioExportImportModal";

describe("Phase 4: Full HSL Color Tokens & Theme Styling", () => {
  it("1. hslTripletToHex and hexToHslTriplet roundtrip accurately", () => {
    // Pure White
    expect(hslTripletToHex("0 0% 100%")).toBe("#ffffff");
    expect(hexToHslTriplet("#ffffff")).toBe("0 0% 100%");

    // Pure Black
    expect(hslTripletToHex("0 0% 0%")).toBe("#000000");
    expect(hexToHslTriplet("#000000")).toBe("0 0% 0%");

    // Dark Navy
    const navyHex = hslTripletToHex("215 28% 17%");
    expect(navyHex).toBe("#1f2937");
    const navyTriplet = hexToHslTriplet(navyHex);
    expect(navyTriplet).toBe("215 28% 17%");

    // Vibrant Orange
    const orangeHex = hslTripletToHex("31 86% 50%");
    expect(orangeHex).toBe("#ed8312");
    expect(hexToHslTriplet(orangeHex)).toBe("31 86% 50%");

    // Wrapped in hsl(...)
    expect(hslTripletToHex("hsl(215 28% 17%)")).toBe("#1f2937");
    expect(hslTripletToHex("hsl(215, 28%, 17%)")).toBe("#1f2937");
  });

  it("2. computeContrastingForeground calculates contrasting foreground accurately", () => {
    // Dark background -> White foreground
    expect(computeContrastingForeground("215 28% 17%")).toBe("0 0% 100%");
    expect(computeContrastingForeground("#1f2937")).toBe("0 0% 100%");
    expect(computeContrastingForeground("0 0% 0%")).toBe("0 0% 100%");

    // Light background -> Black/Dark foreground
    expect(computeContrastingForeground("34 30% 97%")).toBe("0 0% 0%");
    expect(computeContrastingForeground("#ffffff")).toBe("0 0% 0%");
    expect(computeContrastingForeground("0 0% 100%")).toBe("0 0% 0%");
  });

  it("3. isValidHslTriplet accurately validates HSL channel triplets", () => {
    expect(isValidHslTriplet("215 28% 17%")).toBe(true);
    expect(isValidHslTriplet("0 0% 100%")).toBe(true);
    expect(isValidHslTriplet("hsl(24 26% 16%)")).toBe(true);
    expect(isValidHslTriplet("24, 26%, 16%")).toBe(true);

    expect(isValidHslTriplet("#ffffff")).toBe(false);
    expect(isValidHslTriplet("rgb(255, 255, 255)")).toBe(false);
    expect(isValidHslTriplet("invalid")).toBe(false);
    expect(isValidHslTriplet(null)).toBe(false);
  });
});

describe("Phase 5: Full StorefrontTheme JSON Export/Import & Theme Authoring", () => {
  it("4. createBlankStorefrontTheme initializes a valid theme conforming to official schema and section manifests", () => {
    // Check ID sanitization (strips leading hyphens/underscores, enforces ^[a-z0-9][a-z0-9-]*$)
    const blank = createBlankStorefrontTheme("_Custom-Brand_2026!", "براند المستقبل", "rtl");

    expect(blank.id).toBe("custom-brand-2026");
    expect(/^[a-z0-9][a-z0-9-]*$/.test(blank.id)).toBe(true);
    expect(blank.name).toBe("براند المستقبل");
    expect(blank.direction).toBe("rtl");

    // Required schema metadata: description, preview, and seo
    expect(blank.description).toBeDefined();
    expect(typeof blank.description).toBe("string");
    expect(blank.preview).toBeDefined();
    expect(blank.preview.imageUrl).toBeDefined();
    expect(Array.isArray(blank.preview.colors)).toBe(true);
    expect(blank.preview.colors.length).toBeGreaterThanOrEqual(3);
    expect(blank.seo).toBeDefined();
    expect(blank.seo.titleTemplate).toContain("براند المستقبل");
    expect(blank.seo.description).toBeDefined();

    // 4 Core mandatory commercial pages MUST be present
    MANDATORY_PAGE_KEYS.forEach((pageKey) => {
      expect(blank.pages[pageKey]).toBeDefined();
      expect(blank.pages[pageKey]?.sections.length).toBeGreaterThan(0);
    });

    // Section validation: category-strip and account-portal are gone!
    // shop must use valid registered "shop-command-bar"
    const shopSectionTypes = blank.pages.shop?.sections.map((s: any) => s.type || s);
    expect(shopSectionTypes).toContain("shop-command-bar");
    expect(shopSectionTypes).not.toContain("category-strip");

    // checkout must include both checkout-form and payment
    const checkoutSectionTypes = blank.pages.checkout?.sections.map((s: any) => s.type || s);
    expect(checkoutSectionTypes).toContain("checkout-form");
    expect(checkoutSectionTypes).toContain("payment");

    // registration must use "member-registration"
    const registrationSectionTypes = blank.pages.registration?.sections.map((s: any) => s.type || s);
    expect(registrationSectionTypes).toContain("member-registration");
    expect(registrationSectionTypes).not.toContain("account-portal");

    // Verify every section in every page of blank theme is known in the registry
    Object.entries(blank.pages).forEach(([pageKey, pageConfig]) => {
      pageConfig?.sections.forEach((sec: any) => {
        const type = typeof sec === "string" ? sec : sec.type;
        expect(isStorefrontSectionKnown(type)).toBe(true);
      });
    });

    // Omit unauthored system pages so that runtime can supply rich tone-aware fallbacks
    expect(blank.pages.shipping).toBeUndefined();
    expect(blank.pages.returns).toBeUndefined();
    expect(blank.pages.privacy).toBeUndefined();
    expect(blank.pages.terms).toBeUndefined();
    expect(blank.pages.contact).toBeUndefined();
    expect(blank.pages["size-guide"]).toBeUndefined();

    // All 14 semantic color tokens present
    const colors = blank.tokens.colors;
    expect(colors.primary).toBeDefined();
    expect(colors.primaryForeground).toBeDefined();
    expect(colors.secondary).toBeDefined();
    expect(colors.secondaryForeground).toBeDefined();
    expect(colors.accent).toBeDefined();
    expect(colors.accentForeground).toBeDefined();
    expect(colors.background).toBeDefined();
    expect(colors.foreground).toBeDefined();
    expect(colors.muted).toBeDefined();
    expect(colors.mutedForeground).toBeDefined();
    expect(colors.border).toBeDefined();
    expect(colors.card).toBeDefined();
    expect(colors.cardForeground).toBeDefined();
    expect(colors.ring).toBeDefined();

    // Validates against JSON validator
    const validation = validateFullStorefrontThemeJSON(blank);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Passes official validateThemeObject schema and section check
    const officialReport = validateThemeObject(blank as any);
    expect(officialReport.schemaCheck.passed).toBe(true);
    expect(officialReport.schemaCheck.errors).toHaveLength(0);
    expect(officialReport.sectionCheck.passed).toBe(true);
    expect(officialReport.sectionCheck.errors).toHaveLength(0);
  });

  it("5. exportFullStorefrontTheme consolidates authored pages, merges pageOverrides, and omits unauthored system pages", () => {
    const exported = exportFullStorefrontTheme({
      themeId: "-cairo-stride-custom_",
      themeName: "Cairo Stride Custom",
      direction: "rtl",
      tokens: {
        colors: {
          primary: "#1f2937", // Should convert to HSL triplet
          accent: "#ed8312",
        },
        typography: {
          headingFont: "Cairo",
          bodyFont: "Tajawal",
          baseSize: "16px",
        },
      },
      pageOverrides: {
        home: {
          sections: [
            {
              type: "hero-banner",
              config: { variant: "split-panel", title: "العنوان الرئيسي", _id: "temp-123" },
              settings: { subtitle: "الوصف التوضيحي" },
            },
          ],
        },
        customPromoPage: {
          sections: [{ type: "promo-strip" }],
        },
      },
    });

    expect(exported.id).toBe("cairo-stride-custom");
    expect(/^[a-z0-9][a-z0-9-]*$/.test(exported.id)).toBe(true);
    expect(exported.name).toBe("Cairo Stride Custom");

    // Colors must be canonical HSL triplets
    expect(exported.tokens.colors.primary).toBe("215 28% 17%");
    expect(exported.tokens.colors.accent).toBe("31 86% 50%");

    // Section cleaning check: lifted variant and removed _id
    const homeSections = exported.pages.home.sections;
    expect(homeSections).toHaveLength(1);
    const heroSec = homeSections[0] as any;
    expect(heroSec.type).toBe("hero-banner");
    expect(heroSec.variant).toBe("split-panel");
    expect(heroSec.settings.title).toBe("العنوان الرئيسي");
    expect(heroSec.settings.subtitle).toBe("الوصف التوضيحي");
    expect(heroSec.settings._id).toBeUndefined();
    expect(heroSec.config).toBeUndefined();

    // Custom page included
    expect(exported.pages.customPromoPage).toBeDefined();

    // Core 4 mandatory pages preserved
    expect(exported.pages.home).toBeDefined();
    expect(exported.pages.shop).toBeDefined();
    expect(exported.pages.pdp).toBeDefined();
    expect(exported.pages.cart).toBeDefined();

    // Validate theme against schema
    const validation = validateFullStorefrontThemeJSON(exported);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Official validateThemeObject check
    const officialReport = validateThemeObject(exported as any);
    expect(officialReport.schemaCheck.passed).toBe(true);
    expect(officialReport.schemaCheck.errors).toHaveLength(0);
    expect(officialReport.sectionCheck.passed).toBe(true);
    expect(officialReport.sectionCheck.errors).toHaveLength(0);

    // Dynamic / tpl-* theme export: omits unauthored system pages without injecting fake info-content
    const dynamicThemeExport = exportFullStorefrontTheme({
      themeId: "tpl-001-bulk-commerce-women-fashion",
      themeName: "نسوة جملة",
      direction: "rtl",
      previewTheme: {
        id: "tpl-001-bulk-commerce-women-fashion",
        name: "نسوة جملة",
        direction: "rtl",
        tokens: {
          colors: { ...exported.tokens.colors },
          typography: exported.tokens.typography,
          shape: exported.tokens.shape,
        },
        header: exported.header,
        footer: exported.footer,
        pages: {
          home: { sections: [{ type: "hero-banner" }] },
          shop: { sections: [{ type: "product-grid" }] },
          pdp: { sections: [{ type: "product-info" }] },
          cart: { sections: [{ type: "cart-items" }] },
        },
      } as any,
    });

    // Mandatory 4 pages present
    expect(dynamicThemeExport.pages.home).toBeDefined();
    expect(dynamicThemeExport.pages.shop).toBeDefined();
    expect(dynamicThemeExport.pages.pdp).toBeDefined();
    expect(dynamicThemeExport.pages.cart).toBeDefined();

    // Unauthored system pages MUST be omitted (NO fake info-content injection!)
    expect(dynamicThemeExport.pages.checkout).toBeUndefined();
    expect(dynamicThemeExport.pages["thank-you"]).toBeUndefined();
    expect(dynamicThemeExport.pages.shipping).toBeUndefined();
    expect(dynamicThemeExport.pages.returns).toBeUndefined();
    expect(dynamicThemeExport.pages.privacy).toBeUndefined();
    expect(dynamicThemeExport.pages.terms).toBeUndefined();

    const dynamicValidation = validateFullStorefrontThemeJSON(dynamicThemeExport);
    expect(dynamicValidation.valid).toBe(true);
    expect(dynamicValidation.errors).toHaveLength(0);
  });

  it("6. validateFullStorefrontThemeJSON validates official 4 mandatory pages and rejects invalid schema", () => {
    // Exactly 4 mandatory page keys: home, shop, pdp, cart
    expect(MANDATORY_PAGE_KEYS).toEqual(["home", "shop", "pdp", "cart"]);

    // Non-object
    expect(validateFullStorefrontThemeJSON(null).valid).toBe(false);
    expect(validateFullStorefrontThemeJSON("string").valid).toBe(false);

    // Missing mandatory root keys
    const missingKeysRes = validateFullStorefrontThemeJSON({ id: "test" });
    expect(missingKeysRes.valid).toBe(false);
    MANDATORY_THEME_ROOT_KEYS.forEach((key) => {
      if (key !== "id") {
        expect(missingKeysRes.errors.some((err) => err.includes(key))).toBe(true);
      }
    });

    // Invalid id format (starts with hyphen or underscore)
    const invalidIdRes = validateFullStorefrontThemeJSON({
      id: "-invalid-id",
      name: "Test",
      direction: "rtl",
      tokens: { colors: { primary: "1 1% 1%", secondary: "1 1% 1%", accent: "1 1% 1%", background: "1 1% 1%", foreground: "1 1% 1%" } },
      header: {},
      footer: {},
      pages: {
        home: { sections: [] },
        shop: { sections: [] },
        pdp: { sections: [] },
        cart: { sections: [] },
      },
    });
    expect(invalidIdRes.valid).toBe(false);
    expect(invalidIdRes.errors.some((err) => err.includes("id"))).toBe(true);

    // Invalid direction
    const invalidDirRes = validateFullStorefrontThemeJSON({
      id: "test",
      name: "Test",
      direction: "horizontal",
      tokens: { colors: {} },
      header: {},
      footer: {},
      pages: {},
    });
    expect(invalidDirRes.valid).toBe(false);
    expect(invalidDirRes.errors.some((err) => err.includes("الاتجاه"))).toBe(true);

    // Valid 4-page theme without checkout passes!
    const valid4PageTheme = {
      id: "valid-four-pages",
      name: "Test Theme",
      direction: "rtl",
      tokens: {
        colors: {
          primary: "0 0% 0%",
          secondary: "0 0% 90%",
          accent: "0 0% 50%",
          background: "0 0% 100%",
          foreground: "0 0% 0%",
        },
      },
      header: {},
      footer: {},
      pages: {
        home: { sections: [] },
        shop: { sections: [] },
        pdp: { sections: [] },
        cart: { sections: [] },
      },
    };
    expect(validateFullStorefrontThemeJSON(valid4PageTheme).valid).toBe(true);

    // Missing mandatory pages (missing cart)
    const missingPagesRes = validateFullStorefrontThemeJSON({
      ...valid4PageTheme,
      pages: { home: { sections: [] }, shop: { sections: [] }, pdp: { sections: [] } },
    });
    expect(missingPagesRes.valid).toBe(false);
    expect(missingPagesRes.errors.some((err) => err.includes("cart"))).toBe(true);
  });

  it("7. StudioExportImportModal supports Full Theme export, validation and blank theme creation", () => {
    const onApplyImport = vi.fn();
    const onApplyThemeImport = vi.fn();
    const onClose = vi.fn();

    render(
      React.createElement(StudioExportImportModal, {
        isOpen: true,
        onClose,
        activePageKey: "home",
        currentSections: [{ type: "hero-banner" }],
        onApplyImport,
        onApplyThemeImport,
        initialScope: "theme",
      })
    );

    // In theme mode, check mode switch pill
    const modeSwitchTheme = screen.getByTestId("mode-switch-theme");
    const modeSwitchPage = screen.getByTestId("mode-switch-page");
    expect(modeSwitchTheme).toBeDefined();
    expect(modeSwitchPage).toBeDefined();

    // Export preview shows JSON containing id and pages
    const preview = screen.getByTestId("exported-json-preview");
    expect(preview.textContent).toContain('"id"');
    expect(preview.textContent).toContain('"tokens"');
    expect(preview.textContent).toContain('"pages"');

    // Create blank theme button exists and calls onApplyThemeImport
    const blankBtn = screen.getByTestId("create-blank-theme-btn");
    expect(blankBtn).toBeDefined();
    fireEvent.click(blankBtn);
    expect(onApplyThemeImport).toHaveBeenCalledTimes(1);
    const blankCallArg = onApplyThemeImport.mock.calls[0][0];
    expect(blankCallArg.id).toBe("custom-studio-theme");
    expect(blankCallArg.pages.home).toBeDefined();

    // Switch to import tab
    const importTab = screen.getByTestId("tab-import-page");
    fireEvent.click(importTab);

    // Enter a valid theme JSON
    const validTheme = createBlankStorefrontTheme("imported-theme", "Imported Theme", "rtl");
    const textarea = screen.getByTestId("import-json-textarea");
    fireEvent.change(textarea, { target: { value: JSON.stringify(validTheme) } });

    // Should show valid preview banner
    expect(screen.getByTestId("theme-import-preview")).toBeDefined();
    expect(screen.getByText("Imported Theme")).toBeDefined();

    // Confirm button should be enabled and trigger theme application
    const confirmBtn = screen.getByTestId("confirm-import-btn");
    expect(confirmBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(confirmBtn);

    expect(onApplyThemeImport).toHaveBeenCalledTimes(2);
    expect(onApplyThemeImport.mock.calls[1][0].id).toBe("imported-theme");
  });
});
