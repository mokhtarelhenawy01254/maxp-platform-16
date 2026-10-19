import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import ShippingCompanies from "../ShippingCompanies";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../config/environment", () => ({
  envConfig: {
    backendUrl: "https://api.test.maxp.online",
  },
}));

const mockCompanies = [
  {
    id: "comp-1",
    name: "كيو بي إكسبريس",
    slug: "qp-express",
    providerKey: "QP_EXPRESS",
    integrationMode: "LIVE",
    apiKey: "test-key-qp",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "comp-2",
    name: "مندوب القاهرة",
    slug: "cairo-fleet",
    providerKey: "MANUAL",
    integrationMode: "MANUAL",
    isActive: false,
    createdAt: "2026-01-02T00:00:00Z",
  },
];

describe("ShippingCompanies Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockCompanies },
    });
  });

  it("renders shipping companies list with KPI cards and carrier details", async () => {
    render(
      <BrowserRouter>
        <ShippingCompanies />
      </BrowserRouter>
    );

    expect(screen.getByText("جاري جلب شركات الشحن وإعدادات الربط...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("كيو بي إكسبريس")).toBeInTheDocument();
      expect(screen.getByText("مندوب القاهرة")).toBeInTheDocument();
    });

    expect(screen.getByText("إجمالي الشركات")).toBeInTheDocument();
    expect(screen.getByText("الشركات المفعلة")).toBeInTheDocument();
  });

  it("switches view mode from cards to table and back", async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ShippingCompanies />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("كيو بي إكسبريس")).toBeInTheDocument();
    });

    const tableViewBtn = screen.getByTitle("عرض جدول");
    await user.click(tableViewBtn);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("طريقة الربط")).toBeInTheDocument();

    const cardsViewBtn = screen.getByTitle("عرض بطاقات");
    await user.click(cardsViewBtn);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("opens modal on click of add company button", async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ShippingCompanies />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("كيو بي إكسبريس")).toBeInTheDocument();
    });

    const addBtn = screen.getByRole("button", { name: /إضافة شركة شحن/ });
    await user.click(addBtn);

    expect(screen.getByText("إضافة شركة شحن جديدة")).toBeInTheDocument();
    expect(screen.getByText("اسم شركة الشحن أو المندوب *")).toBeInTheDocument();
  });
});
