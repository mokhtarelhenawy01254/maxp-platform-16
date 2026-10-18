import { renderHook } from "@testing-library/react";
import { useOrderDetailsShipping } from "./useOrderDetailsShipping";
import type { OrderDetailsType } from "../types";

const mockFetchBostaShipment = jest.fn();
const mockCancelShipment = jest.fn();
const mockUnlinkShipment = jest.fn();

jest.mock("./useTurboShipping", () => ({
  useTurboShipping: () => ({
    turboLoading: false,
    createShipment: jest.fn(),
    getWaybill: jest.fn(),
    cancelShipment: mockCancelShipment,
    unlinkShipment: mockUnlinkShipment,
    calculateShipping: jest.fn(),
  }),
}));

jest.mock("./useBostaShipping", () => ({
  useBostaShipping: () => ({
    bostaLoading: false,
    bostaShipment: { trackingNumber: "BST-12345" },
    fetchShipment: mockFetchBostaShipment,
    printAWB: jest.fn(),
  }),
}));

jest.mock("./useOrderShippingActions", () => ({
  useOrderShippingActions: () => ({
    showCancelShipmentModal: false,
    setShowCancelShipmentModal: jest.fn(),
    showUnlinkShipmentModal: false,
    setShowUnlinkShipmentModal: jest.fn(),
    showRecreateShipmentModal: false,
    setShowRecreateShipmentModal: jest.fn(),
    handleCreateShipment: jest.fn(),
    handleRecreateShipment: jest.fn(),
    handlePrintWaybill: jest.fn(),
    handleCalculateShipping: jest.fn(),
  }),
}));

describe("useOrderDetailsShipping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches bosta shipment on mount when order has id", () => {
    const mockOrder = { id: 999, orderNumber: "ORD-999" } as unknown as OrderDetailsType;
    const setOrder = jest.fn();

    const { result } = renderHook(() => useOrderDetailsShipping(mockOrder, setOrder));

    expect(mockFetchBostaShipment).toHaveBeenCalled();
    expect(result.current.turboLoading).toBe(false);
    expect(result.current.bostaLoading).toBe(false);
    expect(result.current.shippingActions.showCancelShipmentModal).toBe(false);
  });

  it("does not fetch bosta shipment when order is null", () => {
    const setOrder = jest.fn();

    renderHook(() => useOrderDetailsShipping(null, setOrder));

    expect(mockFetchBostaShipment).not.toHaveBeenCalled();
  });
});
