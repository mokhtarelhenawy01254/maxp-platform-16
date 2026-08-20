import { render, screen, waitFor } from "@testing-library/react";
import StatusMatrixTab from "../tabs/StatusMatrixTab";

jest.mock("../orderMovementShared", () => require("../testSupport").buildSharedMock());
jest.mock("recharts", () => require("../testSupport").buildRechartsMock());

import { fetchMovement } from "../orderMovementShared";

const mockFetch = fetchMovement as jest.Mock;
const props = { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" as const };

const matrixData = {
  totalTransitions: 10,
  totalOrders: 5,
  forwardCount: 4,
  backwardCount: 2,
  skipCount: 1,
  invalidCount: 0,
  startCount: 3,
  sameCount: 0,
  otherCount: 0,
  rows: [
    { fromStatus: "PENDING", toStatus: "CONFIRMED", count: 4, revenue: 100, manualCount: 4, autoCount: 0, kind: "forward" },
  ],
  statuses: ["PENDING", "CONFIRMED"],
  modes: { manual: 8, auto: 2 },
};

describe("StatusMatrixTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPI cards and matrix from data", async () => {
    mockFetch.mockResolvedValue(matrixData);

    render(<StatusMatrixTab {...props} />);

    await waitFor(() => expect(screen.getByText("╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪¡╪▒┘â╪º╪¬")).toBeInTheDocument());
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getAllByText("╪¬┘é╪»┘à").length).toBeGreaterThan(0);
    expect(screen.getByText("┘à╪╡┘ü┘ê┘ü╪⌐ ╪º┘ä╪º┘å╪¬┘é╪º┘ä╪º╪¬")).toBeInTheDocument();
    expect(screen.getByText("┘à┘å \\ ╪Ñ┘ä┘ë")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("matrix", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no transitions", async () => {
    mockFetch.mockResolvedValue({ ...matrixData, totalTransitions: 0, rows: [] });

    render(<StatusMatrixTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("┘ü╪┤┘ä"));

    render(<StatusMatrixTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
