/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductNewFinal from "../ProductNewFinal";

vi.mock("../../../components/ui/theme-toggle", () => ({
  default: () => <div data-testid="theme-toggle" />,
}));

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (p: number) => `${p} EGP`,
  }),
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      role: "ADMIN",
      company: { slug: "test-store" },
      companyId: "comp-1",
    },
    switchCompany: vi.fn(),
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes("/products/categories")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.includes("/settings/company")) {
        return Promise.resolve({ data: { success: true, data: { settings: {} } } });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
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

describe("ProductNewFinal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders product creation header, tab navigation, and default basic tab", () => {
    render(
      <MemoryRouter>
        <ProductNewFinal />
      </MemoryRouter>
    );

    // Header title
    expect(screen.getByText("products.addNew")).toBeInTheDocument();

    // Tab buttons
    expect(screen.getAllByText("products.tabs.basic").length).toBeGreaterThan(0);
    expect(screen.getAllByText("products.tabs.pricing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("products.tabs.inventory").length).toBeGreaterThan(0);
  });
});
