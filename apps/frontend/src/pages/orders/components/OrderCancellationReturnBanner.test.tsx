import React from "react";
import { render, screen } from "@testing-library/react";
import { OrderCancellationReturnBanner } from "./OrderCancellationReturnBanner";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("OrderCancellationReturnBanner", () => {
  it("renders cancellation reason when isCancellation is true", () => {
    render(
      <OrderCancellationReturnBanner
        isCancellation={true}
        latestCancellationReason="العميل طلب إلغاء الطلب لتغيير العنوان"
      />
    );

    expect(screen.getByText("سبب إلغاء الطلب")).toBeInTheDocument();
    expect(screen.getByText("العميل طلب إلغاء الطلب لتغيير العنوان")).toBeInTheDocument();
  });

  it("renders return details banner when isReturned is true", () => {
    render(
      <OrderCancellationReturnBanner
        isCancellation={false}
        returnDetails={{
          isReturned: true,
          returnTypeLabel: "مرتجع كلي",
          source: "TURBO",
          reason: "العميل لم يستلم الشحنة",
          secondaryReason: "الهاتف مغلق طوال اليوم",
        }}
      />
    );

    expect(screen.getByText("مرتجع كلي")).toBeInTheDocument();
    expect(screen.getByText("TURBO")).toBeInTheDocument();
    expect(screen.getByText("العميل لم يستلم الشحنة")).toBeInTheDocument();
    expect(screen.getByText("الهاتف مغلق طوال اليوم")).toBeInTheDocument();
  });

  it("renders nothing when neither cancellation nor return applies", () => {
    const { container } = render(
      <OrderCancellationReturnBanner
        isCancellation={false}
        returnDetails={null}
      />
    );

    expect(container.textContent).toBe("");
  });
});
