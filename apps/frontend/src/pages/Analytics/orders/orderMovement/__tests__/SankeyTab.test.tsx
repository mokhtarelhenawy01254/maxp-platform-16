import { render, screen, waitFor } from "@testing-library/react";
import SankeyTab from "../tabs/SankeyTab";

jest.mock("../orderMovementShared", () => require("../testSupport").buildSharedMock());
jest.mock("recharts", () => require("../testSupport").buildRechartsMock());

import { fetchMovement } from "../orderMovementShared";

const mockFetch = fetchMovement as jest.Mock;
const props = { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" as const };

const sankeyData = {
  totalTransitions: 10,
  totalOrders: 5,
  modes: { manual: 8, auto: 2 },
  nodes: [
    { id: "START", name: "╪¿╪»╪º┘è╪⌐" },
    { id: "DELIVERED", name: "DELIVERED" },
  ],
  links: [{ source: 0, target: 1, value: 5, manual: 5, auto: 0, revenue: 100 }],
  topInflows: [{ status: "DELIVERED", count: 5 }],
  topOutflows: [{ status: "START", count: 5 }],
};

describe("SankeyTab", () => {
  beforeEach(() => mockFetch.mockReset());

  test("renders KPIs and flow lists from data", async () => {
    mockFetch.mockResolvedValue(sankeyData);

    render(<SankeyTab {...props} />);

    await waitFor(() => expect(screen.getByText("╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪¡╪▒┘â╪º╪¬")).toBeInTheDocument());
    expect(screen.getByText("╪¡╪▒┘â╪º╪¬ ┘è╪»┘ê┘è╪⌐")).toBeInTheDocument();
    expect(screen.getByText("╪«╪▒┘è╪╖╪⌐ ╪¬╪»┘ü┘é ╪¡╪▒┘â╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬")).toBeInTheDocument();
    expect(screen.getByText("╪ú╪╣┘ä┘ë ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪»╪«┘ê┘ä╪º┘ï")).toBeInTheDocument();
    expect(screen.getByText("╪ú╪╣┘ä┘ë ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪«╪▒┘ê╪¼╪º┘ï")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("sankey", { startDate: "2026-05-01", endDate: "2026-08-11", mode: "all" });
  });

  test("renders empty state when there are no links", async () => {
    mockFetch.mockResolvedValue({ ...sankeyData, links: [], totalTransitions: 0 });

    render(<SankeyTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("empty")).toBeInTheDocument());
  });

  test("renders error state on failure", async () => {
    mockFetch.mockRejectedValue(new Error("┘ü╪┤┘ä"));

    render(<SankeyTab {...props} />);

    await waitFor(() => expect(screen.getByTestId("error")).toBeInTheDocument());
  });
});
