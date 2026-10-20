// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ReturnRequestsTable } from "../ReturnRequestsTable";
import type { ReturnRequest } from "../../../../services/returnService";

afterEach(() => {
  cleanup();
});

describe("ReturnRequestsTable", () => {
  const mockRequests: ReturnRequest[] = [
    {
      id: "ret-1",
      orderId: "ord-1",
      order: {
        id: "ord-1",
        orderNumber: "ORD-998877",
        currency: "EGP",
      } as unknown as NonNullable<ReturnRequest["order"]>,
      customer: {
        id: "cust-1",
        firstName: "محمد",
        lastName: "أحمد",
        phone: "01012345678",
        customerRating: "EXCELLENT",
        successScore: 92.5,
      } as unknown as NonNullable<ReturnRequest["customer"]>,
      reason: {
        id: "reas-1",
        reason: "مقاس غير مناسب",
        category: { id: "cat-1", name: "مقاسات" } as unknown as NonNullable<NonNullable<ReturnRequest["reason"]>["category"]>,
      } as unknown as NonNullable<ReturnRequest["reason"]>,
      responsibleParty: "CUSTOMER",
      trackingNumber: "RT-100200",
      refundAmount: 350,
      shippingReturnCost: 40,
      settlementAmount: 310,
      status: "PENDING",
      createdAt: "2026-10-15T10:00:00Z",
      updatedAt: "2026-10-15T10:00:00Z",
    } as ReturnRequest,
  ];

  const defaultProps = {
    requests: mockRequests,
    loading: false,
    displayConfig: null,
    responsiblePartyLabel: (role?: string | null) =>
      role === "CUSTOMER" ? "العميل" : "المتجر",
    copyTracking: vi.fn().mockResolvedValue(undefined),
    onSelectRequest: vi.fn(),
    page: 1,
    setPage: vi.fn(),
    totalPages: 3,
    total: 25,
    t: (key: string) => {
      const map: Record<string, string> = {
        "returns.k_143": "الطلب",
        "returns.k_49": "العميل",
        "returns.k_57": "السبب",
        "returns.k_59": "الجهة المسؤولة",
        "returns.k_221": "رقم التتبع",
        "returns.k_227": "البيانات المالية",
        "returns.k_65": "التاريخ",
        "returns.k_67": "الإجراءات",
        "returns.k_144": "جاري التحميل...",
        "returns.k_145": "لا توجد طلبات إرجاع",
        "returns.k_149": "إجمالي النتائج:",
        "returns.k_136": "ممتاز",
        "returns.k_228": "شحن الإرجاع",
        "returns.k_229": "صافي التسوية",
      };
      return map[key] || key;
    },
  };

  it("renders table with request details, customer rating, and pagination", () => {
    render(<ReturnRequestsTable {...defaultProps} />);

    expect(screen.getByText("ORD-998877")).toBeInTheDocument();
    expect(screen.getByText(/محمد أحمد/)).toBeInTheDocument();
    expect(screen.getByText("ممتاز")).toBeInTheDocument();
    expect(screen.getByText("مقاس غير مناسب")).toBeInTheDocument();
    expect(screen.getAllByText("العميل").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("RT-100200")).toBeInTheDocument();
    expect(screen.getByText("350 EGP")).toBeInTheDocument();
    expect(screen.getByText(/إجمالي النتائج: 25/)).toBeInTheDocument();
  });

  it("triggers onSelectRequest when clicking view button", () => {
    render(<ReturnRequestsTable {...defaultProps} />);

    const viewBtn = screen.getByRole("button", { name: /عرض/i });
    fireEvent.click(viewBtn);

    expect(defaultProps.onSelectRequest).toHaveBeenCalledWith(mockRequests[0]);
  });

  it("renders empty state when requests array is empty", () => {
    render(<ReturnRequestsTable {...defaultProps} requests={[]} />);

    expect(screen.getByText("لا توجد طلبات إرجاع")).toBeInTheDocument();
  });
});
