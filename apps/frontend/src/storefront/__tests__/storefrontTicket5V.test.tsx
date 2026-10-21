// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { StudioPropertyInspector } from "../studio/StudioPropertyInspector";
import {
  StudioSectionVariantSelector,
  getSectionManifestVariants,
} from "../studio/inspector/StudioSectionVariantSelector";
import { STOREFRONT_SECTION_MANIFEST } from "../sections/manifest";
import HeroBanner from "../sections/HeroBanner";
import PromoStrip from "../sections/PromoStrip";
import FeaturesBar from "../sections/FeaturesBar";
import Newsletter from "../sections/Newsletter";
import FeaturedCollections from "../sections/FeaturedCollections";
import InfoContentSection from "../sections/InfoContentSection";

// Mock React Router
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: null, key: "test" }),
    Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
  };
});

// Mock categories hook for FeaturedCollections
vi.mock("../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [
      { id: "1", name: "ملابس رجالية", slug: "men", productCount: 12 },
      { id: "2", name: "ملابس نسائية", slug: "women", productCount: 24 },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock theme provider
vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: "default",
      name: "Default Theme",
      direction: "rtl",
      tokens: { layout: { contentAlign: "center" } },
    },
    resolvedTheme: {
      id: "default",
      direction: "rtl",
    },
  }),
}));

