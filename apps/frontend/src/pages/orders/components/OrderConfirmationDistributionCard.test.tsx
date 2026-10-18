import React from "react";
import { render, screen } from "@testing-library/react";
import { OrderConfirmationDistributionCard } from "./OrderConfirmationDistributionCard";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("OrderConfirmationDistributionCard", () => {
  const defaultOrder = {
    confirmedAt: "2026-10-18T10:00:00Z",
    confirmedByUser: { firstName: "محمد", lastName: "محمود" },
    assignedToUser: { firstName: "سارة", lastName: "حسن" },
    assignedByUser: { firstName: "المدير", lastName: "العام" },
    assignedAt: "2026-10-18T09:30:00Z",
    assignmentStrategy: "round_robin",
    confirmationNotes: "تم تأكيد العنوان مع العميل",
  };

  it("renders confirmation and distribution status correctly", () => {
    render(
      <OrderConfirmationDistributionCard
        order={defaultOrder}
        effectiveStatus="CONFIRMED"
        formatOptionalDate={(d) => d || "—"}
      />,
    );

    expect(screen.getByText("بيانات التأكيد والتوزيع")).toBeInTheDocument();
    expect(screen.getByText("محمد محمود")).toBeInTheDocument();
    expect(screen.getByText("سارة حسن")).toBeInTheDocument();
    expect(screen.getByText("round_robin")).toBeInTheDocument();
    expect(screen.getByText("تم تأكيد العنوان مع العميل")).toBeInTheDocument();
  });
});
