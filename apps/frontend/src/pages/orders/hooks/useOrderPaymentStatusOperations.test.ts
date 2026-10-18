import { renderHook, act } from "@testing-library/react";
import { useOrderPaymentStatusOperations } from "./useOrderPaymentStatusOperations";

describe("useOrderPaymentStatusOperations", () => {
  const mockUpdatePaymentStatus = jest.fn();
  const mockSetShowPaymentModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calculates canUpdatePaymentStatus correctly", () => {
    const { result, rerender } = renderHook(
      (props) => useOrderPaymentStatusOperations(props),
      {
        initialProps: {
          isMerchant: false,
          isGuestOrder: false,
          updatePaymentStatus: mockUpdatePaymentStatus,
          setShowPaymentModal: mockSetShowPaymentModal,
        },
      },
    );

    expect(result.current.canUpdatePaymentStatus).toBe(true);

    // If merchant, cannot update
    rerender({
      isMerchant: true,
      isGuestOrder: false,
      updatePaymentStatus: mockUpdatePaymentStatus,
      setShowPaymentModal: mockSetShowPaymentModal,
    });
    expect(result.current.canUpdatePaymentStatus).toBe(false);

    // If guest order, cannot update
    rerender({
      isMerchant: false,
      isGuestOrder: true,
      updatePaymentStatus: mockUpdatePaymentStatus,
      setShowPaymentModal: mockSetShowPaymentModal,
    });
    expect(result.current.canUpdatePaymentStatus).toBe(false);
  });

  it("closes modal immediately on update attempt for guest order", async () => {
    const { result } = renderHook(() =>
      useOrderPaymentStatusOperations({
        isMerchant: false,
        isGuestOrder: true,
        updatePaymentStatus: mockUpdatePaymentStatus,
        setShowPaymentModal: mockSetShowPaymentModal,
      }),
    );

    await act(async () => {
      await result.current.onUpdatePaymentStatus();
    });

    expect(mockSetShowPaymentModal).toHaveBeenCalledWith(false);
    expect(mockUpdatePaymentStatus).not.toHaveBeenCalled();
  });

  it("updates payment status successfully and resets form state", async () => {
    mockUpdatePaymentStatus.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useOrderPaymentStatusOperations({
        isMerchant: false,
        isGuestOrder: false,
        updatePaymentStatus: mockUpdatePaymentStatus,
        setShowPaymentModal: mockSetShowPaymentModal,
      }),
    );

    act(() => {
      result.current.setNewPaymentStatus("PAID");
      result.current.setPaymentNotes("Paid via Bank Transfer");
    });

    expect(result.current.newPaymentStatus).toBe("PAID");
    expect(result.current.paymentNotes).toBe("Paid via Bank Transfer");

    await act(async () => {
      await result.current.onUpdatePaymentStatus();
    });

    expect(mockUpdatePaymentStatus).toHaveBeenCalledWith(
      "PAID",
      "Paid via Bank Transfer",
    );
    expect(mockSetShowPaymentModal).toHaveBeenCalledWith(false);
    expect(result.current.newPaymentStatus).toBe("");
    expect(result.current.paymentNotes).toBe("");
  });

  it("keeps state and does not close modal if update fails", async () => {
    mockUpdatePaymentStatus.mockResolvedValue(false);

    const { result } = renderHook(() =>
      useOrderPaymentStatusOperations({
        isMerchant: false,
        isGuestOrder: false,
        updatePaymentStatus: mockUpdatePaymentStatus,
        setShowPaymentModal: mockSetShowPaymentModal,
      }),
    );

    act(() => {
      result.current.setNewPaymentStatus("PAID");
      result.current.setPaymentNotes("Failed Attempt");
    });

    await act(async () => {
      await result.current.onUpdatePaymentStatus();
    });

    expect(mockUpdatePaymentStatus).toHaveBeenCalledWith(
      "PAID",
      "Failed Attempt",
    );
    expect(mockSetShowPaymentModal).not.toHaveBeenCalled();
    expect(result.current.newPaymentStatus).toBe("PAID");
    expect(result.current.paymentNotes).toBe("Failed Attempt");
  });
});
