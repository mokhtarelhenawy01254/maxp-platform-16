import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OrderDetails from "./OrderDetails";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (price: number) => `${price} EGP`,
  }),
}));

jest.mock("../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (date: any) => String(date || ""),
    formatDateTime: (date: any) => String(date || ""),
  }),
}));

jest.mock("../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Ahmed", role: "ADMIN" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

jest.mock("../../contexts/CompanyContext", () => ({
  useCompany: () => ({
    company: { id: "comp-1", name: "MaxP Test" },
  }),
}));

jest.mock("../../hooks/useUnsavedChanges", () => ({
  useUnsavedChanges: () => ({}),
}));

jest.mock("../../config", () => ({
  config: {
    apiUrl: "http://localhost:5000",
    wsUrl: "ws://localhost:5000",
    isDev: false,
    isProd: true,
  },
}));

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    put: jest.fn().mockResolvedValue({ data: { success: true } }),
    delete: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

jest.mock("../../services/storefrontSettingsService", () => ({
  storefrontSettingsService: {
    getSettings: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../../services/cancellationService", () => ({
  cancellationService: {
    getCancellationReasons: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../services/socketService", () => ({
  socketService: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock("../../components/telephony/OrderCallButton", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-call-button" />,
  OrderCallButton: () => <div data-testid="mock-call-button" />,
}));

jest.mock("../../hooks/useInvoiceSettings", () => ({
  useInvoiceSettings: () => ({
    settings: {},
  }),
}));

jest.mock("./hooks/useTurboShipping", () => ({
  useTurboShipping: () => ({
    turboLoading: false,
    turboTrackingData: null,
    shippingComparison: null,
    createShipment: jest.fn(),
    updateShipment: jest.fn(),
    syncStatus: jest.fn(),
    getWaybill: jest.fn(),
    cancelShipment: jest.fn(),
    unlinkShipment: jest.fn(),
    calculateShipping: jest.fn(),
    setTurboTrackingData: jest.fn(),
  }),
}));

jest.mock("./hooks/useBostaShipping", () => ({
  useBostaShipping: () => ({
    bostaLoading: false,
    bostaShipment: null,
    fetchShipment: jest.fn(),
    createShipment: jest.fn(),
    printAWB: jest.fn(),
    cancelShipment: jest.fn(),
  }),
}));

const mockOrder = {
  id: "ord-123",
  orderNumber: "ORD-9999",
  status: "NEW",
  paymentStatus: "PENDING",
  customerName: "Mohamed Ali",
  customerPhone: "01012345678",
  shippingAddress: "Cairo, Nasr City",
  total: 550,
  subtotal: 500,
  shipping: "50",
  shippingCost: "50",
  items: [
    {
      id: "item-1",
      productName: "T-Shirt",
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500,
    },
  ],
  metadata: {
    returnAmount: "60",
  },
  statusHistory: [],
  notes: "Customer wants fast delivery",
};

jest.mock("./hooks/useOrderDetails", () => ({
  useOrderDetails: () => ({
    order: mockOrder,
    setOrder: jest.fn(),
    loading: false,
    updating: false,
    allowedTransitions: [],
    workflowStatusDefs: [],
    orderStatuses: [{ code: "NEW", name: "جديد" }],
    paymentStatuses: [{ code: "PENDING", name: "معلق" }],
    governments: [],
    areas: [],
    loadingGovernments: false,
    loadingAreas: false,
    isEditing: false,
    setIsEditing: jest.fn(),
    editForm: {},
    setEditForm: jest.fn(),
    selectedGovernmentId: null,
    setSelectedGovernmentId: jest.fn(),
    orderNotes: [],
    handleGovernmentChange: jest.fn(),
    updateStatus: jest.fn(),
    updatePaymentStatus: jest.fn(),
    verifyWalletProof: jest.fn(),
    handleDiscountApproval: jest.fn(),
    addNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    updatingNote: false,
    deletingNote: false,
    saveChanges: jest.fn(),
    fetchOrderDetails: jest.fn(),
  }),
}));

describe("OrderDetails Component", () => {
  it("renders order details page with modularized cards and modals without throwing", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/orders/ORD-9999"]}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(container).toBeInTheDocument();
    expect(screen.getByText("تفاصيل الطلب")).toBeInTheDocument();
    expect(screen.getByText(/ORD-9999/)).toBeInTheDocument();
  });
});
