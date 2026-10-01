import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import MarketplaceAppsManagement from "../MarketplaceAppsManagement";
import { toast } from "sonner";

jest.mock("axios");
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock("../../../utils/urlHelper", () => ({
  buildApiUrl: (endpoint: string) => endpoint,
}));
jest.mock("../../subscription/AppPricingSheet", () => ({
  __esModule: true,
  default: () => null,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

function mockMainEndpoint(url: string, data: unknown) {
  if (url.includes("super-admin/marketplace-management/apps")) {
    return Promise.resolve({ data: { success: true, data: [] } });
  }
  if (url.includes("super-admin/marketplace-management/pricing-rules")) {
    return Promise.resolve({ data: { success: true, data: [] } });
  }
  if (url.includes("super-admin/marketplace-management/bundles")) {
    return Promise.resolve({ data: { success: true, data: [] } });
  }
  if (url.includes("super-admin/marketplace-management/catalog/diff")) {
    return Promise.resolve({ data: { success: true, data } });
  }
  return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
}

describe("MarketplaceAppsManagement Catalog Diff UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.localStorage.getItem as jest.Mock).mockReturnValue("test-token");
  });

  test("renders catalog diff summary on marketplace tab", async () => {
    const diffResponse = {
      comparedAt: "2026-03-06T12:00:00.000Z",
      totals: {
        catalogApps: 8,
        dbApps: 7,
        catalogBundles: 3,
        dbBundles: 2,
        diffEntries: 4,
      },
      apps: {
        missingInDb: ["catalog-only-app"],
        extraInDb: [],
        changed: [],
      },
      bundles: {
        missingInDb: [],
        extraInDb: ["db-only-bundle"],
        changed: [],
      },
    };

    mockedAxios.get.mockImplementation((url: string) =>
      mockMainEndpoint(String(url), diffResponse),
    );

    render(<MarketplaceAppsManagement />);

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("catalog/diff"),
        expect.any(Object),
      ),
    );

    const tabs = await screen.findAllByRole("tab");
    const marketplaceTab = tabs[0];
    if (!marketplaceTab) {
      throw new Error("Marketplace tab was not rendered");
    }
    fireEvent.click(marketplaceTab);

    expect(await screen.findByText(/الملفات مقابل قاعدة البيانات/i)).toBeInTheDocument();
    expect(screen.getByText("التطبيقات (الملفات/قاعدة البيانات)")).toBeInTheDocument();
    expect(screen.getByText("الباقات (الملفات/قاعدة البيانات)")).toBeInTheDocument();
    expect(screen.getByText("8/7")).toBeInTheDocument();
    expect(screen.getByText("3/2")).toBeInTheDocument();
  });

  test("refreshes catalog diff and updates details content", async () => {
    const firstDiff = {
      comparedAt: "2026-03-06T12:00:00.000Z",
      totals: {
        catalogApps: 8,
        dbApps: 8,
        catalogBundles: 3,
        dbBundles: 3,
        diffEntries: 1,
      },
      apps: {
        missingInDb: ["old-catalog-app"],
        extraInDb: [],
        changed: [],
      },
      bundles: {
        missingInDb: [],
        extraInDb: [],
        changed: [],
      },
    };

    const secondDiff = {
      comparedAt: "2026-03-06T12:10:00.000Z",
      totals: {
        catalogApps: 8,
        dbApps: 7,
        catalogBundles: 3,
        dbBundles: 2,
        diffEntries: 2,
      },
      apps: {
        missingInDb: ["new-catalog-app"],
        extraInDb: [],
        changed: [],
      },
      bundles: {
        missingInDb: [],
        extraInDb: ["new-db-bundle"],
        changed: [],
      },
    };

    let diffCall = 0;
    mockedAxios.get.mockImplementation((url: string) => {
      if (String(url).includes("super-admin/marketplace-management/catalog/diff")) {
        diffCall += 1;
        return Promise.resolve({
          data: {
            success: true,
            data: diffCall === 1 ? firstDiff : secondDiff,
          },
        });
      }
      return mockMainEndpoint(String(url), firstDiff);
    });

    render(<MarketplaceAppsManagement />);

    const tabs = await screen.findAllByRole("tab");
    const marketplaceTab = tabs[0];
    if (!marketplaceTab) {
      throw new Error("Marketplace tab was not rendered");
    }
    fireEvent.click(marketplaceTab);

    expect(await screen.findByText(/الملفات مقابل قاعدة البيانات/i)).toBeInTheDocument();

    const detailsButton = screen.getByRole("button", { name: /عرض التفاصيل|إخفاء التفاصيل/i });
    fireEvent.click(detailsButton);
    expect(await screen.findByText("old-catalog-app")).toBeInTheDocument();

    const refreshButton = screen.getByRole("button", { name: /تحديث/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockedToast.success).toHaveBeenCalled();
      expect(screen.getByText("new-catalog-app")).toBeInTheDocument();
    });
  });
});
