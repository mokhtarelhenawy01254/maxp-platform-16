import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import QuickOrderModal from "../QuickOrderModal";

jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
    language: "ar",
    changeLanguage: jest.fn(),
  },
}));

jest.mock("../../../../config", () => ({
  config: {
    apiUrl: "http://localhost:3000/api",
  },
}));

jest.mock("../../../../config/environment", () => ({
  envConfig: {
    apiUrl: "http://localhost:3000/api",
  },
}));

jest.mock("../../../../utils/imageUrl", () => ({
  getPrimaryImageUrl: (img: any) => (typeof img === "string" ? img : img?.url || ""),
  getInboxExternalImageUrl: (url: string) => url,
  getInboxMessageMediaUrl: (_id: string, url: string) => url,
}));

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { success: true, data: { products: [] } } }),
    post: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  },
}));

jest.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Admin", role: "ADMIN" },
  }),
}));

jest.mock("../../../../services/customerBlocklistService", () => ({
  customerBlocklistService: {
    check: jest.fn().mockResolvedValue({ blocked: false }),
  },
}));

jest.mock("../../../../services/authService", () => ({
  authService: {
    getStoredUser: () => ({ role: "ADMIN" }),
    getAccessToken: () => "mock-token",
  },
}));

jest.mock("../../../../utils/geolocation", () => ({
  detectUserGovernorate: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../../../hooks/useCustomerByPhone", () => ({
  lookupCustomerByPhone: jest.fn().mockResolvedValue(null),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("../../../../utils/i18n-toast", () => ({
  tToast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../components/ui/GovernorateAreaSearch", () => ({
  GovernorateAreaSearch: ({
    governorate,
    area,
    onSelect,
  }: {
    governorate: string;
    area: string;
    onSelect: (gov: string, area: string) => void;
  }) => (
    <div data-testid="governorate-area-search">
      <input
        aria-label="mock-gov"
        value={governorate}
        onChange={(e) => onSelect(e.target.value, area)}
      />
      <input
        aria-label="mock-area"
        value={area}
        onChange={(e) => onSelect(governorate, e.target.value)}
      />
    </div>
  ),
}));

describe("QuickOrderModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    customerName: "أحمد علي",
    customerPhone: "01012345678",
    pageName: "MaxP Store",
  };

  const mockProduct = {
    id: "prod-1",
    name: "تيشيرت صيفي",
    price: 250,
    image: "https://example.com/item.jpg",
    stock: 10,
    sku: "TSHIRT-01",
    variants: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [mockProduct],
            totalPages: 1,
          }),
      });
    }) as any;

    const { apiClient } = require("../../../../services/apiClient");
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes("/products")) {
        return Promise.resolve({
          data: {
            success: true,
            data: { products: [mockProduct], totalPages: 1 },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });
  });

  it("renders correctly when open with customer info and product tab", () => {
    render(<QuickOrderModal {...defaultProps} />);

    expect(screen.getByText("طلب سريع")).toBeInTheDocument();
    expect(screen.getByText(/أحمد علي/)).toBeInTheDocument();
    expect(screen.getByText("المنتجات")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("بحث عن منتج...")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <QuickOrderModal {...defaultProps} isOpen={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows blocklist warning when customer is blocked", async () => {
    const { customerBlocklistService } = require("../../../../services/customerBlocklistService");
    customerBlocklistService.check.mockResolvedValue({
      blocked: true,
      reason: "عميل كثير الإلغاء",
      message: "هذا العميل مدرج في القائمة السوداء",
    });

    render(<QuickOrderModal {...defaultProps} />);

    // Go to checkout step after adding item
    await waitFor(() => {
      expect(screen.getByText("تيشيرت صيفي")).toBeInTheDocument();
    });

    // Add item to cart
    const addButton = screen.getByLabelText("إضافة للطلب");
    fireEvent.click(addButton);

    // Switch to step 2 (الدفع والتوصيل)
    const checkoutTab = screen.getByText("الدفع والتوصيل");
    fireEvent.click(checkoutTab);

    // Verify blocklist warning is displayed
    await waitFor(
      () => {
        expect(
          screen.getByText(/العميل محظور من إنشاء الطلبات/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/هذا العميل مدرج في القائمة السوداء/i),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("renders order settings, discounts, and scheduling options in checkout step", async () => {
    render(<QuickOrderModal {...defaultProps} />);

    // Wait for product to load
    await waitFor(() => {
      expect(screen.getByText("تيشيرت صيفي")).toBeInTheDocument();
    });

    // Add to cart
    const addButton = screen.getByLabelText("إضافة للطلب");
    fireEvent.click(addButton);

    // Go to checkout
    const checkoutTab = screen.getByText("الدفع والتوصيل");
    fireEvent.click(checkoutTab);

    // Check Order Settings fields
    await waitFor(() => {
      expect(screen.getByText("إعدادات الطلب والدفع")).toBeInTheDocument();
      expect(screen.getByText("نوع الطلب")).toBeInTheDocument();
      expect(screen.getByText("طريقة الدفع")).toBeInTheDocument();
      expect(screen.getByText("حالة الطلب")).toBeInTheDocument();
      expect(screen.getByText("الكوبونات والخصم")).toBeInTheDocument();
      expect(screen.getByText(/خصم يدوي مباشر/i)).toBeInTheDocument();
      expect(screen.getByText("جدولة الطلب لتسليمه في تاريخ محدد")).toBeInTheDocument();
      expect(screen.getByTestId("governorate-area-search")).toBeInTheDocument();
    });
  });
});
