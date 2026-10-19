import {
  getAttrValue,
  normalizeText,
  getItemOptions,
  matchVariantByAttributes,
} from "./workspaceItemVariantHelpers";
import { WorkspaceOrderItem } from "./types";

describe("workspaceItemVariantHelpers", () => {
  it("normalizes Arabic text correctly", () => {
    expect(normalizeText("أحمد")).toBe("احمد");
    expect(normalizeText("إبراهيم")).toBe("ابراهيم");
    expect(normalizeText("عليّ")).toBe("علي");
    expect(normalizeText("فاطمة")).toBe("فاطمه");
  });

  it("extracts attribute value from metadata matching keys", () => {
    const meta = { color: "أحمر", size: "XL" };
    expect(getAttrValue(meta, ["اللون", "color"])).toBe("أحمر");
    expect(getAttrValue(meta, ["المقاس", "size"])).toBe("XL");
    expect(getAttrValue(null, ["color"])).toBeNull();
  });

  it("extracts available options from item and product variants", () => {
    const item: WorkspaceOrderItem = {
      id: "it-1",
      name: "تيشيرت قطن",
      quantity: 2,
      price: 150,
      total: 300,
      variants: [
        { id: "v-1", color: "أزرق", size: "L", price: 150 },
        { id: "v-2", color: "أسود", size: "M", price: 150 },
      ],
    };

    const options = getItemOptions(item, {});
    expect(options.colors).toContain("أزرق");
    expect(options.colors).toContain("أسود");
    expect(options.sizes).toContain("L");
    expect(options.sizes).toContain("M");
    expect(options.variants.length).toBe(2);
  });

  it("matches variant by attributes correctly", () => {
    const variants = [
      { id: "v-1", color: "أزرق", size: "L", price: 150 },
      { id: "v-2", color: "أسود", size: "M", price: 160 },
    ];

    const match = matchVariantByAttributes(variants, "أسود", "M");
    expect(match).toBeDefined();
    expect(match?.id).toBe("v-2");
    expect(match?.price).toBe(160);

    const noMatch = matchVariantByAttributes(variants, "أصفر", "XXL");
    expect(noMatch).toBeUndefined();
  });
});
