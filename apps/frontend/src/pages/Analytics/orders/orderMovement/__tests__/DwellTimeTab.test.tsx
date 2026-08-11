import { render, screen, waitFor } from "@testing-library/react";
import DwellTimeTab from "../tabs/DwellTimeTab";

jest.mock("../orderMovementShared", () => require("../testSupport").buildSharedMock());
jest.mock("recharts", () => require("../testSupport").buildRechartsMock());

import { fetchMovement } from "../orderMovementShared";

const mockFetch = fetchMovement as jest.Mock;
const props = { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" as const };

const dwellData = {
  totalOrders: 10,
  statuses: [
    { status: "PENDING", entries: 5, avgHours: 10, p50Hours: 8, p90Hours: 20, maxHours: 30, manualEntries: 5, autoEntries: 0 },
  ],
  cycleTime: { avgHours: 40, p50Hours: 35, p90Hours: 60, sampleSize: 6, manualAvgHours: 40, autoAvgHours: 0 },
};

describe("DwellTimeTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs and per-status dwell list from data", async () => {
    mockFetch.mockResolvedValue(dwellData);

    render(<DwellTimeTab {...props} />);

    await waitFor(() => expect(screen.getByText("أبطأ حالة")).toBeInTheDocument());
    expect(screen.getByText("أسرع حالة")).toBeInTheDocument();
    expect(screen.getByText("متوسط زمن الدورة")).toBeInTheDocument();
    expect(screen.getByText("المكوث لكل حالة")).toBeInTheDocument();
    expect(screen.getByText("متوسط المكوث بالحالة")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("dwell-time", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no statuses", async () => {
    mockFetch.mockResolvedValue({ totalOrders: 0, statuses: [], cycleTime: { avgHours: 0, p50Hours: 0, p90Hours: 0, sampleSize: 0, manualAvgHours: 0, autoAvgHours: 0 } });

    render(<DwellTimeTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("فشل"));

    render(<DwellTimeTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
