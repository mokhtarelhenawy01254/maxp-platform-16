import { renderHook, act } from "@testing-library/react";
import { useOrdersBulkShipments } from "./useOrdersBulkShipments";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe("useOrdersBulkShipments", () => {
  const mockFetchOrders = jest.fn();
  const mockSetSelectedOrders = jest.fn();
  const mockSetBulkProcessing = jest.fn();
  const mockGetApiErrorMessage = jest.fn((_err, fallback) => fallback);
  const mockT = jest.fn((key, options) => options?.defaultValue || key);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockImplementation(() => true);
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {
    selectedOrders: ["ord-1", "ord-2"],
    setSelectedOrders: mockSetSelectedOrders,
    fetchOrders: mockFetchOrders,
    setBulkProcessing: mockSetBulkProcessing,
    getApiErrorMessage: mockGetApiErrorMessage,
    t: mockT as any,
  };

  it("handles bulk create Turbo shipments successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: { success: 2, failed: 0, skipped: 0 },
      },
    });

    const { result } = renderHook(() => useOrdersBulkShipments(defaultProps));

    await act(async () => {
      await result.current.handleBulkCreateTurboShipments();
    });

    expect(apiClient.post).toHaveBeenCalledWith("/turbo/bulk/create-shipments", {
      orderIds: ["ord-1", "ord-2"],
    });
    expect(mockSetSelectedOrders).toHaveBeenCalledWith([]);
    expect(mockFetchOrders).toHaveBeenCalled();
  });

  it("handles bulk create QP Express shipments successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: { success: 2, failed: 0, skipped: 0 },
      },
    });

    const { result } = renderHook(() => useOrdersBulkShipments(defaultProps));

    await act(async () => {
      await result.current.handleBulkCreateQpExpressShipments();
    });

    expect(apiClient.post).toHaveBeenCalledWith("/qp-express/bulk/create-shipments", {
      orderIds: ["ord-1", "ord-2"],
    });
    expect(mockSetSelectedOrders).toHaveBeenCalledWith([]);
    expect(mockFetchOrders).toHaveBeenCalled();
  });

  it("handles bulk create Bosta shipments successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: { success: 2, failed: 0, skipped: 0 },
      },
    });

    const { result } = renderHook(() => useOrdersBulkShipments(defaultProps));

    await act(async () => {
      await result.current.handleBulkCreateBostaShipments();
    });

    expect(apiClient.post).toHaveBeenCalledWith("/bosta/bulk/create-shipments", {
      orderIds: ["ord-1", "ord-2"],
    });
    expect(mockSetSelectedOrders).toHaveBeenCalledWith([]);
    expect(mockFetchOrders).toHaveBeenCalled();
  });

  it("does not proceed if user cancels confirmation", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);

    const { result } = renderHook(() => useOrdersBulkShipments(defaultProps));

    await act(async () => {
      await result.current.handleBulkCreateTurboShipments();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(mockSetSelectedOrders).not.toHaveBeenCalled();
  });
});
