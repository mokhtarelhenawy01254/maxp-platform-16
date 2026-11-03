import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OperixLuxuryLanding from "../landing/operix-luxury/OperixLuxuryLanding";

jest.mock("../../utils/platformSiteMetaPixel", () => ({
  trackPlatformSiteLead: jest.fn(),
}));

const renderOperixLanding = () =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <OperixLuxuryLanding />
    </MemoryRouter>,
  );

describe("OperixLuxuryLanding (Authentic MaxP Business OS)", () => {
  it("renders MaxP luxury headline, Bosta/WhatsApp telemetry, and 3D cockpit tabs", async () => {
    const user = userEvent.setup();
    renderOperixLanding();

    // Verify main MaxP OS branding & headline
    expect(
      screen.getAllByText(/MaxP Business OS 3.0/i)[0],
    ).toBeInTheDocument();
    expect(
      screen.getByText(/عمليات تجارتك ومبيعاتك/i),
    ).toBeInTheDocument();

    // Verify 3D cockpit tabs
    const ordersTab = screen.getByRole("tab", { name: /تأكيد الطلبات وواتساب/i });
    const inventoryTab = screen.getByRole("tab", { name: /المخزون وفروع المحلات/i });
    const shippingTab = screen.getByRole("tab", { name: /بوالص بوسطة والشحن/i });
    const financialsTab = screen.getByRole("tab", { name: /الخزينة ومطابقة الـ COD/i });

    expect(ordersTab).toBeInTheDocument();
    expect(inventoryTab).toBeInTheDocument();
    expect(shippingTab).toBeInTheDocument();
    expect(financialsTab).toBeInTheDocument();

    // Verify Bosta waybill & WhatsApp AI floating cards exist
    expect(
      screen.getByText(/تأكيد آلي فوري عبر واتساب MaxP/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/بوسطة BOSTA AWB/i),
    ).toBeInTheDocument();

    // Switch to Inventory
    await user.click(inventoryTab);
    expect(screen.getByText(/مخزن التجهيز الرئيسي/i)).toBeInTheDocument();

    // Switch to Shipping
    await user.click(shippingTab);
    expect(screen.getByText(/ربط سحابي معتمد مع بوسطة وأرامكس/i)).toBeInTheDocument();

    // Switch to Financials
    await user.click(financialsTab);
    expect(screen.getByText(/مطابقة كشف حساب بوسطة الأخير/i)).toBeInTheDocument();

    // Verify pricing promise
    expect(
      screen.getByText(/أسعار بسيطة و0% عمولة/i),
    ).toBeInTheDocument();
  });
});
