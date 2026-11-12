import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SuperAdminCompanyDetails from "../../SuperAdminCompanyDetails";
import { apiClient } from "../../../../services/apiClient";
import { businessSpecialtyService } from "../../../../services/businessSpecialtyService";

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../../services/businessSpecialtyService", () => ({
  businessSpecialtyService: {
    listSpecialties: jest.fn(),
  },
}));

jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: {
    dir: () => "rtl",
    t: (key: string) => key,
    language: "ar",
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
  },
}));

const mockedApi = apiClient as jest.Mocked<typeof apiClient>;
const mockedSpecialtyService = businessSpecialtyService as jest.Mocked<
  typeof businessSpecialtyService
>;

const TWO_DAYS_AHEAD = new Date(Date.now() + 2 * 86400000).toISOString();
const FORTY_DAYS_AGO = new Date(Date.now() - 40 * 86400000).toISOString();
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 86400000).toISOString();

function buildMockPayload(options?: { withoutAppPrices?: boolean }) {
  const companyDetailResponse = {
    success: true,
    data: {
      company: {
        id: "cmp-1",
        name: "شركة النور للتجارة",
        email: "info@alnour.test",
        phone: "01000000000",
        website: "https://alnour.test",
        currency: "EGP",
        isActive: true,
        slug: "alnour",
        createdAt: "2026-01-10T10:00:00.000Z",
        _count: {
          users: 16,
          customers: 320,
          products: 118,
          conversations: 95,
          facebookPages: 2,
        },
      },
      review: {
        wallet: {
          balance: 150,
          totalDeposited: 5000,
          totalSpent: 4850,
          currency: "EGP",
          updatedAt: TWO_DAYS_AGO,
          recentTransactions: [
            {
              id: "tx-1",
              type: "DEPOSIT",
              amount: 1000,
              createdAt: TWO_DAYS_AGO,
              description: "شحن محفظة الشركة",
            },
          ],
        },
        subscription: {
          id: "sub-1",
          monthlyFee: 400,
          status: "ACTIVE",
          nextBillingDate: TWO_DAYS_AHEAD,
          failedAttempts: 0,
        },
        usage: {
          costs: { total: 650, subscriptions: 400, usage: 250 },
          totalActions: 45,
          totalQuantity: 120,
          activeApps: 3,
          usageBreakdown: [
            {
              feature: "outbound_messages",
              totalActions: 45,
              totalQuantity: 120,
              totalCost: 250,
            },
          ],
          installedApps: [],
        },
        limits: {
          features: { advancedReports: true, apiAccess: false },
          entries: [
            {
              key: "users",
              label: "الأعضاء",
              current: 16,
              limit: 20,
              percentage: 80,
              remaining: 4,
              isUnlimited: false,
            },
            {
              key: "products",
              label: "المنتجات",
              current: 118,
              limit: 500,
              percentage: 24,
              remaining: 382,
              isUnlimited: false,
            },
            {
              key: "orders",
              label: "طلبات الشهر",
              current: 64,
              limit: 200,
              percentage: 32,
              remaining: 136,
              isUnlimited: false,
            },
            {
              key: "customers",
              label: "العملاء",
              current: 320,
              limit: 1000,
              percentage: 32,
              remaining: 680,
              isUnlimited: false,
            },
          ],
        },
        billing: {
          stats: {
            unpaidInvoices: 1,
            overdueInvoices: 0,
            pendingReceipts: 0,
            failedPayments: 0,
            paidInvoices: 4,
            totalInvoices: 5,
          },
          recentInvoices: [
            {
              id: "inv-1",
              invoiceNumber: "INV-101",
              status: "PAID",
              issueDate: "2026-10-01T00:00:00.000Z",
              dueDate: "2026-10-10T00:00:00.000Z",
              totalAmount: 400,
              currency: "EGP",
            },
          ],
          recentPayments: [
            {
              id: "pay-1",
              paymentNumber: "PAY-101",
              status: "COMPLETED",
              method: "WALLET",
              amount: 400,
              currency: "EGP",
              paidAt: TWO_DAYS_AGO,
              createdAt: TWO_DAYS_AGO,
            },
          ],
          recentReceipts: [],
          recentHistory: [
            {
              id: "bh-1",
              type: "PLATFORM_FEE",
              amount: 400,
              description: "Subscription renewed",
              createdAt: TWO_DAYS_AGO,
            },
          ],
        },
        userStats: {
          total: 16,
          active: 14,
          inactive: 2,
        },
      },
    },
  };

  // Note: intentionally includes 14 regular + 2 system = 16, or even 18 items to ensure Team section uses unified count (16)
  const usersResponse = {
    success: true,
    data: {
      users: [
        {
          id: "u-1",
          firstName: "أحمد",
          lastName: "محمود",
          email: "ahmed@alnour.test",
          role: "COMPANY_ADMIN",
          isActive: true,
          createdAt: "2026-01-10T10:00:00.000Z",
          lastLoginAt: TWO_DAYS_AGO,
        },
        {
          id: "u-2",
          firstName: "سارة",
          lastName: "خالد",
          email: "sara@alnour.test",
          role: "AGENT",
          isActive: true,
          createdAt: "2026-01-12T10:00:00.000Z",
          lastLoginAt: FORTY_DAYS_AGO,
        },
        {
          id: "u-sys",
          firstName: "حساب",
          lastName: "النظام",
          email: "system@maxp.online",
          role: "SUPER_ADMIN",
          isActive: true,
          createdAt: "2026-01-01T10:00:00.000Z",
          lastLoginAt: TWO_DAYS_AGO,
        },
      ],
    },
  };

  const pagesResponse = {
    success: true,
    data: [
      {
        id: "pg-1",
        pageId: "123456",
        pageName: "صفحة النور",
        status: "CONNECTED",
        connectedAt: TWO_DAYS_AGO,
      },
    ],
  };

  const ticketsResponse = {
    tickets: [
      {
        id: "t-1",
        ticketId: "TKT-101",
        subject: "استفسار عن الفواتير",
        category: "BILLING",
        priority: "high",
        status: "open",
        createdAt: TWO_DAYS_AGO,
        user: { id: "u-1", firstName: "أحمد", lastName: "محمود", email: "ahmed@alnour.test" },
      },
      {
        id: "t-2",
        ticketId: "TKT-102",
        subject: "متابعة الربط",
        category: "TECH",
        priority: "medium",
        status: "in_progress",
        createdAt: TWO_DAYS_AGO,
      },
      {
        id: "t-3",
        ticketId: "TKT-103",
        subject: "طلب قديم",
        category: "GENERAL",
        priority: "low",
        status: "closed",
        createdAt: TWO_DAYS_AGO,
      },
    ],
  };

  const activitiesResponse = {
    success: true,
    data: {
      activities: [
        {
          id: "act-1",
          category: "AUTH",
          action: "IMPERSONATE",
          description: "POST /api/v1/admin/companies/cmp-1/login-as-admin",
          severity: "HIGH",
          createdAt: TWO_DAYS_AGO,
          metadata: JSON.stringify({ reason: "مراجعة تذكرة دعم" }),
        },
        {
          id: "act-2",
          category: "BILLING",
          action: "TOP_UP",
          description: "POST /api/v1/admin/wallet/add-funds",
          severity: "LOW",
          createdAt: TWO_DAYS_AGO,
        },
      ],
    },
  };

  const appsResponse = {
    success: true,
    data: options?.withoutAppPrices
      ? [
          { slug: "app-1", name: "أداة التسويق", pricingModel: "SUBSCRIPTION", isActive: true },
          { slug: "app-2", name: "أداة الواتساب", pricingModel: "HYBRID", isActive: true },
        ]
      : [
          { slug: "app-1", name: "أداة التسويق", pricingModel: "SUBSCRIPTION", monthlyPrice: 150, isActive: true },
          { slug: "app-2", name: "أداة الواتساب", pricingModel: "SUBSCRIPTION", monthlyPrice: 250, isActive: true },
          { slug: "app-3", name: "أداة مجانية", pricingModel: "FREE", monthlyPrice: 0, isActive: true },
        ],
  };

  const bundlesResponse = {
    success: true,
    data: [],
  };

  return {
    companyDetailResponse,
    usersResponse,
    pagesResponse,
    ticketsResponse,
    activitiesResponse,
    appsResponse,
    bundlesResponse,
  };
}

