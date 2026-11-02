import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import VariationsAnalytics from "../VariationsAnalytics";
import { VariationsCharts } from "../VariationsCharts";
import analyticsService from "../../../../services/analyticsService";

// Mock analyticsService
jest.mock("../../../../services/analyticsService", () => ({
  __esModule: true,
  default: {
    getVariationsAnalytics: jest.fn(),
  },
}));

// Mock useCurrency
const mockFormatPrice = jest.fn((amount: number | null | undefined) => `${Number(amount || 0).toLocaleString()} ج.م`);
jest.mock("../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: mockFormatPrice,
    isLoading: false,
    error: null,
  }),
}));

// Mock DeferredResponsiveContainer
jest.mock("../../../../components/ui/DeferredResponsiveContainer", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="deferred-responsive-container">{children}</div>
  ),
}));

// Capture Tooltip props to test the formatter
let capturedTooltips: any[] = [];

jest.mock("recharts", () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data, children, dataKey, nameKey }: any) => (
      <div data-testid="pie" data-key={dataKey} data-name-key={nameKey}>
        {data?.map((item: any, idx: number) => (
          <div key={idx} data-testid={`slice-${item.name}`} data-item={JSON.stringify(item)}>
            {item.name}
          </div>
        ))}
        {children}
      </div>
    ),
    Cell: () => null,
    Tooltip: (props: any) => {
      capturedTooltips.push(props);
      return <div data-testid="chart-tooltip" data-has-formatter={Boolean(props.formatter)} />;
    },
  };
});

// Mock i18next
let currentLanguage = "ar";
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translationsAr: Record<string, string> = {
        "variationsAnalytics.title": "تحليلات المتغيرات",
        "variationsAnalytics.topSizes": "أفضل المقاسات مبيعاً",
        "variationsAnalytics.topColors": "أفضل الألوان مبيعاً",
        "variationsAnalytics.qtyRevenue": "الكمية / الإيراد",
        "variationsAnalytics.sales": "المبيعات",
        "variationsAnalytics.revenue": "الإيرادات",
      };
      const translationsEn: Record<string, string> = {
        "variationsAnalytics.title": "Variations Analytics",
        "variationsAnalytics.topSizes": "Top Selling Sizes",
        "variationsAnalytics.topColors": "Top Selling Colors",
        "variationsAnalytics.qtyRevenue": "Qty / Revenue",
        "variationsAnalytics.sales": "Sales",
        "variationsAnalytics.revenue": "Revenue",
      };
      const dict = currentLanguage === "ar" ? translationsAr : translationsEn;
      return dict[key] || fallback || key;
    },
    i18n: {
      get language() {
        return currentLanguage;
      },
    },
  }),
}));

const mockVariationsData = {
  success: true,
  data: {
    sizes: [
      { name: "XL", sales: 42, revenue: 8400 },
      { name: "L", sales: 18, revenue: 3600 },
    ],
    colors: [
      { name: "Red", sales: 35, revenue: 7000 },
      { name: "Blue", sales: 25, revenue: 5000 },
    ],
    topVariations: [
      {
        name: "Classic T-Shirt - Red - XL",
        product: "Classic T-Shirt",
        productId: "prod-1",
        color: "Red",
        size: "XL",
        sales: 42,
        revenue: 8400,
        orders: 15,
      },
      {
        name: "Classic T-Shirt - Blue - L",
        product: "Classic T-Shirt",
        productId: "prod-1",
        color: "Blue",
        size: "L",
        sales: 18,
        revenue: 3600,
        orders: 8,
      },
    ],
    totalVariations: 2,
    totalSales: 60,
    totalRevenue: 12000,
    totalOrders: 23,
    filteredProduct: null,
  },
};

describe("VariationsAnalytics and VariationsCharts Tooltip", () => {
  beforeEach(() => {
    capturedTooltips = [];
    currentLanguage = "ar";
    jest.clearAllMocks();
    (analyticsService.getVariationsAnalytics as jest.Mock).mockResolvedValue(mockVariationsData);
  });

  it("renders page and tooltip formatter returns both quantity and revenue matching the table row", async () => {
    render(
      <MemoryRouter initialEntries={["/analytics/orders/variations"]}>
        <Routes>
          <Route path="/analytics/orders/variations" element={<VariationsAnalytics />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(analyticsService.getVariationsAnalytics).toHaveBeenCalled();
    });

    // Check table has row with quantity 42 and revenue formatted
    await waitFor(() => {
      expect(screen.getByText("Classic T-Shirt - Red - XL")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Verify tooltips were captured for both charts (sizes pie and colors pie)
    expect(capturedTooltips.length).toBeGreaterThanOrEqual(2);

    const sizesTooltip = capturedTooltips[0];
    expect(typeof sizesTooltip.formatter).toBe("function");

    // Call the formatter with the fixture row (XL: sales 42, revenue 8400)
    const fixtureItem = { payload: { name: "XL", sales: 42, revenue: 8400 } };
    const [formattedVal, label] = sizesTooltip.formatter(42, "XL", fixtureItem);

    // Formatted value must contain BOTH quantity and revenue
    expect(formattedVal).toContain("42");
    expect(formattedVal).toContain("8,400");
    // Formatted label should be Arabic "الكمية / الإيراد"
    expect(label).toBe("الكمية / الإيراد");

    // Ensure the revenue in the tooltip equals the table row's revenue
    const expectedRevenue = mockFormatPrice(8400);
    expect(formattedVal).toContain(expectedRevenue);
  });

  it("displays English tooltip label 'Qty / Revenue' when language is English", async () => {
    currentLanguage = "en";

    render(
      <VariationsCharts
        sizes={mockVariationsData.data.sizes}
        colors={mockVariationsData.data.colors}
        isArabic={false}
      />
    );

    expect(capturedTooltips.length).toBeGreaterThanOrEqual(2);
    const tooltip = capturedTooltips[0];

    const fixtureItem = { payload: { name: "XL", sales: 42, revenue: 8400 } };
    const [formattedVal, label] = tooltip.formatter(42, "XL", fixtureItem);

    expect(formattedVal).toContain("42");
    expect(formattedVal).toContain("8,400");
    expect(label).toBe("Qty / Revenue");
  });

  it("safely handles zero or missing revenue in tooltip payload", () => {
    render(
      <VariationsCharts
        sizes={[{ name: "S", sales: 5, revenue: 0 }]}
        colors={[{ name: "Green", sales: 5, revenue: 0 }]}
        isArabic={true}
      />
    );

    const tooltip = capturedTooltips[capturedTooltips.length - 1];
    const [formattedVal, label] = tooltip.formatter(5, "S", { payload: { sales: 5 } });

    expect(formattedVal).toContain("5");
    expect(formattedVal).toContain("0");
    expect(label).toBe("الكمية / الإيراد");
  });
});
