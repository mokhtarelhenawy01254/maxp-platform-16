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
      requestedByName: "أحمد",
      fromStatus: { name: "مؤكد", code: "CONFIRMED" },
      toStatus: { name: "تم التسليم", code: "DELIVERED" },
      reason: null,
      status: "approved",
      reviewedBy: "u2",
      reviewedByName: "علي",
      reviewedAt: "2026-08-02T00:00:00Z",
      createdAt: "2026-08-01T00:00:00Z",
    },
  ],
  reviewers: [{ name: "علي", reviewedCount: 1, approved: 1, rejected: 0, avgReviewHours: 2 }],
};

describe("ApprovalsTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs, reviewers and requests from data", async () => {
    mockFetch.mockResolvedValue(approvalsData);

    render(<ApprovalsTab {...props} />);

    await waitFor(() => expect(screen.getByText("إجمالي الطلبات")).toBeInTheDocument());
    expect(screen.getAllByText("بانتظار الموافقة").length).toBeGreaterThan(0);
    expect(screen.getAllByText("موافق عليها").length).toBeGreaterThan(0);
    expect(screen.getByText("معدل الموافقة")).toBeInTheDocument();
    expect(screen.getByText("تجاوزات")).toBeInTheDocument();
    expect(screen.getByText("حالة الموافقات")).toBeInTheDocument();
    expect(screen.getByText("أداء المراجعين")).toBeInTheDocument();
    expect(screen.getByText("طلبات تغيير الحالة")).toBeInTheDocument();
    expect(screen.getByText("ORD-1")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("approvals", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no requests", async () => {
    mockFetch.mockResolvedValue({ ...approvalsData, summary: { ...approvalsData.summary, totalRequests: 0 }, requests: [] });

    render(<ApprovalsTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("فشل"));

    render(<ApprovalsTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
