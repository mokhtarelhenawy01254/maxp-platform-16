// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ShippingCarrierSelector } from "../ShippingCarrierSelector";

vi.mock("../../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} EGP`,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("ShippingCarrierSelector", () => {
  const defaultProps = {
    order: { id: "ord-1", total: 600 },
    courierMode: "turbo" as const,
    setCourierMode: vi.fn(),
    setIsManualCourier: vi.fn(),
    turboCompany: { id: "c-turbo", name: "Turbo", integrationMode: "DIRECT" },
    qpCompany: { id: "c-qp", name: "QP Express", integrationMode: "DIRECT" },
    bostaCompany: { id: "c-bosta", name: "Bosta", integrationMode: "DIRECT" },
    customCompanies: [],
    qpSettings: { customerId: "1234" },
    qpNotes: "",
    setQpNotes: vi.fn(),
    manualTracking: "",
    setManualTracking: vi.fn(),
    manualNotes: "",
    setManualNotes: vi.fn(),
    selectedCompanyId: "",
    setSelectedCompanyId: vi.fn(),
    loading: false,
    onTurboDirectShipment: vi.fn(),
    onQpExpressDirectShipment: vi.fn(),
    onBostaDirectShipment: vi.fn(),
    onCreateShipment: vi.fn(),
  };

  it("renders carrier tabs and Turbo direct mode card when courierMode is turbo", () => {
    render(<ShippingCarrierSelector {...defaultProps} />);

    expect(screen.getByText("تربو (Turbo)")).toBeInTheDocument();
    expect(screen.getByText("كيو بي (QP Express)")).toBeInTheDocument();
    expect(screen.getByText("بوستا (Bosta)")).toBeInTheDocument();
    expect(screen.getByText("شحن يدوي / خاص")).toBeInTheDocument();
    expect(screen.getByText("إرسال فوري إلى شركة تربو (Turbo Courier)")).toBeInTheDocument();
  });

  it("triggers onTurboDirectShipment when dispatch button is clicked", () => {
    render(<ShippingCarrierSelector {...defaultProps} />);

    const dispatchBtn = screen.getByText("إرسال إلى شركة تربو وتوليد البوليصة");
    fireEvent.click(dispatchBtn);

    expect(defaultProps.onTurboDirectShipment).toHaveBeenCalled();
  });

  it("switches to manual mode when manual tab is clicked", () => {
    render(<ShippingCarrierSelector {...defaultProps} />);

    const manualTab = screen.getByText("شحن يدوي / خاص");
    fireEvent.click(manualTab);

    expect(defaultProps.setCourierMode).toHaveBeenCalledWith("manual");
    expect(defaultProps.setIsManualCourier).toHaveBeenCalledWith(true);
  });

  it("renders manual mode inputs and triggers onCreateShipment when courierMode is manual", () => {
    render(<ShippingCarrierSelector {...defaultProps} courierMode="manual" />);

    expect(
      screen.getByPlaceholderText("مثال: EXP-982341")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("اسم المندوب ورقم هاتفه")
    ).toBeInTheDocument();

    const saveBtn = screen.getByText("حفظ بيانات الشحن اليدوي");
    fireEvent.click(saveBtn);

    expect(defaultProps.onCreateShipment).toHaveBeenCalled();
  });
});
