import { describe, expect, it } from "vitest";
import { formatActivityTimeline, formatNumber, formatCurrency, getStatusMeta, getMetricDetails } from "../helpers";

describe("CompanyLimitsSection Dynamic Labeling", () => {
  it("renders dynamic labels according to metric type without repeated 'المستخدم X'", () => {
    const userEntry = {
      key: "users",
      label: "الأعضاء",
      current: 14,
      limit: 20,
      percentage: 70,
      remaining: 6,
      isUnlimited: false,
    };
    const userDetails = getMetricDetails(userEntry);
    expect(userDetails.detail).toBe("الأعضاء النشطون: 14 عضو من أصل 20");
    expect(userDetails.percentageText).toBe("70% من سعة الفريق");
    expect(userDetails.remainingText).toBe("المتبقي: 6 مقعد");

    const productEntry = {
      key: "products",
      label: "المنتجات",
      current: 150,
      limit: 500,
      percentage: 30,
      remaining: 350,
      isUnlimited: false,
    };
    const productDetails = getMetricDetails(productEntry);
    expect(productDetails.detail).toBe("المنتجات المضافة: 150 منتج من أصل 500");
    expect(productDetails.percentageText).toBe("30% من الحد المسموح");
    expect(productDetails.remainingText).toBe("المتبقي: 350 منتج");

    const orderEntry = {
      key: "orders",
      label: "طلبات الشهر",
      current: 80,
      limit: 200,
      percentage: 40,
      remaining: 120,
      isUnlimited: false,
    };
    const orderDetails = getMetricDetails(orderEntry);
    expect(orderDetails.detail).toBe("طلبات هذا الشهر: 80 طلب من أصل 200");
    expect(orderDetails.percentageText).toBe("40% من حصة الشهر");
    expect(orderDetails.remainingText).toBe("المتبقي: 120 طلب");

    const customerEntry = {
      key: "customers",
      label: "العملاء",
      current: 300,
      limit: 1000,
      percentage: 30,
      remaining: 700,
      isUnlimited: false,
    };
    const customerDetails = getMetricDetails(customerEntry);
    expect(customerDetails.detail).toBe("العملاء المسجلون: 300 عميل من أصل 1,000");
    expect(customerDetails.percentageText).toBe("30% من سعة العملاء");
    expect(customerDetails.remainingText).toBe("المتبقي: 700 عميل");

    const unlimitedEntry = {
      key: "storage",
      label: "التخزين",
      current: 10,
      limit: -1,
      percentage: 0,
      remaining: 0,
      isUnlimited: true,
    };
    const unlimitedDetails = getMetricDetails(unlimitedEntry);
    expect(unlimitedDetails.detail).toContain("غير محدود");
    expect(unlimitedDetails.percentageText).toBe("بدون حد أقصى");
    expect(unlimitedDetails.remainingText).toBe("المتبقي: غير محدود");
  });
});

describe("Timeline Formatter without /api/", () => {
  it("translates raw endpoints and technical verbs into descriptive Arabic", () => {
    const result1 = formatActivityTimeline({
      action: "IMPERSONATE",
      description: "Super Admin (ali@test.com) logged in as Company Admin (admin@test.com)",
      metadata: JSON.stringify({ reason: "فحص شكوى دفع" }),
    });
    expect(result1.actionText).toContain("دخول إداري");
    expect(result1.detailText).toContain("السبب: فحص شكوى دفع");
    expect(result1.actionText).not.toContain("/api/");

    const result2 = formatActivityTimeline({
      category: "AUTH",
      description: "POST /api/v1/auth/login",
    });
    expect(result2.actionText).toBe("تسجيل دخول إلى النظام");
    expect(result2.actionText).not.toContain("POST");
    expect(result2.actionText).not.toContain("/api/");

    const result3 = formatActivityTimeline({
      category: "BILLING",
      action: "TOP_UP",
      description: "POST /admin/wallet/add-funds",
    });
    expect(result3.actionText).toBe("شحن رصيد المحفظة");
    expect(result3.actionText).not.toContain("/admin/wallet");

    const result4 = formatActivityTimeline({
      action: "SUSPEND_COMPANY",
      description: "Company suspended",
    });
    expect(result4.actionText).toBe("إيقاف نشاط الشركة");
  });
});

describe("StatusMeta Localization", () => {
  it("translates english statuses into arabic labels", () => {
    expect(getStatusMeta("subscription", "ACTIVE").label).toBe("نشط");
    expect(getStatusMeta("subscription", "CANCELLED").label).toBe("ملغي");
    expect(getStatusMeta("ticket", "OPEN").label).toBe("مفتوحة");
    expect(getStatusMeta("ticket", "IN_PROGRESS").label).toBe("قيد المعالجة");
    expect(getStatusMeta("ticket", "RESOLVED").label).toBe("تم الحل");
    expect(getStatusMeta("activity", "CRITICAL").label).toBe("حرج");
    expect(getStatusMeta("activity", "HIGH").label).toBe("مرتفع");
    expect(getStatusMeta("activity", "LOW").label).toBe("منخفض");
    expect(getStatusMeta("user", "ACTIVE").label).toBe("نشط");
    expect(getStatusMeta("user", "INACTIVE").label).toBe("غير نشط");
    expect(getStatusMeta("pricingModel", "PAY_PER_USE").label).toBe("حسب الاستخدام");
    expect(getStatusMeta("channel", "WHATSAPP").label).toBe("واتساب");
  });
});

describe("Numeral Consistency", () => {
  it("formats numbers and currency with standard digits in arabic locale", () => {
    expect(formatNumber(14)).toBe("14");
    expect(formatNumber(1250)).toBe("1,250");
    const formattedCurr = formatCurrency(500, "EGP");
    expect(formattedCurr).toContain("500");
    expect(formattedCurr).toContain("ج.م");
  });
});
