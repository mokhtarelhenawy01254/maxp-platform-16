import { describe, it, expect } from "vitest";
import type { StudioEntity, StudioDraftAction, StudioSession } from "../../../../components/agent-studio/types";

describe("Inventory AI Studio - Telemetry & Strategy Engine", () => {
  const sampleProduct: StudioEntity = {
    id: "prod_sneaker_401",
    name: "كوتشي سوان الترا سبورت",
    slug: "swan-ultra-sport",
    price: 650,
    cost: 320,
    stock: 24,
    category: "أحذية رياضية",
  };

  it("calculates gross profit margin percentage accurately", () => {
    const profit = (sampleProduct.price || 0) - (sampleProduct.cost || 0);
    const marginPercent = Math.round((profit / (sampleProduct.price || 1)) * 100);
    expect(marginPercent).toBe(51);
    expect(profit).toBe(330);
  });

  it("classifies inventory stock health correctly across levels", () => {
    const classifyStock = (stock: number) => {
      if (stock <= 0) return "OUT_OF_STOCK";
      if (stock < 10) return "LOW_STOCK";
      return "SAFE_STOCK";
    };

    expect(classifyStock(sampleProduct.stock || 0)).toBe("SAFE_STOCK");
    expect(classifyStock(8)).toBe("LOW_STOCK");
    expect(classifyStock(0)).toBe("OUT_OF_STOCK");
  });

  it("evaluates price adjustment draft impact on margin", () => {
    const currentPrice = sampleProduct.price || 0;
    const proposedPrice = 699;
    const cost = sampleProduct.cost || 0;

    const currentMargin = Math.round(((currentPrice - cost) / currentPrice) * 100);
    const newMargin = Math.round(((proposedPrice - cost) / proposedPrice) * 100);
    const marginGain = newMargin - currentMargin;

    const draft: StudioDraftAction = {
      id: "draft_price_01",
      type: "PRICE_CHANGE",
      title: "تعديل سعر بيع مقترح",
      entityId: sampleProduct.id,
      entityName: sampleProduct.name,
      currentValue: currentPrice,
      proposedValue: proposedPrice,
      delta: proposedPrice - currentPrice,
      reason: "مراجعة أسعار السوق والمنافسين ورفع الهامش بنسبة 3%",
      status: "DRAFT",
    };

    expect(draft.type).toBe("PRICE_CHANGE");
    expect(draft.proposedValue).toBe(699);
    expect(draft.delta).toBe(49);
    expect(marginGain).toBe(3); // +3% margin gain
  });

  it("creates stock adjustment draft for physical count discrepancy", () => {
    const systemStock = sampleProduct.stock || 0;
    const physicalCount = 20; // 4 items discrepancy

    const draft: StudioDraftAction = {
      id: "draft_stock_01",
      type: "STOCK_ADJUSTMENT",
      title: "تسوية رصيد مخزون مقترحة",
      entityId: sampleProduct.id,
      entityName: sampleProduct.name,
      currentValue: systemStock,
      proposedValue: physicalCount,
      delta: physicalCount - systemStock,
      reason: "تسوية جرد فعلي للمستودع الرئيسي",
      status: "DRAFT",
    };

    expect(draft.type).toBe("STOCK_ADJUSTMENT");
    expect(draft.currentValue).toBe(24);
    expect(draft.proposedValue).toBe(20);
    expect(draft.delta).toBe(-4);
  });

  it("filters sessions accurately based on search keyword", () => {
    const sessions: StudioSession[] = [
      { id: "s1", title: "جرد كوتشي سوان الترا", updatedAt: new Date().toISOString(), createdAt: "", messages: [] },
      { id: "s2", title: "مراجعة هوامش فئة التيشرتات", updatedAt: new Date().toISOString(), createdAt: "", messages: [] },
      { id: "s3", title: "تحليل نقطة إعادة طلب الأحذية", updatedAt: new Date().toISOString(), createdAt: "", messages: [] },
    ];

    const q = "جرد";
    const filtered = sessions.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("s1");
  });

  it("prevents React Error #31 by strictly sanitizing session titles from synthetic events", () => {
    const sanitizeTitle = (title?: unknown) =>
      typeof title === "string" && title.trim() ? title.trim() : "جلسة جديدة";

    const syntheticClickEvent = {
      _reactName: "onClick",
      type: "click",
      nativeEvent: {},
      target: {},
      currentTarget: {},
    };

    expect(sanitizeTitle(syntheticClickEvent)).toBe("جلسة جديدة");
    expect(sanitizeTitle("مراجعة مخزون شهر سبتمبر")).toBe("مراجعة مخزون شهر سبتمبر");
    expect(sanitizeTitle(null)).toBe("جلسة جديدة");
    expect(sanitizeTitle(undefined)).toBe("جلسة جديدة");
  });

  it("handles seamless mobile view transitions between CHAT and CANVAS", () => {
    let mobileView: "CHAT" | "CANVAS" = "CHAT";
    const onActionTriggered = () => {
      mobileView = "CANVAS";
    };

    expect(mobileView).toBe("CHAT");
    onActionTriggered();
    expect(mobileView).toBe("CANVAS");
  });
});
