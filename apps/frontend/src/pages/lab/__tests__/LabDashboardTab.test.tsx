import { render, screen, waitFor } from "@testing-library/react";
import LabDashboardTab from "../LabDashboardTab";

jest.mock("../shared", () => ({
  api: (p: string) => `https://x/api/v1/lab/${p}`,
  bookingApi: (p: string) => `https://x/api/v1/booking/${p}`,
  fetchJson: jest.fn(),
  LAB_STATUS_MAP: {
    PENDING: { label: "بانتظار أخذ العينة", color: "x" },
    COLLECTED: { label: "تم أخذ العينة", color: "x" },
    IN_PROGRESS: { label: "جارٍ التحليل", color: "x" },
    REVIEWED: { label: "تمت المراجعة", color: "x" },
    SIGNED: { label: "تم التوقيع", color: "x" },
    DELIVERED: { label: "تم التسليم", color: "x" },
  },
}));

import { fetchJson } from "../shared";

const mockFetchJson = fetchJson as jest.Mock;

describe("LabDashboardTab", () => {
  beforeEach(() => mockFetchJson.mockReset());

  test("renders KPI cards from orders + revenue", async () => {
    mockFetchJson
      .mockResolvedValueOnce({ items: [
        { status: "PENDING", reportStatus: "PENDING", total: 100, paid: 50 },
        { status: "SIGNED", reportStatus: "SIGNED", total: 200, paid: 200 },
      ], total: 2 })
      .mockResolvedValueOnce({ totals: { billed: 300 } });

    render(<LabDashboardTab />);

    await waitFor(() => expect(screen.getByText("طلبات اليوم")).toBeInTheDocument());
    expect(screen.getByText("قيد التحليل")).toBeInTheDocument();
    expect(screen.getByText("موقعة / مسلمة")).toBeInTheDocument();
    expect(screen.getByText("إجمالي الفواتير")).toBeInTheDocument();
    expect(screen.getByText("المحصل")).toBeInTheDocument();
  });

  test("renders error state on failure", async () => {
    mockFetchJson.mockRejectedValueOnce(new Error("فشل"));
    render(<LabDashboardTab />);
    await waitFor(() => expect(screen.getByText("فشل")).toBeInTheDocument());
  });
});
