import { renderHook, act } from "@testing-library/react";
import { useOrdersBulkOperations } from "./useOrdersBulkOperations";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe("useOrdersBulkOperations", () => {
  const mockSetSelectedOrders = jest.fn();
  const mockFetchOrders = jest.fn().mockResolvedValue(undefined);
  const mockNavigate = jest.fn();
  const mockT = jest.fn((key: string, opts?: any) => opts?.defaultValue || key);
  const mockGetStatusDisplay = jest.fn((status: string) => ({ label: status }));
  const mockNormalizeStatusCode = jest.fn((val: string | null | undefined) =>
    String(val || "").trim().toUpperCase()
  );
  const mockIsCancellationStatus = jest.fn((val: string | null | undefined) =>
    ["CANCELLED", "CANCELED"].includes(String(val || "").toUpperCase())
  );
  const mockGetApiErrorMessage = jest.fn(
    (err: unknown, fallback: string) => fallback
  );

  const defaultParams = {
    selectedOrders: ["ORD-001", "ORD-002"],
    setSelectedOrders: mockSetSelectedOrders,
    isTrashView: false,
    fetchOrders: mockFetchOrders,
    user: { company: { name: "Test Corp" } },
    navigate: mockNavigate,
    t: mockT as any,
    getStatusDisplay: mockGetStatusDisplay,
    normalizeStatusCode: mockNormalizeStatusCode,
    isCancellationStatus: mockIsCancellationStatus,
    getApiErrorMessage: mockGetApiErrorMessage,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
    window.prompt = jest.fn(() => "Customer requested");
    window.alert = jest.fn();
    window.open = jest.fn();
  });

  it("initializes with default states", () => {
    const { result } = renderHook(() => useOrdersBulkOperations(defaultParams));

    expect(result.current.bulkProcessing).toBe(false);
    expect(result.current.printingInvoices).toBe(false);
    expect(result.current.selectedInvoice).toBeNull();
  });

  describe("handleBulkStatusUpdate", () => {
    it("updates status successfully and refreshes orders", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            successCount: 2,
            results: [{ id: "ORD-001", success: true }, { id: "ORD-002", success: true }],
          },
        },
      });

      const { result } = renderHook(() => useOrdersBulkOperations(defaultParams));

      await act(async () => {
        await result.current.handleBulkStatusUpdate("CONFIRMED");
      });

      expect(apiClient.post).toHaveBeenCalledWith("/orders-new/bulk/status", {
        orderIds: ["ORD-001", "ORD-002"],
        status: "CONFIRMED",
        notes: "",
      });
      expect(mockFetchOrders).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedOrders).toHaveBeenCalledWith([]);
    });

    it("requires cancellation reason when status is CANCELLED", async () => {
      (window.prompt as jest.Mock).mockReturnValueOnce(null);

      const { result } = renderHook(() => useOrdersBulkOperations(defaultParams));

      await act(async () => {
        await result.current.handleBulkStatusUpdate("CANCELLED");
      });

      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe("handleBulkDelete", () => {
    it("calls bulk delete endpoint with permanent=false in regular view", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { successCount: 2, results: [] },
        },
      });

      const { result } = renderHook(() => useOrdersBulkOperations(defaultParams));

      await act(async () => {
        await result.current.handleBulkDelete();
      });

      expect(apiClient.post).toHaveBeenCalledWith("/orders-new/bulk/delete", {
        orderIds: ["ORD-001", "ORD-002"],
        permanent: false,
      });
      expect(mockFetchOrders).toHaveBeenCalledTimes(1);
    });

    it("calls bulk delete endpoint with permanent=true in trash view", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { successCount: 2, results: [] },
        },
      });

      const { result } = renderHook(() =>
        useOrdersBulkOperations({ ...defaultParams, isTrashView: true })
      );

      await act(async () => {
        await result.current.handleBulkDelete();
      });

      expect(apiClient.post).toHaveBeenCalledWith("/orders-new/bulk/delete", {
        orderIds: ["ORD-001", "ORD-002"],
        permanent: true,
      });
    });
  });

  describe("carrier dispatch operations", () => {
    it("creates turbo shipments successfully", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { success: 2, failed: 0, skipped: 0 },
        },
      });

      const { result } = renderHook(() => useOrdersBulkOperations(defaultParams));

      await act(async () => {
        await result.current.handleBulkCreateTurboShipments();
      });

      expect(apiClient.post).toHaveBeenCalledWith("/turbo/bulk/create-shipments", {
        orderIds: ["ORD-001", "ORD-002"],
      });
      expect(mockFetchOrders).toHaveBeenCalledTimes(1);
    });

    it("creates QP Express shipments successfully", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { success: 2, failed: 0, skipped: 0 },
        },
      });

      const { result } = renderHook(() => useOrdersBulkOperations(defaultParams));

      await act(async () => {
        await result.current.handleBulkCreateQpExpressShipments();
      });

      expect(apiClient.post).toHaveBeenCalledWith("/qp-express/bulk/create-shipments", {
        orderIds: ["ORD-001", "ORD-002"],
      });
      expect(mockFetchOrders).toHaveBeenCalledTimes(1);
    });

    it("creates Bosta shipments successfully", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: { success: 2, failed: 0, skipped: 0 },
        },
      });

      const { result } = renderHook(() => useOrdersBulkOperations(defaultParams));

      await act(async () => {
        await result.current.handleBulkCreateBostaShipments();
      });

      expect(apiClient.post).toHaveBeenCalledWith("/bosta/bulk/create-shipments", {
        orderIds: ["ORD-001", "ORD-002"],
      });
      expect(mockFetchOrders).toHaveBeenCalledTimes(1);
    });
  });
});
