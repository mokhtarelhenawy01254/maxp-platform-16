import React from "react";
import { act, render } from "@testing-library/react";
import IncompleteOrders from "../IncompleteOrders";

const mockHandleRetry = jest.fn();
let capturedOnHandler: ((...args: unknown[]) => void) | null = null;
let capturedOffHandler: ((...args: unknown[]) => void) | null = null;

const mockSocketOn = jest.fn((event: string, callback: (...args: unknown[]) => void) => {
  if (event === "order:incomplete:new") {
    capturedOnHandler = callback;
  }
});

const mockSocketOff = jest.fn((event: string, callback?: (...args: unknown[]) => void) => {
  if (event === "order:incomplete:new") {
    capturedOffHandler = callback || null;
  }
});

jest.mock("../../../services/socketService", () => ({
  socketService: {
    on: (event: string, callback: (...args: unknown[]) => void) =>
      mockSocketOn(event, callback),
    off: (event: string, callback?: (...args: unknown[]) => void) =>
      mockSocketOff(event, callback),
  },
}));

jest.mock("../incomplete/useIncompleteOrdersData", () => ({
  useIncompleteOrdersData: () => ({
    orders: [],
    setOrders: jest.fn(),
    stats: { total: 0, active: 0, lost: 0, totalValue: 0, activeValue: 0, lostValue: 0 },
    statsAreServer: false,
    loading: false,
    error: null,
    page: 1,
    setPage: jest.fn(),
    limit: 20,
    setLimit: jest.fn(),
    totalOrders: 0,
    totalPages: 1,
    searchInput: "",
    setSearchInput: jest.fn(),
    statusFilter: "active",
    setStatusFilter: jest.fn(),
    phoneFilter: "with_phone",
    setPhoneFilter: jest.fn(),
    sortValue: "priority",
    setSortValue: jest.fn(),
    buildParams: jest.fn(),
    handleRetry: mockHandleRetry,
  }),
}));

jest.mock("../incomplete/useIncompleteOrdersActions", () => ({
  useIncompleteOrdersActions: () => ({
    confirmConvertCartId: null,
    setConfirmConvertCartId: jest.fn(),
    convertingCartId: null,
    exporting: false,
    contactCartId: null,
    setContactCartId: jest.fn(),
    contactMethod: "phone",
    setContactMethod: jest.fn(),
    contactResult: "no_answer",
    setContactResult: jest.fn(),
    contactNote: "",
    setContactNote: jest.fn(),
    savingContact: false,
    cancelModalOpen: false,
    setCancelModalOpen: jest.fn(),
    selectedCancelOrder: null,
    setSelectedCancelOrder: jest.fn(),
    handleCopyCartId: jest.fn(),
    handleConvert: jest.fn(),
    openContactModal: jest.fn(),
    handleSaveContact: jest.fn(),
    handleExport: jest.fn(),
    handleConfirmConvert: jest.fn(),
  }),
}));

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({ user: { role: "ADMIN" } }),
}));

jest.mock("../../../contexts/CompanyContext", () => ({
  useCompany: () => ({ company: {} }),
}));

jest.mock("../../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("../incomplete/IncompleteOrdersHeader", () => ({
  __esModule: true,
  default: () => <div data-testid="header" />,
}));
jest.mock("../incomplete/IncompleteOrdersStatsBar", () => ({
  __esModule: true,
  default: () => <div data-testid="stats" />,
}));
jest.mock("../incomplete/IncompleteOrdersFilterBar", () => ({
  __esModule: true,
  default: () => <div data-testid="filter" />,
}));
jest.mock("../incomplete/IncompleteOrdersTable", () => ({
  __esModule: true,
  default: () => <div data-testid="table" />,
}));
jest.mock("../incomplete/IncompleteOrdersPagination", () => ({
  __esModule: true,
  default: () => <div data-testid="pagination" />,
}));
jest.mock("../incomplete/IncompleteOrdersModals", () => ({
  IncompleteOrdersModals: () => <div data-testid="modals" />,
}));

describe("IncompleteOrders live socket refresh", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    capturedOnHandler = null;
    capturedOffHandler = null;
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("subscribes to order:incomplete:new and debounces multiple events within 100ms to exactly one handleRetry", () => {
    render(<IncompleteOrders />);

    expect(mockSocketOn).toHaveBeenCalledWith(
      "order:incomplete:new",
      expect.any(Function),
    );
    expect(capturedOnHandler).toBeDefined();

    act(() => {
      capturedOnHandler?.({ cartId: "cart-1" });
    });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    act(() => {
      capturedOnHandler?.({ cartId: "cart-2" });
    });

    expect(mockHandleRetry).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(mockHandleRetry).toHaveBeenCalledTimes(1);
  });

  it("unregisters listener on unmount with the same handler reference", () => {
    const { unmount } = render(<IncompleteOrders />);
    expect(capturedOnHandler).toBeDefined();

    unmount();

    expect(mockSocketOff).toHaveBeenCalledWith(
      "order:incomplete:new",
      capturedOnHandler,
    );
    expect(capturedOffHandler).toBe(capturedOnHandler);
  });

  it("skips refresh when document.visibilityState is hidden", () => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });

    render(<IncompleteOrders />);

    act(() => {
      capturedOnHandler?.({ cartId: "cart-hidden" });
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockHandleRetry).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });
});
