import { render, screen, waitFor } from "@testing-library/react";
import ApprovalsTab from "../tabs/ApprovalsTab";

jest.mock("../orderMovementShared", () => require("../testSupport").buildSharedMock());
jest.mock("recharts", () => require("../testSupport").buildRechartsMock());

import { fetchMovement } from "../orderMovementShared";

const mockFetch = fetchMovement as jest.Mock;
const props = { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" as const };

const approvalsData = {
  summary: { totalRequests: 3, pending: 1, approved: 2, rejected: 0, approvalRate: 66.7, avgReviewHours: 2, totalOverrides: 1 },
  requests: [
    {
      id: "r1",
      orderId: "o1",
      orderNumber: "ORD-1",
      requestedBy: "u1",
      requestedByName: "╪ú╪¡┘à╪»",
      fromStatus: { name: "┘à╪ñ┘â╪»", code: "CONFIRMED" },
      toStatus: { name: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à", code: "DELIVERED" },
      reason: null,
      status: "approved",
      reviewedBy: "u2",
      reviewedByName: "╪╣┘ä┘è",
      reviewedAt: "2026-08-02T00:00:00Z",
      createdAt: "2026-08-01T00:00:00Z",
    },
  ],
  reviewers: [{ name: "╪╣┘ä┘è", reviewedCount: 1, approved: 1, rejected: 0, avgReviewHours: 2 }],
};

describe("ApprovalsTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs, reviewers and requests from data", async () => {
    mockFetch.mockResolvedValue(approvalsData);

    render(<ApprovalsTab {...props} />);

    await waitFor(() => expect(screen.getByText("╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬")).toBeInTheDocument());
    expect(screen.getAllByText("╪¿╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä┘à┘ê╪º┘ü┘é╪⌐").length).toBeGreaterThan(0);
    expect(screen.getAllByText("┘à┘ê╪º┘ü┘é ╪╣┘ä┘è┘ç╪º").length).toBeGreaterThan(0);
    expect(screen.getByText("┘à╪╣╪»┘ä ╪º┘ä┘à┘ê╪º┘ü┘é╪⌐")).toBeInTheDocument();
    expect(screen.getByText("╪¬╪¼╪º┘ê╪▓╪º╪¬")).toBeInTheDocument();
    expect(screen.getByText("╪¡╪º┘ä╪⌐ ╪º┘ä┘à┘ê╪º┘ü┘é╪º╪¬")).toBeInTheDocument();
    expect(screen.getByText("╪ú╪»╪º╪í ╪º┘ä┘à╪▒╪º╪¼╪╣┘è┘å")).toBeInTheDocument();
    expect(screen.getByText("╪╖┘ä╪¿╪º╪¬ ╪¬╪║┘è┘è╪▒ ╪º┘ä╪¡╪º┘ä╪⌐")).toBeInTheDocument();
    expect(screen.getByText("ORD-1")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("approvals", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no requests", async () => {
    mockFetch.mockResolvedValue({ ...approvalsData, summary: { ...approvalsData.summary, totalRequests: 0 }, requests: [] });

    render(<ApprovalsTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("┘ü╪┤┘ä"));

    render(<ApprovalsTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
