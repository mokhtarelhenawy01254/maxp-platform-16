import { describe, expect, it } from "vitest";
import {
  cleanStorefrontSectionSettings,
  getStorefrontSectionFieldDisplayValue,
} from "../utils/structuredSectionFields";

describe("structured section field utilities", () => {
  it("preserves non-empty arrays and objects when cleaning section settings", () => {
    expect(
      cleanStorefrontSectionSettings({
        title: "Smart Bazaar",
        limit: 4,
        enabled: true,
        items: [{ title: "وصل جديد", subtitle: "منتجات جديدة", link: "/shop" }],
        profileChip: { name: "Support" },
        emptyArray: [],
        emptyObject: {},
        blank: "   ",
      }),
    ).toEqual({
      title: "Smart Bazaar",
      limit: 4,
      enabled: true,
      items: [{ title: "وصل جديد", subtitle: "منتجات جديدة", link: "/shop" }],
      profileChip: { name: "Support" },
    });
  });

  it("serializes structured section arrays for textarea editors", () => {
    expect(
      getStorefrontSectionFieldDisplayValue(
        {
          items: [
            {
              eyebrow: "وصل جديد",
              title: "أساسيات يومية",
              subtitle: "منتجات سريعة الدوران",
              link: "/shop?sort=newest",
              tone: "primary",
              chip: "جديد",
            },
          ],
          cards: [
            {
              label: "كتلة عرض",
              title: "الأكثر طلبًا",
              subtitle: "منتجات تحتاج ظهورًا أعلى",
              ctaText: "شاهد المنتجات",
              link: "/shop",
              tone: "primary",
              stat: "الأكثر طلبًا",
            },
          ],
          collections: [
            {
              title: "أساسيات يومية",
              subtitle: "منتجات تتكرر يوميًا",
              image: "/assets/themes/smart-bazaar/daily.png",
              link: "/shop?sort=popular",
            },
          ],
        },
        "items",
      ),
    ).toContain("وصل جديد|أساسيات يومية|منتجات سريعة الدوران|/shop?sort=newest|primary|جديد");

    expect(
      getStorefrontSectionFieldDisplayValue(
        {
          cards: [
            {
              label: "كتلة عرض",
              title: "الأكثر طلبًا",
              subtitle: "منتجات تحتاج ظهورًا أعلى",
              ctaText: "شاهد المنتجات",
              link: "/shop",
              tone: "primary",
              stat: "الأكثر طلبًا",
            },
          ],
        },
        "cards",
      ),
    ).toContain("كتلة عرض|الأكثر طلبًا|منتجات تحتاج ظهورًا أعلى|شاهد المنتجات|/shop|primary|الأكثر طلبًا");

    expect(
      getStorefrontSectionFieldDisplayValue(
        {
          collections: [
            {
              title: "أساسيات يومية",
              subtitle: "منتجات تتكرر يوميًا",
              image: "/assets/themes/smart-bazaar/daily.png",
              link: "/shop?sort=popular",
            },
          ],
        },
        "collections",
      ),
    ).toContain("أساسيات يومية|منتجات تتكرر يوميًا|/assets/themes/smart-bazaar/daily.png|/shop?sort=popular");
  });
});
