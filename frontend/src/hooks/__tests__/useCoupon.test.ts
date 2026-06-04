/**
 * 🧪 Unit Tests: useCoupon
 *
 * Tests the coupon validation logic in isolation.
 * The storefrontApi is mocked so no HTTP calls are made.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useCoupon } from "../useCoupon";

// ─── Mock storefrontApi ───────────────────────────────────

jest.mock("../../utils/storefrontApi", () => ({
  storefrontApi: {
    validateCoupon: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { storefrontApi } = require("../../utils/storefrontApi") as {
  storefrontApi: { validateCoupon: jest.Mock };
};

// ─── Tests ───────────────────────────────────────────────────

describe("useCoupon", () => {
  const defaultProps = {
    companyId: "test-company-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should start with null appliedCoupon and no error", () => {
    const { result } = renderHook(() => useCoupon(defaultProps));
    expect(result.current.appliedCoupon).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it("should show isValidating = true while request is in flight", async () => {
    // Never resolves — simulates pending network request
    storefrontApi.validateCoupon.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCoupon(defaultProps));

    act(() => {
      void result.current.applyCoupon("LUXURY15", 1000);
    });

    expect(result.current.isValidating).toBe(true);
  });

  it("should apply coupon and call onSuccess when API returns success", async () => {
    const onSuccess = jest.fn();
    storefrontApi.validateCoupon.mockResolvedValue({
      success: true,
      discount: 150,
    });

    const { result } = renderHook(() =>
      useCoupon({ ...defaultProps, onSuccess })
    );

    await act(async () => {
      await result.current.applyCoupon("LUXURY15", 1000);
    });

    expect(result.current.appliedCoupon).toBe("LUXURY15");
    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith(150, "LUXURY15");
  });

  it("should calculate 15% fallback discount if API returns no discount amount", async () => {
    const onSuccess = jest.fn();
    storefrontApi.validateCoupon.mockResolvedValue({
      success: true,
      // No discount field — fallback to 15%
    });

    const { result } = renderHook(() =>
      useCoupon({ ...defaultProps, onSuccess })
    );

    await act(async () => {
      await result.current.applyCoupon("SUMMER10", 2000);
    });

    // 15% of 2000 = 300
    expect(onSuccess).toHaveBeenCalledWith(300, "SUMMER10");
  });

  it("should set error and call onError when API returns failure", async () => {
    const onError = jest.fn();
    storefrontApi.validateCoupon.mockResolvedValue({
      success: false,
      message: "Coupon has expired",
    });

    const { result } = renderHook(() =>
      useCoupon({ ...defaultProps, onError })
    );

    await act(async () => {
      await result.current.applyCoupon("EXPIRED", 500);
    });

    expect(result.current.appliedCoupon).toBeNull();
    expect(result.current.error).toBe("Coupon has expired");
    expect(onError).toHaveBeenCalledWith("Coupon has expired");
  });

  it("should handle API network error gracefully", async () => {
    const onError = jest.fn();
    storefrontApi.validateCoupon.mockRejectedValue(new Error("Network timeout"));

    const { result } = renderHook(() =>
      useCoupon({ ...defaultProps, onError })
    );

    await act(async () => {
      await result.current.applyCoupon("TEST", 100);
    });

    expect(result.current.error).toBe("Network timeout");
    expect(result.current.isValidating).toBe(false);
    expect(onError).toHaveBeenCalledWith("Network timeout");
  });

  it("should not call API when code is empty string", async () => {
    const { result } = renderHook(() => useCoupon(defaultProps));

    await act(async () => {
      await result.current.applyCoupon("", 1000);
    });

    expect(storefrontApi.validateCoupon).not.toHaveBeenCalled();
  });

  it("should clear coupon and error on removeCoupon", async () => {
    storefrontApi.validateCoupon.mockResolvedValue({ success: true, discount: 100 });

    const { result } = renderHook(() => useCoupon(defaultProps));

    await act(async () => {
      await result.current.applyCoupon("VALID10", 1000);
    });

    expect(result.current.appliedCoupon).toBe("VALID10");

    act(() => {
      result.current.removeCoupon();
    });

    expect(result.current.appliedCoupon).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should reset isValidating to false after success", async () => {
    storefrontApi.validateCoupon.mockResolvedValue({ success: true, discount: 50 });
    const { result } = renderHook(() => useCoupon(defaultProps));

    await act(async () => {
      await result.current.applyCoupon("CODE", 500);
    });

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });
  });
});
