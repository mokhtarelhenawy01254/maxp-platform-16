import React from "react";
import { render, screen } from "@testing-library/react";
import AffiliateReferrals from "../AffiliateReferrals";

const mockGet = jest.fn();

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (value: number | string) => `EGP ${Number(value)}`,
  }),
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

describe("AffiliateReferrals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows referral funnel data from the affiliate referrals endpoint", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "ref-1",
            referralCode: "AFF123",
            source: "instagram",
            converted: true,
            createdAt: "2026-05-01T10:00:00.000Z",
            convertedAt: "2026-05-02T10:00:00.000Z",
            customer: {
              id: "customer-1",
              firstName: "Mona",
              lastName: "Buyer",
              phone: "01000000000",
            },
            order: {
              id: "order-1",
              orderNumber: "ORD-3001",
              total: 650,
            },
          },
        ],
      },
    });

    render(<AffiliateReferrals />);

    expect(await screen.findByText("الإحالات والتحويلات")).toBeInTheDocument();
    expect(screen.getByText("AFF123")).toBeInTheDocument();
    expect(screen.getByText("Mona Buyer")).toBeInTheDocument();
    expect(screen.getByText("ORD-3001")).toBeInTheDocument();
    expect(screen.getAllByText("EGP 650").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });
});
