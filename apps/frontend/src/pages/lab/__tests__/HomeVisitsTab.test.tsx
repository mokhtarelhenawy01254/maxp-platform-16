import { render, screen, waitFor } from "@testing-library/react";
import HomeVisitsTab from "../HomeVisitsTab";

jest.mock("../shared", () => ({
  api: (p: string) => `https://x/api/v1/lab/${p}`,
  getAuthHeaders: () => ({}),
  fetchJson: jest.fn(),
  MODAL_INPUT_CLS: "input",
  MODAL_CONTENT_CLS: "modal",
  CULTURE_STATUS: { SCHEDULED: "┘à╪¼╪»┘ê┘ä╪⌐", DONE: "╪¬┘à╪¬", CANCELLED: "┘à┘ä╪║╪º╪⌐" },
}));

const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) }) as Response;

describe("HomeVisitsTab", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  test("renders visits with status badge", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok([
      { id: "v1", patientName: "╪╣┘ä┘è", phone: "010", address: "╪º┘ä┘à┘å╪╡┘ê╪▒╪⌐", status: "SCHEDULED", reviewed: false },
    ]));

    render(<HomeVisitsTab />);
    await waitFor(() => expect(screen.getByText(/╪╣┘ä┘è/)).toBeInTheDocument());
    expect(screen.getAllByText("┘à╪¼╪»┘ê┘ä╪⌐").length).toBeGreaterThan(0);
  });

  test("shows empty state", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok([]));
    render(<HomeVisitsTab />);
    await waitFor(() => expect(screen.getByText(/┘ä╪º ╪¬┘ê╪¼╪» ╪▓┘è╪º╪▒╪º╪¬|┘ä╪º ┘è┘ê╪¼╪»/)).toBeInTheDocument());
  });
});
