import { render, screen } from "@testing-library/react";
import { billingDescription } from "../CompanyBillingSection";
import { CompanyRecentActivity } from "../CompanyRecentActivity";
import {
  formatActivityTimeline,
  formatNumber,
  formatCurrency,
  getStatusMeta,
  getMetricDetails,
  getUnifiedUsersCount,
  isSystemAccount,
  isUserDormant,
  getCompanyRiskInfo,
} from "../helpers";

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
    expect(userDetails.detail).toBe("الأعضاء: 14 عضو من أصل 20");
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
    expect(productDetails.detail).not.toContain("المستخدم");

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

    const storageEntry = {
      key: "storage",
      label: "المساحة",
      current: 250,
      limit: 1000,
      percentage: 25,
      remaining: 750,
      isUnlimited: false,
    };
    const storageDetails = getMetricDetails(storageEntry);
    expect(storageDetails.detail).toBe("المساحة المستخدمة: 250 من أصل 1,000");
    expect(storageDetails.percentageText).toBe("25% من المساحة المتاحة");

    const unlimitedEntry = {
      key: "storage",
      label: "المساحة",
      current: 10,
      limit: -1,
      percentage: 0,
      remaining: 0,
      isUnlimited: true,
    };
    const unlimitedDetails = getMetricDetails(unlimitedEntry);
    expect(unlimitedDetails.detail).toBe("المساحة المستخدمة: 10");
    expect(unlimitedDetails.percentageText).toBe("بدون حد أقصى");
    expect(unlimitedDetails.remainingText).toBe("");
  });
});

describe("Timeline Formatter without /api/", () => {
  it("translates raw endpoints and technical verbs into descriptive Arabic", () => {
    const result1 = formatActivityTimeline({
      action: "IMPERSONATE",
      description: "Super Admin (ali@test.com) logged in as Company Admin (admin@test.com)",
      metadata: JSON.stringify({ reason: "فحص شكوى دفع" }),
    });
    expect(result1.actionText).toBe("سوبر أدمن دخل كأدمن الشركة");
    expect(result1.detailText).toContain("السبب: فحص شكوى دفع");
    expect(result1.actionText).not.toContain("/api/");
    expect(result1.actionText).not.toContain("Super Admin");

    const result2 = formatActivityTimeline({
      category: "AUTH",
      description: "POST /api/v1/auth/login",
    });
    expect(result2.actionText).toBe("تسجيل دخول إلى النظام");
    expect(result2.actionText).not.toContain("POST");
    expect(result2.actionText).not.toContain("/api/");
    expect(result2.detailText).not.toContain("/api/");

    const result3 = formatActivityTimeline({
      category: "BILLING",
      action: "TOP_UP",
      description: "POST /admin/wallet/add-funds",
    });
    expect(result3.actionText).toBe("شحن رصيد المحفظة");
    expect(result3.actionText).not.toContain("/admin/wallet");

    const result4 = formatActivityTimeline({
      action: "SUSPEND_COMPANY",
      description: "Company suspended via /api/v1/admin/companies/123",
    });
    expect(result4.actionText).toBe("إيقاف نشاط الشركة");
    expect(result4.detailText).not.toContain("/api/");

    const result5 = formatActivityTimeline({
      category: "SYSTEM",
      action: "CRON",
      description: "GET /api/v1/webhooks/dispatch AdminCompanyController",
    });
    expect(result5.actionText).not.toContain("/api/");
    expect(result5.actionText).not.toContain("Controller");

    const resultWithDateInReason = formatActivityTimeline({
      action: "IMPERSONATE",
      description: "POST /api/v1/admin/companies/cmp-1/login-as-admin",
      metadata: JSON.stringify({
        reason: "فحص فاتورة بتاريخ 2026/11/01 وحالة 12/05 للدفعة 50/100",
      }),
    });
    expect(resultWithDateInReason.detailText).toBe(
      "السبب: فحص فاتورة بتاريخ 2026/11/01 وحالة 12/05 للدفعة 50/100",
    );

    const pulseEntry = formatActivityTimeline({
      category: "PULSE",
      action: "TENANT_ACTIVITY",
      description: "POST /api/v1/orders",
      targetName: "orders",
    });
    expect(pulseEntry.actionText).toBe("نبض نشاط تشغيلي للشركة");
    expect(pulseEntry.actionText).not.toContain("/api/");
    expect(pulseEntry.typeLabel).toBe("نبض النشاط");

    const trialDeactivate = formatActivityTimeline({
      action: "DEACTIVATE_TRIAL",
      description: "إيقاف الفترة التجريبية مؤقتاً",
    });
    expect(trialDeactivate.actionText).toBe("تحديث الفترة التجريبية");

    const companyDeactivate = formatActivityTimeline({
      action: "DEACTIVATE_COMPANY",
      description: "Action via /webhooks/dispatch",
      metadata: JSON.stringify({ reason: "سبب بتاريخ 2026/11/01" }),
    });
    expect(companyDeactivate.actionText).toBe("إيقاف نشاط الشركة");
    expect(companyDeactivate.detailText).toBe("السبب: سبب بتاريخ 2026/11/01");
    expect(companyDeactivate.detailText).not.toContain("/webhooks/dispatch");
  });
});

