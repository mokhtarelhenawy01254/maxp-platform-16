jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MerchantOperationsSummary from "../components/MerchantOperationsSummary";
import { apiClient } from "../../../../services/apiClient";

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.count !== undefined) return `${key} (${opts.count})`;
      if (opts?.ordersCount !== undefined) return `${key} (${opts.ordersCount})`;
      return key;
    },
  }),
}));

const mockSummaryData = {
  data: {
    data: {
      summary: {
        assignedOrdersCount: 15,
        assignedPieces: 30,
        inShippingOrdersCount: 5,
        inShippingPieces: 10,
        deliveredOrdersCount: 8,
        deliveredPieces: 16,
        payablePieces: 16,
        pendingPayablePieces: 4,
        notDeliveredOrdersCount: 2,
        notDeliveredPieces: 4,
        expectedReceivableAmount: 4500,
        deliveredPayableAmount: 2400,
        inShippingAmount: 1500,
        shippingCostAmount: 300,
        paidAmount: 200,
      },
      rows: [
        {
          id: "row-1",
          orderNumber: "ORD-9999",
          createdAt: "2026-10-17T12:00:00Z",
          customerName: "Mahmoud Hassan",
          fulfillmentSource: "SWAN",
          operationStatus: "IN_SHIPPING",
          merchantOrderStatus: "in_shipping",
          pieces: 2,
          merchantAmount: 300,
          commissionAmount: 30,
          shippingCost: 50,
          payablePieces: 2,
          pendingPayablePieces: 0,
          payableAmount: 250,
          expectedAmount: 300,
        },
      ],
    },
  },
};

describe("MerchantOperationsSummary Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and renders operations KPIs and table rows", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSummaryData);

    render(
      <MerchantOperationsSummary
        formatPrice={(v) => `${v} EGP`}
        formatDate={(v) => String(v)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("merchant.title")).toBeInTheDocument();
    });

    expect(screen.getAllByText("ORD-9999").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mahmoud Hassan/i).length).toBeGreaterThan(0);
    expect(screen.getByText("4500 EGP")).toBeInTheDocument();
    expect(screen.getByText("2400 EGP")).toBeInTheDocument();
  });

  it("handles empty rows gracefully", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          summary: {},
          rows: [],
        },
      },
    });

    render(
      <MerchantOperationsSummary
        formatPrice={(v) => `${v} EGP`}
        formatDate={(v) => String(v)}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("merchant.table.noOrders").length).toBeGreaterThan(0);
    });
  });
});
