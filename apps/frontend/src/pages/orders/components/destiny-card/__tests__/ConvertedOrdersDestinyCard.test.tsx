// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConvertedOrdersDestinyCard } from "../../../components/ConvertedOrdersDestinyCard";
import type { ConvertedOrdersDestiny } from "../types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (k: string, defaultValue?: any) => defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

vi.mock("../../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amt: number) => `${amt} EGP`,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("ConvertedOrdersDestinyCard", () => {
  const mockDestiny: ConvertedOrdersDestiny = {
    totalConverted: 100,
    delivered: { count: 70, value: 35000, rate: 70 },
    inProgress: { count: 15, value: 7500, rate: 15 },
    returned: { count: 10, value: 5000, rate: 10 },
    cancelled: { count: 5, value: 2500, rate: 5 },
    deliveryRate: 70,
    effectiveDeliveryRate: 82.3,
    statusBreakdown: [
      { status: "DELIVERED", count: 70, value: 35000, rate: 70 },
      { status: "SHIPPED", count: 15, value: 7500, rate: 15 },
    ],
  };

  it("returns null if destiny is not provided or totalConverted is 0", () => {
    const { container } = render(<ConvertedOrdersDestinyCard destiny={undefined} />);
    expect(container.firstChild).toBeNull();

    const { container: emptyContainer } = render(
      <ConvertedOrdersDestinyCard destiny={{ ...mockDestiny, totalConverted: 0 }} />
    );
    expect(emptyContainer.firstChild).toBeNull();
  });

  it("renders header, delivery success rates, and 4 KPI cards", () => {
    render(<ConvertedOrdersDestinyCard destiny={mockDestiny} />);

    expect(screen.getByText("مصير الطلبات المحولة وجودتها")).toBeInTheDocument();
    expect(screen.getByText("جودة ممتازة")).toBeInTheDocument();
    expect(screen.getAllByText("70.0%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("82.3%")).toBeInTheDocument();
    expect(screen.getAllByText("تم التسليم").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("قيد الشحن والتنفيذ")).toBeInTheDocument();
    expect(screen.getByText("مرتجع")).toBeInTheDocument();
    expect(screen.getByText("ملغي")).toBeInTheDocument();
  });

  it("expands granular breakdown table when toggle button is clicked", () => {
    render(<ConvertedOrdersDestinyCard destiny={mockDestiny} />);

    const toggleBtn = screen.getByText(/تفصيل الحالات الفعلية/i);
    fireEvent.click(toggleBtn);

    expect(screen.getByText("الحالة")).toBeInTheDocument();
    expect(screen.getByText("العدد")).toBeInTheDocument();
    expect(screen.getByText("النسبة")).toBeInTheDocument();
    expect(screen.getByText("القيمة")).toBeInTheDocument();
  });
});
