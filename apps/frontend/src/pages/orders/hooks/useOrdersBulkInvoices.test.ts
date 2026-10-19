import { renderHook, act } from "@testing-library/react";
import { useOrdersBulkInvoices } from "./useOrdersBulkInvoices";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe("useOrdersBulkInvoices", () => {
  const mockSetSelectedOrders = jest.fn();
  const mockNavigate = jest.fn();
  const mockT = jest.fn((key, options) => options?.defaultValue || key);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockImplementation(() => true);
    jest.spyOn(window, "alert").mockImplementation(() => {});
    jest.spyOn(window, "open").mockImplementation(() => ({
      close: jest.fn(),
      focus: jest.fn(),
    } as any));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {
    selectedOrders: ["ord-1", "ord-2"],
    setSelectedOrders: mockSetSelectedOrders,
    user: { company: { name: "Test Corp" } },
    navigate: mockNavigate,
    t: mockT as any,
  };

  it("initializes with default states", () => {
    const { result } = renderHook(() => useOrdersBulkInvoices(defaultProps));
    expect(result.current.printingInvoices).toBe(false);
    expect(result.current.selectedInvoice).toBeNull();
  });

  it("alerts when no orders are selected", async () => {
    const { result } = renderHook(() =>
      useOrdersBulkInvoices({ ...defaultProps, selectedOrders: [] }),
    );

    await act(async () => {
      await result.current.handleBulkPrintInvoices();
    });

    expect(window.alert).toHaveBeenCalledWith("يرجى اختيار الطلبات أولاً");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("handles multi-order invoice generation and opens window", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          success: ["ord-1", "ord-2"],
          existing: [],
          failed: [],
          invoices: [{ id: "inv-1" }, { id: "inv-2" }],
        },
      },
    });

    const { result } = renderHook(() => useOrdersBulkInvoices(defaultProps));

    await act(async () => {
      await result.current.handleBulkPrintInvoices();
    });

    expect(apiClient.post).toHaveBeenCalledWith("/order-invoices/bulk-generate", {
      orderIds: ["ord-1", "ord-2"],
    });
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("/orders/invoices/print-multiple?ids=inv-1%2Cinv-2"),
      "_blank",
    );
    expect(mockSetSelectedOrders).toHaveBeenCalledWith([]);
  });

  it("handles single-order invoice generation", async () => {
    const mockWindow = { close: jest.fn(), focus: jest.fn() };
    (window.open as jest.Mock).mockReturnValue(mockWindow);

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          invoices: [{ id: "inv-single", invoiceNumber: "INV-100" }],
        },
      },
    });

    const { result } = renderHook(() =>
      useOrdersBulkInvoices({ ...defaultProps, selectedOrders: ["ord-single"] }),
    );

    await act(async () => {
      await result.current.handleBulkPrintInvoices();
    });

    expect(apiClient.post).toHaveBeenCalledWith("/order-invoices/bulk-generate", {
      orderIds: ["ord-single"],
    });
    expect(mockWindow.close).toHaveBeenCalled();
    expect(result.current.selectedInvoice).toEqual({
      id: "inv-single",
      invoiceNumber: "INV-100",
    });
  });
});
