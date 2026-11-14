// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  resolveDynamicValue,
  resolveDynamicSettings,
  type DynamicContext,
} from "../studio/utils/dynamicValues";
import {
  evaluateDisplayConditions,
  parseConditionString,
} from "../studio/utils/displayConditions";
import { StorefrontSectionFrame } from "../layout/StorefrontSectionFrame";
import { StudioInspectorContentTab } from "../studio/inspector/StudioInspectorContentTab";
import { formatStorefrontCurrency } from "../utils/currency";

// Mock useStorefrontTheme to provide minimal context
vi.mock("../engine/ThemeProvider", () => ({
  useStorefrontTheme: () => ({
    theme: { id: "default", name: "Default Theme" },
    pageStyleVars: {},
  }),
}));

vi.mock("../hooks/useCurrentBreakpoint", () => ({
  useCurrentBreakpoint: () => "desktop",
}));

describe("Ticket DYN-1: Dynamic tags + شروط عرض", () => {
  // ─────────────────────────────────────────────────────────────────
  // Part 1: resolveDynamicValue (≥5 cases)
  // ─────────────────────────────────────────────────────────────────
  describe("1. Dynamic Token Resolution (resolveDynamicValue)", () => {
    it("Case 1 (حالة رقمية): price = 250 وعملة ج.م -> {{product.priceFormatted}} = '250 ج.م'", () => {
      const ctx: DynamicContext = {
        product: {
          title: "تيشيرت قطني",
          price: 250,
        },
        currency: "ج.م",
      };

      const result = resolveDynamicValue("{{product.priceFormatted}}", ctx);
      expect(result).toBe("250 ج.م");

      // Verify that direct util call formatStorefrontCurrency also yields the identical output
      const directUtilResult = formatStorefrontCurrency(250, "ج.م");
      expect(directUtilResult).toBe("250 ج.م");
      expect(result).toBe(directUtilResult);
    });

    it("Case 2: توكن مجهول {{foo.bar}} -> '' (assert) — والاختبار السلبي: لو رجع undefined الاختبار يفشل", () => {
      const ctx: DynamicContext = {
        product: {
          title: "منتج تجريبي",
          price: 100,
        },
      };

      const result = resolveDynamicValue("{{foo.bar}}", ctx);

      // Strict assertions: must be empty string "", NEVER undefined, null, or "undefined"
      expect(result).toBe("");
      expect(result).not.toBeUndefined();
      expect(result).not.toBeNull();
      expect(result).not.toBe("undefined");
      expect(result).not.toBe("null");
      expect(result).not.toBe("NaN");

      // Negative check: ensure result !== undefined
      const isUndefined = result === undefined;
      expect(isUndefined).toBe(false);
    });

    it("Case 3: All product tokens resolve accurately", () => {
      const ctx: DynamicContext = {
        product: {
          title: "قميص كتان بيج",
          description: "وصف قميص كتان مريح وعصري",
          price: 450,
          compareAtPrice: 600,
          stock: 15,
          image: "https://swan.com/images/shirt.jpg",
        },
        item: {
          title: "عنصر loop",
          description: "وصف عنصر loop",
        },
        currency: "EGP",
        locale: "ar-EG",
      };

      expect(resolveDynamicValue("{{product.title}}", ctx)).toBe("قميص كتان بيج");
      expect(resolveDynamicValue("{{product.description}}", ctx)).toBe("وصف قميص كتان مريح وعصري");
      expect(resolveDynamicValue("{{item.description}}", ctx)).toBe("وصف عنصر loop");
      expect(resolveDynamicValue("{{product.price}}", ctx)).toBe("450");
      expect(resolveDynamicValue("{{product.priceFormatted}}", ctx)).toBe("450 ج.م");
      expect(resolveDynamicValue("{{product.compareAtPrice}}", ctx)).toBe("600");
      expect(resolveDynamicValue("{{product.stock}}", ctx)).toBe("15");
      expect(resolveDynamicValue("{{product.image}}", ctx)).toBe("https://swan.com/images/shirt.jpg");
    });

    it("Case 4: Collection, page, and store tokens resolve accurately", () => {
      const ctx: DynamicContext = {
        collection: {
          name: "مجموعة صيف 2026",
          count: 38,
        },
        page: {
          title: "العروض الحصرية",
        },
        store: {
          name: "سوان ستور",
        },
      };

      expect(resolveDynamicValue("{{collection.name}}", ctx)).toBe("مجموعة صيف 2026");
      expect(resolveDynamicValue("{{collection.count}}", ctx)).toBe("38");
      expect(resolveDynamicValue("{{page.title}}", ctx)).toBe("العروض الحصرية");
      expect(resolveDynamicValue("{{store.name}}", ctx)).toBe("سوان ستور");
    });

    it("Case 5: Custom tokens {{custom.<key>}} resolve appropriately", () => {
      const ctx: DynamicContext = {
        custom: {
          delivery_badge: "شحن مجاني للطلبات فوق 500",
          discount_code: "SUMMER50",
        },
      };

      expect(resolveDynamicValue("{{custom.delivery_badge}}", ctx)).toBe("شحن مجاني للطلبات فوق 500");
      expect(resolveDynamicValue("{{custom.discount_code}}", ctx)).toBe("SUMMER50");
      expect(resolveDynamicValue("{{custom.nonexistent}}", ctx)).toBe("");
    });

    it("Case 6: Mixed sentence interpolation with dynamic tokens", () => {
      const ctx: DynamicContext = {
        product: {
          title: "فستان حريري",
          price: 850,
        },
        store: {
          name: "بوتيك سوان",
          currency: "ج.م",
        },
      };

      const template = "اشتري {{product.title}} بسعر {{product.priceFormatted}} حصرياً من {{store.name}}!";
      const rendered = resolveDynamicValue(template, ctx);
      expect(rendered).toBe("اشتري فستان حريري بسعر 850 ج.م حصرياً من بوتيك سوان!");
    });

    it("Case 7: resolveDynamicSettings deeply resolves nested objects and arrays", () => {
      const ctx: DynamicContext = {
        product: {
          title: "حذاء رياضي",
          price: 300,
        },
        currency: "ج.م",
      };

      const settings = {
        title: "{{product.title}}",
        ctaText: "اشتر الآن مقابل {{product.priceFormatted}}",
        items: [
          { label: "اسم المنتج: {{product.title}}" },
          { label: "سعر الوحدة: {{product.price}}" },
        ],
      };

      const resolved = resolveDynamicSettings(settings, ctx);
      expect(resolved.title).toBe("حذاء رياضي");
      expect(resolved.ctaText).toBe("اشتر الآن مقابل 300 ج.م");
      expect(resolved.items[0].label).toBe("اسم المنتج: حذاء رياضي");
      expect(resolved.items[1].label).toBe("سعر الوحدة: 300");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Part 2: evaluateDisplayConditions (≥5 cases)
  // ─────────────────────────────────────────────────────────────────
  describe("2. Display Conditions Evaluation (evaluateDisplayConditions)", () => {
    it("Case 8: شرط فاضي -> ظاهر دايماً (assert)", () => {
      const ctx: DynamicContext = { product: { stock: 0 } };

      // Empty string, null, undefined, empty array, empty object
      expect(evaluateDisplayConditions("", ctx)).toBe(true);
      expect(evaluateDisplayConditions(null, ctx)).toBe(true);
      expect(evaluateDisplayConditions(undefined, ctx)).toBe(true);
      expect(evaluateDisplayConditions([], ctx)).toBe(true);
      expect(evaluateDisplayConditions({}, ctx)).toBe(true);
      expect(evaluateDisplayConditions({ rules: [] }, ctx)).toBe(true);
    });

    it("Case 9: شرط stock > 0 مع stock=0 -> false ومع stock=5 -> true", () => {
      const outOfStockCtx: DynamicContext = { product: { stock: 0 } };
      const inStockCtx: DynamicContext = { product: { stock: 5 } };

      expect(evaluateDisplayConditions("stock > 0", outOfStockCtx)).toBe(false);
      expect(evaluateDisplayConditions("stock > 0", inStockCtx)).toBe(true);
      expect(evaluateDisplayConditions({ field: "stock", operator: ">", value: 0 }, outOfStockCtx)).toBe(false);
      expect(evaluateDisplayConditions({ field: "stock", operator: ">", value: 0 }, inStockCtx)).toBe(true);
    });

    it("Case 10: شرط onSale -> يظهر فقط عندما compareAtPrice > price", () => {
      const onSaleCtx: DynamicContext = {
        product: { price: 250, compareAtPrice: 350 },
      };
      const regularPriceCtx: DynamicContext = {
        product: { price: 250, compareAtPrice: 250 },
      };
      const noComparePriceCtx: DynamicContext = {
        product: { price: 250 },
      };

      expect(evaluateDisplayConditions("onSale", onSaleCtx)).toBe(true);
      expect(evaluateDisplayConditions("onSale", regularPriceCtx)).toBe(false);
      expect(evaluateDisplayConditions("onSale", noComparePriceCtx)).toBe(false);
    });

    it("Case 11: شرط السعر price >= N و price <= N", () => {
      const productCtx: DynamicContext = { product: { price: 250 } };

      expect(evaluateDisplayConditions("price >= 200", productCtx)).toBe(true);
      expect(evaluateDisplayConditions("price >= 300", productCtx)).toBe(false);
      expect(evaluateDisplayConditions("price <= 300", productCtx)).toBe(true);
      expect(evaluateDisplayConditions("price <= 200", productCtx)).toBe(false);
    });

    it("Case 12: شروط الدور role = customer|guest والصفحة page = <key>", () => {
      const guestCtx: DynamicContext = { role: "guest", page: { slug: "pdp" } };
      const customerCtx: DynamicContext = { role: "customer", page: { slug: "home" } };

      expect(evaluateDisplayConditions("role = customer", guestCtx)).toBe(false);
      expect(evaluateDisplayConditions("role = guest", guestCtx)).toBe(true);
      expect(evaluateDisplayConditions("role = customer", customerCtx)).toBe(true);
      expect(evaluateDisplayConditions("role = guest", customerCtx)).toBe(false);

      expect(evaluateDisplayConditions("page = pdp", guestCtx)).toBe(true);
      expect(evaluateDisplayConditions("page = pdp", customerCtx)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Part 3: DOM Rendering Verification (StorefrontSectionFrame & Studio UI)
  // ─────────────────────────────────────────────────────────────────
  describe("3. DOM Render Tree & Binding UI Integration", () => {
    it("Case 13 (قبول 4): شرط stock > 0 مع stock=0 -> القسم مش موجود في الـrender tree (assert على DOM)", () => {
      const sectionEntry = {
        type: "hero-banner",
        key: "hero-out-of-stock",
        settings: {
          title: "عرض خاص للسلعة",
          displayConditions: "stock > 0",
        },
        dynamicContext: {
          product: { stock: 0 },
        },
      };

      const { container, queryByTestId } = render(
        <StorefrontSectionFrame
          index={0}
          sectionEntry={sectionEntry}
          element={<div data-testid="test-hero-section">محتوى الهيرو</div>}
        />
      );

      // Must NOT be in the DOM tree at all (not display:none)
      expect(queryByTestId("test-hero-section")).toBeNull();
      expect(container.firstChild).toBeNull();
      expect(container.innerHTML).toBe("");
    });

    it("Case 14 (قبول 5): شرط فاضي -> ظاهر دايماً في الـrender tree (assert)", () => {
      const sectionEntry = {
        type: "hero-banner",
        key: "hero-always-visible",
        settings: {
          title: "عنوان دائم",
          displayConditions: "",
        },
      };

      const { getByTestId, queryByTestId } = render(
        <StorefrontSectionFrame
          index={0}
          sectionEntry={sectionEntry}
          element={<div data-testid="test-hero-always">محتوى ظاهر دائماً</div>}
        />
      );

      expect(queryByTestId("test-hero-always")).not.toBeNull();
      expect(getByTestId("test-hero-always")).toBeInTheDocument();
      expect(getByTestId("test-hero-always").textContent).toBe("محتوى ظاهر دائماً");
    });

    it("Case 15: StudioInspectorContentTab integrates dynamic binding icon and token selection", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioInspectorContentTab
          sectionType="hero-banner"
          settings={{
            title: "عنوان ثابت",
            subtitle: "وصف ثابت",
            ctaText: "تسوق الآن",
            ctaLink: "/shop",
          }}
          onUpdateField={onUpdateField}
        />
      );

      // Find binding buttons for dynamic tags
      const bindingButtons = screen.getAllByTestId("btn-dynamic-tag-picker");
      expect(bindingButtons.length).toBeGreaterThan(0);

      // Click the first binding button (Main Heading)
      fireEvent.click(bindingButtons[0]);

      // Popover menu should appear
      const popover = screen.getByTestId("dynamic-token-popover");
      expect(popover).toBeInTheDocument();

      // Click on a product title token option
      const tokenBtn = screen.getByTestId("token-option---product-title--");
      expect(tokenBtn).toBeInTheDocument();
      fireEvent.click(tokenBtn);

      // Verify onUpdateField was called with the selected token
      expect(onUpdateField).toHaveBeenCalledWith("title", "{{product.title}}");
      expect(onUpdateField).toHaveBeenCalledWith("heading", "{{product.title}}");
    });
  });
});
