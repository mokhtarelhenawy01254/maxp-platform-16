// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ReturnDetailsTab, type ReturnDetailsTabProps } from "../ReturnDetailsTab";
import type { ReturnRequest, ReturnShippingCompany, ReturnType } from "../../../../services/returnService";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "returns.k_201": "مراجعة وتعديل بيانات الطلب",
        "returns.k_202": "الجهة المسؤولة",
        "returns.k_154": "سبب الإرجاع",
        "returns.k_156": "ملاحظات العميل",
        "returns.k_207": "ملاحظات الإدارة",
        "returns.k_254": "شركة الشحن",
        "returns.k_255": "نوع المرتجع",
        "returns.k_256": "التكلفة التقديرية",
        "returns.k_228": "تكلفة الشحن الراجع",
        "returns.k_229": "صافي التسوية",
        "returns.k_30": "-- اختر --",
      };
      return map[key] || key;
    },
  }),
}));

afterEach(() => {
  cleanup();
});

describe("ReturnDetailsTab", () => {
  const mockRequest = {
    id: "ret-1",
    orderId: "ord-1",
    order: {
      id: "ord-1",
      orderNumber: "ORD-998877",
      currency: "EGP",
      codDepositPaid: true,
      codDepositAmount: 50,
      codDepositRefunded: false,
    } as unknown as NonNullable<ReturnRequest["order"]>,
    responsibleParty: "CUSTOMER",
    shippingReturnCost: 40,
    settlementAmount: 310,
    productCondition: "بحالة جيدة",
  } as ReturnRequest;

  const mockShippingCompanies: ReturnShippingCompany[] = [
    {
      id: "sc-1",
      name: "بوسطة",
      returnTypes: [{ id: "rt-1", name: "استبدال فوري", returnCost: 35 }] as unknown as ReturnType[],
    } as ReturnShippingCompany,
  ];

  const defaultProps: ReturnDetailsTabProps = {
    request: mockRequest,
    responsibleParty: "CUSTOMER",
    setResponsibleParty: vi.fn(),
    responsiblePartyOptions: [
      { value: "CUSTOMER", label: "العميل" },
      { value: "COMPANY", label: "الشركة" },
    ],
    reasonId: "reas-1",
    setReasonId: vi.fn(),
    reasons: [
      {
        id: "reas-1",
        reason: "مقاس غير مناسب",
        categoryId: "cat-1",
        category: { defaultRole: "CUSTOMER" },
      },
    ],
    categories: [{ id: "cat-1", name: "مقاسات", defaultRole: "CUSTOMER" }],
    customerNotes: "الطلب وصل بمقاس أصغر",
    setCustomerNotes: vi.fn(),
    adminNotes: "تم التأكيد مع العميل",
    setAdminNotes: vi.fn(),
    shippingCompanyId: "sc-1",
    handleShippingCompanyChange: vi.fn(),
    shippingCompanies: mockShippingCompanies,
    returnTypeId: "rt-1",
    handleReturnTypeChange: vi.fn(),
    returnTypes: [{ id: "rt-1", name: "استبدال فوري", returnCost: 35 }] as unknown as ReturnType[],
    getSuggestedCost: vi.fn(() => 35),
    shippingReturnCost: "40",
    setShippingReturnCost: vi.fn(),
    settlementAmount: "310",
    setSettlementAmount: vi.fn(),
  };

  it("renders financial summary bar with deposit and settlement values", () => {
    render(<ReturnDetailsTab {...defaultProps} />);

    expect(screen.getByText("التسوية المالية")).toBeInTheDocument();
    expect(screen.getByText(/50 EGP/)).toBeInTheDocument();
    expect(screen.getByText("لم تسترد")).toBeInTheDocument();
    expect(screen.getByText(/40 EGP/)).toBeInTheDocument();
    expect(screen.getByText(/310 EGP/)).toBeInTheDocument();
    expect(screen.getByText("بحالة جيدة")).toBeInTheDocument();
  });

  it("renders review fields and handles input changes", () => {
    render(<ReturnDetailsTab {...defaultProps} />);

    expect(screen.getByText("مراجعة وتعديل بيانات الطلب")).toBeInTheDocument();
    expect(screen.getByDisplayValue("الطلب وصل بمقاس أصغر")).toBeInTheDocument();
    expect(screen.getByDisplayValue("تم التأكيد مع العميل")).toBeInTheDocument();

    const notesInput = screen.getByDisplayValue("الطلب وصل بمقاس أصغر");
    fireEvent.change(notesInput, { target: { value: "ملاحظة جديدة" } });
    expect(defaultProps.setCustomerNotes).toHaveBeenCalledWith("ملاحظة جديدة");
  });

  it("renders shipping and settlement inputs and suggested cost", () => {
    render(<ReturnDetailsTab {...defaultProps} />);

    expect(screen.getByText(/35 EGP/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("40")).toBeInTheDocument();
    expect(screen.getByDisplayValue("310")).toBeInTheDocument();

    const costInput = screen.getByDisplayValue("40");
    fireEvent.change(costInput, { target: { value: "45" } });
    expect(defaultProps.setShippingReturnCost).toHaveBeenCalledWith("45");
  });
});
