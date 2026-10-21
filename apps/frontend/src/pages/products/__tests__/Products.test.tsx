/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Products from "../Products";

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (p: number) => `${p} EGP`,
  }),
}));

vi.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d,
  }),
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "ar" },
    }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockProductsHook: any = {
  products: [
    {
      id: "prod-1",
      name: "ساعة ذكية فاخرة",
      price: 1500,
      stock: 25,
      sku: "WATCH-001",
      workflow: { status: "published" },
      isActive: true,
      category: "إلكترونيات",
      tags: ["ساعات", "ذكية"],
    },
  ],
  isLoading: false,
  error: null,
  isDeletingAll: false,
  duplicatingProductId: null,
  isAdmin: true,
  isMerchant: true,
  canSubmitProductReview: false,
  canCreateProducts: true,
  canSelectProducts: true,
  currentPage: 1,
  itemsPerPage: 10,
  totalItems: 1,
  publishedCount: 1,
  sortField: "createdAt",
  sortDirection: "desc",
  selectedProducts: new Set(),
  selectAll: false,
  editingProduct: null,
  editPrice: "",
  editStock: "",
  editSku: "",
  filters: {
    search: "",
    category: "all",
    stockFilter: "all",
    statusFilter: "all",
    tagFilter: "all",
    offerFilter: "all",
  },
  hasActiveFilters: false,
  categories: ["إلكترونيات"],
  allTags: ["ساعات", "ذكية"],
  offersCount: 0,
  sortedProducts: [
    {
      id: "prod-1",
      name: "ساعة ذكية فاخرة",
      price: 1500,
      stock: 25,
      sku: "WATCH-001",
      workflow: { status: "published" },
      isActive: true,
    },
  ],
  totalPages: 1,
  startIndex: 0,
  paginatedProducts: [
    {
      id: "prod-1",
      name: "ساعة ذكية فاخرة",
      price: 1500,
      stock: 25,
      sku: "WATCH-001",
      workflow: { status: "published" },
      isActive: true,
    },
  ],
  setCurrentPage: vi.fn(),
  setItemsPerPage: vi.fn(),
  handleFilterChange: vi.fn(),
  handleSort: vi.fn(),
  handleSelectAll: vi.fn(),
  handleSelectProduct: vi.fn(),
  handleBulkVisibility: vi.fn(),
  handleBulkDelete: vi.fn(),
  clearSelection: vi.fn(),
  resetFilters: vi.fn(),
  startQuickEdit: vi.fn(),
  cancelQuickEdit: vi.fn(),
  setEditPrice: vi.fn(),
  setEditStock: vi.fn(),
  setEditSku: vi.fn(),
  saveQuickEdit: vi.fn(),
  handleDuplicate: vi.fn(),
  workflowLoadingId: null,
  handleWorkflowAction: vi.fn(),
  handleDelete: vi.fn(),
  handleDeleteAll: vi.fn(),
  loadProducts: vi.fn(),
  prepareStorefrontContext: vi.fn(),
  getStorefrontUrl: () => "/shop/prod-1",
};

vi.mock("../hooks/useProducts", () => ({
  useProducts: () => mockProductsHook,
}));

describe("Products Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders header, stats, filters, and products table", () => {
    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

    // Products table should render the product name
    expect(screen.getAllByText("ساعة ذكية فاخرة").length).toBeGreaterThan(0);
  });
});
