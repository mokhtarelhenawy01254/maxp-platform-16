// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { IncompleteReportsFlowTable } from "../IncompleteReportsFlowTable";
import type { CohortDay, SummaryData } from "../IncompleteReportsTypes";

vi.mock("../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} EGP`,
  }),
}));

vi.mock("../../../../i18n", () => ({
  getDirection: () => "rtl",
}));

afterEach(() => {
  cleanup();
});

describe("IncompleteReportsFlowTable", () => {
  const mockCohorts: CohortDay[] = [
    {
      date: "2026-10-20",
      uncompleted: 12,
      uncompletedValue: 2400,
      byTeamConverted: 4,
      byTeamConvertedValue: 800,
      cancelled: 3,
      cancelledValue: 600,
      lost: 2,
      lostValue: 400,
      active: 3,
      activeValue: 600,
    },
  ];

  const mockSummary: SummaryData = {
    total: 12,
    totalValue: 2400,
    byTeam: 4,
    byTeamValue: 800,
    cancelled: 3,
    cancelledValue: 600,
    lost: 2,
    lostValue: 400,
    active: 3,
    activeValue: 600,
    recoveredOrdersCount: 4,
    recoveredRevenue: 800,
    directConvertedOrdersCount: 0,
    directConvertedRevenue: 0,
    overallConversionRate: 33.3,
  };

  it("renders daily uncompleted flow title and cohort row", () => {
    render(
      <IncompleteReportsFlowTable
        cohorts={mockCohorts}
        summary={mockSummary}
        totalUncompletedCount={12}
        totalUncompletedValue={2400}
      />
    );

    expect(
      screen.getByText(/جدول كشف السلات غير المكتملة والفاقد اليومي/i)
    ).toBeInTheDocument();
    expect(screen.getByText("2026-10-20")).toBeInTheDocument();
    expect(screen.getAllByText("2400 EGP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3 معلقة")).toBeInTheDocument();
    expect(screen.getByText("3 فرصة معلقة")).toBeInTheDocument();
  });

  it("renders empty state when cohorts list is empty", () => {
    render(
      <IncompleteReportsFlowTable
        cohorts={[]}
        summary={mockSummary}
        totalUncompletedCount={0}
        totalUncompletedValue={0}
      />
    );

    expect(
      screen.getByText("لا توجد سلات مسجلة في هذه الفترة")
    ).toBeInTheDocument();
  });
});
