import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CustomerInfoCard from "./CustomerInfoCard";
import { OrderDetailsType } from "../types";
import { customerBlocklistService } from "../../../services/customerBlocklistService";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    post: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    put: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  },
}));

jest.mock("../../../services/storefrontSettingsService", () => ({
  storefrontSettingsService: {
    getSettings: jest.fn().mockResolvedValue({ data: { designTokens: {} } }),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: "COMPANY_ADMIN" },
  }),
}));

jest.mock("../../../utils/validation", () => ({
  validateEgyptianPhone: jest.fn(() => ({ isValid: true })),
  toStandardDigits: (str?: string | null) => str || "",
}));

jest.mock("../../../services/customerBlocklistService", () => ({
  customerBlocklistService: {
    check: jest.fn(),
    createRule: jest.fn(),
    liftRule: jest.fn(),
  },
}));

jest.mock("../../../components/telephony/OrderCallButton", () => ({
  OrderCallButton: () => null,
}));

const baseOrder: OrderDetailsType = {
  id: "ORD-100",
  orderNumber: "ORD-100",
  customerId: "customer-1",
  customerName: "Sara Ali",
  customerEmail: "sara@example.com",
  customerPhone: "01000000000",
  status: "PENDING",
  paymentStatus: "PENDING",
  paymentMethod: "cash_on_delivery",
  items: [],
  subtotal: 100,
  tax: 0,
  shipping: 20,
  total: 120,
  currency: "EGP",
  createdAt: "2026-05-04T09:00:00.000Z",
  updatedAt: "2026-05-04T09:00:00.000Z",
};

const renderCard = (
  order: OrderDetailsType = baseOrder,
  options?: {
    isEditing?: boolean;
    editForm?: any;
    setEditForm?: jest.Mock;
    customFieldConfig?: {
      isEnabled?: boolean;
      label?: string;
      placeholder?: string;
    };
  },
) =>
  render(
    <MemoryRouter>
      <CustomerInfoCard
        order={order}
        isEditing={options?.isEditing ?? false}
        editForm={options?.editForm ?? {}}
        setEditForm={options?.setEditForm ?? jest.fn()}
        governments={[]}
        areas={[]}
        loadingGovernments={false}
        loadingAreas={false}
        selectedGovernmentId={null}
        setSelectedGovernmentId={jest.fn()}
        handleGovernmentChange={jest.fn()}
        customFieldConfig={options?.customFieldConfig}
      />
    </MemoryRouter>,
  );

describe("CustomerInfoCard customer blocking", () => {
  beforeEach(() => {
    jest.mocked(customerBlocklistService.check).mockResolvedValue({
      blocked: false,
    });
    jest.mocked(customerBlocklistService.createRule).mockResolvedValue({
      id: "rule-1",
      companyId: "company-1",
      customerId: "customer-1",
      phone: "01000000000",
      email: "sara@example.com",
      reasonCode: "REPEATED_REFUSAL",
      action: "BLOCK_ORDERS",
      status: "ACTIVE",
      startsAt: "2026-05-04T09:00:00.000Z",
      createdAt: "2026-05-04T09:00:00.000Z",
      updatedAt: "2026-05-04T09:00:00.000Z",
    });
  });

  it("shows a customer block action in order details for admins", async () => {
    renderCard();

    expect(
      await screen.findByRole("button", { name: /حظر العميل/ }),
    ).toBeInTheDocument();
    expect(customerBlocklistService.check).toHaveBeenCalledWith({
      customerId: "customer-1",
      phone: "01000000000",
      email: "sara@example.com",
      source: "manual",
      paymentMethod: "cash_on_delivery",
    });
  });

  it("creates a block rule from the order customer data", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: /حظر العميل/ }));
    await user.click(screen.getByRole("button", { name: /تأكيد الحظر/ }));

    await waitFor(() => {
      expect(customerBlocklistService.createRule).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "customer-1",
          phone: "01000000000",
          email: "sara@example.com",
          reasonCode: "REPEATED_REFUSAL",
          action: "BLOCK_ORDERS",
          metadata: {
            source: "order_details",
            orderNumber: "ORD-100",
          },
        }),
      );
    });
  });
});

