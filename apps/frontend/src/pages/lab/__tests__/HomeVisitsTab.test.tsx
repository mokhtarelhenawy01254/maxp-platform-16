import { render, screen, waitFor } from "@testing-library/react";
import HomeVisitsTab from "../HomeVisitsTab";

jest.mock("../shared", () => ({
  api: (p: string) => `https://x/api/v1/lab/${p}`,
  getAuthHeaders: () => ({}),
  fetchJson: jest.fn(),
  MODAL_INPUT_CLS: "input",
  MODAL_CONTENT_CLS: "modal",
  CULTURE_STATUS: { SCHEDULED: "مجدولة", DONE: "تمت", CANCELLED: "ملغاة" },
}));

const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) }) as Response;

describe("HomeVisitsTab", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  test("renders visits with status badge", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok([
      { id: "v1", patientName: "علي", phone: "010", address: "المنصورة", status: "SCHEDULED", reviewed: false },
    ]));

    render(<HomeVisitsTab />);
    await waitFor(() => expect(screen.getByText(/علي/)).toBeInTheDocument());
    expect(screen.getAllByText("مجدولة").length).toBeGreaterThan(0);
  });

  test("shows empty state", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok([]));
    render(<HomeVisitsTab />);
    await waitFor(() => expect(screen.getByText(/لا توجد زيارات|لا يوجد/)).toBeInTheDocument());
  });
});
