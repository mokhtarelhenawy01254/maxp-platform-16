import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CustomerInfoCard from "./CustomerInfoCard";
import { OrderDetailsType } from "../types";
import { customerBlocklistService } from "../../../services/customerBlocklistService";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

const renderCard = (order: OrderDetailsType = baseOrder) =>
  render(
    <MemoryRouter>
      <CustomerInfoCard
        order={order}
        isEditing={false}
        editForm={{}}
        setEditForm={jest.fn()}
        governments={[]}
        areas={[]}
        loadingGovernments={false}
        loadingAreas={false}
        selectedGovernmentId={null}
        setSelectedGovernmentId={jest.fn()}
        handleGovernmentChange={jest.fn()}
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