describe("CustomerInfoCard notes and custom fields behavior", () => {
  const orderWithNotesAndCarSpecs: OrderDetailsType = {
    ...baseOrder,
    notes: "تفاصيل الطلب: نوع وموديل وسنة صنع السيارة: هيونداي توسان 2022\nرقم هاتف بديل 01005053064",
    metadata: {
      carModel: "هيونداي توسان 2022",
    },
  };

  it("when custom fields is DISABLED, displays generic order notes without car specs wording and preserves customer text", () => {
    renderCard(orderWithNotesAndCarSpecs, {
      customFieldConfig: { isEnabled: false },
    });

    // Should display general notes label
    expect(screen.getByText("ملاحظات الطلب")).toBeInTheDocument();

    // Should NOT contain the old hardcoded headers
    expect(
      screen.queryByText(/تفاصيل وملاحظات الطلب ومواصفات السيارة/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/مواصفات وتفاصيل مدخلة بواسطة العميل:/),
    ).not.toBeInTheDocument();

    // Must preserve full original notes content including alternate phone
    expect(screen.getByText(/رقم هاتف بديل 01005053064/)).toBeInTheDocument();
  });

  it("when custom fields is DISABLED and in edit mode, shows generic notes placeholder", () => {
    renderCard(orderWithNotesAndCarSpecs, {
      isEditing: true,
      editForm: { notes: orderWithNotesAndCarSpecs.notes },
      customFieldConfig: { isEnabled: false },
    });

    const textarea = screen.getByPlaceholderText("أدخل ملاحظات الطلب...");
    expect(textarea).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/مثل نوع وموديل السيارة/),
    ).not.toBeInTheDocument();
  });

  it("when custom fields is ENABLED, displays extracted custom fields with label and value, and preserves extra delivery notes", () => {
    renderCard(orderWithNotesAndCarSpecs, {
      customFieldConfig: {
        isEnabled: true,
        label: "نوع وموديل وسنة صنع السيارة",
        placeholder: "اكتب مواصفات السيارة...",
      },
    });

    // Displays custom field label and value extracted
    expect(
      screen.getByText(/نوع وموديل وسنة صنع السيارة:/),
    ).toBeInTheDocument();
    expect(screen.getByText("هيونداي توسان 2022")).toBeInTheDocument();

    // Displays residual notes under additional notes
    expect(screen.getByText("ملاحظات إضافية:")).toBeInTheDocument();
    expect(screen.getByText(/رقم هاتف بديل 01005053064/)).toBeInTheDocument();
  });

  it("when custom fields is ENABLED and in edit mode, shows custom field placeholder", () => {
    renderCard(orderWithNotesAndCarSpecs, {
      isEditing: true,
      editForm: { notes: orderWithNotesAndCarSpecs.notes },
      customFieldConfig: {
        isEnabled: true,
        label: "نوع وموديل وسنة صنع السيارة",
        placeholder: "اكتب مواصفات السيارة...",
      },
    });

    const textarea = screen.getByPlaceholderText("اكتب مواصفات السيارة...");
    expect(textarea).toBeInTheDocument();
  });

  it("same order displays appropriately based strictly on store settings", () => {
    // Disabled store
    const { unmount } = renderCard(orderWithNotesAndCarSpecs, {
      customFieldConfig: { isEnabled: false },
    });
    expect(screen.getByText("ملاحظات الطلب")).toBeInTheDocument();
    expect(
      screen.queryByText("المواصفات والحقول المخصصة"),
    ).not.toBeInTheDocument();
    unmount();

    // Enabled store
    renderCard(orderWithNotesAndCarSpecs, {
      customFieldConfig: {
        isEnabled: true,
        label: "نوع وموديل وسنة صنع السيارة",
      },
    });
    expect(
      screen.getByText(/نوع وموديل وسنة صنع السيارة:/),
    ).toBeInTheDocument();
    expect(screen.getByText("هيونداي توسان 2022")).toBeInTheDocument();
  });

  it("caches invoice settings in memory so opening multiple orders does not repeat API calls", async () => {
    const { apiClient } = require("../../../services/apiClient");
    const { clearInvoiceSettingsCache } = require("../../../hooks/useInvoiceSettings");
    clearInvoiceSettingsCache();
    jest.mocked(apiClient.get).mockClear();

    const { unmount: unmount1 } = renderCard({ ...baseOrder, id: "ORD-1", notes: "ملاحظة 1" });
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });
    unmount1();

    // Second and third orders should read directly from cache with 0 additional API calls
    const { unmount: unmount2 } = renderCard({ ...baseOrder, id: "ORD-2", notes: "ملاحظة 2" });
    unmount2();
    const { unmount: unmount3 } = renderCard({ ...baseOrder, id: "ORD-3", notes: "ملاحظة 3" });
    unmount3();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
