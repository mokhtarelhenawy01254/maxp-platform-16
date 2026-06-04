import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommissionsManagement from "../CommissionsManagement";

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPost = jest.fn();

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (value: number | string) => `EGP ${Number(value)}`,
  }),
}));

describe("CommissionsManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "prompt").mockImplementation(() => null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders company commission stats and confirms a payout status update", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/admin/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "payout-1",
                amount: 75,
                status: "PENDING",
                paymentMethod: "WALLET",
                createdAt: "2026-05-01T10:00:00.000Z",
                processedAt: null,
                transactionId: null,
                externalReference: null,
                proofFileUrl: null,
                affiliate: {
                  affiliateCode: "AFF-1001",
                  user: {
                    firstName: "Ali",
                    lastName: "Seller",
                    email: "ali@example.com",
                    phone: "01000000000",
                  },
                },
                commissions: [
                  {
                    id: "commission-1",
                    amount: 75,
                    status: "CONFIRMED",
                    order: {
                      orderNumber: "ORD-1001",
                    },
                  },
                ],
              },
            ],
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          data: {
            commissions: [
              {
                id: "commission-1",
                orderId: "order-1",
                type: "AFFILIATE",
                amount: 75,
                status: "CONFIRMED",
                createdAt: "2026-05-01T10:00:00.000Z",
                order: {
                  orderNumber: "ORD-1001",
                  total: 500,
                },
                affiliate: {
                  affiliateCode: "AFF-1001",
                  user: {
                    firstName: "Ali",
                    lastName: "Seller",
                  },
                },
                merchant: null,
              },
            ],
            stats: {
              totalAmount: 75,
              byType: {
                AFFILIATE: 75,
                MERCHANT: 0,
                PLATFORM: 0,
              },
            },
          },
        },
      });
    });
    mockPut.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter>
        <CommissionsManagement />
      </MemoryRouter>,
    );

    expect(await screen.findByText("إدارة العمولات")).toBeInTheDocument();
    expect(screen.getByText("طلبات سحب المسوقين")).toBeInTheDocument();
    expect(screen.getByText("AFF-1001")).toBeInTheDocument();
    expect(screen.getAllByText("ORD-1001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EGP 75").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("تأكيد الدفع"));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith("/commissions/commission-1/status", {
        status: "PAID",
      });
    });
  });

  test("records an external affiliate payout from the admin payout inbox", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/admin/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "payout-1",
                amount: 125,
                status: "PENDING",
                paymentMethod: "WALLET",
                createdAt: "2026-05-01T10:00:00.000Z",
                processedAt: null,
                transactionId: null,
                externalReference: null,
                proofFileUrl: null,
                affiliate: {
                  affiliateCode: "AFF-1001",
                  user: {
                    firstName: "Ali",
                    lastName: "Seller",
                    email: "ali@example.com",
                    phone: "01000000000",
                  },
                },
                commissions: [],
              },
            ],
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          data: {
            commissions: [],
            stats: {
              totalAmount: 0,
              byType: {
                AFFILIATE: 0,
                MERCHANT: 0,
                PLATFORM: 0,
              },
            },
          },
        },
      });
    });
    mockPost.mockResolvedValue({
      data: {
        success: true,
      },
    });

    const promptSpy = jest
      .spyOn(window, "prompt")
      .mockReturnValueOnce("TX-500")
      .mockReturnValueOnce("bank ref");

    render(
      <MemoryRouter>
        <CommissionsManagement />
      </MemoryRouter>,
    );

    expect(await screen.findByText("تسجيل التحويل")).toBeInTheDocument();

    fireEvent.click(screen.getByText("تسجيل التحويل"));

    await waitFor(() => {
      expect(promptSpy).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalledWith(
        "/affiliates/payouts/payout-1/record-external",
        {
          transactionId: "TX-500",
          externalReference: "bank ref",
        },
      );
    });
  });

  test("cancels a pending affiliate payout request with a required reason", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/admin/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "payout-1",
                amount: 125,
                status: "PENDING",
                paymentMethod: "WALLET",
                createdAt: "2026-05-01T10:00:00.000Z",
                processedAt: null,
                transactionId: null,
                externalReference: null,
                notes: null,
                proofFileUrl: null,
                affiliate: {
                  affiliateCode: "AFF-1001",
                  user: {
                    firstName: "Ali",
                    lastName: "Seller",
                    email: "ali@example.com",
                    phone: "01000000000",
                  },
                },
                commissions: [],
              },
            ],
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          data: {
            commissions: [],
            stats: {
              totalAmount: 0,
              byType: {
                AFFILIATE: 0,
                MERCHANT: 0,
                PLATFORM: 0,
              },
            },
          },
        },
      });
    });
    mockPost.mockResolvedValue({
      data: {
        success: true,
      },
    });

    const promptSpy = jest
      .spyOn(window, "prompt")
      .mockReturnValueOnce("سبب الرفض");

    render(
      <MemoryRouter>
        <CommissionsManagement />
      </MemoryRouter>,
    );

    expect(await screen.findByText("رفض الطلب")).toBeInTheDocument();

    fireEvent.click(screen.getByText("رفض الطلب"));

    await waitFor(() => {
      expect(promptSpy).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalledWith(
        "/affiliates/payouts/payout-1/cancel",
        {
          reason: "سبب الرفض",
        },
      );
    });
  });

  test("uploads payout proof for processed affiliate payouts", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/admin/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "payout-1",
                amount: 125,
                status: "PROCESSED",
                paymentMethod: "BANK_TRANSFER",
                createdAt: "2026-05-01T10:00:00.000Z",
                processedAt: "2026-05-01T12:00:00.000Z",
                transactionId: "TX-100",
                externalReference: "REF-200",
                notes: null,
                proofFileUrl: null,
                affiliate: {
                  affiliateCode: "AFF-1001",
                  user: {
                    firstName: "Ali",
                    lastName: "Seller",
                    email: "ali@example.com",
                    phone: "01000000000",
                  },
                },
                commissions: [],
              },
            ],
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          data: {
            commissions: [],
            stats: {
              totalAmount: 0,
              byType: {
                AFFILIATE: 0,
                MERCHANT: 0,
                PLATFORM: 0,
              },
            },
          },
        },
      });
    });
    mockPost.mockResolvedValue({
      data: {
        success: true,
      },
    });

    const { container } = render(
      <MemoryRouter>
        <CommissionsManagement />
      </MemoryRouter>,
    );

    expect(await screen.findByText("رفع الإثبات")).toBeInTheDocument();

    fireEvent.click(screen.getByText("رفع الإثبات"));

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const proofFile = new File(["proof"], "proof.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: {
        files: [proofFile],
      },
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/affiliates/payouts/payout-1/proof",
        expect.any(FormData),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
    });
  });
});
