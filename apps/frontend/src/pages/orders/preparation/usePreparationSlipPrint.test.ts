import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { usePreparationSlipPrint } from "./usePreparationSlipPrint";
import { printSingleShippingLabel, toOrderDetailsType } from "../../../utils/printShippingLabel";
import type { PreparationOrder } from "./types";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../utils/printShippingLabel", () => ({
  printSingleShippingLabel: jest.fn(),
  toOrderDetailsType: jest.fn((order) => ({ ...order, isMapped: true })),
}));

describe("usePreparationSlipPrint", () => {
  const mockT = jest.fn((key: string) => key);
  const mockUser = {
    company: {
      name: "MaxP Test Company",
      logo: "https://example.com/logo.png",
    },
  };
  const mockInvoiceSettings = { paperSize: "A4" };
  const mockOrders: PreparationOrder[] = [
    {
      id: "ord-1",
      orderNumber: "ORD-101",
      customerName: "Ahmed Ali",
      customerPhone: "01012345678",
      status: "READY_FOR_PREPARATION",
      createdAt: "2026-10-18T10:00:00Z",
      items: [],
      subtotal: 100,
      total: 120,
    } as any,
  ];

  let originalWindowOpen: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalWindowOpen = window.open;
  });

  afterEach(() => {
    window.open = originalWindowOpen;
  });

  it("initializes with printingOrderNumber as null", () => {
    const { result } = renderHook(() =>
      usePreparationSlipPrint({
        orders: mockOrders,
        user: mockUser,
        invoiceSettings: mockInvoiceSettings,
        t: mockT,
      }),
    );

    expect(result.current.printingOrderNumber).toBeNull();
  });

  it("displays error toast when order is not found", async () => {
    const { result } = renderHook(() =>
      usePreparationSlipPrint({
        orders: mockOrders,
        user: mockUser,
        invoiceSettings: mockInvoiceSettings,
        t: mockT,
      }),
    );

    await act(async () => {
      await result.current.handlePrintPreparationSlip("NON_EXISTENT_ORDER");
    });

    expect(toast.error).toHaveBeenCalledWith("preparation.page.orderNotFound");
    expect(result.current.printingOrderNumber).toBeNull();
  });

  it("displays error toast when popup window is blocked", async () => {
    window.open = jest.fn().mockReturnValue(null);

    const { result } = renderHook(() =>
      usePreparationSlipPrint({
        orders: mockOrders,
        user: mockUser,
        invoiceSettings: mockInvoiceSettings,
        t: mockT,
      }),
    );

    await act(async () => {
      await result.current.handlePrintPreparationSlip("ORD-101");
    });

    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(toast.error).toHaveBeenCalledWith("preparation.page.printWindowBlocked");
    expect(result.current.printingOrderNumber).toBeNull();
  });

  it("prints slip and shows success toast when window is open", async () => {
    const mockPrintWindow = { document: { write: jest.fn() } };
    window.open = jest.fn().mockReturnValue(mockPrintWindow);
    (printSingleShippingLabel as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      usePreparationSlipPrint({
        orders: mockOrders,
        user: mockUser,
        invoiceSettings: mockInvoiceSettings,
        t: mockT,
      }),
    );

    await act(async () => {
      await result.current.handlePrintPreparationSlip("ORD-101");
    });

    expect(toOrderDetailsType).toHaveBeenCalledWith(mockOrders[0]);
    expect(printSingleShippingLabel).toHaveBeenCalledWith({
      order: expect.objectContaining({ isMapped: true }),
      companyName: "MaxP Test Company",
      companyLogoUrl: "https://example.com/logo.png",
      printWindow: mockPrintWindow,
      settings: mockInvoiceSettings,
    });
    expect(toast.success).toHaveBeenCalledWith("preparation.page.slipOpened");
    expect(result.current.printingOrderNumber).toBeNull();
  });

  it("handles print failure and displays error toast", async () => {
    const mockPrintWindow = { document: { write: jest.fn() } };
    window.open = jest.fn().mockReturnValue(mockPrintWindow);
    (printSingleShippingLabel as jest.Mock).mockRejectedValueOnce(new Error("Print driver failed"));

    const { result } = renderHook(() =>
      usePreparationSlipPrint({
        orders: mockOrders,
        user: mockUser,
        invoiceSettings: mockInvoiceSettings,
        t: mockT,
      }),
    );

    await act(async () => {
      await result.current.handlePrintPreparationSlip("ORD-101");
    });

    expect(toast.error).toHaveBeenCalledWith("Print driver failed");
    expect(result.current.printingOrderNumber).toBeNull();
  });
});