function setupApiMocks(options?: { withoutAppPrices?: boolean }) {
  const payload = buildMockPayload(options);
  mockedSpecialtyService.listSpecialties.mockResolvedValue([]);
  mockedApi.get.mockImplementation((url: string) => {
    if (url === "/admin/companies/cmp-1") return Promise.resolve({ data: payload.companyDetailResponse });
    if (url.includes("/admin/companies/cmp-1/users")) return Promise.resolve({ data: payload.usersResponse });
    if (url.includes("/admin/companies/cmp-1/facebook-pages")) return Promise.resolve({ data: payload.pagesResponse });
    if (url.includes("/support/admin/tickets")) return Promise.resolve({ data: payload.ticketsResponse });
    if (url.includes("/activity/company/activities")) return Promise.resolve({ data: payload.activitiesResponse });
    if (url.includes("/marketplace/apps")) return Promise.resolve({ data: payload.appsResponse });
    if (url.includes("/marketplace/bundles")) return Promise.resolve({ data: payload.bundlesResponse });
    return Promise.resolve({ data: { success: true, data: [] } });
  });
  mockedApi.post.mockResolvedValue({ data: { success: true, data: { token: "t", user: {} } } });
  mockedApi.put.mockResolvedValue({
    data: { success: true, data: { company: payload.companyDetailResponse.data.company } },
  });
}

