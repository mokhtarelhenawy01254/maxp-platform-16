import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AffiliateSystemSettings from "../AffiliateSystemSettings";

const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock("sonner", () => {
  const toastMock = {
    error: jest.fn(),
    success: jest.fn(),
  };
  return {
    __esModule: true,
    toast: toastMock,
    default: toastMock,
  };
});

jest.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      company: {
        slug: "demo-store",
      },
    },
  }),
}));

jest.mock("../../../utils/storeUrl", () => ({
  getBaseDomain: () => "localhost:3000",
}));

describe("AffiliateSystemSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads and saves operational defaults for new affiliates", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          commissionType: "PERCENTAGE",
          commissionRate: 5,
          cookieDuration: 30,
          termsAndConditions: "",
          isActive: true,
          autoApproveAffiliates: false,
          defaultMinPayout: 100,
          defaultCanCreateOrdersForOthers: true,
          defaultCanViewCustomerData: true,
          requireIdentityDocument: false,
          identityDocumentLabel: "مستند إثبات الهوية",
          payoutSlaDays: 3,
          platformMarginType: "FIXED",
          platformMarginValue: 0,
        },
      },
    });
    mockPut.mockResolvedValue({
      data: {
        success: true,
        data: {
          commissionType: "PERCENTAGE",
          commissionRate: 5,
          cookieDuration: 30,
          termsAndConditions: "",
          isActive: true,
          autoApproveAffiliates: true,
          defaultMinPayout: 150,
          defaultCanCreateOrdersForOthers: false,
          defaultCanViewCustomerData: false,
          requireIdentityDocument: true,
          identityDocumentLabel: "صورة البطاقة",
          payoutSlaDays: 5,
          platformMarginType: "FIXED",
          platformMarginValue: 0,
        },
      },
    });

    render(<AffiliateSystemSettings />);

    expect(await screen.findByText("إعدادات نظام المسوقين")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("الموافقة التلقائية على المسوقين الجدد"));
    fireEvent.change(screen.getByLabelText("الحد الأدنى الافتراضي للسحب"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByLabelText("السماح بالطلبات المباشرة"));
    fireEvent.click(screen.getByLabelText("إظهار بيانات العملاء"));
    fireEvent.click(screen.getByLabelText("إلزام مستند اعتماد"));
    fireEvent.change(screen.getByLabelText("اسم مستند الاعتماد"), {
      target: { value: "صورة البطاقة" },
    });
    fireEvent.change(screen.getByLabelText("مدة معالجة السحب"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "حفظ التغييرات" })[0]);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith("/affiliate-settings", {
        commissionType: "PERCENTAGE",
        commissionRate: 5,
        cookieDuration: 30,
        termsAndConditions: "",
        isActive: true,
        autoApproveAffiliates: true,
        defaultMinPayout: 150,
        defaultCanCreateOrdersForOthers: false,
        defaultCanViewCustomerData: false,
        requireIdentityDocument: true,
        identityDocumentLabel: "صورة البطاقة",
        payoutSlaDays: 5,
        platformMarginType: "FIXED",
        platformMarginValue: 0,
        commissionOnStatus: "CONFIRMED",
      });
    });
  });
});
