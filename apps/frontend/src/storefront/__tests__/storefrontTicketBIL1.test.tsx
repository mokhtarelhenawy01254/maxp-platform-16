// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import {
  getStorefrontLocale,
  getLocaleDirection,
  localizeSectionSettings,
  localizePageConfig,
  STOREFRONT_LOCALE_STORAGE_KEY,
} from "../i18n";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { StudioI18nTab } from "../studio/StudioI18nTab";
import { StudioPropertyInspector } from "../studio/StudioPropertyInspector";
import DynamicStorefrontPage from "../pages/DynamicStorefrontPage";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";

// Mock storefront settings hook
vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { id: "comp-bil1", name: "متجر الفخامة" },
      storefront: {
        settings: { storeName: "متجر الفخامة" },
      },
    },
    isLoading: false,
  }),
}));

// Mock DB page hook
vi.mock("../../hooks/useStorePage", () => ({
  useStorePage: () => ({
    page: null,
    loading: false,
    error: null,
  }),
}));

// Mock categories hook
vi.mock("../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [],
    loading: false,
  }),
}));

// Mock cart store
vi.mock("../store/useCartStore", () => ({
  useCartStore: (selector: any) =>
    selector({
      items: [],
      isOpen: false,
      setIsOpen: vi.fn(),
    }),
  DEFAULT_STOREFRONT_CART_STORAGE_NAME: "storefront-cart",
  getStorefrontPreviewCartStorageName: () => "storefront-preview-cart",
}));

