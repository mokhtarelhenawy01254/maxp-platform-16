import { render, screen, waitFor } from "@testing-library/react";
import TeamTab from "../tabs/TeamTab";

jest.mock("../orderMovementShared", () => require("../testSupport").buildSharedMock());
jest.mock("recharts", () => require("../testSupport").buildRechartsMock());

import { fetchMovement } from "../orderMovementShared";

const mockFetch = fetchMovement as jest.Mock;
const props = { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" as const };

const teamData = {
  summary: { totalTransitions: 10, manualTransitions: 8, autoTransitions: 2, activeMembers: 1 },
  members: [
    {
      name: "أحمد",
      changedBy: "u1",
      transitions: 8,
      manualTransitions: 8,
      autoTransitions: 0,
      confirms: 3,
      cancels: 1,
      deliveries: 2,
      invalidTransitions: 0,
      avgHoursToConfirm: 1,
      avgHoursToCancel: 2,
      revenue: 500,
      isSystem: false,
    },
    {
      name: "النظام (تلقائي)",
      changedBy: "SYSTEM_AUTO",
      transitions: 2,
      manualTransitions: 0,
      autoTransitions: 2,
      confirms: 0,
      cancels: 0,
      deliveries: 0,
      invalidTransitions: 0,
      avgHoursToConfirm: 0,
      avgHoursToCancel: 0,
      revenue: 100,
      isSystem: true,
    },
  ],
};

describe("TeamTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs and the team leaderboard from data", async () => {
    mockFetch.mockResolvedValue(teamData);

    render(<TeamTab {...props} />);

    await waitFor(() => expect(screen.getByText("حركات يدوية")).toBeInTheDocument());
    expect(screen.getByText("حركات تلقائية")).toBeInTheDocument();
    expect(screen.getByText("أعضاء نشطون")).toBeInTheDocument();
    expect(screen.getByText("الحركات حسب العضو")).toBeInTheDocument();
    expect(screen.getByText("ترتيب الفريق")).toBeInTheDocument();
    expect(screen.getByText("أحمد")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("team", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no members", async () => {
    mockFetch.mockResolvedValue({ ...teamData, members: [] });

    render(<TeamTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("فشل"));

    render(<TeamTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
