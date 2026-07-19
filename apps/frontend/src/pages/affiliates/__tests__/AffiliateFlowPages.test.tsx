import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AffiliateDashboard from "../AffiliateDashboard";
import AffiliateProducts from "../AffiliateProducts";
import AffiliateOrders from "../AffiliateOrders";
import AffiliateOrderDetails from "../AffiliateOrderDetails";
import AffiliateCustomers from "../AffiliateCustomers";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockNavigate = jest.fn();

jest.mock("sonner", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: jest.fn(),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (value: number | string) => `EGP ${Number(value)}`,
  }),
}));

jest.mock("../../../utils/storeUrl", () => ({
  buildStoreUrl: (identifier: string, path: string) =>
    `https://${identifier}.example.test${path}`,
}));

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      companyId: "company-1",
      company: { id: "company-1" },
      role: "AFFILIATE",
    },
  }),
}));

jest.mock("../../../utils/storage", () => ({
  createStorageKey: (prefix: string, companyId: string) =>
    `${prefix}:${companyId}`,
  getWithExpiry: jest.fn(() => null),
  setWithExpiry: jest.fn(),
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("affiliate flow pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("dashboard shows the pending review state for a non-active affiliate", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/me") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: "affiliate-1",
              affiliateCode: "AFF123",
              status: "PENDING",
              statusReason: "بانتظار مراجعة بيانات التسجيل",
              reviewedAt: "2026-05-03T10:00:00.000Z",
              identityDocumentStatus: "REJECTED",
              identityDocumentReviewNote: "صورة البطاقة غير واضحة",
              identityDocumentReviewedAt: "2026-05-03T10:30:00.000Z",
              totalEarnings: 0,
              paidEarnings: 0,
              pendingEarnings: 0,
              totalSales: 0,
              totalClicks: 0,
              conversionRate: 0,
            },
          },
        });
      }

      if (url === "/affiliates/stats") {
        return Promise.resolve({
          data: { success: true, data: {} },
        });
      }

      if (url === "/affiliates/commissions?limit=5") {
        return Promise.resolve({
          data: { success: true, data: [] },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(
      <MemoryRouter>
        <AffiliateDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("حسابك قيد المراجعة")).toBeInTheDocument();
    expect(
      screen.getByText("بانتظار مراجعة بيانات التسجيل"),
    ).toBeInTheDocument();
    expect(screen.getByText("صورة البطاقة غير واضحة")).toBeInTheDocument();
  });

  test("dashboard lets affiliates resubmit a rejected identity document", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/me") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: "affiliate-1",
              affiliateCode: "AFF123",
              status: "PENDING",
              statusReason: "بانتظار مراجعة بيانات التسجيل",
              reviewedAt: "2026-05-03T10:00:00.000Z",
              identityDocumentStatus: "REJECTED",
              identityDocumentReviewNote: "صورة البطاقة غير واضحة",
              identityDocumentReviewedAt: "2026-05-03T10:30:00.000Z",
              totalEarnings: 0,
              paidEarnings: 0,
              pendingEarnings: 0,
              totalSales: 0,
              totalClicks: 0,
              conversionRate: 0,
            },
          },
        });
      }

      if (url === "/affiliates/stats") {
        return Promise.resolve({
          data: { success: true, data: {} },
        });
      }

      if (url === "/affiliates/commissions?limit=5") {
        return Promise.resolve({
          data: { success: true, data: [] },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "affiliate-1",
          affiliateCode: "AFF123",
          status: "PENDING",
          statusReason: "تم رفع نسخة جديدة من مستند الاعتماد وبانتظار المراجعة",
          reviewedAt: "2026-05-03T12:00:00.000Z",
          identityDocumentStatus: "PENDING_REVIEW",
          identityDocumentReviewNote: null,
          identityDocumentReviewedAt: null,
          totalEarnings: 0,
          paidEarnings: 0,
          pendingEarnings: 0,
          totalSales: 0,
          totalClicks: 0,
          conversionRate: 0,
        },
      },
    });

    render(
      <MemoryRouter>
        <AffiliateDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("رفع نسخة جديدة من مستند الاعتماد")).toBeInTheDocument();

    const file = new File(["replacement"], "replacement.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(
      screen.getByLabelText("رفع نسخة جديدة من مستند الاعتماد"),
      {
        target: { files: [file] },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "رفع نسخة جديدة" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/affiliates/me/identity-document",
        expect.any(FormData),
      );
    });
    expect(
      await screen.findByText(
        "تم رفع نسخة جديدة من مستند الاعتماد وبانتظار المراجعة",
      ),
    ).toBeInTheDocument();
  });

  test("dashboard hides customer actions when affiliate cannot view customer data", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/me") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: "affiliate-1",
              affiliateCode: "AFF123",
              status: "ACTIVE",
              canViewCustomerData: false,
              totalEarnings: 0,
              paidEarnings: 0,
              pendingEarnings: 0,
              totalSales: 0,
              totalClicks: 0,
              conversionRate: 0,
            },
          },
        });
      }

      if (url === "/affiliates/stats") {
        return Promise.resolve({
          data: { success: true, data: {} },
        });
      }

      if (url === "/affiliates/commissions?limit=5") {
        return Promise.resolve({
          data: { success: true, data: [] },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(
      <MemoryRouter>
        <AffiliateDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("لوحة تحكم المسوق")).toBeInTheDocument();
    expect(screen.queryByText("عملائي")).not.toBeInTheDocument();
    expect(screen.queryByText("عرض العملاء المرتبطين")).not.toBeInTheDocument();
    expect(
      screen.queryByText("متابعة التحويلات والعملاء"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("متابعة التحويلات")).toBeInTheDocument();
  });

  test("affiliate products page lists imported products and actions", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/affiliates/products") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "affiliate-product-1",
                productId: "product-1",
                basePrice: 200,
                markup: 50,
                finalPrice: 250,
                isActive: true,
                product: {
                  id: "product-1",
                  name: "منتج المسوق",
                  images: '["https://example.com/product.png"]',
                },
              },
            ],
          },
        });
      }

      if (url === "/affiliates/me") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: "affiliate-1",
              affiliateCode: "AFF123",
              company: { id: "company-1", slug: "demo-company" },
            },
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(
      <MemoryRouter>
        <AffiliateProducts />
      </MemoryRouter>,
    );

    expect(await screen.findByText("منتجاتي")).toBeInTheDocument();
    expect(screen.getByText("منتج المسوق")).toBeInTheDocument();
    expect(screen.getByText("نسخ الرابط")).toBeInTheDocument();
  });

  test("affiliate orders page shows only affiliate-related order rows", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "order-1",
            orderNumber: "ORD-2001",
            total: 450,
            status: "CONFIRMED",
            orderSource: "AFFILIATE_REFERRAL",
            createdAt: "2026-05-01T10:00:00.000Z",
            customer: {
              firstName: "Ali",
              lastName: "Customer",
              phone: "01012345678",
            },
            commissions: [],
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <AffiliateOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText("طلباتي")).toBeInTheDocument();
    expect(screen.getByText("ORD-2001")).toBeInTheDocument();
    expect(screen.getByText("Ali Customer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /عرض/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/affiliates/orders/order-1");
  });

  test("affiliate order details lets the affiliate open a ticket on the order", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "order-1",
          orderNumber: "ORD-2001",
          total: 450,
          subtotal: 400,
          shipping: 50,
          discount: 0,
          tax: 0,
          status: "CONFIRMED",
          paymentStatus: "PENDING",
          paymentMethod: "CASH",
          orderSource: "AFFILIATE_REFERRAL",
          createdAt: "2026-05-01T10:00:00.000Z",
          customer: {
            firstName: "Ali",
            lastName: "Customer",
            phone: "01012345678",
            email: "ali@example.test",
          },
          orderItems: [
            {
              id: "item-1",
              productName: "Demo Product",
              productSku: "SKU-1",
              quantity: 2,
              price: 200,
              total: 400,
            },
          ],
          commissions: [
            {
              id: "commission-1",
              amount: 54,
              status: "CONFIRMED",
            },
          ],
          shipments: [],
          merchantOrders: [],
          supportTickets: [],
        },
      },
    });
    mockPost.mockResolvedValue({
      data: {
        success: true,
        message: "تم فتح التيكت وربطه بالطلب",
        data: {
          ticket: {
            id: "ticket-1",
            ticketId: "TKT-1",
            subject: "طلب إلغاء من العميل - ORD-2001",
            status: "OPEN",
            priority: "HIGH",
            orderId: "order-1",
            createdAt: "2026-05-03T09:00:00.000Z",
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/affiliates/orders/order-1"]}>
        <Routes>
          <Route
            path="/affiliates/orders/:orderId"
            element={<AffiliateOrderDetails />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("ORD-2001")).toBeInTheDocument();
    expect(screen.getByText("مفيش تيكتات مفتوحة على الطلب ده.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("اكتب تفاصيل طلب العميل..."), {
      target: { value: "العميل طلب إلغاء الأوردر قبل الشحن" },
    });
    fireEvent.click(screen.getByRole("button", { name: /فتح تيكت على الطلب/ }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/affiliates/orders/order-1/tickets",
        {
          reason: "CANCEL_ORDER",
          message: "العميل طلب إلغاء الأوردر قبل الشحن",
        },
      );
    });
    expect(await screen.findByText(/TKT-1/)).toBeInTheDocument();
  });

  test("affiliate customers page shows only affiliate-linked customers", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "customer-1",
            firstName: "Mona",
            lastName: "Buyer",
            phone: "01000000000",
            email: "mona@example.com",
            totalOrders: 3,
            totalSpent: 900,
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <AffiliateCustomers />
      </MemoryRouter>,
    );

    expect(await screen.findByText("عملائي")).toBeInTheDocument();
    expect(screen.getByText("Mona Buyer")).toBeInTheDocument();
    expect(screen.getByText("01000000000")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("EGP 900")).toBeInTheDocument();
    });
  });
});
