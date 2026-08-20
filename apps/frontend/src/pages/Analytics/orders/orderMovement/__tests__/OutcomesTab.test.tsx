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
  reasons: [{ reason: "╪º┘ä╪╣┘à┘è┘ä ╪▒┘ü╪╢", count: 2, revenue: 200, status: "CANCELLED" }],
  modeSplit: { manual: 9, auto: 1 },
};

describe("OutcomesTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs, outcomes and reasons from data", async () => {
    mockFetch.mockResolvedValue(outcomesData);

    render(<OutcomesTab {...props} />);

    await waitFor(() => expect(screen.getByText("╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬")).toBeInTheDocument());
    expect(screen.getByText("┘à┘Å╪│┘ä┘Ä┘æ┘à")).toBeInTheDocument();
    expect(screen.getByText("┘å╪│╪¿╪⌐ ╪º┘ä┘å╪¼╪º╪¡")).toBeInTheDocument();
    expect(screen.getByText("╪º┘ä╪Ñ┘è╪▒╪º╪» ╪º┘ä╪╢╪º╪ª╪╣")).toBeInTheDocument();
    expect(screen.getByText("╪¬┘ê╪▓┘è╪╣ ╪º┘ä┘å╪¬╪º╪ª╪¼")).toBeInTheDocument();
    expect(screen.getByText("╪ú╪│╪¿╪º╪¿ ╪º┘ä┘ü╪┤┘ä")).toBeInTheDocument();
    expect(screen.getByText("╪º┘ä╪╣┘à┘è┘ä ╪▒┘ü╪╢")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("outcomes", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no orders", async () => {
    mockFetch.mockResolvedValue({ ...outcomesData, summary: { ...outcomesData.summary, totalOrders: 0 } });

    render(<OutcomesTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("┘ü╪┤┘ä"));

    render(<OutcomesTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
