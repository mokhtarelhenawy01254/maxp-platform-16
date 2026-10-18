import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OrderSessionDetailsCard } from "./OrderSessionDetailsCard";

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d,
    formatDateTime: (d: string) => d,
  }),
}));

describe("OrderSessionDetailsCard Suite", () => {
  const baseSession = {
    ip: "156.204.120.45",
    ipCountry: "مصر",
    ipGovernorate: "القاهرة",
    ipCity: "المعادي",
    durationSeconds: 145,
    sessionCount: 2,
    firstSeenAt: "2026-10-10T10:00:00.000Z",
    pagesVisited: [
      { path: "/store", title: "المتجر", timestamp: "2026-10-18T10:00:00.000Z" },
      { path: "/cart", title: "السلة", timestamp: "2026-10-18T10:02:00.000Z" },
    ],
  };

  const baseFirstOrder = {
    isFirstOrder: false,
    firstOrderAt: "2026-09-01T12:00:00.000Z",
    firstOrderNumber: "ORD-990",
    totalOrdersCount: 3,
  };

  it("renders session card header, IP, location, duration, and first order details", () => {
    render(
      <OrderSessionDetailsCard
        sessionDetails={baseSession}
        firstOrderInfo={baseFirstOrder}
      />
    );

    expect(screen.getByText("تفاصيل الجلسة")).toBeInTheDocument();
    expect(screen.getByText("156.204.120.45")).toBeInTheDocument();
    expect(screen.getByText(/القاهرة - المعادي/)).toBeInTheDocument();
    expect(screen.getByText("2 دقيقة و 25 ثانية")).toBeInTheDocument();
    expect(screen.getByText("2 جلسات")).toBeInTheDocument();
    expect(screen.getByText("عميل متكرر (3 طلبات)")).toBeInTheDocument();
    expect(screen.getByText("رحلة التصفح (2 صفحات)")).toBeInTheDocument();
  });

  it("copies IP when copy button is clicked", () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<OrderSessionDetailsCard sessionDetails={baseSession} />);

    const copyBtn = screen.getByTitle("نسخ عنوان IP");
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("156.204.120.45");
  });
});
