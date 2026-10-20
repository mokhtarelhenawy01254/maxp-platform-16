// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ShippingTrackingView } from "../ShippingTrackingView";

vi.mock("../../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} EGP`,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("ShippingTrackingView", () => {
  const defaultProps = {
    order: { total: 450, turboReturnReason: "رفض الاستلام" },
    shipment: { labelUrl: "https://example.com/label.pdf" },
    existingTracking: "TRK-98765",
    existingCarrierName: "Bosta Express",
    isQpExpress: false,
    isBosta: true,
    isTurbo: false,
    shipmentMeta: {},
    liveStatus: {
      driverName: "أحمد محمود",
      driverPhone: "01000000000",
      statusNote: "سيتم التسليم اليوم",
    },
    resending: false,
    syncing: false,
    onResendShipment: vi.fn(),
    onSyncStatus: vi.fn(),
    onOpenTicket: vi.fn(),
    onPrintBostaAWB: vi.fn(),
    onPrintQpWaybill: vi.fn(),
    onShowCancelModal: vi.fn(),
    onCopyTracking: vi.fn(),
  };

  it("renders carrier name, tracking number, driver telemetry, and COD value", () => {
    render(<ShippingTrackingView {...defaultProps} />);

    expect(screen.getByText("Bosta Express")).toBeInTheDocument();
    expect(screen.getByText("TRK-98765")).toBeInTheDocument();
    expect(screen.getByText("450 EGP")).toBeInTheDocument();
    expect(screen.getByText("Bosta API")).toBeInTheDocument();
    expect(screen.getByText("أحمد محمود")).toBeInTheDocument();
    expect(screen.getByText("رفض الاستلام")).toBeInTheDocument();
  });

  it("triggers onCopyTracking, onSyncStatus, and onResendShipment when clicked", () => {
    render(<ShippingTrackingView {...defaultProps} />);

    const copyBtn = screen.getByTitle("نسخ رقم التتبع");
    fireEvent.click(copyBtn);
    expect(defaultProps.onCopyTracking).toHaveBeenCalledTimes(1);

    const syncBtn = screen.getByText("مزامنة الحالة اللحظية");
    fireEvent.click(syncBtn);
    expect(defaultProps.onSyncStatus).toHaveBeenCalledTimes(1);

    const resendBtn = screen.getByText("إعادة إرسال الشحنة");
    fireEvent.click(resendBtn);
    expect(defaultProps.onResendShipment).toHaveBeenCalledTimes(1);
  });
});
