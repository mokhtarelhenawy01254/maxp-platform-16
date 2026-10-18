import React from "react";
import { render, screen } from "@testing-library/react";
import { OrderScheduledDeliveryCard } from "./OrderScheduledDeliveryCard";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("OrderScheduledDeliveryCard", () => {
  it("renders scheduled delivery details with notes and auto-transition indicator", () => {
    render(
      <OrderScheduledDeliveryCard
        scheduledDeliveryDate="2026-10-25T14:30:00.000Z"
        scheduledNotes="يرجى التسليم بعد الساعة الثانية ظهراً"
        autoTransitionEnabled={true}
      />
    );

    expect(screen.getByText("بيانات التوصيل المؤجل والمجدول")).toBeInTheDocument();
    expect(screen.getByText("يرجى التسليم بعد الساعة الثانية ظهراً")).toBeInTheDocument();
    expect(screen.getByText("سيتم تحويل حالة الطلب تلقائياً إلى قيد التجهيز عند حلول الموعد")).toBeInTheDocument();
  });

  it("renders without notes or auto-transition if omitted", () => {
    render(
      <OrderScheduledDeliveryCard
        scheduledDeliveryDate="2026-10-25T14:30:00.000Z"
      />
    );

    expect(screen.getByText("بيانات التوصيل المؤجل والمجدول")).toBeInTheDocument();
    expect(screen.queryByText("ملاحظات التأجيل")).not.toBeInTheDocument();
    expect(screen.queryByText("سيتم تحويل حالة الطلب تلقائياً إلى قيد التجهيز عند حلول الموعد")).not.toBeInTheDocument();
  });
});
