import { render, screen, waitFor } from "@testing-library/react";
import LabInvoicesTab from "../LabInvoicesTab";

jest.mock("../shared", () => ({
  bookingApi: (p: string) => `https://x/api/v1/booking/${p}`,
  fetchJson: jest.fn(),
}));

import { fetchJson } from "../shared";
const mockFetchJson = fetchJson as jest.Mock;

describe("LabInvoicesTab", () => {
  beforeEach(() => mockFetchJson.mockReset());

  test("renders invoices with net/remaining", async () => {
    mockFetchJson.mockResolvedValueOnce([
      { id: "i1", invoiceNumber: "INV-1", total: 100, discount: 10, additionAmount: 5, amountPaid: 60, status: "PARTIAL", patient: { firstName: "┘à╪¡┘à╪»" } },
    ]);

    render(<LabInvoicesTab />);
    await waitFor(() => expect(screen.getByText("INV-1")).toBeInTheDocument());
    expect(screen.getByText("┘à╪│╪»╪» ╪¼╪▓╪ª┘è╪º┘ï")).toBeInTheDocument();
  });

  test("shows empty state", async () => {
    mockFetchJson.mockResolvedValueOnce([]);
    render(<LabInvoicesTab />);
    await waitFor(() => expect(screen.getByText("┘ä╪º ╪¬┘ê╪¼╪» ┘ü┘ê╪º╪¬┘è╪▒")).toBeInTheDocument());
  });
});
