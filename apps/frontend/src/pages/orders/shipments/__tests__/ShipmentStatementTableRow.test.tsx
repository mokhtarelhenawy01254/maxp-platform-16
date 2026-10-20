// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ShipmentStatementTableRow } from "../ShipmentStatementTableRow";
import type { ShipmentRowItem } from "../ShipmentStatementTable";

afterEach(() => {
  cleanup();
});

describe("ShipmentStatementTableRow", () => {
  const mockShipment: ShipmentRowItem = {
    id: "ship-123",
    orderId: "ord-999",
    trackingNumber: "TRK-8877",
    externalShipmentId: "EXT-8877",
    carrierType: "TURBO",
    status: "DELIVERED",
    createdAt: "2026-10-20T10:00:00Z",
    destinationGovernorate: "Giza",
    destinationCity: "Dokki",
    destinationAddress: "10 Tahrir St",
    receivedAmount: 450,
    cost: 450,
    shippingCompany: {
      id: "comp-1",
      name: "Turbo Express",
      providerKey: "TURBO",
      integrationMode: "LIVE",
    },
    order: {
      id: "ord-999",
      orderNumber: "ORD-999",
      customerName: "Mahmoud Hassan",
      customerPhone: "01122334455",
      total: 450,
    },
  };

  const defaultProps = {
    shipment: mockShipment,
    isSelected: false,
    onToggleSelectOne: vi.fn(),
    syncingId: null,
    onSyncShipment: vi.fn(),
    onPrintWaybill: vi.fn(),
    onOpenChat: vi.fn(),
    onOpenTicket: vi.fn(),
    onResendShipment: vi.fn(),
    onCancelShipment: vi.fn(),
    onCopyTracking: vi.fn(),
    getStatusBadge: () => ({ label: "تم التسليم", className: "bg-emerald-50 text-emerald-700" }),
    formatDate: (dt: string | Date | null | undefined) => "20/10/2026",
    formatPrice: (amt: number) => `${amt} EGP`,
  };

  it("renders shipment details, tracking code, customer and destination cleanly", () => {
    render(
      <MemoryRouter>
        <table>
          <tbody>
            <ShipmentStatementTableRow {...defaultProps} />
          </tbody>
        </table>
      </MemoryRouter>
    );

    expect(screen.getByText("#ORD-999")).toBeInTheDocument();
    expect(screen.getByText("Mahmoud Hassan")).toBeInTheDocument();
    expect(screen.getByText("01122334455")).toBeInTheDocument();
    expect(screen.getByText("Giza - Dokki - 10 Tahrir St")).toBeInTheDocument();
    expect(screen.getByText("TRK-8877")).toBeInTheDocument();
    expect(screen.getByText("Turbo Express")).toBeInTheDocument();
    expect(screen.getByText("ربط مباشر")).toBeInTheDocument();
  });

  it("calls onToggleSelectOne when checkbox is clicked", () => {
    render(
      <MemoryRouter>
        <table>
          <tbody>
            <ShipmentStatementTableRow {...defaultProps} />
          </tbody>
        </table>
      </MemoryRouter>
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(defaultProps.onToggleSelectOne).toHaveBeenCalledWith("ship-123");
  });

  it("calls onPrintWaybill when print button is clicked", () => {
    render(
      <MemoryRouter>
        <table>
          <tbody>
            <ShipmentStatementTableRow {...defaultProps} />
          </tbody>
        </table>
      </MemoryRouter>
    );

    const printBtn = screen.getByTitle("طباعة البوليصة");
    fireEvent.click(printBtn);
    expect(defaultProps.onPrintWaybill).toHaveBeenCalledWith(mockShipment);
  });
});
