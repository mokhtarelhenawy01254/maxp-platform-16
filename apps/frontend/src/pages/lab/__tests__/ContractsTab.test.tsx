import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContractsTab from "../ContractsTab";

jest.mock("../shared", () => ({
  api: (p: string) => `https://x/api/v1/lab/${p}`,
  getAuthHeaders: () => ({}),
  fetchJson: jest.fn(),
  MODAL_INPUT_CLS: "input",
  MODAL_CONTENT_CLS: "modal",
}));

const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) }) as Response;

describe("ContractsTab", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  test("renders contracts with discount type", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok([
      { id: "c1", name: "╪┤╪▒┘â╪⌐ VIP", region: "6 ╪ú┘â╪¬┘ê╪¿╪▒", governorate: "╪º┘ä╪¼┘è╪▓╪⌐", discountType: "PERCENTAGE", discountPercent: 15, externalSample: true, isActive: true },
    ]));

    render(<ContractsTab />);
    await waitFor(() => expect(screen.getByText(/╪┤╪▒┘â╪⌐ VIP/)).toBeInTheDocument());
  });

  test("creates a contract", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") return Promise.resolve(ok({ id: "c2" }));
      return Promise.resolve(ok([]));
    });
    render(<ContractsTab />);
    await waitFor(() => expect(screen.getByText("╪º┘ä╪¬╪╣╪º┘é╪»╪º╪¬")).toBeInTheDocument());

    await userEvent.click(screen.getByText("╪Ñ╪╢╪º┘ü╪⌐ ╪¬╪╣╪º┘é╪»"));
    await userEvent.type(screen.getByPlaceholderText(/╪┤╪▒┘â╪⌐ ╪º┘ä╪ú┘à┘ä/), "┘à┘è╪» ┘à╪╡╪▒");
    await userEvent.click(screen.getAllByRole("button").find(b => b.textContent === "╪¡┘ü╪╕")!);

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls as Array<[string, RequestInit | undefined]>;
      const post = calls.find(([u, o]) => String(u).includes("lab/contracts") && o?.method === "POST");
      expect(post).toBeTruthy();
    });
  });
});
