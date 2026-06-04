import { describe, expect, it } from "vitest";
import { validateStorefrontPageOverrides } from "../utils/pageOverrideValidation";

describe("validateStorefrontPageOverrides", () => {
  it("flags unknown sections and sections attached to unsupported pages", () => {
    const result = validateStorefrontPageOverrides({
      overrides: {
        cart: {
          sections: [
            "mystery-section",
            "product-gallery",
          ],
        },
      },
    });

    expect(result.errorCount).toBe(2);
    expect(result.warningCount).toBe(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "section_unknown",
          severity: "error",
          pageKey: "cart",
          sectionType: "mystery-section",
          fieldKey: "type",
        }),
        expect.objectContaining({
          code: "section_unsupported_page",
          severity: "error",
          pageKey: "cart",
          sectionType: "product-gallery",
          fieldKey: "type",
        }),
      ]),
    );
  });

  it("flags incomplete lookbook cards and unknown categories", () => {
    const result = validateStorefrontPageOverrides({
      overrides: {
        home: {
          sections: [
            {
              type: "lookbook-showcase",
              settings: {
                categoryCards: "missing-category|Night Edit|||",
              },
            },
          ],
        },
      },
      categories: [{ id: "heels", name: "Heels", slug: "heels" }],
    });

    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(1);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "lookbook_missing_required",
          severity: "error",
          pageKey: "home",
          sectionType: "lookbook-showcase",
          fieldKey: "categoryCards",
          itemIndex: 0,
        }),
        expect.objectContaining({
          code: "lookbook_unknown_category",
          severity: "warning",
          pageKey: "home",
          sectionType: "lookbook-showcase",
          fieldKey: "categoryCards",
          itemIndex: 0,
          message: expect.stringContaining("غير موجود"),
        }),
      ]),
    );
  });

  it("blocks duplicate size guide rows and override targets while warning on missing references", () => {
    const result = validateStorefrontPageOverrides({
      overrides: {
        pdp: {
          sections: [
            {
              type: "size-guide",
              settings: {
                guideRows: [
                  "product:ghost-pair|39|6|8|24.4",
                  "product:ghost-pair|39|6|8|24.4",
                ].join("\n"),
                guideOverrides: [
                  "product:ghost-pair|Ghost Pair Fit|Missing product|Handle with care",
                  "product:ghost-pair|Second Ghost Fit|Duplicate target|Same product again",
                ].join("\n"),
              },
            },
          ],
        },
      },
      categories: [{ id: "heels", name: "Heels", slug: "heels" }],
      products: [{ id: "prod-1", name: "Crystal Heel", slug: "crystal-heel" }],
    });

    expect(result.errorCount).toBe(2);
    expect(result.warningCount).toBe(4);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "size_guide_row_duplicate_size",
          severity: "error",
          pageKey: "pdp",
          sectionType: "size-guide",
          fieldKey: "guideRows",
          itemIndex: 1,
          message: expect.stringContaining("مكرر"),
        }),
        expect.objectContaining({
          code: "size_guide_override_duplicate_target",
          severity: "error",
          pageKey: "pdp",
          sectionType: "size-guide",
          fieldKey: "guideOverrides",
          itemIndex: 1,
          message: expect.stringContaining("أكثر من تخصيص"),
        }),
        expect.objectContaining({
          code: "size_guide_unknown_product_target",
          severity: "warning",
          pageKey: "pdp",
          sectionType: "size-guide",
          fieldKey: "guideRows",
          itemIndex: 0,
          message: expect.stringContaining("لا يطابق أي منتج"),
        }),
      ]),
    );
  });
});
