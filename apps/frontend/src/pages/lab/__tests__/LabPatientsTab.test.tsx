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
      { id: "p1", firstName: "محمد", lastName: "علي", phone: "010", gender: "ذكر", status: "ACTIVE", isActive: true },
      { id: "p2", firstName: "سارة", phone: "011", gender: "أنثى", status: "REVIEW", isActive: true },
    ]);

    render(<LabPatientsTab />);
    await waitFor(() => expect(screen.getByText(/محمد/)).toBeInTheDocument());
    expect(screen.getByText(/سارة/)).toBeInTheDocument();
    expect(screen.getByText("نشط")).toBeInTheDocument();
  });

  test("adds a new patient via modal", async () => {
    mockFetchJson.mockResolvedValueOnce([]);
    render(<LabPatientsTab />);
    await waitFor(() => expect(screen.getByText(/لا يوجد مرضى/)).toBeInTheDocument());

    mockFetchJson.mockResolvedValueOnce({ id: "p3" });
    await userEvent.click(screen.getByText(/مريض جديد/));
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[1], "اختبار");
    await userEvent.click(screen.getByText(/حفظ/));

    await waitFor(() => expect(mockFetchJson).toHaveBeenCalledWith(
      expect.stringContaining("booking/patients"),
      expect.objectContaining({ method: "POST" })
    ));
  });
});
