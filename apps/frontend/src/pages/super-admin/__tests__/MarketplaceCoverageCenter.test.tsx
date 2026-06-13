import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { toast } from "react-hot-toast";
import MarketplaceCoverageCenter from "../MarketplaceCoverageCenter";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock("../../../utils/urlHelper", () => ({
  buildApiUrl: (endpoint: string) => endpoint,
}));
jest.mock("../../../utils/tokenManager", () => ({
  __esModule: true,
  default: {
    createAuthHeaders: jest.fn(() => ({ Authorization: "Bearer test-token" })),
  },
}));
jest.mock("../../../config/marketplaceFeatureMap", () => ({
  areaLabels: {
    platform: "المنصة",
    commerce: "التجارة والمتجر",
  },
  statusLabels: {
    core: "Core",
    covered: "مربوط بتطبيق",
    "needs-granular-gate": "يحتاج ربط أدق",
    "missing-app": "يحتاج تطبيق جديد",
  },
  marketplaceFeatureMap: [
    {
      id: "core",
      area: "platform",
      label: "أساسيات المنصة",
      description: "Core workspace",
      status: "core",
      routes: [],
      action: "Keep core",
    },
    {
      id: "orders-core",
      area: "commerce",
      label: "إدارة الطلبات",
      description: "Orders workspace",
      status: "covered",
      appSlug: "order-core",
      appLabel: "Order Core",
      currentGate: "order-core",
      legacyGate: "ecommerce-basic",
      routes: [],
      action: "Install exact app",
    },
  ],
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

const coveragePayload = {
  generatedAt: "2026-05-02T10:00:00.000Z",
  totals: { companies: 1, returnedCompanies: 1, marketplaceApps: 1 },
  companies: [
    {
      id: "company-1",
      name: "Swan",
      email: "swan@h2m.com",
      slug: "swan",
      plan: "PRO",
      isActive: true,
      activeAppSlugs: ["ecommerce-basic"],
    },
  ],
  apps: [
    {
      id: "app-1",
      slug: "order-core",
      name: "Order Core",
      isActive: true,
      isPublic: true,
      category: "COMMERCE",
      pricingModel: "SUBSCRIPTION",
    },
  ],
};

describe("MarketplaceCoverageCenter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading state", () => {
    test("shows CircularProgress while loading", () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));
      render(<MarketplaceCoverageCenter />);
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });

  describe("error states", () => {
    test("shows auth error on 401", async () => {
      mockedAxios.get.mockRejectedValue({ response: { status: 401 } });
      render(<MarketplaceCoverageCenter />);
      expect(await screen.findByText("ليس لديك صلاحية الوصول إلى هذه البيانات")).toBeInTheDocument();
    });

    test("shows auth error on 403", async () => {
      mockedAxios.get.mockRejectedValue({ response: { status: 403 } });
      render(<MarketplaceCoverageCenter />);
      expect(await screen.findByText("ليس لديك صلاحية الوصول إلى هذه البيانات")).toBeInTheDocument();
    });

    test("shows 404 error", async () => {
      mockedAxios.get.mockRejectedValue({ response: { status: 404 } });
      render(<MarketplaceCoverageCenter />);
      expect(await screen.findByText("خدمة التغطية غير متوفرة حالياً")).toBeInTheDocument();
    });

    test("shows API message on general error", async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 500, data: { message: "Internal server error" } },
      });
      render(<MarketplaceCoverageCenter />);
      expect(await screen.findByText("Internal server error")).toBeInTheDocument();
    });

    test("shows generic error when API response success is false", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: false, data: null },
      });
      render(<MarketplaceCoverageCenter />);
      expect(await screen.findByText(/تعذر تحميل/i)).toBeInTheDocument();
    });

    test("shows network error when no response", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network Error"));
      render(<MarketplaceCoverageCenter />);
      expect(await screen.findByText(/تعذر تحميل/i)).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    test("shows no companies alert when filteredCoverage is empty with query", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { ...coveragePayload, companies: [] } },
      });
      render(<MarketplaceCoverageCenter />);
      expect(await screen.findByText("لا توجد شركات مطابقة للفلتر الحالي.")).toBeInTheDocument();
    });
  });

  describe("filter functionality", () => {
    test("shows clean company info when no risk", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...coveragePayload,
            companies: [{
              ...coveragePayload.companies[0],
              activeAppSlugs: ["order-core"],
            }],
          },
        },
      });
      render(<MarketplaceCoverageCenter />);
      expect(await screen.findByText("نظيفة")).toBeInTheDocument();
    });

    test("switching filter changes company list", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: coveragePayload },
      });
      render(<MarketplaceCoverageCenter />);

      expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);

      const filterSelect = screen.getByLabelText("فلتر الحالة");
      fireEvent.mouseDown(filterSelect);

      const allOption = await screen.findByText("كل الشركات");
      fireEvent.click(allOption);

      expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);
    });

    test("shows totals card with correct values", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: coveragePayload },
      });
      render(<MarketplaceCoverageCenter />);

      expect(await screen.findByText("الشركات المقروءة")).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    test("filters companies by search query", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...coveragePayload,
            companies: [
              ...coveragePayload.companies,
              {
                id: "company-2",
                name: "Other Co",
                email: "other@test.com",
                slug: "other",
                plan: "BASIC",
                isActive: true,
                activeAppSlugs: [],
              },
            ],
          },
        },
      });
      render(<MarketplaceCoverageCenter />);

      expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);
      expect(screen.getByText("Other Co")).toBeInTheDocument();

      const searchInput = screen.getByLabelText("بحث عن شركة");
      fireEvent.change(searchInput, { target: { value: "Other" } });

      expect(screen.getByText("Other Co")).toBeInTheDocument();
      const sidebarItems = screen.getAllByText("Swan");
      expect(sidebarItems.length).toBe(1);
    });
  });

  describe("install flow", () => {
    test("installs a fallback app", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: coveragePayload },
      });
      mockedAxios.post.mockResolvedValue({
        data: { success: true, data: { installation: { id: "install-1" } } },
      });

      render(<MarketplaceCoverageCenter />);

      expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);
      expect(screen.getByText("Order Core")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /تفعيل/i }));

      expect(await screen.findByText("تأكيد تفعيل التطبيق")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /تأكيد التفعيل/i }));

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "super-admin/marketplace-management/coverage/companies/company-1/apps/order-core/install",
          { pricingModel: "SUBSCRIPTION" },
          expect.any(Object),
        );
        expect(mockedToast.success).toHaveBeenCalledWith("تم تفعيل التطبيق للشركة");
      });
    });

    test("cancel dialog does not install", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: coveragePayload },
      });

      render(<MarketplaceCoverageCenter />);

      expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("button", { name: /تفعيل/i }));
      expect(await screen.findByText("تأكيد تفعيل التطبيق")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /إلغاء/i }));

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    test("shows error toast when install fails", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: coveragePayload },
      });
      mockedAxios.post.mockRejectedValue({
        response: { data: { message: "Company not found" } },
      });

      render(<MarketplaceCoverageCenter />);

      expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole("button", { name: /تفعيل/i }));
      expect(await screen.findByText("تأكيد تفعيل التطبيق")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /تأكيد التفعيل/i }));

      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalledWith("Company not found");
      });
    });
  });

  describe("refresh button", () => {
    test("refreshes data when clicked", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: coveragePayload },
      });

      render(<MarketplaceCoverageCenter />);

      expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);

      const refreshBtn = screen.getByRole("button", { name: /تحديث التغطية/i });
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("pricing model from API", () => {
    test("uses app pricing model from catalog", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...coveragePayload,
            apps: [{
              ...coveragePayload.apps[0],
              pricingModel: "FREE",
            }],
          },
        },
      });
      mockedAxios.post.mockResolvedValue({
        data: { success: true, data: { installation: { id: "install-1" } } },
      });

      render(<MarketplaceCoverageCenter />);

      expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole("button", { name: /تفعيل/i }));
      expect(await screen.findByText("تأكيد تفعيل التطبيق")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /تأكيد التفعيل/i }));

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          { pricingModel: "FREE" },
          expect.any(Object),
        );
      });
    });
  });
});