function renderDetailsPage(initialRoute = "/super-admin/companies-v2/cmp-1") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/super-admin/companies-v2/:companyId" element={<SuperAdminCompanyDetails />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SuperAdminCompanyDetails Acceptance Criteria", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders breadcrumb, page title, max-w-[1440px], unified 4-KPI bar, health column, and 3 header actions with 1 primary button", async () => {
    setupApiMocks();
    const { container } = renderDetailsPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "شركة النور للتجارة" })).toBeInTheDocument();
    });

    // 10. max-w-[1440px] container
    expect(container.firstChild).toHaveClass("max-w-[1440px]", "mx-auto");

    // 9. Breadcrumb & page title
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumb).toHaveTextContent("إدارة الشركات");
    expect(breadcrumb).toHaveTextContent("شركة النور للتجارة");
    expect(screen.getByText("لوحة تفاصيل الشركة")).toBeInTheDocument();

    // 4. Header actions: exactly 3 visible controls ("تعديل" Primary, "دخول بدعم موثّق", "المزيد") + Risk Badge
    expect(screen.getByTestId("company-risk-badge")).toBeInTheDocument();
    const headerActions = screen.getByTestId("company-header-actions");
    const headerButtons = within(headerActions).getAllByRole("button");
    expect(headerButtons).toHaveLength(3);
    expect(headerButtons[0]).toHaveTextContent("تعديل");
    expect(headerButtons[1]).toHaveTextContent("دخول بدعم موثّق");
    expect(headerButtons[1]).toHaveAttribute("data-variant", "warning");
    expect(headerButtons[1].className).toContain("amber");
    expect(headerButtons[1].className).not.toContain("text-primary");
    expect(headerButtons[2]).toHaveTextContent("المزيد");

    // Unified 4-KPI Bar without fake trends
    const kpiBar = screen.getByTestId("unified-kpi-bar");
    expect(within(kpiBar).getByText("الأعضاء")).toBeInTheDocument();
    expect(within(kpiBar).getByText("العملاء")).toBeInTheDocument();
    expect(within(kpiBar).getByText("طلبات الشهر")).toBeInTheDocument();
    expect(within(kpiBar).getByText("الأدوات النشطة")).toBeInTheDocument();
    expect(within(kpiBar).getByText("16")).toBeInTheDocument();

    // Company Health Column with 4 required indicators & single renewal badge
    const healthCol = screen.getByTestId("company-health-column");
    expect(within(healthCol).getByText("صحة الشركة")).toBeInTheDocument();
    expect(within(healthCol).getByText(/قرب التجديد/)).toBeInTheDocument();
    expect(within(healthCol).getByText("التجديد قريب")).toBeInTheDocument();
    expect(within(healthCol).getByText(/نسبة استهلاك الخطة/)).toBeInTheDocument();
    expect(within(healthCol).getByText("80%")).toBeInTheDocument();
    expect(within(healthCol).getByText(/حسابات خاملة/)).toBeInTheDocument();
    expect(within(healthCol).getByText(/تذاكر مفتوحة/)).toBeInTheDocument();
    expect(screen.getByTestId("health-open-tickets-count")).toHaveTextContent("2");

    // Defect #3: Renewal badge appears ONCE on the page (not duplicated in general tab alerts)
    expect(screen.getAllByText("التجديد قريب")).toHaveLength(1);
    // Defect #3: Financial balance/deposits/spent do NOT appear in header or general tab
    expect(within(kpiBar).queryByText(/150/)).not.toBeInTheDocument();

    // Defect #9: Labeled creation date, renewal date, last activity label, and zero Eastern Arabic/Hindi digits (٠-٩)
    expect(screen.getByText(/تاريخ الإنشاء:/)).toBeInTheDocument();
    expect(within(healthCol).getByText(/تاريخ التجديد:/)).toBeInTheDocument();
    expect(within(healthCol).getByText(/تاريخ آخر نشاط:/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/[\u0660-\u0669]/);
  });

  it("places auxiliary and destructive actions inside the 'المزيد' menu with warning styles", async () => {
    setupApiMocks();
    renderDetailsPage();

    const moreBtn = await screen.findByRole("button", { name: /المزيد/ });
    fireEvent.click(moreBtn);

    expect(await screen.findByText("شحن المحفظة")).toBeInTheDocument();
    expect(screen.getByText("تحديث البيانات")).toBeInTheDocument();
    expect(screen.getByText("ربط الشركة بوكيل")).toBeInTheDocument();
    const transferItem = screen.getByText("نقل ملكية الشركة").closest('[role="menuitem"]');
    const suspendItem = screen.getByText("إيقاف نشاط الشركة").closest('[role="menuitem"]');
    expect(transferItem?.className).toContain("amber");
    expect(suspendItem?.className).toContain("destructive");
  });

  it("opens impersonation modal with mandatory reason and disables confirm until entered", async () => {
    setupApiMocks();
    renderDetailsPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "دخول بدعم موثّق" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "دخول بدعم موثّق" }));

    const confirmBtn = await screen.findByRole("button", { name: "تأكيد الدخول كمدير" });
    expect(confirmBtn).toBeDisabled();

    const reasonInput = screen.getByLabelText(/سبب الدخول/);
    fireEvent.change(reasonInput, { target: { value: "   " } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: "فحص تذكرة دعم رقم 101" } });
    expect(confirmBtn).toBeEnabled();

    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        "/admin/companies/cmp-1/login-as-admin",
        { reason: "فحص تذكرة دعم رقم 101" },
        expect.any(Object),
      );
    });
  });

  it("keeps single user count across KPI bar, Limits tab, and Team tab, and separates system accounts", async () => {
    setupApiMocks();
    renderDetailsPage("/super-admin/companies-v2/cmp-1?tab=team");

    await waitFor(() => {
      expect(screen.getByTestId("team-total-badge")).toHaveTextContent("16 عضو");
    });

    // Defect #1: Team badge shows 16 (matching API usage/limits), NOT 3 (array length) or 14 (active)
    expect(screen.queryByText(/14 نشط/)).not.toBeInTheDocument();

    // Defect #8: Search input, role filter select, status filter, sort select, dormant badge, separated system accounts
    expect(screen.getByLabelText("بحث في أعضاء الفريق")).toBeInTheDocument();
    expect(screen.getByLabelText("فلتر الدور")).toBeInTheDocument();
    expect(screen.getByLabelText("فرز الأعضاء")).toBeInTheDocument();
    expect(screen.getByText(/خامل > 30 يوم/)).toBeInTheDocument();

    const systemSection = screen.getByTestId("system-accounts-section");
    expect(within(systemSection).getByText("حسابات النظام")).toBeInTheDocument();
    expect(within(systemSection).getByText("حساب النظام")).toBeInTheDocument();

    // Every team date has an Arabic label
    expect(screen.getAllByText(/تاريخ الإضافة:/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/آخر دخول:/).length).toBeGreaterThanOrEqual(2);
  });

  it("displays proper metric labels in Management tab and single-place wallet metrics in Financial tab", async () => {
    setupApiMocks();
    renderDetailsPage("/super-admin/companies-v2/cmp-1?tab=management");

    await waitFor(() => {
      expect(screen.getByText("الحدود والمزايا")).toBeInTheDocument();
    });

    expect(screen.getByText("الأعضاء: 16 عضو من أصل 20")).toBeInTheDocument();
    expect(screen.getByText("المنتجات المضافة: 118 منتج من أصل 500")).toBeInTheDocument();
    expect(screen.getByText("طلبات هذا الشهر: 64 طلب من أصل 200")).toBeInTheDocument();
    expect(screen.getByText("العملاء المسجلون: 320 عميل من أصل 1,000")).toBeInTheDocument();
    expect(screen.queryByText(/المستخدم 118/)).not.toBeInTheDocument();

    // Switch to Financial tab and verify wallet metrics appear once
    fireEvent.click(screen.getByRole("tab", { name: "مالي" }));
    await waitFor(() => {
      expect(screen.getByText("المحفظة والشحن")).toBeInTheDocument();
    });
    expect(screen.getAllByText("الرصيد الحالي")).toHaveLength(1);
    expect(screen.getAllByText("إجمالي الإيداعات")).toHaveLength(1);
    expect(screen.getAllByText("إجمالي المصروف")).toHaveLength(1);
  });

  it("localizes support statuses/priorities and removes /api/ from activity timeline", async () => {
    setupApiMocks();
    renderDetailsPage("/super-admin/companies-v2/cmp-1?tab=support");

    await waitFor(() => {
      expect(screen.getByText("استفسار عن الفواتير")).toBeInTheDocument();
    });

    const supportPanel = screen.getByRole("tabpanel");
    expect(within(supportPanel).getByText("مفتوحة")).toBeInTheDocument();
    expect(within(supportPanel).getByText("قيد المعالجة")).toBeInTheDocument();
    expect(within(supportPanel).getByText("مغلقة")).toBeInTheDocument();
    expect(within(supportPanel).getByText("أولوية عالية")).toBeInTheDocument();
    expect(within(supportPanel).getByText("أولوية متوسطة")).toBeInTheDocument();
    expect(within(supportPanel).getByText("أولوية منخفضة")).toBeInTheDocument();
    expect(supportPanel.textContent).not.toMatch(/\b(open|in_progress|closed|medium|high|low)\b/i);

    fireEvent.click(screen.getByRole("tab", { name: "نشاط" }));
    await waitFor(() => {
      expect(screen.getByText("سوبر أدمن دخل كأدمن الشركة")).toBeInTheDocument();
    });

    const activityPanel = screen.getByRole("tabpanel");
    expect(activityPanel.textContent).not.toContain("/api/");
    expect(within(activityPanel).getByText("السبب: مراجعة تذكرة دعم")).toBeInTheDocument();
    expect(within(activityPanel).getByText("شحن رصيد المحفظة")).toBeInTheDocument();
  });

  it("shows confirmation modal with count and total price (or fallback) before bulk activation", async () => {
    setupApiMocks();
    renderDetailsPage("/super-admin/companies-v2/cmp-1?tab=activation");

    const activateAllBtn = await screen.findByRole("button", { name: /تفعيل الكل/ });
    fireEvent.click(activateAllBtn);

    expect(await screen.findByText("تأكيد التفعيل الجماعي للأدوات")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-activate-total-price")).toHaveTextContent("400");
    expect(screen.getByRole("button", { name: /تأكيد وتفعيل 3 أداة/ })).toBeInTheDocument();
  });

  it("shows 'السعر غير محدد' in bulk activation modal when API does not return app prices", async () => {
    setupApiMocks({ withoutAppPrices: true });
    renderDetailsPage("/super-admin/companies-v2/cmp-1?tab=activation");

    const activateAllBtn = await screen.findByRole("button", { name: /تفعيل الكل/ });
    fireEvent.click(activateAllBtn);

    expect(await screen.findByText("تأكيد التفعيل الجماعي للأدوات")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-activate-total-price")).toHaveTextContent("السعر غير محدد");
  });

  it("displays '100 من 150 عضو' and loads remaining users via pagination when company has > 100 members", async () => {
    const payload = buildMockPayload();
    payload.companyDetailResponse.data.company._count.users = 150;
    payload.companyDetailResponse.data.review.userStats = { total: 150, active: 140, inactive: 10 };
    payload.companyDetailResponse.data.review.limits.entries[0].current = 150;

    const makeUsers = (start: number, count: number) =>
      Array.from({ length: count }, (_, idx) => {
        const num = start + idx;
        return {
          id: `u-${num}`,
          firstName: `عضو`,
          lastName: `${num}`,
          email: `user${num}@alnour.test`,
          role: "AGENT",
          isActive: true,
          createdAt: "2026-01-10T10:00:00.000Z",
          lastLoginAt: TWO_DAYS_AGO,
        };
      });

    mockedSpecialtyService.listSpecialties.mockResolvedValue([]);
    mockedApi.get.mockImplementation((url: string, config?: any) => {
      if (url === "/admin/companies/cmp-1") return Promise.resolve({ data: payload.companyDetailResponse });
      if (url.includes("/admin/companies/cmp-1/users")) {
        const page = config?.params?.page ?? 1;
        if (page === 1) {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                users: makeUsers(1, 100),
                pagination: { page: 1, limit: 100, total: 150, totalPages: 2, hasNext: true, hasPrev: false },
              },
            },
          });
        }
        return Promise.resolve({
          data: {
            success: true,
            data: {
              users: makeUsers(101, 50),
              pagination: { page: 2, limit: 100, total: 150, totalPages: 2, hasNext: false, hasPrev: true },
            },
          },
        });
      }
      if (url.includes("/admin/companies/cmp-1/facebook-pages")) return Promise.resolve({ data: payload.pagesResponse });
      if (url.includes("/support/admin/tickets")) return Promise.resolve({ data: payload.ticketsResponse });
      if (url.includes("/activity/company/activities")) return Promise.resolve({ data: payload.activitiesResponse });
      if (url.includes("/marketplace/apps")) return Promise.resolve({ data: payload.appsResponse });
      if (url.includes("/marketplace/bundles")) return Promise.resolve({ data: payload.bundlesResponse });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderDetailsPage("/super-admin/companies-v2/cmp-1?tab=team");

    await waitFor(() => {
      expect(screen.getByTestId("team-total-badge")).toHaveTextContent("100 من 150 عضو");
    });

    const loadMoreBtn = screen.getByTestId("team-load-more-button");
    expect(loadMoreBtn).toHaveTextContent("تحميل المزيد من الأعضاء");
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByTestId("team-total-badge")).toHaveTextContent("150 عضو");
    });
    expect(screen.queryByTestId("team-load-more-bar")).not.toBeInTheDocument();
  });

  it("opens warning confirmation modal with mandatory reason for company suspend and logs reason in activity", async () => {
    setupApiMocks();
    renderDetailsPage();

    const moreBtn = await screen.findByRole("button", { name: /المزيد/ });
    fireEvent.click(moreBtn);
    fireEvent.click(await screen.findByText("إيقاف نشاط الشركة"));

    // Should open warning confirm dialog instead of Edit Company modal
    expect(await screen.findByTestId("company-status-confirm-dialog")).toBeInTheDocument();
    expect(screen.queryByText(/حدّث بيانات الشركة الأساسية/)).not.toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "تأكيد إيقاف الشركة" });
    expect(confirmBtn).toBeDisabled();

    const reasonInput = screen.getByLabelText(/سبب إيقاف الشركة/);
    fireEvent.change(reasonInput, { target: { value: "   " } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: "إيقاف مؤقت بسبب فاتورة 2026/11/01" } });
    expect(confirmBtn).toBeEnabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith(
        "/admin/companies/cmp-1",
        expect.objectContaining({
          isActive: false,
          reason: "إيقاف مؤقت بسبب فاتورة 2026/11/01",
        }),
        expect.any(Object),
      );
    });

    // Switch to activity tab and verify suspend action + reason (including date!) appear
    fireEvent.click(screen.getByRole("tab", { name: "نشاط" }));
    await waitFor(() => {
      expect(screen.getByText("إيقاف نشاط الشركة")).toBeInTheDocument();
    });
    expect(screen.getByText("السبب: إيقاف مؤقت بسبب فاتورة 2026/11/01")).toBeInTheDocument();
  });

  it("requires mandatory reason for bulk activation and sends it in install requests and activity", async () => {
    setupApiMocks();
    renderDetailsPage("/super-admin/companies-v2/cmp-1?tab=activation");

    const activateAllBtn = await screen.findByRole("button", { name: /تفعيل الكل/ });
    fireEvent.click(activateAllBtn);

    const confirmBtn = await screen.findByRole("button", { name: /تأكيد وتفعيل 3 أداة/ });
    expect(confirmBtn).toBeDisabled();

    const reasonInput = screen.getByLabelText(/سبب التفعيل الجماعي/);
    fireEvent.change(reasonInput, { target: { value: "   " } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: "تفعيل باقة النمو للعميل بتاريخ 2026/11/12" } });
    expect(confirmBtn).toBeEnabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        "/marketplace/apps/app-1/install",
        expect.objectContaining({
          reason: "تفعيل باقة النمو للعميل بتاريخ 2026/11/12",
        }),
        expect.any(Object),
      );
    });

    fireEvent.click(screen.getByRole("tab", { name: "نشاط" }));
    await waitFor(() => {
      expect(screen.getByText(/تفعيل جماعي للأدوات/)).toBeInTheDocument();
    });
    expect(screen.getByText("السبب: تفعيل باقة النمو للعميل بتاريخ 2026/11/12")).toBeInTheDocument();
  });
});
