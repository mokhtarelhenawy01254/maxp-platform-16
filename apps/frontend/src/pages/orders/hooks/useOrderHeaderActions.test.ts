import { renderHook, act } from "@testing-library/react";
import { useOrderHeaderActions } from "./useOrderHeaderActions";
import { printSingleShippingLabel } from "../../../utils/printShippingLabel";
import tokenManager from "../../../utils/tokenManager";
import type { OrderDetailsType } from "../types";

jest.mock("../../../utils/printShippingLabel", () => ({
  printSingleShippingLabel: jest.fn(),
}));

jest.mock("../../../utils/tokenManager", () => ({
  __esModule: true,
  default: {
    createAuthHeaders: jest.fn(() => ({ Authorization: "Bearer test-token" })),
  },
}));

describe("useOrderHeaderActions", () => {
  const mockT = jest.fn((key: string, options?: any) => key);
  const mockUser = {
    company: {
      name: "Acme Orders Ltd",
      logo: "https://example.com/logo.png",
    },
  };
  const mockInvoiceSettings = { paperSize: "A4" };
  const baseOrder: OrderDetailsType = {
    id: "ord-1",
    orderNumber: "ORD-999",
    customerName: "Mahmoud Hassan",
    customerPhone: "01098765432",
    customerAddress: "Cairo, Egypt",
    status: "CONFIRMED",
    createdAt: "2026-10-18T12:00:00Z",
    items: [],
    subtotal: 500,
    shipping: 50,
    tax: 0,
    discount: 0,
    total: 550,
    conversationId: "conv-123",
  } as any;

  let originalWindowOpen: any;
  let originalAlert: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalWindowOpen = window.open;
    originalAlert = window.alert;
    window.alert = jest.fn();
  });

  afterEach(() => {
    window.open = originalWindowOpen;
    window.alert = originalAlert;
  });

  describe("whatsappChatUrl", () => {
    it("returns null when order has no phone", () => {
      const { result } = renderHook(() =>
        useOrderHeaderActions({
          order: { ...baseOrder, customerPhone: undefined, alternativePhone: undefined },
          user: mockUser,
          invoiceSettings: mockInvoiceSettings,
          t: mockT,
        }),
      );

      expect(result.current.whatsappChatUrl).toBeNull();
    });

    it("normalizes Egyptian phone starting with 01 to 201 and adds params", () => {
      const { result } = renderHook(() =>
        useOrderHeaderActions({
          order: baseOrder,
          user: mockUser,
          invoiceSettings: mockInvoiceSettings,
          t: mockT,
        }),
      );

      expect(result.current.whatsappChatUrl).toContain("phone=201098765432");
      expect(result.current.whatsappChatUrl).toContain("name=Mahmoud+Hassan");
      expect(result.current.whatsappChatUrl).toContain("orderNumber=ORD-999");
      expect(result.current.whatsappChatUrl).toContain("conversationId=conv-123");
    });
  });

  describe("handlePrintInvoice", () => {
    it("alerts if popup is blocked", async () => {
      window.open = jest.fn().mockReturnValue(null);

      const { result } = renderHook(() =>
        useOrderHeaderActions({
          order: baseOrder,
          user: mockUser,
          invoiceSettings: mockInvoiceSettings,
          t: mockT,
        }),
      );

      await act(async () => {
        await result.current.handlePrintInvoice();
      });

      expect(window.alert).toHaveBeenCalledWith("orderDetails.printWindowError");
    });

    it("prints direct invoice for guest orders", async () => {
      const mockPrintWindow = { document: { write: jest.fn() } };
      window.open = jest.fn().mockReturnValue(mockPrintWindow);
      (printSingleShippingLabel as jest.Mock).mockResolvedValueOnce(undefined);

      const guestOrder = {
        ...baseOrder,
        metadata: { isGuestOrder: true },
      };

      const { result } = renderHook(() =>
        useOrderHeaderActions({
          order: guestOrder,
          user: mockUser,
          invoiceSettings: mockInvoiceSettings,
          t: mockT,
        }),
      );

      await act(async () => {
        await result.current.handlePrintInvoice();
      });

      expect(printSingleShippingLabel).toHaveBeenCalledWith({
        order: guestOrder,
        companyName: "Acme Orders Ltd",
        companyLogoUrl: "https://example.com/logo.png",
        printWindow: mockPrintWindow,
        settings: mockInvoiceSettings,
      });
    });

    it("calls API to generate invoice and updates window location on success", async () => {
      const mockPrintWindow = { location: { href: "" } };
      window.open = jest.fn().mockReturnValue(mockPrintWindow);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: "inv-888" } }),
      } as any);

      const { result } = renderHook(() =>
        useOrderHeaderActions({
          order: baseOrder,
          user: mockUser,
          invoiceSettings: mockInvoiceSettings,
          t: mockT,
        }),
      );

      await act(async () => {
        await result.current.handlePrintInvoice();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/order-invoices/generate/ord-1",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockPrintWindow.location.href).toBe("/orders/invoice/inv-888?print=true");
    });
  });

  describe("handlePrintPreparationSlip", () => {
    it("calls printSingleShippingLabel with company info and settings", async () => {
      const mockPrintWindow = { document: { write: jest.fn() } };
      window.open = jest.fn().mockReturnValue(mockPrintWindow);
      (printSingleShippingLabel as jest.Mock).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useOrderHeaderActions({
          order: baseOrder,
          user: mockUser,
          invoiceSettings: mockInvoiceSettings,
          t: mockT,
        }),
      );

      await act(async () => {
        await result.current.handlePrintPreparationSlip();
      });

      expect(printSingleShippingLabel).toHaveBeenCalledWith({
        order: baseOrder,
        companyName: "Acme Orders Ltd",
        companyLogoUrl: "https://example.com/logo.png",
        printWindow: mockPrintWindow,
        settings: mockInvoiceSettings,
      });
    });
  });
});
