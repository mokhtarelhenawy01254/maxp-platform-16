import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import SupportAdmin from "../SupportAdmin";
import supportService from "../../../services/supportService";

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: "SUPER_ADMIN", name: "Super Admin" },
    isAuthenticated: true,
  }),
}));

jest.mock("../../../services/supportService", () => ({
  default: {
    getAllTickets: jest.fn(),
    getAdminFAQs: jest.fn(),
  },
}));

describe("SupportAdmin Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders genuine empty state when ticket list is empty (no fake demo tickets)", async () => {
    (supportService.getAllTickets as jest.Mock).mockResolvedValueOnce({
      success: true,
      tickets: [],
    });
    (supportService.getAdminFAQs as jest.Mock).mockResolvedValueOnce({
      success: true,
      faqs: [],
    });

    render(
      <MemoryRouter>
        <SupportAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("لا توجد أي تذاكر دعم مسجلة حتى الآن")).toBeInTheDocument();
    });

    // Zero fake demo tickets
    expect(screen.queryByText("TCK-8821")).not.toBeInTheDocument();
    expect(screen.queryByText("TCK-8820")).not.toBeInTheDocument();
    expect(screen.queryByText("TCK-8815")).not.toBeInTheDocument();
    expect(screen.queryByText("أحمد المنسي")).not.toBeInTheDocument();

    // Metric counts are 0
    expect(screen.getByText("0 تذكرة")).toBeInTheDocument();
  });

  it("renders genuine empty state when tickets fetch fails", async () => {
    (supportService.getAllTickets as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));
    (supportService.getAdminFAQs as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

    render(
      <MemoryRouter>
        <SupportAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("لا توجد أي تذاكر دعم مسجلة حتى الآن")).toBeInTheDocument();
    });

    expect(screen.queryByText("TCK-8821")).not.toBeInTheDocument();
  });

  it("renders Arabic labels for suggestion and complaint categories in table and filter", async () => {
    (supportService.getAllTickets as jest.Mock).mockResolvedValueOnce({
      success: true,
      tickets: [
        {
          _id: "t-sugg",
          ticketId: "TCK-9901",
          subject: "اقتراح إضافة بوسطة شحن تلقائي",
          status: "open",
          category: "suggestion",
          createdAt: "2026-10-15T12:00:00",
          userId: { name: "محمود التاجر", email: "merchant@test.com" },
        },
        {
          _id: "t-comp",
          ticketId: "TCK-9902",
          subject: "شكوى بخصوص تأخر استلام الدفعة",
          status: "in_progress",
          category: "complaint",
          createdAt: "2026-10-15T12:30:00",
          userId: { name: "هاني سعيد", email: "hani@test.com" },
        },
      ],
    });
    (supportService.getAdminFAQs as jest.Mock).mockResolvedValueOnce({
      success: true,
      faqs: [],
    });

    render(
      <MemoryRouter>
        <SupportAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("TCK-9901")).toBeInTheDocument();
      expect(screen.getByText("TCK-9902")).toBeInTheDocument();
    });

    // Check category badge translations
    expect(screen.getByText("اقتراح تطويري")).toBeInTheDocument();
    expect(screen.getByText("شكوى")).toBeInTheDocument();

    // Check category filter dropdown options
    expect(screen.getByRole("option", { name: "اقتراح تطويري" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "شكوى" })).toBeInTheDocument();
  });

  it("switches to FAQ tab and displays empty state when no FAQs exist", async () => {
    (supportService.getAllTickets as jest.Mock).mockResolvedValueOnce({
      success: true,
      tickets: [],
    });
    (supportService.getAdminFAQs as jest.Mock).mockResolvedValueOnce({
      success: true,
      faqs: [],
    });

    render(
      <MemoryRouter>
        <SupportAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("الأسئلة الشائعة (0)")).toBeInTheDocument();
    });

    const faqTabButton = screen.getByText("الأسئلة الشائعة (0)");
    fireEvent.click(faqTabButton);

    await waitFor(() => {
      expect(screen.getByText("لا توجد أسئلة شائعة مضافة حتى الآن")).toBeInTheDocument();
    });

    expect(screen.queryByText("كيف يتم ربط متجر ووكومرس بمحرك المزامنة اللحظية؟")).not.toBeInTheDocument();
  });
});
