import { describe, expect, it } from "vitest";
import {
  parseCategoryLookbookCards,
  parseSizeGuideOverrides,
  parseSizeGuideRows,
  resolveSizeGuideOverrideForProduct,
  resolveSizeGuideRowsForProduct,
} from "../utils/dynamicSectionContent";

describe("dynamic storefront section content", () => {
  it("parses category lookbook cards from textarea-friendly lines", () => {
    expect(
      parseCategoryLookbookCards(
        [
          "heels|من المكتب إلى العشاء|كعب مريح للمشاوير الطويلة|ستايل يومي|/heel.png|/shop?category=heels",
          "sandals|نهار خفيف|صندل سريع للحركة|Summer|/sandal.png|/shop?category=sandals",
        ].join("\n"),
      ),
    ).toEqual([
      {
        categoryKey: "heels",
        title: "من المكتب إلى العشاء",
        subtitle: "كعب مريح للمشاوير الطويلة",
        mood: "ستايل يومي",
        image: "/heel.png",
        link: "/shop?category=heels",
      },
      {
        categoryKey: "sandals",
        title: "نهار خفيف",
        subtitle: "صندل سريع للحركة",
        mood: "Summer",
        image: "/sandal.png",
        link: "/shop?category=sandals",
      },
    ]);
  });

  it("resolves size guide rows and overrides with product match first, then category, then default", () => {
    const rows = parseSizeGuideRows(
      [
        "default|36|3|5|22.5",
        "default|37|4|6|23.2",
        "category:heels|36|3|5|22.2",
        "category:heels|37|4|6|22.9",
        "product:crystal-heel|36|3|5|22.0",
      ].join("\n"),
    );
    const overrides = parseSizeGuideOverrides(
      [
        "default|دليل المقاسات|اختيار أسرع للمقاس|اختاري الأكبر لو كنتِ بين مقاسين",
        "category:heels|مقاسات الكعب|هذا الموديل أقرب للمقدمة المدببة|يناسب القدم المتوسطة",
        "product:crystal-heel|Crystal Heel Fit|هذا الموديل أضيق قليلًا|ننصح بالمقاس الأكبر غالبًا",
      ].join("\n"),
    );
    const product = {
      id: "sale-heel",
      slug: "crystal-heel",
      name: "Crystal Heel",
      description: "",
      price: 1200,
      images: [],
      categoryId: "heels",
      category: { id: "heels", name: "Heels" },
    };

    expect(resolveSizeGuideRowsForProduct(rows, product)).toEqual([
      {
        target: "product:crystal-heel",
        eu: "36",
        uk: "3",
        us: "5",
        cm: "22.0",
      },
    ]);

    expect(resolveSizeGuideOverrideForProduct(overrides, product)).toEqual({
      target: "product:crystal-heel",
      title: "Crystal Heel Fit",
      subtitle: "هذا الموديل أضيق قليلًا",
      note: "ننصح بالمقاس الأكبر غالبًا",
    });
  });
});
