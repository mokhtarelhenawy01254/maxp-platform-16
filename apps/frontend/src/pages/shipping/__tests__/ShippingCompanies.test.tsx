// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ShippingCompanies from "../ShippingCompanies";
import { apiClient } from "../../../services/apiClient";

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../../config/environment", () => ({
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
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({
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
      expect(screen.getAllByText("كيو بي إكسبريس").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("مندوب القاهرة").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("إجمالي الشركات")).toBeInTheDocument();
    expect(screen.getByText("الشركات المفعلة")).toBeInTheDocument();
  });

  it("switches view mode from cards to table and back", async () => {
    render(
      <BrowserRouter>
        <ShippingCompanies />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("كيو بي إكسبريس").length).toBeGreaterThanOrEqual(1);
    });

    const tableViewBtns = screen.getAllByTitle("عرض جدول");
    fireEvent.click(tableViewBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("طريقة الربط")).toBeInTheDocument();
    });

    const cardsViewBtns = screen.getAllByTitle("عرض بطاقات");
    fireEvent.click(cardsViewBtns[0]);

    await waitFor(() => {
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  it("opens modal on click of add company button", async () => {
    render(
      <BrowserRouter>
        <ShippingCompanies />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("كيو بي إكسبريس").length).toBeGreaterThanOrEqual(1);
    });

    const addBtns = screen.getAllByRole("button", { name: /إضافة شركة شحن/ });
    fireEvent.click(addBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("إضافة شركة شحن جديدة")).toBeInTheDocument();
      expect(screen.getByText("اسم شركة الشحن أو المندوب *")).toBeInTheDocument();
    });
  });
});