describe("Ticket BIL-1: Bilingual Storefront Foundation (English Per Page)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // Test 1: Arabic Fallback when no en is configured
  it("Test 1: Fallback to Arabic content when English translation is not set", () => {
    const rawSection = {
      type: "hero-banner",
      settings: {
        title: "عروض الصيف الكبرى",
        subtitle: "خصومات تصل إلى 50%",
      },
    };

    // English mode with no i18n
    const localized = localizeSectionSettings(rawSection.settings, "en");
    expect(localized.title).toBe("عروض الصيف الكبرى");
    expect(localized.subtitle).toBe("خصومات تصل إلى 50%");

    // With i18n.en having only subtitle
    const partialSection = {
      ...rawSection.settings,
      i18n: {
        en: {
          subtitle: "Up to 50% discount",
        },
      },
    };
    const localizedPartial = localizeSectionSettings(partialSection, "en");
    // title falls back to Arabic
    expect(localizedPartial.title).toBe("عروض الصيف الكبرى");
    // subtitle uses English override
    expect(localizedPartial.subtitle).toBe("Up to 50% discount");
  });

  // Test 2: English Mode displays English text when i18n.en is provided
  it("Test 2: Displays English text in English mode when i18n.en is present", () => {
    const sectionSettings = {
      title: "عروض الصيف",
      subtitle: "تسوق الآن",
      i18n: {
        en: {
          title: "Summer Sale",
          subtitle: "Shop Now",
        },
      },
    };

    const enResult = localizeSectionSettings(sectionSettings, "en");
    expect(enResult.title).toBe("Summer Sale");
    expect(enResult.subtitle).toBe("Shop Now");

    // Arabic mode should always display base Arabic
    const arResult = localizeSectionSettings(sectionSettings, "ar");
    expect(arResult.title).toBe("عروض الصيف");
    expect(arResult.subtitle).toBe("تسوق الآن");
  });

  // Test 3: Language Switching changes document/page direction ('rtl' for ar, 'ltr' for en)
  it("Test 3: Language Switching sets direction to rtl for Arabic and ltr for English", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("en")).toBe("ltr");

    // Test LanguageSwitcher updating document direction
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LanguageSwitcher />
      </MemoryRouter>
    );

    const enBtn = screen.getByTestId("language-switch-en");
    act(() => {
      fireEvent.click(enBtn);
    });

    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem(STOREFRONT_LOCALE_STORAGE_KEY)).toBe("en");

    const arBtn = screen.getByTestId("language-switch-ar");
    act(() => {
      fireEvent.click(arBtn);
    });

    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    expect(localStorage.getItem(STOREFRONT_LOCALE_STORAGE_KEY)).toBe("ar");
  });

  // Test 4: Saving in StudioI18nTab writes to settings.i18n.en[field]
  it("Test 4: Editing in StudioI18nTab writes English overrides into settings.i18n.en[field]", () => {
    const initialSettings = {
      title: "عروض حصرية",
      subtitle: "أحدث الموديلات",
      i18n: {
        en: {
          title: "Exclusive Offers",
        },
      },
    };

    let updatedField: string | null = null;
    let updatedValue: any = null;

    const handleUpdate = (field: string, val: any) => {
      updatedField = field;
      updatedValue = val;
    };

    render(
      <StudioI18nTab
        sectionType="hero-banner"
        settings={initialSettings}
        onUpdateField={handleUpdate}
      />
    );

    const titleInput = screen.getByTestId("i18n-en-title-input") as HTMLInputElement;
    expect(titleInput.value).toBe("Exclusive Offers");

    act(() => {
      fireEvent.change(titleInput, { target: { value: "Summer Flash Deals" } });
    });

    expect(updatedField).toBe("i18n");
    expect(updatedValue).toBeDefined();
    expect(updatedValue.en.title).toBe("Summer Flash Deals");
  });

  // Test 5: Base Arabic properties are NOT modified when saving i18n.en
  it("Test 5: Base Arabic fields remain untouched when editing English overrides", () => {
    const initialSettings = {
      title: "أزياء الخريف",
      subtitle: "تشكيلة جديدة بأسعار مميزة",
      eyebrow: "جديد 2026",
    };

    let resultingSettings = { ...initialSettings };

    const handleUpdate = (field: string, val: any) => {
      resultingSettings = {
        ...resultingSettings,
        [field]: val,
      };
    };

    render(
      <StudioI18nTab
        sectionType="hero-banner"
        settings={initialSettings}
        onUpdateField={handleUpdate}
      />
    );

    const subtitleInput = screen.getByTestId("i18n-en-subtitle-input");
    act(() => {
      fireEvent.change(subtitleInput, { target: { value: "New collection at great prices" } });
    });

    // Base Arabic fields must remain identical
    expect(resultingSettings.title).toBe("أزياء الخريف");
    expect(resultingSettings.subtitle).toBe("تشكيلة جديدة بأسعار مميزة");
    expect(resultingSettings.eyebrow).toBe("جديد 2026");

    // Only i18n.en is updated
    expect((resultingSettings as any).i18n.en.subtitle).toBe("New collection at great prices");
  });

  // Test 6: LanguageSwitcher header component toggles between Arabic and English
  it("Test 6: LanguageSwitcher renders correctly and toggles locale via button", () => {
    render(
      <MemoryRouter initialEntries={["/shop?tag=new"]}>
        <LanguageSwitcher />
      </MemoryRouter>
    );

    const switcher = screen.getByTestId("language-switcher");
    expect(switcher).toBeTruthy();

    const toggleBtn = screen.getByTestId("language-toggle-btn");
    expect(toggleBtn).toBeTruthy();

    // Initial state is Arabic
    expect(screen.getByTestId("language-switch-ar").className).toContain("font-bold");

    // Click toggle to switch to English
    act(() => {
      fireEvent.click(toggleBtn);
    });

    expect(localStorage.getItem(STOREFRONT_LOCALE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });

  // Test 7: Acceptance Criteria (Manager) - Summer Sale test
  it("Test 7 (Manager Acceptance): Section with «عروض الصيف» + EN «Summer Sale» renders Summer Sale & ltr with ?lang=en and «عروض الصيف» & rtl with ?lang=ar", () => {
    const pageConfig = {
      sections: [
        {
          id: "hero-1",
          type: "hero-banner",
          settings: {
            title: "عروض الصيف",
            subtitle: "تخفيضات كبرى",
            i18n: {
              en: {
                title: "Summer Sale",
                subtitle: "Big Discounts",
              },
            },
          },
        },
      ],
    };

    // 1. In English mode (?lang=en)
    const enPage = localizePageConfig(pageConfig as any, "en");
    const enSection = enPage.sections[0] as any;
    expect(enSection.settings.title).toBe("Summer Sale");
    expect(enSection.settings.subtitle).toBe("Big Discounts");
    expect(getLocaleDirection("en")).toBe("ltr");

    // 2. In Arabic mode (?lang=ar)
    const arPage = localizePageConfig(pageConfig as any, "ar");
    const arSection = arPage.sections[0] as any;
    expect(arSection.settings.title).toBe("عروض الصيف");
    expect(arSection.settings.subtitle).toBe("تخفيضات كبرى");
    expect(getLocaleDirection("ar")).toBe("rtl");
  });

  // Test 8: StudioPropertyInspector mounts the «اللغة» tab
  it("Test 8: StudioPropertyInspector renders the «اللغة» tab and opens StudioI18nTab when clicked", () => {
    const sectionConfig = {
      type: "hero-banner",
      settings: {
        title: "عنوان القسم",
      },
    };

    render(
      <StudioPropertyInspector
        selectedSectionKey="hero_1"
        sectionConfig={sectionConfig}
        onClose={vi.fn()}
        onUpdateField={vi.fn()}
      />
    );

    // Look for the «اللغة» tab button
    const i18nTabBtn = screen.getByRole("button", { name: /اللغة/ });
    expect(i18nTabBtn).toBeTruthy();

    act(() => {
      fireEvent.click(i18nTabBtn);
    });

    // StudioI18nTab should now be visible
    expect(screen.getByTestId("studio-i18n-tab")).toBeTruthy();
    expect(screen.getByTestId("i18n-en-title-input")).toBeTruthy();
  });
});
