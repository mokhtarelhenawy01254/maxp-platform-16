import { renderHook, act } from "@testing-library/react";
import { useTurboWaybill } from "./useTurboWaybill";
import { toast } from "sonner";

jest.mock("../../../config", () => ({
  config: {
    apiUrl: "https://api.example.com",
  },
}));

jest.mock("../../../utils/tokenManager", () => ({
  getAccessToken: () => "mock-token",
}));

jest.mock("sonner", () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useTurboWaybill", () => {
  const mockSetTurboLoading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
    (global as any).open = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null if order has no id", async () => {
    const { result } = renderHook(() =>
      useTurboWaybill({
        order: null,
        setTurboLoading: mockSetTurboLoading,
      }),
    );

    const res = await result.current.getWaybill();
    expect(res).toBeNull();
    expect(mockSetTurboLoading).not.toHaveBeenCalled();
  });

  it("fetches and opens HTML waybill when format is html", async () => {
    const mockWindow = {
      document: {
        write: jest.fn(),
        close: jest.fn(),
        title: "",
      },
      focus: jest.fn(),
      print: jest.fn(),
    };
    (window.open as jest.Mock).mockReturnValue(mockWindow);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        headers: { get: () => "text/html" },
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "<html>Waybill</html>",
      });

    const { result } = renderHook(() =>
      useTurboWaybill({
        order: { id: "ord-123", orderNumber: "ORD-123" },
        setTurboLoading: mockSetTurboLoading,
      }),
    );

    let res: boolean | null = null;
    await act(async () => {
      res = await result.current.getWaybill();
    });

    expect(res).toBe(true);
    expect(mockSetTurboLoading).toHaveBeenCalledWith(true);
    expect(mockSetTurboLoading).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalled();
  });
});
