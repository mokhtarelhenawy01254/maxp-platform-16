import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import OrderSettings from "../OrderSettings";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "orderSettings.title": "إعدادات الطلبات",
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock("../OrderStatusManager", () => () => <div>Order Status Mock</div>);
jest.mock("../ScheduledOrderSettings", () => () => (
  <div>Scheduled Orders Mock</div>
));
jest.mock("../OrderNumberingSettings", () => () => (
  <div>Order Numbering Mock</div>
));
jest.mock("../DuplicateOrderSettings", () => () => (
  <div>Duplicate Orders Mock</div>
));
jest.mock("../OrderInvoiceSettings", () => () => (
  <div>Order Invoice Mock</div>
));
jest.mock("../RatingSettingsManager", () => () => (
  <div>Rating Settings Mock</div>
));
jest.mock("../OrderColumnsSettings", () => () => (
  <div>Order Columns Mock</div>
));
jest.mock("../IncompleteOrdersSettings", () => () => (
  <div>Incomplete Orders Mock</div>
));
jest.mock("../../admin/OrderWorkflow", () => () => (
  <div>Order Workflow Mock</div>
));
jest.mock("../OrderConfirmationSettings", () => () => (
  <div>Order Confirmation Mock</div>
));
jest.mock("../OrderPreparationSettings", () => () => (
  <div>Order Preparation Mock</div>
));
jest.mock("../MinimumOrderSettings", () => () => (
  <div>Minimum Order Mock</div>
));
jest.mock("../EasyWarehouseSettings", () => () => (
  <div>Easy Warehouse Mock</div>
));
jest.mock("../OrderSoundSettings", () => () => (
  <div>Order Sound Mock</div>
));
jest.mock("../LateCancellationSettings", () => () => (
  <div>Late Cancellation Mock</div>
));
jest.mock("../../cancellations/CancellationSettingsPage", () => () => (
  <div>Cancellation Settings Mock</div>
));
jest.mock("../ExchangeReturnSettings", () => () => (
  <div>Exchange Return Mock</div>
));
jest.mock("../DiscountApprovalSettings", () => () => (
  <div>Discount Approval Mock</div>
));
jest.mock("../OrderWebhookSettings", () => () => (
  <div>Order Webhooks Mock</div>
));

describe("OrderSettings", () => {
  it("does not list customer block settings inside the order settings tabs", async () => {
    render(
      <MemoryRouter initialEntries={["/settings/orders"]}>
        <Routes>
          <Route path="/settings/orders" element={<OrderSettings />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Order Status Mock")).toBeTruthy();
    expect(screen.getByText("إعدادات الطلبات")).toBeTruthy();
    expect(screen.queryByText("حظر العملاء")).toBeNull();
  });

  it("redirects legacy customer block order-settings links to the standalone page", async () => {
    render(
      <MemoryRouter initialEntries={["/settings/orders?tab=customer-block"]}>
        <Routes>
          <Route path="/settings/orders" element={<OrderSettings />} />
          <Route
            path="/settings/customer-blocks"
            element={<div>Customer Block Standalone Mock</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Customer Block Standalone Mock"),
    ).toBeTruthy();
  });
});
