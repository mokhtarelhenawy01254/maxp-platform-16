import { render, screen, waitFor } from "@testing-library/react";
import PathsTab from "../tabs/PathsTab";

jest.mock("../orderMovementShared", () => require("../testSupport").buildSharedMock());
jest.mock("recharts", () => require("../testSupport").buildRechartsMock());

import { fetchMovement } from "../orderMovementShared";

const mockFetch = fetchMovement as jest.Mock;
const props = { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" as const };

const pathsData = {
  totalOrders: 10,
  uniquePaths: 2,
  stats: {
    maxPathLength: 3,
    avgPathLength: 1.5,
    avgPathHours: 24,
    successPathCount: 6,
    failedPathCount: 2,
    pendingPathCount: 2,
  },
  topPaths: [
    {
      path: "PENDING→DELIVERED",
      orderCount: 6,
      percent: 60,
      avgHours: 24,
      medianHours: 20,
      avgOrderValue: 100,
      totalRevenue: 600,
      terminalStatus: "DELIVERED",
      manualTransitions: 6,
      autoTransitions: 0,
    },
  ],
};

describe("PathsTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs and top paths from data", async () => {
    mockFetch.mockResolvedValue(pathsData);

    render(<PathsTab {...props} />);

    await waitFor(() => expect(screen.getByText("إجمالي الطلبات المحركة")).toBeInTheDocument());
    expect(screen.getByText("عدد المسارات")).toBeInTheDocument();
    expect(screen.getByText("حصيلة النتائج")).toBeInTheDocument();
    expect(screen.getByText("أكثر المسارات تكراراً")).toBeInTheDocument();
    expect(screen.getByText("DELIVERED")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("paths", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders the empty message when no paths exist", async () => {
    mockFetch.mockResolvedValue({ ...pathsData, totalOrders: 0, uniquePaths: 0, topPaths: [] });

    render(<PathsTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("فشل"));

    render(<PathsTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
