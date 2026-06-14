import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AffiliateCommission from "../AffiliateCommission";

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock("sonner", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (value: number | string) => `EGP ${Number(value)}`,
  }),
}));

describe("AffiliateCommission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCommissionPageData = () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/me") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              pendingEarnings: 500,
              totalEarnings: 1200,
              paidEarnings: 700,
              minPayout: 100,
            },
          },
        });
      }

      if (url === "/affiliates/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
          },
        });
      }

      if (url === "/affiliates/commissions?limit=20") {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  };

  test("reads commissions when the backend returns the array directly and computes expected pending commission", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/me") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              pendingEarnings: 500,
              totalEarnings: 1200,
              paidEarnings: 700,
              minPayout: 100,
            },
          },
        });
      }

      if (url === "/affiliates/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
          },
        });
      }

      if (url === "/affiliates/commissions?limit=20") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "comm-1",
                amount: "80",
                orderTotal: 500,
                status: "PENDING",
                createdAt: "2026-05-01T10:00:00.000Z",
                order: {
                  orderNumber: "ORD-1001",
                  status: "PENDING",
                },
              },
              {
                id: "comm-2",
                amount: "20",
                orderTotal: 300,
                status: "PAID",
                createdAt: "2026-05-01T11:00:00.000Z",
                order: {
                  orderNumber: "ORD-1002",
                  status: "DELIVERED",
                },
              },
              {
                id: "comm-3",
                amount: "40",
                orderTotal: 450,
                status: "PROCESSING",
                createdAt: "2026-05-01T12:00:00.000Z",
                order: {
                  orderNumber: "ORD-1003",
                  status: "PROCESSING",
                },
              },
            ],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<AffiliateCommission />);

    expect(
      await screen.findByRole("heading", { name: "العمولات والأرباح" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("EGP 120")).toBeInTheDocument();
    });

    expect(screen.getAllByText("EGP 500").length).toBeGreaterThan(0);
    expect(screen.getByText("EGP 1200")).toBeInTheDocument();
    expect(screen.getByText("EGP 700")).toBeInTheDocument();
    expect(screen.getByText("ORD-1001")).toBeInTheDocument();
    expect(screen.getByText("ORD-1003")).toBeInTheDocument();
  });

  test("submits payout requests for the full available balance", async () => {
    mockCommissionPageData();
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { id: "payout-1" },
      },
    });

    render(<AffiliateCommission />);

    fireEvent.click(await screen.findByText("طلب سحب الرصيد"));

    const amountInput = screen.getByLabelText("المبلغ المتاح للسحب");
    expect(amountInput).toHaveValue(500);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "INSTAPAY" },
    });
    fireEvent.change(screen.getByPlaceholderText("مثال: 010xxxxxx"), {
      target: { value: "01000000000" },
    });
    fireEvent.click(screen.getByText("تأكيد الطلب"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/affiliates/payout-request",
        expect.objectContaining({
          amount: 500,
          paymentMethod: "INSTAPAY",
        }),
      );
    });
  });

  test("shows cancelled payout reasons to the affiliate", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/me") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              pendingEarnings: 500,
              totalEarnings: 1200,
              paidEarnings: 700,
              minPayout: 100,
            },
          },
        });
      }

      if (url === "/affiliates/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "payout-1",
                amount: 300,
                status: "CANCELLED",
                paymentMethod: "WALLET",
                createdAt: "2026-05-01T10:00:00.000Z",
                notes: "تم إلغاء طلب السحب: بيانات الحساب غير مكتملة",
              },
            ],
          },
        });
      }

      if (url === "/affiliates/commissions?limit=20") {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<AffiliateCommission />);

    expect(
      await screen.findByRole("heading", { name: "العمولات والأرباح" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("تم إلغاء طلب السحب: بيانات الحساب غير مكتملة"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("تم إرجاع الرصيد القابل للسحب بعد الإلغاء"),
    ).toBeInTheDocument();
  });

  test("shows payout proof links to the affiliate after payment is processed", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/me") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              pendingEarnings: 500,
              totalEarnings: 1200,
              paidEarnings: 700,
              minPayout: 100,
            },
          },
        });
      }

      if (url === "/affiliates/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "payout-1",
                amount: 300,
                status: "PROCESSED",
                paymentMethod: "BANK_TRANSFER",
                createdAt: "2026-05-01T10:00:00.000Z",
                notes: "تم تحويل المبلغ بنجاح",
                proofFileUrl: "/uploads/affiliate-payouts/proof-test.png",
              },
            ],
          },
        });
      }

      if (url === "/affiliates/commissions?limit=20") {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<AffiliateCommission />);

    expect(
      await screen.findByRole("heading", { name: "العمولات والأرباح" }),
    ).toBeInTheDocument();
    expect(screen.getByText("عرض إثبات التحويل")).toBeInTheDocument();
    expect(screen.getByText("تم إرفاق إثبات التحويل")).toBeInTheDocument();
  });
});
