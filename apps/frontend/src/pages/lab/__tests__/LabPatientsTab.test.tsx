import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LabPatientsTab from "../LabPatientsTab";

jest.mock("../shared", () => ({
  bookingApi: (p: string) => `https://x/api/v1/booking/${p}`,
  fetchJson: jest.fn(),
  MODAL_INPUT_CLS: "input",
  MODAL_CONTENT_CLS: "modal",
}));

import { fetchJson } from "../shared";
const mockFetchJson = fetchJson as jest.Mock;

describe("LabPatientsTab", () => {
  beforeEach(() => mockFetchJson.mockReset());

  test("renders patients list with status", async () => {
    mockFetchJson.mockResolvedValueOnce([
      { id: "p1", firstName: "┘à╪¡┘à╪»", lastName: "╪╣┘ä┘è", phone: "010", gender: "╪░┘â╪▒", status: "ACTIVE", isActive: true },
      { id: "p2", firstName: "╪│╪º╪▒╪⌐", phone: "011", gender: "╪ú┘å╪½┘ë", status: "REVIEW", isActive: true },
    ]);

    render(<LabPatientsTab />);
    await waitFor(() => expect(screen.getByText(/┘à╪¡┘à╪»/)).toBeInTheDocument());
    expect(screen.getByText(/╪│╪º╪▒╪⌐/)).toBeInTheDocument();
    expect(screen.getByText("┘å╪┤╪╖")).toBeInTheDocument();
  });

  test("adds a new patient via modal", async () => {
    mockFetchJson.mockResolvedValueOnce([]);
    render(<LabPatientsTab />);
    await waitFor(() => expect(screen.getByText(/┘ä╪º ┘è┘ê╪¼╪» ┘à╪▒╪╢┘ë/)).toBeInTheDocument());

    mockFetchJson.mockResolvedValueOnce({ id: "p3" });
    await userEvent.click(screen.getByText(/┘à╪▒┘è╪╢ ╪¼╪»┘è╪»/));
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[1], "╪º╪«╪¬╪¿╪º╪▒");
    await userEvent.click(screen.getByText(/╪¡┘ü╪╕/));

    await waitFor(() => expect(mockFetchJson).toHaveBeenCalledWith(
      expect.stringContaining("booking/patients"),
      expect.objectContaining({ method: "POST" })
    ));
  });
});
