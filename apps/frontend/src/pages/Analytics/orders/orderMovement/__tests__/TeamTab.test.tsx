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
      name: "╪ú╪¡┘à╪»",
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
      name: "╪º┘ä┘å╪╕╪º┘à (╪¬┘ä┘é╪º╪ª┘è)",
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

    await waitFor(() => expect(screen.getByText("╪¡╪▒┘â╪º╪¬ ┘è╪»┘ê┘è╪⌐")).toBeInTheDocument());
    expect(screen.getByText("╪¡╪▒┘â╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è╪⌐")).toBeInTheDocument();
    expect(screen.getByText("╪ú╪╣╪╢╪º╪í ┘å╪┤╪╖┘ê┘å")).toBeInTheDocument();
    expect(screen.getByText("╪º┘ä╪¡╪▒┘â╪º╪¬ ╪¡╪│╪¿ ╪º┘ä╪╣╪╢┘ê")).toBeInTheDocument();
    expect(screen.getByText("╪¬╪▒╪¬┘è╪¿ ╪º┘ä┘ü╪▒┘è┘é")).toBeInTheDocument();
    expect(screen.getByText("╪ú╪¡┘à╪»")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("team", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no members", async () => {
    mockFetch.mockResolvedValue({ ...teamData, members: [] });

    render(<TeamTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("┘ü╪┤┘ä"));

    render(<TeamTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
