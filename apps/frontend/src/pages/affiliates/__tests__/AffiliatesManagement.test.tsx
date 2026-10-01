import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AffiliatesManagement from "../AffiliatesManagement";

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPrompt = jest.fn();

jest.mock("sonner", () => {
  const toastObj = {
    error: jest.fn(),
    success: jest.fn(),
  };
  return {
    __esModule: true,
    default: toastObj,
    toast: toastObj,
  };
});

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: jest.fn(),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

jest.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

beforeAll(() => {
  Object.defineProperty(window, "prompt", {
    writable: true,
    value: (...args: unknown[]) => mockPrompt(...args),
  });
});

describe("AffiliatesManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrompt.mockReturnValue("");
  });

  test("loads affiliates and lets admins update an affiliate status", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "affiliate-1",
            userId: "user-1",
            user: {
              firstName: "Ali",
              lastName: "Seller",
              email: "ali@example.com",
              phone: "01012345678",
            },
            status: "PENDING",
            isActive: false,
            commissionType: "PERCENTAGE",
            commissionRate: 10,
            totalEarnings: 0,
            paidEarnings: 0,
            pendingEarnings: 0,
            totalSales: 2,
            totalClicks: 12,
            minPayout: 100,
            canCreateOrdersForOthers: true,
            canViewCustomerData: true,
            identityDocumentUrl: "/uploads/affiliate-documents/ali-id.png",
            identityDocumentUploadedAt: "2026-05-01T09:00:00.000Z",
            identityDocumentStatus: "PENDING_REVIEW",
            identityDocumentReviewNote: null,
            identityDocumentReviewedAt: null,
            statusReason: null,
            reviewedAt: null,
            reviewedBy: null,
            createdAt: "2026-05-01T10:00:00.000Z",
          },
        ],
      },
    });
    mockPut.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter>
        <AffiliatesManagement />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("إدارة شبكة المسوقين (Premium)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ali Seller")).toBeInTheDocument();
    expect(screen.getByText("مستند الاعتماد")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("مراجعة الطلب"), {
      target: { value: "ACTIVE" },
    });

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalled();
      expect(mockPut).toHaveBeenCalledWith("/affiliates/affiliate-1/status", {
        status: "ACTIVE",
        statusReason: null,
      });
    });
  });

  test("opens the affiliate policy modal and saves operational controls", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "affiliate-1",
            userId: "user-1",
            user: {
              firstName: "Ali",
              lastName: "Seller",
              email: "ali@example.com",
              phone: "01012345678",
            },
            status: "ACTIVE",
            isActive: true,
            commissionType: "PERCENTAGE",
            commissionRate: 10,
            totalEarnings: 120,
            paidEarnings: 20,
            pendingEarnings: 100,
            totalSales: 2,
            totalClicks: 12,
            minPayout: 100,
            canCreateOrdersForOthers: true,
            canViewCustomerData: true,
            identityDocumentUrl: "/uploads/affiliate-documents/ali-id.png",
            identityDocumentUploadedAt: "2026-05-01T09:00:00.000Z",
            identityDocumentStatus: "PENDING_REVIEW",
            identityDocumentReviewNote: "الصورة تحتاج مراجعة",
            identityDocumentReviewedAt: "2026-05-02T10:00:00.000Z",
            statusReason: "بانتظار المستندات",
            reviewedAt: "2026-05-02T10:00:00.000Z",
            reviewedBy: "owner-1",
            createdAt: "2026-05-01T10:00:00.000Z",
          },
        ],
      },
    });
    mockPut.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter>
        <AffiliatesManagement />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ali Seller")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /الضوابط/i }));

    expect(await screen.findByText("ضوابط المسوق")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("الحد الأدنى للسحب"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByLabelText("السماح بالطلبات المباشرة"));
    fireEvent.click(screen.getByLabelText("عرض بيانات العملاء"));
    fireEvent.click(screen.getByRole("button", { name: "حفظ التغييرات" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith("/affiliates/affiliate-1/policy", {
        minPayout: 150,
        canCreateOrdersForOthers: false,
        canViewCustomerData: false,
      });
    });
  });

  test("requires a reason before suspending an affiliate", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "affiliate-1",
            userId: "user-1",
            user: {
              firstName: "Ali",
              lastName: "Seller",
              email: "ali@example.com",
              phone: "01012345678",
            },
            status: "ACTIVE",
            isActive: true,
            commissionType: "PERCENTAGE",
            commissionRate: 10,
            totalEarnings: 0,
            paidEarnings: 0,
            pendingEarnings: 0,
            totalSales: 2,
            totalClicks: 12,
            minPayout: 100,
            canCreateOrdersForOthers: true,
            canViewCustomerData: true,
            identityDocumentUrl: null,
            identityDocumentUploadedAt: null,
            identityDocumentStatus: "NOT_SUBMITTED",
            identityDocumentReviewNote: null,
            identityDocumentReviewedAt: null,
            statusReason: null,
            reviewedAt: null,
            reviewedBy: null,
            createdAt: "2026-05-01T10:00:00.000Z",
          },
        ],
      },
    });
    mockPrompt.mockReturnValue("");

    render(
      <MemoryRouter>
        <AffiliatesManagement />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ali Seller")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("تفعيل المسوق"), {
      target: { value: "SUSPENDED" },
    });

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  test("allows approving a marketer identity document and opening review history", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/list") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "affiliate-1",
                userId: "user-1",
                user: {
                  firstName: "Ali",
                  lastName: "Seller",
                  email: "ali@example.com",
                  phone: "01012345678",
                },
                status: "PENDING",
                isActive: false,
                commissionType: "PERCENTAGE",
                commissionRate: 10,
                totalEarnings: 0,
                paidEarnings: 0,
                pendingEarnings: 0,
                totalSales: 2,
                totalClicks: 12,
                minPayout: 100,
                canCreateOrdersForOthers: true,
                canViewCustomerData: true,
                identityDocumentUrl: "/uploads/affiliate-documents/ali-id.png",
                identityDocumentUploadedAt: "2026-05-01T09:00:00.000Z",
                identityDocumentStatus: "PENDING_REVIEW",
                identityDocumentReviewNote: null,
                identityDocumentReviewedAt: null,
                statusReason: "بانتظار مراجعة بيانات التسجيل",
                reviewedAt: "2026-05-02T10:00:00.000Z",
                reviewedBy: "owner-1",
                createdAt: "2026-05-01T10:00:00.000Z",
              },
            ],
          },
        });
      }

      if (url === "/affiliates/affiliate-1/review-history") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "log-1",
                title: "تم رفع مستند الاعتماد",
                eventType: "DOCUMENT_UPLOADED",
                createdAt: "2026-05-03T11:00:00.000Z",
                actor: {
                  id: "owner-1",
                  name: "Owner Admin",
                  email: "owner@example.com",
                },
              },
            ],
          },
        });
      }

      if (url === "/affiliates/affiliate-1/document-history") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "doc-current",
                fileUrl: "/uploads/affiliate-documents/ali-id-v2.png",
                uploadedAt: "2026-05-03T12:00:00.000Z",
                source: "RESUBMISSION",
                isCurrent: true,
              },
              {
                id: "doc-old",
                fileUrl: "/uploads/affiliate-documents/ali-id-v1.png",
                uploadedAt: "2026-05-01T09:00:00.000Z",
                source: "REGISTRATION",
                isCurrent: false,
              },
            ],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    mockPut.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter>
        <AffiliatesManagement />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ali Seller")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "اعتماد المستند" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/affiliates/affiliate-1/document-review",
        {
          status: "APPROVED",
          reviewNote: null,
        },
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "سجل المراجعة" }));

    expect(await screen.findByText("سجل مراجعات المسوق")).toBeInTheDocument();
    expect(await screen.findByText("تم رفع مستند الاعتماد")).toBeInTheDocument();
    expect(await screen.findByText("Owner Admin")).toBeInTheDocument();
    expect(screen.getByText("مقارنة المستندات")).toBeInTheDocument();
    expect(screen.getByText("المستند الحالي")).toBeInTheDocument();
    expect(screen.getByText("إعادة رفع")).toBeInTheDocument();
    expect(screen.getByText("التسجيل الأول")).toBeInTheDocument();
  });
});