describe("StatusMeta Localization", () => {
  it("translates english statuses and priorities into arabic labels", () => {
    expect(getStatusMeta("subscription", "ACTIVE").label).toBe("نشط");
    expect(getStatusMeta("subscription", "CANCELLED").label).toBe("ملغي");
    expect(getStatusMeta("ticket", "OPEN").label).toBe("مفتوحة");
    expect(getStatusMeta("ticket", "IN_PROGRESS").label).toBe("قيد المعالجة");
    expect(getStatusMeta("ticket", "in-progress").label).toBe("قيد المعالجة");
    expect(getStatusMeta("ticket", "CLOSED").label).toBe("مغلقة");
    expect(getStatusMeta("ticket", "RESOLVED").label).toBe("تم الحل");
    expect(getStatusMeta("priority", "HIGH").label).toBe("عالية");
    expect(getStatusMeta("priority", "medium").label).toBe("متوسطة");
    expect(getStatusMeta("priority", "low").label).toBe("منخفضة");
    expect(getStatusMeta("activity", "CRITICAL").label).toBe("حرج");
    expect(getStatusMeta("activity", "HIGH").label).toBe("مرتفع");
    expect(getStatusMeta("activity", "LOW").label).toBe("منخفض");
    expect(getStatusMeta("user", "ACTIVE").label).toBe("نشط");
    expect(getStatusMeta("user", "INACTIVE").label).toBe("غير نشط");
    expect(getStatusMeta("pricingModel", "PAY_PER_USE").label).toBe("حسب الاستخدام");
    expect(getStatusMeta("channel", "WHATSAPP").label).toBe("واتساب");
  });

  it("uses neutral arabic fallback instead of stealing labels across categories", () => {
    const unknownInvoiceStatus = getStatusMeta("invoice", "PENDING");
    expect(unknownInvoiceStatus.label).toBe("غير محدد");
    expect(unknownInvoiceStatus.className).toContain("slate");
    expect(getStatusMeta("ticket", "TOTALLY_UNKNOWN").label).toBe("غير محدد");
  });
});

describe("Team, Health, Risk & Numeral Helpers", () => {
  it("formats numbers and currency with consistent digits in arabic locale", () => {
    expect(formatNumber(14)).toBe("14");
    expect(formatNumber(1250)).toBe("1,250");
    const formattedCurr = formatCurrency(500, "EGP");
    expect(formattedCurr).toContain("500");
    expect(formattedCurr).toContain("ج.م");
  });

  it("resolves single unified user count from limits/userStats", () => {
    const review = {
      limits: { entries: [{ key: "users", current: 16, limit: 20 }] },
      userStats: { total: 16, active: 14, inactive: 2 },
    };
    expect(getUnifiedUsersCount(review, { _count: { users: 18 } })).toBe(16);
  });

  it("identifies system accounts and dormant users (>30 days)", () => {
    expect(isSystemAccount({ role: "SUPER_ADMIN", email: "admin@maxp.online" })).toBe(true);
    expect(isSystemAccount({ role: "AGENT", email: "system@maxp.online" })).toBe(true);
    expect(isSystemAccount({ role: "COMPANY_ADMIN", email: "owner@store.com" })).toBe(false);

    const oldDate = new Date(Date.now() - 45 * 86400000).toISOString();
    const recentDate = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(isUserDormant({ lastLoginAt: oldDate, createdAt: oldDate }, 30)).toBe(true);
    expect(isUserDormant({ lastLoginAt: recentDate, createdAt: oldDate }, 30)).toBe(false);
  });

  it("computes company risk badge accurately", () => {
    expect(getCompanyRiskInfo({ isActive: false }, null).level).toBe("danger");
    expect(
      getCompanyRiskInfo({ isActive: true }, { billing: { stats: { overdueInvoices: 2 } } }).level,
    ).toBe("danger");
    expect(
      getCompanyRiskInfo({ isActive: true }, { wallet: { balance: 10 }, subscription: { monthlyFee: 200 } }).level,
    ).toBe("warning");
    expect(
      getCompanyRiskInfo({ isActive: true }, { wallet: { balance: 500 }, subscription: { monthlyFee: 200 } }).level,
    ).toBe("ok");
  });

  it("maps unknown billing server descriptions to a clean Arabic fallback and displays PULSE activity category", () => {
    expect(billingDescription("Subscription renewed")).toBe("تجديد اشتراك");
    expect(billingDescription("شحن رصيد يدوي")).toBe("شحن رصيد يدوي");
    expect(billingDescription("Unexpected gateway settlement batch #99")).toBe("حركة فوترة على الحساب");
    expect(billingDescription(null)).toBe("حركة فوترة");

    render(
      <CompanyRecentActivity
        loading={false}
        activities={[
          {
            id: "act-pulse-1",
            category: "PULSE",
            action: "TENANT_ACTIVITY",
            description: "POST /api/v1/orders",
            severity: "LOW",
            createdAt: new Date().toISOString(),
          },
        ]}
      />,
    );
    expect(screen.getAllByText("نبض النشاط").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("عام")).not.toBeInTheDocument();
  });
});
