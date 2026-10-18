import { renderHook, act } from "@testing-library/react";
import { useOrderShippingActions } from "./useOrderShippingActions";
import type { OrderDetailsType } from "../types";

describe("useOrderShippingActions", () => {
  const mockCreateShipment = jest.fn();
  const mockGetWaybill = jest.fn();
  const mockCalculateShipping = jest.fn();
  const mockPrintBostaAWB = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles handleCreateShipment", async () => {
    const { result } = renderHook(() =>
      useOrderShippingActions({
        order: null,
        createShipment: mockCreateShipment,
        getWaybill: mockGetWaybill,
        calculateShipping: mockCalculateShipping,
      }),
    );

    await act(async () => {
      await result.current.handleCreateShipment();
    });

    expect(mockCreateShipment).toHaveBeenCalled();
  });

  it("handles handleRecreateShipment closing modal on success", async () => {
    mockCreateShipment.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useOrderShippingActions({
        order: null,
        createShipment: mockCreateShipment,
        getWaybill: mockGetWaybill,
        calculateShipping: mockCalculateShipping,
      }),
    );

    act(() => {
      result.current.setShowRecreateShipmentModal(true);
    });
    expect(result.current.showRecreateShipmentModal).toBe(true);

    await act(async () => {
      await result.current.handleRecreateShipment();
    });

    expect(mockCreateShipment).toHaveBeenCalledWith({ replaceExisting: true });
    expect(result.current.showRecreateShipmentModal).toBe(false);
  });

  it("handles handlePrintWaybill for QP_EXPRESS carrier", async () => {
    const windowOpenSpy = jest.spyOn(window, "open").mockImplementation(() => null);

    const order: OrderDetailsType = {
      carrierType: "QP_EXPRESS",
      trackingNumber: "QP123456",
    } as any;

    const { result } = renderHook(() =>
      useOrderShippingActions({
        order,
        createShipment: mockCreateShipment,
        getWaybill: mockGetWaybill,
        calculateShipping: mockCalculateShipping,
      }),
    );

    await act(async () => {
      await result.current.handlePrintWaybill();
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "/api/v1/qp-express/waybill/QP123456",
      "_blank",
    );
    windowOpenSpy.mockRestore();
  });

  it("handles handlePrintWaybill for BOSTA carrier", async () => {
    const order: OrderDetailsType = {
      carrierType: "BOSTA",
      trackingNumber: "BOSTA999",
    } as any;

    const { result } = renderHook(() =>
      useOrderShippingActions({
        order,
        createShipment: mockCreateShipment,
        getWaybill: mockGetWaybill,
        calculateShipping: mockCalculateShipping,
        bostaShipment: { trackingNumber: "BOSTA999" },
        printBostaAWB: mockPrintBostaAWB,
      }),
    );

    await act(async () => {
      await result.current.handlePrintWaybill();
    });

    expect(mockPrintBostaAWB).toHaveBeenCalled();
  });

  it("handles handleCalculateShipping with parsed JSON address", async () => {
    const order: OrderDetailsType = {
      shippingAddress: JSON.stringify({
        governorate: "Cairo",
        city: "Nasr City",
      }),
    } as any;

    const { result } = renderHook(() =>
      useOrderShippingActions({
        order,
        createShipment: mockCreateShipment,
        getWaybill: mockGetWaybill,
        calculateShipping: mockCalculateShipping,
      }),
    );

    await act(async () => {
      await result.current.handleCalculateShipping();
    });

    expect(mockCalculateShipping).toHaveBeenCalledWith("Cairo", "Nasr City");
  });
});
