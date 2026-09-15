import { describe, it, expect } from "vitest";
import {
  SIDEBAR_ITEMS,
  LANDING_TEMPLATES,
  exportLandingPageToJson,
  importLandingPageFromJson,
  buildDefaultSectionsForProduct,
} from "../types";

describe("Product Landing Builder - Full EasyOrders Parity Tests", () => {
  const mockProduct = {
    id: "prod-test-1",
    name: "حذاء طبي مريح سوان",
    price: 499,
    comparePrice: 750,
    mainImage: "https://example.com/shoe.jpg",
    images: ["https://example.com/shoe.jpg", "https://example.com/shoe2.jpg"],
    description: "حذاء طبي مريح جداً",
  };

  it("should contain all EasyOrders and MaxP section types in SIDEBAR_ITEMS", () => {
    const types = SIDEBAR_ITEMS.map((item) => item.type);

    // Core EasyOrders parity section types
    expect(types).toContain("IMAGE_ONLY");
    expect(types).toContain("CAROUSEL");
    expect(types).toContain("HOW_IT_WORKS");
    expect(types).toContain("FEATURED_PRODUCT");
    expect(types).toContain("YOUTUBE_VIDEO");
    expect(types).toContain("BUY_BUTTON");
    expect(types).toContain("HEADING");
    expect(types).toContain("BANNERS");
    expect(types).toContain("MEDIA");
    expect(types).toContain("FORM");
    expect(types).toContain("REVIEWS");
    expect(types).toContain("FAQ");
    expect(types).toContain("COUNTDOWN");
    expect(types).toContain("HTML");

    // MaxP Enhanced CRO section types
    expect(types).toContain("BEFORE_AFTER");
    expect(types).toContain("BREAKDOWN");
    expect(types).toContain("COMPARISON");
    expect(types).toContain("LIVE_PROOF");
  });

  it("should categorize sections into 4 logical groups", () => {
    const categories = new Set(SIDEBAR_ITEMS.map((item) => item.category));
    expect(categories.has("media")).toBe(true);
    expect(categories.has("commerce")).toBe(true);
    expect(categories.has("content")).toBe(true);
    expect(categories.has("trust")).toBe(true);
  });

  it("should build sections correctly using pre-made templates", () => {
    expect(LANDING_TEMPLATES.length).toBeGreaterThanOrEqual(4);

    for (const template of LANDING_TEMPLATES) {
      const sections = template.buildSections(mockProduct);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections.every((s) => s.id && s.type && s.title)).toBe(true);

      // Verify a form is included in every sales template
      const hasForm = sections.some((s) => s.type === "FORM");
      expect(hasForm).toBe(true);
    }
  });

  it("should build default sections for a product", () => {
    const sections = buildDefaultSectionsForProduct(mockProduct);
    expect(sections.length).toBeGreaterThan(3);
    expect(sections[0].type).toBe("MEDIA");
    expect(sections.some((s) => s.type === "FEATURES")).toBe(true);
    expect(sections.some((s) => s.type === "FORM")).toBe(true);
  });

  it("should export and import MaxP landing page JSON cleanly (Round-trip)", () => {
    const originalSections = buildDefaultSectionsForProduct(mockProduct);
    const jsonStr = exportLandingPageToJson(
      "صفحة هبوط تجريبية",
      "test-landing-slug",
      originalSections,
      { buttonLabel: "اطلب الآن" },
    );

    expect(typeof jsonStr).toBe("string");
    expect(jsonStr).toContain("test-landing-slug");

    const imported = importLandingPageFromJson(jsonStr);
    expect(imported.title).toBe("صفحة هبوط تجريبية");
    expect(imported.slug).toBe("test-landing-slug");
    expect(imported.sections.length).toBe(originalSections.length);
    expect(imported.sections[0].type).toBe(originalSections[0].type);
  });

  it("should seamlessly import EasyOrders features array and map to MaxP sections", () => {
    // Simulated raw EasyOrders features array from swan.myeasyorders.com
    const easyOrdersFeatures = [
      {
        type: "banner",
        images: ["https://example.com/banner1.jpg", "https://example.com/banner2.jpg"],
      },
      {
        type: "img_only",
        image: "https://example.com/fullwidth.jpg",
        alt: "صورة مكبرة",
      },
      {
        type: "how-to-work",
        title: "خطوات الاستخدام",
        steps: [
          { number: 1, title: "الطلب", desc: "سجل بياناتك" },
          { number: 2, title: "الاستلام", desc: "عاين واستلم" },
        ],
      },
      {
        type: "buy_button",
        text: "شراء سريع الآن",
      },
    ];

    const imported = importLandingPageFromJson(JSON.stringify(easyOrdersFeatures));
    expect(imported.sections.length).toBe(4);

    expect(imported.sections[0].type).toBe("CAROUSEL");
    expect(imported.sections[1].type).toBe("IMAGE_ONLY");
    expect(imported.sections[2].type).toBe("HOW_IT_WORKS");
    expect(imported.sections[3].type).toBe("BUY_BUTTON");
  });

  it("should throw error or handle corrupted JSON gracefully", () => {
    expect(() => importLandingPageFromJson("invalid json {}")).toThrow();
  });

  it("should render ProductLandingHeader without ReferenceError on onOpenTemplatesModal", async () => {
    const { renderToString } = await import("react-dom/server");
    const React = await import("react");
    const { ProductLandingHeader } = await import("../ProductLandingHeader");

    const html = renderToString(
      React.createElement(ProductLandingHeader, {
        pages: [],
        selectedId: "test-id",
        onSelectPage: () => {},
        onRefresh: () => {},
        onSave: () => {},
        saving: false,
        onOpenCreateModal: () => {},
        onOpenTemplatesModal: () => {},
        onExportJson: () => {},
        onImportJson: () => {},
        onGenerateAi: () => {},
        generatingAi: false,
        previewUrl: "https://example.com",
        customerUrl: "https://example.com/p",
        onCopyUrl: () => {},
        onTogglePhonePreview: () => {},
        showPhonePreview: false,
        isDirty: false,
      })
    );

    expect(html).toContain("نماذج وقوالب");
    expect(html).toContain("تصدير JSON");
    expect(html).toContain("استيراد JSON");
  });
});

