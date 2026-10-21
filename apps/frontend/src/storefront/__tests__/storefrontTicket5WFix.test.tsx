/* @vitest-environment jsdom */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
import {
  extractPageStyles,
  resolvePageStyleVars,
  resolveActivePageKeyFromPath,
  PAGE_STYLE_DENSITY_GAPS,
  PAGE_STYLE_PRESETS,
} from "../engine/themeResolverCore";
import { resolveStorefrontTheme } from "../engine/themeResolver";
import { StorefrontThemeProvider, useStorefrontTheme } from "../engine/ThemeProvider";
import type { StorefrontThemeInput } from "../engine/themeResolverCore";

// Minimal consumer component to inspect theme context and DOM computed style
const ThemeInspector: React.FC<{ testId?: string }> = ({ testId = "theme-inspector" }) => {
  const { theme, activePageKey, pageStyleVars } = useStorefrontTheme();
  return (
    <div
      data-testid={testId}
      data-active-page={activePageKey}
      data-store-accent={pageStyleVars?.["--store-accent"]}
      data-store-bg={pageStyleVars?.["--store-bg"]}
      data-store-density={pageStyleVars?.["--store-density-gap"]}
    >
      <span className="accent-text" style={{ color: "var(--store-accent)" }}>
        Active: {activePageKey}
      </span>
      <span className="bg-box" style={{ backgroundColor: "var(--store-bg)" }}>
        Theme: {theme.name}
      </span>
    </div>
  );
};

