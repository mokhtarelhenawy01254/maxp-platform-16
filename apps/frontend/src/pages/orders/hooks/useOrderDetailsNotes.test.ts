import { renderHook, act } from "@testing-library/react";
import { useOrderDetailsNotes } from "./useOrderDetailsNotes";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useOrderDetailsNotes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles adding a note successfully", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, data: { id: "n1", content: "Test note" } },
    });

    const { result } = renderHook(() =>
      useOrderDetailsNotes({ encodedOrderNumber: "ORD-1" }),
    );

    let ok = false;
    await act(async () => {
      ok = await result.current.addNote("Test note");
    });

    expect(ok).toBe(true);
    expect(result.current.orderNotes).toEqual([{ id: "n1", content: "Test note" }]);
  });

  it("handles updating a note successfully", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      data: { success: true, data: { id: "n1", content: "Updated note" } },
    });

    const { result } = renderHook(() =>
      useOrderDetailsNotes({ encodedOrderNumber: "ORD-1" }),
    );

    act(() => {
      result.current.setOrderNotes([{ id: "n1", content: "Initial note" }]);
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.updateNote("n1", "Updated note");
    });

    expect(ok).toBe(true);
    expect(result.current.orderNotes[0].content).toBe("Updated note");
  });

  it("handles deleting a note successfully", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    const { result } = renderHook(() =>
      useOrderDetailsNotes({ encodedOrderNumber: "ORD-1" }),
    );

    act(() => {
      result.current.setOrderNotes([{ id: "n1", content: "Note to delete" }]);
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteNote("n1");
    });

    expect(ok).toBe(true);
    expect(result.current.orderNotes).toEqual([]);
  });
});
