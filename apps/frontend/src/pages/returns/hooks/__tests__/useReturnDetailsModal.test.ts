// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useReturnDetailsModal } from "../useReturnDetailsModal";
import { returnService, type ReturnRequest } from "../../../../services/returnService";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../../services/returnService", () => ({
  returnService: {
    getCategories: vi.fn().mockResolvedValue({
      data: [{ id: "cat-1", name: "مقاسات", defaultRole: "CUSTOMER" }],
    }),
    getReasons: vi.fn().mockResolvedValue({
      data: [{ id: "reas-1", reason: "مقاس غير مناسب", categoryId: "cat-1" }],
    }),
    getReturnShippingCompanies: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: "sc-1",
            name: "بوسطة",
            isActive: true,
            returnTypes: [
              { id: "rt-1", name: "استبدال", costModel: "FIXED", fixedAmount: 40, isActive: true },
            ],
          },
        ],
      },
    }),
    updateRequest: vi.fn().mockResolvedValue({ success: true }),
    addContactAttempt: vi.fn().mockResolvedValue({ success: true }),
    getContactHistory: vi.fn().mockResolvedValue({ data: [] }),
    getActivityLog: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

describe("useReturnDetailsModal", () => {
  const mockRequest = {
    id: "ret-100",
    reasonId: "reas-1",
    customerNotes: "ملاحظة العميل الأولية",
    responsibleParty: "CUSTOMER",
    adminNotes: "ملاحظة الإدارة",
    shippingReturnCost: 40,
    settlementAmount: 310,
    shippingCompanyId: "sc-1",
    returnTypeId: "rt-1",
    order: {
      id: "ord-1",
      currency: "EGP",
    },
  } as unknown as ReturnRequest;

  const onUpdateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes state from request and loads categories and reasons", async () => {
    const { result } = renderHook(() => useReturnDetailsModal(mockRequest, onUpdateMock));

    expect(result.current.reasonId).toBe("reas-1");
    expect(result.current.customerNotes).toBe("ملاحظة العميل الأولية");
    expect(result.current.responsibleParty).toBe("CUSTOMER");
    expect(result.current.shippingReturnCost).toBe("40");
    expect(result.current.settlementAmount).toBe("310");
  });

  it("allows updating notes and form fields", () => {
    const { result } = renderHook(() => useReturnDetailsModal(mockRequest, onUpdateMock));

    act(() => {
      result.current.setCustomerNotes("ملاحظة عميل محدثة");
      result.current.setAdminNotes("ملاحظة إدارة محدثة");
      result.current.setShippingReturnCost("50");
    });

    expect(result.current.customerNotes).toBe("ملاحظة عميل محدثة");
    expect(result.current.adminNotes).toBe("ملاحظة إدارة محدثة");
    expect(result.current.shippingReturnCost).toBe("50");
  });

  it("calls updateRequest and triggers onUpdate on review save", async () => {
    const { result } = renderHook(() => useReturnDetailsModal(mockRequest, onUpdateMock));

    await act(async () => {
      await result.current.handleSaveReview();
    });

    expect(returnService.updateRequest).toHaveBeenCalledWith("ret-100", expect.objectContaining({
      responsibleParty: "CUSTOMER",
      isReviewed: true,
      shippingReturnCost: 40,
      settlementAmount: 310,
    }));
    expect(onUpdateMock).toHaveBeenCalled();
  });

  it("switches tabs and fetches logs", async () => {
    const { result } = renderHook(() => useReturnDetailsModal(mockRequest, onUpdateMock));

    await act(async () => {
      result.current.setActiveTab("contact");
    });

    expect(result.current.activeTab).toBe("contact");
    expect(returnService.getContactHistory).toHaveBeenCalledWith("ret-100");
  });
});
