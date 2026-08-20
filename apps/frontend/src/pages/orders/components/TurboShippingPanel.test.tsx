import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TurboShippingPanel from "./TurboShippingPanel";
import { OrderDetailsType } from "../types";

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (value: string) => value,
  }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

const baseOrder: OrderDetailsType = {
  id: "order-1",
  orderNumber: "ORD-100",
  customerName: "Customer",
  status: "CONFIRMED",
  paymentStatus: "PENDING",
  paymentMethod: "CASH",
  items: [],
  subtotal: 100,
  tax: 0,
  shipping: 85,
  total: 185,
  currency: "EGP",
  createdAt: "2026-05-03T10:00:00.000Z",
  updatedAt: "2026-05-03T10:00:00.000Z",
  turboShipmentId: "CODE-100",
  turboTrackingNumber: "BAR-100",
  turboShipmentStatus: "created",
  turboLabelUrl: undefined,
};

describe("TurboShippingPanel", () => {
  it("shows a local unlink action for linked Turbo shipments", () => {
    const onUnlinkShipment = jest.fn();

    render(
      <TurboShippingPanel
        order={baseOrder}
        turboTrackingData={null}
        shippingComparison={null}
        loadingComparison={false}
        turboLoading={false}
        onCreateShipment={jest.fn()}
        onPrintWaybill={jest.fn()}
        onCancelShipment={jest.fn()}
        onUnlinkShipment={onUnlinkShipment}
        onCalculateShipping={jest.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /إلغاء ربط Turbo/ }),
    );

    expect(onUnlinkShipment).toHaveBeenCalledTimes(1);
  });

  it("hides cancel and unlink actions for delivered Turbo shipments", () => {
    render(
      <TurboShippingPanel
        order={{ ...baseOrder, turboShipmentStatus: "delivered" }}
        turboTrackingData={null}
        shippingComparison={null}
        loadingComparison={false}
        turboLoading={false}
        onCreateShipment={jest.fn()}
        onPrintWaybill={jest.fn()}
        onCancelShipment={jest.fn()}
        onUnlinkShipment={jest.fn()}
        onCalculateShipping={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /إلغاء الشحنة/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /إلغاء ربط Turbo/ }),
    ).not.toBeInTheDocument();
  });

  it("treats a saved shipment id as a linked Turbo shipment even without tracking number", () => {
    render(
      <TurboShippingPanel
        order={{
          ...baseOrder,
          turboTrackingNumber: undefined,
          turboShipmentId: "CODE-ONLY",
        }}
        turboTrackingData={null}
        shippingComparison={null}
        loadingComparison={false}
        turboLoading={false}
        onCreateShipment={jest.fn()}
        onPrintWaybill={jest.fn()}
        onCancelShipment={jest.fn()}
        onUnlinkShipment={jest.fn()}
        onCalculateShipping={jest.fn()}
      />,
    );

    expect(screen.getByText("CODE-ONLY")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /إلغاء ربط Turbo/ }),
    ).toBeInTheDocument();
  });
});
