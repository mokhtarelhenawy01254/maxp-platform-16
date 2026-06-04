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
  totals: {
    companies: 1,
    returnedCompanies: 1,
    marketplaceApps: 1,
  },
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
    },
  ],
};

describe("MarketplaceCoverageCenter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: coveragePayload },
    });
    mockedAxios.post.mockResolvedValue({
      data: { success: true, data: { installation: { id: "install-1" } } },
    });
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  test("renders company coverage and installs a fallback app from the page", async () => {
    render(<MarketplaceCoverageCenter />);

    expect((await screen.findAllByText("Swan")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fallback/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Order Core")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /تفعيل/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "super-admin/marketplace-management/coverage/companies/company-1/apps/order-core/install",
        { pricingModel: "SUBSCRIPTION" },
        expect.any(Object),
      );
      expect(mockedToast.success).toHaveBeenCalledWith("تم تفعيل التطبيق للشركة");
    });
  });
});
