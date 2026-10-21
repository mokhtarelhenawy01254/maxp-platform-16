// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import {
  resolveStorefrontTheme,
  resolvePageStyleVars,
  extractPageStyles,
  PAGE_STYLE_PRESETS,
  PAGE_STYLE_DENSITY_GAPS,
} from "../engine/themeResolver";
import { StudioTopBar } from "../studio/StudioTopBar";
import type { PageStylesMap } from "../studio/StudioTypes";

// Mock React Router
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: null, key: "test" }),
    Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
  };
});

describe("Ticket 5W: Page Style Scope + Art Direction Presets", () => {
  afterEach(() => {
    cleanup();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. غياب pageStyles = صفر تغيير واسترجاع قيم الثيم الافتراضية
  // ─────────────────────────────────────────────────────────────
  it("Criterion 1: Absence of pageStyles causes zero changes and resolves theme fallback values", () => {
    const themeInput = {
      themeId: "modern-minimal",
      designTokens: {
        colors: {
          primary: "#111827",
          accent: "#3b82f6",
        },
        typography: {
          bodyFont: "'Inter', sans-serif",
          headingFont: "'Inter', sans-serif",
        },
        shape: {
          borderRadius: "12px",
        },
      },
    };

    const resolved = resolveStorefrontTheme(themeInput);

    // pageStyles is empty/undefined on theme
    expect(extractPageStyles(themeInput)).toEqual({});
    expect((resolved as any).pageStyles).toBeUndefined();

    // Resolving vars for any page (e.g. 'home', 'shop', 'cart') falls back cleanly to theme tokens
    const homeVars = resolvePageStyleVars(resolved, "home");
    expect(homeVars["--store-accent"]).toBe("#3b82f6");
    expect(homeVars["--store-font-family"]).toBe("'Inter', sans-serif");
    expect(homeVars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.normal);
    expect(homeVars["--store-radius"]).toBe("12px");

    const shopVars = resolvePageStyleVars(resolved, "shop");
    expect(shopVars).toEqual(homeVars);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. تطبيق الـ6 Presets يغيّر CSS Variables بدقة
  // ─────────────────────────────────────────────────────────────
  it("Criterion 2: All 6 art direction presets apply correct accent, font, density, and radius", () => {
    expect(PAGE_STYLE_PRESETS).toHaveLength(6);

    const presetMap = new Map(PAGE_STYLE_PRESETS.map((p) => [p.id, p]));
    expect(presetMap.has("editorial")).toBe(true);
    expect(presetMap.has("bold")).toBe(true);
    expect(presetMap.has("minimal")).toBe(true);
    expect(presetMap.has("dark-luxe")).toBe(true);
    expect(presetMap.has("loud")).toBe(true);
    expect(presetMap.has("calm")).toBe(true);

    // Test editorial (airy, serif, 4px)
    const editorial = presetMap.get("editorial")!;
    const editorialVars = resolvePageStyleVars(undefined, "home", {
      preset: editorial.id,
      accent: editorial.accent,
      fontFamily: editorial.fontFamily,
      density: editorial.density,
      radius: editorial.radius,
    });
    expect(editorialVars["--store-accent"]).toBe(editorial.accent);
    expect(editorialVars["--store-font-family"]).toBe(editorial.fontFamily);
    expect(editorialVars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.airy);
    expect(editorialVars["--store-radius"]).toBe("4px");

    // Test bold (normal, sharp 0px, neon lime)
    const bold = presetMap.get("bold")!;
    const boldVars = resolvePageStyleVars(undefined, "shop", {
      preset: bold.id,
      accent: bold.accent,
      fontFamily: bold.fontFamily,
      density: bold.density,
      radius: bold.radius,
    });
    expect(boldVars["--store-accent"]).toBe(bold.accent);
    expect(boldVars["--store-radius"]).toBe("0px");
    expect(boldVars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.normal);

    // Test minimal (compact, 8px, royal blue)
    const minimal = presetMap.get("minimal")!;
    const minimalVars = resolvePageStyleVars(undefined, "pdp", {
      preset: minimal.id,
      accent: minimal.accent,
      density: minimal.density,
      radius: minimal.radius,
    });
    expect(minimalVars["--store-accent"]).toBe(minimal.accent);
    expect(minimalVars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.compact);
    expect(minimalVars["--store-radius"]).toBe("8px");

    // Test dark-luxe (normal, 12px, gold)
    const darkLuxe = presetMap.get("dark-luxe")!;
    const darkLuxeVars = resolvePageStyleVars(undefined, "cart", {
      preset: darkLuxe.id,
      accent: darkLuxe.accent,
      radius: darkLuxe.radius,
    });
    expect(darkLuxeVars["--store-accent"]).toBe(darkLuxe.accent);
    expect(darkLuxeVars["--store-radius"]).toBe("12px");

    // Test loud (compact, 16px, red)
    const loud = presetMap.get("loud")!;
    const loudVars = resolvePageStyleVars(undefined, "sale", {
      preset: loud.id,
      accent: loud.accent,
      density: loud.density,
      radius: loud.radius,
    });
    expect(loudVars["--store-accent"]).toBe(loud.accent);
    expect(loudVars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.compact);
    expect(loudVars["--store-radius"]).toBe("16px");

    // Test calm (airy, 20px, turquoise)
    const calm = presetMap.get("calm")!;
    const calmVars = resolvePageStyleVars(undefined, "thank-you", {
      preset: calm.id,
      accent: calm.accent,
      density: calm.density,
      radius: calm.radius,
    });
    expect(calmVars["--store-accent"]).toBe(calm.accent);
    expect(calmVars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.airy);
    expect(calmVars["--store-radius"]).toBe("20px");
  });

  // ─────────────────────────────────────────────────────────────
  // 3. الحفظ والتحميل من الـPUT Payload (Zombie-safe)
  // ─────────────────────────────────────────────────────────────
  it("Criterion 3: Saves and loads designTokens.pageStyles cleanly from PUT theme input", () => {
    const pageStyles: PageStylesMap = {
      home: {
        preset: "editorial",
        accent: "#8B5E3C",
        fontFamily: "'Amiri', serif",
        density: "airy",
        radius: 4,
      },
      pdp: {
        preset: "dark-luxe",
        accent: "#D4AF37",
        radius: 12,
      },
    };

    // Case A: Inside designTokens.pageStyles
    const themeInputA = {
      themeId: "modern-minimal",
      designTokens: {
        pageStyles,
      },
    };
    const extractedA = extractPageStyles(themeInputA);
    expect(extractedA.home.accent).toBe("#8B5E3C");
    expect(extractedA.pdp.accent).toBe("#D4AF37");

    const resolvedA = resolveStorefrontTheme(themeInputA);
    expect((resolvedA as any).pageStyles).toBeDefined();
    expect((resolvedA.pages.home as any).pageStyle.preset).toBe("editorial");
    expect((resolvedA.pages.pdp as any).pageStyle.preset).toBe("dark-luxe");

    // Case B: Inside settings.designTokens.pageStyles (nested backend format)
    const themeInputB = {
      settings: {
        themeId: "modern-minimal",
        designTokens: {
          pageStyles,
        },
      },
    };
    const extractedB = extractPageStyles(themeInputB);
    expect(extractedB.home.accent).toBe("#8B5E3C");
    expect(extractedB.pdp.radius).toBe(12);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. استقلالية الطابع لكل صفحة (Zero Blast Radius)
  // ─────────────────────────────────────────────────────────────
  it("Criterion 4: Each page scope is strictly independent with zero bleed across other pages", () => {
    const theme = resolveStorefrontTheme({
      themeId: "modern-minimal",
      designTokens: {
        colors: {
          accent: "#2563eb",
        },
        pageStyles: {
          home: {
            preset: "bold",
            accent: "#CCFF00",
            density: "normal",
            radius: 0,
          },
          shop: {
            preset: "calm",
            accent: "#0D9488",
            density: "airy",
            radius: 20,
          },
        },
      },
    });

    const homeVars = resolvePageStyleVars(theme, "home");
    expect(homeVars["--store-accent"]).toBe("#CCFF00");
    expect(homeVars["--store-radius"]).toBe("0px");

    const shopVars = resolvePageStyleVars(theme, "shop");
    expect(shopVars["--store-accent"]).toBe("#0D9488");
    expect(shopVars["--store-radius"]).toBe("20px");
    expect(shopVars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.airy);

    // Untouched pages (e.g. pdp, cart, checkout) retain global theme defaults
    const pdpVars = resolvePageStyleVars(theme, "pdp");
    expect(pdpVars["--store-accent"]).toBe("#2563eb");
    expect(pdpVars["--store-radius"]).not.toBe("0px");
    expect(pdpVars["--store-radius"]).not.toBe("20px");

    const checkoutVars = resolvePageStyleVars(theme, "checkout");
    expect(checkoutVars["--store-accent"]).toBe("#2563eb");
  });

  // ─────────────────────────────────────────────────────────────
  // 5. إعادة ضبط الطابع يستعيد الثيم الافتراضي
  // ─────────────────────────────────────────────────────────────
  it("Criterion 5: Resetting page style removes scoped overrides and reverts cleanly to theme default", () => {
    const themeWithCustomHome = resolveStorefrontTheme({
      themeId: "modern-minimal",
      designTokens: {
        colors: { accent: "#3b82f6" },
        pageStyles: {
          home: {
            accent: "#CCFF00",
            radius: 0,
          },
        },
      },
    });

    expect(resolvePageStyleVars(themeWithCustomHome, "home")["--store-accent"]).toBe("#CCFF00");

    // After reset: delete 'home' from pageStyles
    const resetTheme = resolveStorefrontTheme({
      themeId: "modern-minimal",
      designTokens: {
        colors: { accent: "#3b82f6" },
        pageStyles: {},
      },
    });

    const resetHomeVars = resolvePageStyleVars(resetTheme, "home");
    expect(resetHomeVars["--store-accent"]).toBe("#3b82f6");
    expect(resetHomeVars["--store-radius"]).toBe(resetTheme.tokens.shape.borderRadius);
  });

  // ─────────────────────────────────────────────────────────────
  // 6. مرونة الـFallback عند تحديد خصائص جزئية
  // ─────────────────────────────────────────────────────────────
  it("Criterion 6: Partial overrides fallback safely to theme defaults without crash or undefined", () => {
    const partialTheme = resolveStorefrontTheme({
      themeId: "modern-minimal",
      designTokens: {
        colors: { accent: "#10b981", primary: "#047857" },
        typography: { bodyFont: "'Cairo', sans-serif" },
        shape: { borderRadius: "10px" },
        pageStyles: {
          home: {
            // Only density is defined, accent/font/radius are undefined
            density: "compact",
          },
        },
      },
    });

    const vars = resolvePageStyleVars(partialTheme, "home");
    expect(vars["--store-density-gap"]).toBe(PAGE_STYLE_DENSITY_GAPS.compact);
    // Fallbacks
    expect(vars["--store-accent"]).toBe("#10b981");
    expect(vars["--store-font-family"]).toBe("'Cairo', sans-serif");
    expect(vars["--store-radius"]).toBe("10px");
  });

  // ─────────────────────────────────────────────────────────────
  // 7. واجهة المستخدم: زر «طابع الصفحة» في الـTopBar والـPopover
  // ─────────────────────────────────────────────────────────────
  it("Criterion 7: StudioPageStylePopover renders in StudioTopBar with 6 preset cards and triggers callbacks", () => {
    const onApplyPreset = vi.fn();
    const onUpdateStyle = vi.fn();
    const onResetStyle = vi.fn();

    const { unmount } = render(
      <StudioTopBar
        themeName="Modern Minimal"
        activePageKey="home"
        deviceMode="desktop"
        hasPendingChanges={false}
        canUndo={false}
        canRedo={false}
        saving={false}
        onBack={vi.fn()}
        onPageChange={vi.fn()}
        onDeviceChange={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onSave={vi.fn()}
        onOpenPreview={vi.fn()}
        pageStyle={{
          preset: "editorial",
          accent: "#8B5E3C",
          density: "airy",
          radius: 4,
        }}
        onApplyPageStylePreset={onApplyPreset}
        onUpdatePageStyle={onUpdateStyle}
        onResetPageStyle={onResetStyle}
      />
    );

    // 1. Trigger button is visible in TopBar
    const triggerBtn = screen.getByTestId("page-style-scope-btn");
    expect(triggerBtn).toBeTruthy();
    expect(screen.getByText("طابع الصفحة")).toBeTruthy();

    // 2. Click to open popover
    fireEvent.click(triggerBtn);

    const popover = screen.getByTestId("page-style-popover");
    expect(popover).toBeTruthy();

    // 3. All 6 preset cards are rendered
    PAGE_STYLE_PRESETS.forEach((preset) => {
      expect(screen.getByTestId(`preset-card-${preset.id}`)).toBeTruthy();
    });

    // 4. Click a preset card (e.g. bold)
    const boldCard = screen.getByTestId("preset-card-bold");
    fireEvent.click(boldCard);
    expect(onApplyPreset).toHaveBeenCalledWith("bold");

    // 5. Density button click
    const compactBtn = screen.getByTestId("density-btn-compact");
    fireEvent.click(compactBtn);
    expect(onUpdateStyle).toHaveBeenCalledWith({ density: "compact", preset: undefined });

    // 6. Reset button click
    const resetBtn = screen.getByTestId("page-style-reset-btn");
    fireEvent.click(resetBtn);
    expect(onResetStyle).toHaveBeenCalledTimes(1);

    unmount();
  });
});
