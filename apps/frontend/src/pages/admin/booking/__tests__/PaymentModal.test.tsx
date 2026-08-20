import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentModal from "../PaymentModal";
import { BookingInvoice } from "../shared";
import { toast } from "sonner";

jest.mock("../../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true, default: { createAuthHeaders: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const invoice: BookingInvoice = {
  id: "i1", invoiceNumber: "INV-1", patientId: "p1",
  total: 100, discount: 0, amountPaid: 0, net: 100, remaining: 100,
  status: "UNPAID", createdAt: "2024-01-01",
};

afterEach(() => { jest.clearAllMocks(); cleanup(); });

describe("PaymentModal", () => {
  test("pay path closes the modal when onSave resolves", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(() => Promise.resolve());
    const onClose = jest.fn();
    render(<PaymentModal invoice={invoice} onClose={onClose} onSave={onSave} />);
    await user.click(screen.getByText("╪¬╪│╪¼┘è┘ä ╪º┘ä╪»┘ü╪╣"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("pay path shows an error toast and keeps the modal open when onSave rejects", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(() => Promise.reject(new Error("┘à╪¿┘ä╪║ ╪║┘è╪▒ ╪╡╪º┘ä╪¡")));
    const onClose = jest.fn();
    render(<PaymentModal invoice={invoice} onClose={onClose} onSave={onSave} />);
    await user.click(screen.getByText("╪¬╪│╪¼┘è┘ä ╪º┘ä╪»┘ü╪╣"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("┘à╪¿┘ä╪║ ╪║┘è╪▒ ╪╡╪º┘ä╪¡"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
