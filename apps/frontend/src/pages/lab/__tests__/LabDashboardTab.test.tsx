import { render, screen, waitFor } from "@testing-library/react";
import LabDashboardTab from "../LabDashboardTab";

jest.mock("../shared", () => ({
  api: (p: string) => `https://x/api/v1/lab/${p}`,
  bookingApi: (p: string) => `https://x/api/v1/booking/${p}`,
  fetchJson: jest.fn(),
  LAB_STATUS_MAP: {
    PENDING: { label: "╪¿╪º┘å╪¬╪╕╪º╪▒ ╪ú╪«╪░ ╪º┘ä╪╣┘è┘å╪⌐", color: "x" },
    COLLECTED: { label: "╪¬┘à ╪ú╪«╪░ ╪º┘ä╪╣┘è┘å╪⌐", color: "x" },
    IN_PROGRESS: { label: "╪¼╪º╪▒┘ì ╪º┘ä╪¬╪¡┘ä┘è┘ä", color: "x" },
    REVIEWED: { label: "╪¬┘à╪¬ ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐", color: "x" },
    SIGNED: { label: "╪¬┘à ╪º┘ä╪¬┘ê┘é┘è╪╣", color: "x" },
    DELIVERED: { label: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à", color: "x" },
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

    await waitFor(() => expect(screen.getByText("╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘è┘ê┘à")).toBeInTheDocument());
    expect(screen.getByText("┘é┘è╪» ╪º┘ä╪¬╪¡┘ä┘è┘ä")).toBeInTheDocument();
    expect(screen.getByText("┘à┘ê┘é╪╣╪⌐ / ┘à╪│┘ä┘à╪⌐")).toBeInTheDocument();
    expect(screen.getByText("╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒")).toBeInTheDocument();
    expect(screen.getByText("╪º┘ä┘à╪¡╪╡┘ä")).toBeInTheDocument();
  });

  test("renders error state on failure", async () => {
    mockFetchJson.mockRejectedValueOnce(new Error("┘ü╪┤┘ä"));
    render(<LabDashboardTab />);
    await waitFor(() => expect(screen.getByText("┘ü╪┤┘ä")).toBeInTheDocument());
  });
});
