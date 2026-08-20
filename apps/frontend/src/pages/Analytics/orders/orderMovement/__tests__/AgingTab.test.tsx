import { render, screen, waitFor } from "@testing-library/react";
import AgingTab from "../tabs/AgingTab";

jest.mock("../orderMovementShared", () => require("../testSupport").buildSharedMock());
jest.mock("recharts", () => require("../testSupport").buildRechartsMock());

import { fetchMovement } from "../orderMovementShared";

const mockFetch = fetchMovement as jest.Mock;
const props = { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" as const };

const agingData = {
  summary: { totalAged: 3, oldestHours: 48, totalRevenue: 300, stuckOver7d: 1 },
  buckets: [{ key: "<1d", label: "أقل من يوم", count: 1, revenue: 100 }],
  orders: [
    {
      orderId: "o1",
      orderNumber: "ORD-1",
      status: "PENDING",
      ageHours: 48,
      total: 100,
      customerName: "عميل تجريبي",
      governorate: "القاهرة",
      lastTransitionAt: "2026-08-01T00:00:00Z",
      lastTransitionBy: "أحمد",
      lastTransitionAuto: false,
      updatedAt: "2026-08-10T00:00:00Z",
    },
  ],
};

describe("AgingTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs, buckets and the stuck orders list from data", async () => {
    mockFetch.mockResolvedValue(agingData);

    render(<AgingTab {...props} />);

    await waitFor(() => expect(screen.getByText("إجمالي المعلّق")).toBeInTheDocument());
    expect(screen.getByText("الأقدم")).toBeInTheDocument();
    expect(screen.getByText("قيمة الفلوس المحبوسة")).toBeInTheDocument();
    expect(screen.getByText("أكثر من أسبوع")).toBeInTheDocument();
    expect(screen.getByText("التوزيع حسب العمر")).toBeInTheDocument();
    expect(screen.getByText("قائمة الطلبات المعلقة")).toBeInTheDocument();
    expect(screen.getByText("ORD-1")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("aging", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all", minAgeHours: 24 });
  });

  test("renders empty state when there are no aged orders", async () => {
    mockFetch.mockResolvedValue({ ...agingData, summary: { totalAged: 0, oldestHours: 0, totalRevenue: 0, stuckOver7d: 0 }, orders: [] });

    render(<AgingTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("فشل"));

    render(<AgingTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