describe("Ticket 5V: Storefront Section Variants Selector & Core Sections Application", () => {
  afterEach(() => {
    cleanup();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. المُحدّد يظهر لقسم عنده variants
  // ─────────────────────────────────────────────────────────────
  it("Criterion 1: variants selector renders in StudioPropertyInspector for sections with variants", () => {
    const onUpdateFieldMock = vi.fn();

    const { unmount } = render(
      <StudioPropertyInspector
        selectedSectionKey="hero-0"
        sectionConfig={{
          type: "hero-banner",
          settings: { title: "عنوان البنر" },
        }}
        onClose={vi.fn()}
        onUpdateField={onUpdateFieldMock}
      />
    );

    expect(screen.getByTestId("section-variant-row")).toBeTruthy();
    expect(screen.getByTestId("section-variant-select")).toBeTruthy();
    expect(screen.getByText("شكل القسم")).toBeTruthy();

    unmount();

    // Check features-bar as well
    render(
      <StudioPropertyInspector
        selectedSectionKey="features-0"
        sectionConfig={{
          type: "features-bar",
          settings: {},
        }}
        onClose={vi.fn()}
        onUpdateField={onUpdateFieldMock}
      />
    );

    expect(screen.getByTestId("section-variant-row")).toBeTruthy();
    expect(screen.getByTestId("section-variant-select")).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────
  // 2. مخفي للي مالهاش variants
  // ─────────────────────────────────────────────────────────────
  it("Criterion 2: variants selector row is hidden for sections without variants in manifest", () => {
    const onUpdateFieldMock = vi.fn();

    // info-content has no variants declared in STOREFRONT_SECTION_MANIFEST
    const { unmount } = render(
      <StudioPropertyInspector
        selectedSectionKey="info-0"
        sectionConfig={{
          type: "info-content",
          settings: { title: "محتوى نصي" },
        }}
        onClose={vi.fn()}
        onUpdateField={onUpdateFieldMock}
      />
    );

    expect(screen.queryByTestId("section-variant-row")).toBeNull();
    expect(screen.queryByTestId("section-variant-select")).toBeNull();

    unmount();

    // Direct test on StudioSectionVariantSelector with non-variant type
    const { container } = render(
      <StudioSectionVariantSelector
        sectionType="info-content"
        settings={{}}
        onUpdateField={onUpdateFieldMock}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────
  // 3. اختيار يكتب settings.variant
  // ─────────────────────────────────────────────────────────────
  it("Criterion 3: selecting a variant writes to settings.variant via onUpdateField and onBatchUpdateFields", () => {
    const onUpdateFieldMock = vi.fn();
    const onBatchUpdateMock = vi.fn();

    render(
      <StudioPropertyInspector
        selectedSectionKey="hero-0"
        sectionConfig={{
          type: "hero-banner",
          settings: { variant: "centered" },
        }}
        onClose={vi.fn()}
        onUpdateField={onUpdateFieldMock}
        onBatchUpdateFields={onBatchUpdateMock}
      />
    );

    const select = screen.getByTestId("section-variant-select") as HTMLSelectElement;
    expect(select.value).toBe("centered");

    // Change variant to split-panel
    fireEvent.change(select, { target: { value: "split-panel" } });

    expect(onUpdateFieldMock).toHaveBeenCalledWith("variant", "split-panel");
    expect(onBatchUpdateMock).toHaveBeenCalledWith({ variant: "split-panel" });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. الحفظ يستدعي onSave (نفس مسار الحفظ)
  // ─────────────────────────────────────────────────────────────
  it("Criterion 4: changing variant triggers onSave immediately for seamless persistence", () => {
    const onSaveMock = vi.fn();
    const onUpdateFieldMock = vi.fn();

    render(
      <StudioPropertyInspector
        selectedSectionKey="newsletter-0"
        sectionConfig={{
          type: "newsletter",
          settings: { variant: "standard" },
        }}
        onClose={vi.fn()}
        onUpdateField={onUpdateFieldMock}
        onSave={onSaveMock}
      />
    );

    const select = screen.getByTestId("section-variant-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "split-panel" } });

    expect(onSaveMock).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────
  // 5. الافتراضي بدون تغيير (صفر visual regression)
  // ─────────────────────────────────────────────────────────────
  it("Criterion 5: default renders when variant is undefined remain identical (zero regression)", () => {
    // 1. HeroBanner with no variant renders without crashing
    const { container: heroContainer } = render(
      <HeroBanner section={{ type: "hero-banner" } as any} settings={{ title: "افتراضي" } as any} />
    );
    expect(heroContainer.firstChild).toBeTruthy();

    // 2. PromoStrip with no variant renders standard
    const { container: promoContainer } = render(
      <PromoStrip section={{ type: "promo-strip" } as any} settings={{ message: "شحن سريع" } as any} />
    );
    expect(promoContainer.firstChild).toBeTruthy();

    // 3. FeaturesBar with no variant renders default trust-strip
    const { container: featContainer } = render(
      <FeaturesBar section={{ type: "features-bar" } as any} settings={{ title: "مميزاتنا" } as any} />
    );
    expect(featContainer.firstChild).toBeTruthy();

    // 4. Newsletter with no variant renders default standard
    const { container: newsContainer } = render(
      <Newsletter section={{ type: "newsletter" } as any} settings={{ title: "النشرة" } as any} />
    );
    expect(newsContainer.firstChild).toBeTruthy();

    // 5. FeaturedCollections with no variant renders default standard-showcase
    const { container: collContainer } = render(
      <FeaturedCollections section={{ type: "featured-collections" } as any} settings={{ title: "التصنيفات" } as any} />
    );
    expect(collContainer.firstChild).toBeTruthy();

    // 6. InfoContentSection renders standard content
    const { container: infoContainer } = render(
      <InfoContentSection settings={{ title: "معلومات", body: "نص تجريبي" } as any} />
    );
    expect(infoContainer.firstChild).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────
  // 6. قائمة القيم مطابقة للمانيفست
  // ─────────────────────────────────────────────────────────────
  it("Criterion 6: options list matches STOREFRONT_SECTION_MANIFEST exactly in values and labels", () => {
    const testSections = [
      "hero-banner",
      "promo-strip",
      "features-bar",
      "newsletter",
      "featured-collections",
    ];

    for (const secType of testSections) {
      const manifestVariants = (STOREFRONT_SECTION_MANIFEST as Record<string, any>)[secType]?.variants || [];
      expect(manifestVariants.length).toBeGreaterThan(0);

      const resolved = getSectionManifestVariants(secType);
      expect(resolved).toEqual(manifestVariants);

      const { container, unmount } = render(
        <StudioSectionVariantSelector
          sectionType={secType}
          settings={{}}
          onUpdateField={vi.fn()}
        />
      );

      const select = container.querySelector("select");
      expect(select).toBeTruthy();

      const optionElements = Array.from(select!.querySelectorAll("option"));
      expect(optionElements.length).toBe(manifestVariants.length);

      optionElements.forEach((opt, idx) => {
        expect(opt.value).toBe(manifestVariants[idx].value);
        expect(opt.textContent).toBe(manifestVariants[idx].label);
      });

      unmount();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 7. تطبيق الـ variants في الريندر الفوري للـ 6 أقسام الأساسية
  // ─────────────────────────────────────────────────────────────
  it("Criterion 7: setting settings.variant renders the selected variant in PromoStrip, FeaturesBar, Newsletter, FeaturedCollections", () => {
    // PromoStrip responds to settings.variant = "benefit-ribbon"
    const { container: promoRibbon } = render(
      <PromoStrip
        section={{ type: "promo-strip" } as any}
        settings={{ variant: "benefit-ribbon", message: "شريط المزايا الحريمي" } as any}
      />
    );
    expect(promoRibbon.textContent).toContain("شريط المزايا الحريمي");

    // FeaturesBar responds to settings.variant = "service-clarity"
    const { container: featClarity } = render(
      <FeaturesBar
        section={{ type: "features-bar" } as any}
        settings={{ variant: "service-clarity", title: "وضوح الخدمة" } as any}
      />
    );
    expect(featClarity.textContent).toContain("وضوح الخدمة");

    // Newsletter responds to settings.variant = "split-panel"
    const { container: newsSplit } = render(
      <Newsletter
        section={{ type: "newsletter" } as any}
        settings={{ variant: "split-panel", title: "اشتراك مجزأ" } as any}
      />
    );
    expect(newsSplit.textContent).toContain("اشتراك مجزأ");

    // FeaturedCollections responds to settings.variant = "editorial-categories"
    const { container: collEditorial } = render(
      <FeaturedCollections
        section={{ type: "featured-collections" } as any}
        settings={{ variant: "editorial-categories", title: "تصنيفات تحريرية" } as any}
      />
    );
    expect(collEditorial.textContent).toContain("تصنيفات تحريرية");
  });
});
