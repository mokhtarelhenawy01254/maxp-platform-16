import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { OrderSessionDetailsCard } from "../OrderSessionDetailsCard";

// Mock useDateFormat hook
jest.mock("@/hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d,
    formatDateTime: (d: string) => d,
  }),
}));

describe("OrderSessionDetailsCard", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it("renders IP and translated Arabic governorate and city correctly", () => {
    const sessionDetails = {
      ip: "156.197.244.232",
      ipGovernorate: "Dakahlia",
      ipCity: "Al Mansurah",
      ipCountry: "EG",
      durationSeconds: 125,
      sessionCount: 2,
      firstSeenAt: "2026-09-21T10:00:00Z",
      pagesVisited: [
        { path: "/product/123", title: "منتج تجريبي", timestamp: "2026-09-21T10:00:00Z" }
      ],
      trafficSource: {
        source: "facebook",
        medium: "paid",
        campaignName: "Test Campaign",
      },
    };

    render(
      <OrderSessionDetailsCard
        sessionDetails={sessionDetails}
        firstOrderInfo={{ isFirstOrder: true, totalOrdersCount: 1, firstOrderDate: "2026-09-21" }}
      />
    );

    // IP check
    expect(screen.getByText("156.197.244.232")).toBeInTheDocument();

    // Arabic translation: Dakahlia -> الدقهلية, Al Mansurah -> المنصورة
    expect(screen.getByText(/الدقهلية - المنصورة/)).toBeInTheDocument();

    // Customer badge
    expect(screen.getByText("عميل جديد")).toBeInTheDocument();

    // Duration: 2 minutes and 5 seconds
    expect(screen.getByText("2 دقيقة و 5 ثانية")).toBeInTheDocument();
  });

  it("handles copy IP button click", () => {
    const sessionDetails = {
      ip: "156.197.244.232",
      ipGovernorate: "Cairo",
      ipCity: "Cairo",
    };

    render(<OrderSessionDetailsCard sessionDetails={sessionDetails} />);

    const copyBtn = screen.getByTitle("نسخ عنوان IP");
    expect(copyBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("156.197.244.232");
    expect(screen.getByText("تم النسخ")).toBeInTheDocument();
  });

  it("displays manual order fallback when no IP is present", () => {
    render(
      <OrderSessionDetailsCard
        sessionDetails={null}
        sourceType="manual"
        orderSource="MANUAL"
      />
    );

    expect(screen.getByText("طلب يدوي (بدون IP)")).toBeInTheDocument();
  });
});
