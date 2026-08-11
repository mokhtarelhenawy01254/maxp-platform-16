import { render, screen, waitFor } from "@testing-library/react";
import OutcomesTab from "../tabs/OutcomesTab";

jest.mock("../orderMovementShared", () => require("../testSupport").buildSharedMock());
jest.mock("recharts", () => require("../testSupport").buildRechartsMock());

import { fetchMovement } from "../orderMovementShared";

const mockFetch = fetchMovement as jest.Mock;
const props = { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" as const };

const outcomesData = {
  summary: {
    totalOrders: 10,
    delivered: 7,
    failed: 2,
    pending: 1,
    successRate: 70,
    deliveredRevenue: 700,
    lostRevenue: 200,
    failedRevenue: 200,
  },
  outcomes: [
    { status: "DELIVERED", count: 7, percent: 70, revenue: 700, avgOrderValue: 100, isTerminal: true },
    { status: "CANCELLED", count: 2, percent: 20, revenue: 200, avgOrderValue: 100, isTerminal: true },
  ],
  reasons: [{ reason: "العميل رفض", count: 2, revenue: 200, status: "CANCELLED" }],
  modeSplit: { manual: 9, auto: 1 },
};

describe("OutcomesTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs, outcomes and reasons from data", async () => {
    mockFetch.mockResolvedValue(outcomesData);

    render(<OutcomesTab {...props} />);

    await waitFor(() => expect(screen.getByText("إجمالي الطلبات")).toBeInTheDocument());
    expect(screen.getByText("مُسلَّم")).toBeInTheDocument();
    expect(screen.getByText("نسبة النجاح")).toBeInTheDocument();
    expect(screen.getByText("الإيراد الضائع")).toBeInTheDocument();
    expect(screen.getByText("توزيع النتائج")).toBeInTheDocument();
    expect(screen.getByText("أسباب الفشل")).toBeInTheDocument();
    expect(screen.getByText("العميل رفض")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("outcomes", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no orders", async () => {
    mockFetch.mockResolvedValue({ ...outcomesData, summary: { ...outcomesData.summary, totalOrders: 0 } });

    render(<OutcomesTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("فشل"));

    render(<OutcomesTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