describe("Ticket 5W-FIX: Page Style Scope (هوية الصفحة النشطة)", () => {
  afterEach(() => {
    cleanup();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. تطبيق هوية الصفحة النشطة يغيّر --store-accent والخلفية والكثافة في DOM
  // ─────────────────────────────────────────────────────────────
  it("Test 1: Active pageStyle applies --store-accent, --store-bg, and density to DOM and getComputedStyle", () => {
    const themeInput: StorefrontThemeInput = {
      themeId: "modern-minimal",
      designTokens: {
        colors: {
          accent: "#2563eb",
          background: "#ffffff",
        },
        pageStyles: {
          shop: {
            accent: "#FF5722",
            background: "#18181b",
            density: "airy",
            radius: 20,
          },
        },
      },
    };

    render(
      <StorefrontThemeProvider initialTheme={themeInput} activePageKey="shop">
        <ThemeInspector />
      </StorefrontThemeProvider>
    );

    const rootEl = document.getElementById("storefront-engine-root");
    expect(rootEl).toBeTruthy();

    // Verify computed styles directly on DOM root element (Manager criterion)
    const computedAccent = rootEl?.style.getPropertyValue("--store-accent");
    expect(computedAccent).toBe("#FF5722");

    const computedBg = rootEl?.style.getPropertyValue("--store-bg");
    expect(computedBg).toBe("#18181b");

    const computedDensity = rootEl?.style.getPropertyValue("--store-density-gap");
    expect(computedDensity).toBe(PAGE_STYLE_DENSITY_GAPS.airy);

    const computedRadius = rootEl?.style.getPropertyValue("--store-radius");
    expect(computedRadius).toBe("20px");

    // Also verify --accent mirrors --store-accent for Tailwind/standard CSS
    expect(rootEl?.style.getPropertyValue("--accent")).toBe("#FF5722");
  });

  // ─────────────────────────────────────────────────────────────
  // 2. الصفحة التي بدون هوية ترجع لأكسنت وخلفية الثيم الافتراضي
  // ─────────────────────────────────────────────────────────────
  it("Test 2: A page without custom pageStyle retains global theme defaults", () => {
    const themeInput: StorefrontThemeInput = {
      themeId: "modern-minimal",
      designTokens: {
        colors: {
          accent: "#3b82f6",
          primary: "#1d4ed8",
        },
        pageStyles: {
          shop: {
            accent: "#FF5722",
            density: "compact",
          },
        },
      },
    };

    // Render on 'home' (which has NO custom pageStyle)
    render(
      <StorefrontThemeProvider initialTheme={themeInput} activePageKey="home">
        <ThemeInspector />
      </StorefrontThemeProvider>
    );

    const rootEl = document.getElementById("storefront-engine-root");
    expect(rootEl).toBeTruthy();

    // Retains theme default accent, NOT shop's #FF5722
    const computedAccent = rootEl?.style.getPropertyValue("--store-accent");
    expect(computedAccent).toBe("#3b82f6");

    const computedDensity = rootEl?.style.getPropertyValue("--store-density-gap");
    expect(computedDensity).toBe(PAGE_STYLE_DENSITY_GAPS.normal);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. تبديل الصفحة النشطة يغيّر الأكسنت ديناميكياً (Route Switch)
  // ─────────────────────────────────────────────────────────────
  it("Test 3: Switching activePageKey dynamically updates CSS vars from one page scope to another", () => {
    const themeInput: StorefrontThemeInput = {
      themeId: "modern-minimal",
      designTokens: {
        colors: { accent: "#2563eb" },
        pageStyles: {
          home: { accent: "#CCFF00", density: "normal" },
          shop: { accent: "#0D9488", density: "airy" },
          pdp: { accent: "#EF4444", density: "compact" },
        },
      },
    };

    // 1. Initial page: 'home'
    const { rerender } = render(
      <StorefrontThemeProvider initialTheme={themeInput} activePageKey="home">
        <ThemeInspector />
      </StorefrontThemeProvider>
    );

    let rootEl = document.getElementById("storefront-engine-root");
    expect(rootEl?.style.getPropertyValue("--store-accent")).toBe("#CCFF00");

    // 2. Navigate to 'shop'
    rerender(
      <StorefrontThemeProvider initialTheme={themeInput} activePageKey="shop">
        <ThemeInspector />
      </StorefrontThemeProvider>
    );
    rootEl = document.getElementById("storefront-engine-root");
    expect(rootEl?.style.getPropertyValue("--store-accent")).toBe("#0D9488");
    expect(rootEl?.style.getPropertyValue("--store-density-gap")).toBe(PAGE_STYLE_DENSITY_GAPS.airy);

    // 3. Navigate to 'pdp'
    rerender(
      <StorefrontThemeProvider initialTheme={themeInput} activePageKey="pdp">
        <ThemeInspector />
      </StorefrontThemeProvider>
    );
    rootEl = document.getElementById("storefront-engine-root");
    expect(rootEl?.style.getPropertyValue("--store-accent")).toBe("#EF4444");
    expect(rootEl?.style.getPropertyValue("--store-density-gap")).toBe(PAGE_STYLE_DENSITY_GAPS.compact);

    // 4. Navigate to unstyled page 'checkout' -> reverts to theme default #2563eb
    rerender(
      <StorefrontThemeProvider initialTheme={themeInput} activePageKey="checkout">
        <ThemeInspector />
      </StorefrontThemeProvider>
    );
    rootEl = document.getElementById("storefront-engine-root");
    expect(rootEl?.style.getPropertyValue("--store-accent")).toBe("#2563eb");
  });

  // ─────────────────────────────────────────────────────────────
  // 4. الـFallback الآمن لو الأكسنت ناقص في الـPreset أو الـStyle
  // ─────────────────────────────────────────────────────────────
  it("Test 4: Missing accent falls back safely to preset accent then theme accent without crashing", () => {
    const boldPreset = PAGE_STYLE_PRESETS.find((p) => p.id === "bold")!;

    // Case A: pageStyle has only preset: 'bold' (accent omitted) -> gets boldPreset.accent (#CCFF00)
    const themeA = resolveStorefrontTheme({
      themeId: "modern-minimal",
      designTokens: {
        colors: { accent: "#10b981" },
        pageStyles: {
          sale: {
            preset: "bold",
          },
        },
      },
    });

    const saleVars = resolvePageStyleVars(themeA, "sale");
    expect(saleVars["--store-accent"]).toBe(boldPreset.accent);
    expect(saleVars["--store-radius"]).toBe(`${boldPreset.radius}px`);

    // Case B: pageStyle has only density: 'compact' (preset & accent omitted) -> gets theme accent
    const themeB = resolveStorefrontTheme({
      themeId: "modern-minimal",
      designTokens: {
        colors: { accent: "#8B5E3C" },
        pageStyles: {
          about: {
            density: "compact",
          },
        },
      },
    });

    const aboutVars = resolvePageStyleVars(themeB, "about");
    expect(aboutVars["--store-accent"]).toBe("#8B5E3C");
    expect(aboutVars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.compact);
    expect(aboutVars["--store-font-family"]).toBeDefined();
    expect(aboutVars["--store-radius"]).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────
  // 5. تطبيق كثافة المسافات (Density Spacing Gaps) بدقة
  // ─────────────────────────────────────────────────────────────
  it("Test 5: Density spacing gap resolves correctly for compact, normal, and airy presets", () => {
    const theme = resolveStorefrontTheme({
      themeId: "modern-minimal",
      designTokens: {
        pageStyles: {
          pageCompact: { density: "compact" },
          pageNormal: { density: "normal" },
          pageAiry: { density: "airy" },
        },
      },
    });

    expect(resolvePageStyleVars(theme, "pageCompact")["--store-density-gap"]).toBe("0.75rem");
    expect(resolvePageStyleVars(theme, "pageNormal")["--store-density-gap"]).toBe("1.5rem");
    expect(resolvePageStyleVars(theme, "pageAiry")["--store-density-gap"]).toBe("2.5rem");
  });

  // ─────────────────────────────────────────────────────────────
  // 6. التوافق العكسي مع البنى القديمة واستخراج pageStyles من مختلف المواقع
  // ─────────────────────────────────────────────────────────────
  it("Test 6: Backwards compatibility extracts pageStyles from nested or top-level structures", () => {
    // 1. Old theme without any pageStyles
    const legacyTheme = resolveStorefrontTheme({
      themeId: "khemet-luxe-eg",
      designTokens: {
        colors: { primary: "#d97706" },
      },
    });
    expect(extractPageStyles(legacyTheme)).toEqual({});
    const fallbackVars = resolvePageStyleVars(legacyTheme, "home");
    expect(fallbackVars["--store-accent"]).toBeDefined();
    expect(fallbackVars["--store-bg"]).toBeDefined();

    // 2. Nested settings.storefront.designTokens.pageStyles (backend API payload format)
    const backendPayload: StorefrontThemeInput = {
      storefront: {
        designTokens: {
          pageStyles: {
            terms: {
              accent: "#4f46e5",
              background: "#0f172a",
              density: "compact",
            },
          },
        },
      },
    };
    const extracted = extractPageStyles(backendPayload);
    expect(extracted.terms).toBeDefined();
    expect(extracted.terms.accent).toBe("#4f46e5");
    expect(extracted.terms.background).toBe("#0f172a");
    expect(extracted.terms.density).toBe("compact");
  });

  // ─────────────────────────────────────────────────────────────
  // 7. مطابقة المسارات وحساب activePageKey (resolveActivePageKeyFromPath)
  // ─────────────────────────────────────────────────────────────
  it("Test 7: resolveActivePageKeyFromPath correctly resolves routes, nested splats, and custom pages", () => {
    expect(resolveActivePageKeyFromPath("/")).toBe("home");
    expect(resolveActivePageKeyFromPath("/store")).toBe("home");
    expect(resolveActivePageKeyFromPath("/store/")).toBe("home");
    expect(resolveActivePageKeyFromPath("/shop")).toBe("shop");
    expect(resolveActivePageKeyFromPath("/store/shop")).toBe("shop");
    expect(resolveActivePageKeyFromPath("/products")).toBe("shop");
    expect(resolveActivePageKeyFromPath("/product/classic-sneaker")).toBe("pdp");
    expect(resolveActivePageKeyFromPath("/store/product/hoodie-99")).toBe("pdp");
    expect(resolveActivePageKeyFromPath("/cart")).toBe("cart");
    expect(resolveActivePageKeyFromPath("/checkout")).toBe("checkout");
    expect(resolveActivePageKeyFromPath("/thank-you")).toBe("thank-you");
    expect(resolveActivePageKeyFromPath("/pages/about-us")).toBe("about-us");
    expect(resolveActivePageKeyFromPath("/store/pages/brand-story")).toBe("brand-story");
    expect(resolveActivePageKeyFromPath("/shop/page/summer-deals")).toBe("summer-deals");
    expect(resolveActivePageKeyFromPath("/contact-us")).toBe("contact-us");
  });
});
