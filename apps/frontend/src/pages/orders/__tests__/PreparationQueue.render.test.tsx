// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import PreparationQueue from "../PreparationQueue";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: "COMPANY_ADMIN", companyId: "company-1" },
  }),
}));

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (amount: number | null | undefined) => `${amount ?? 0} EGP`,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (date: Date | string | number) => String(date).slice(0, 10),
    formatDateTime: (date: Date | string | number) => String(date),
  }),
}));

vi.mock("../../../hooks/useInvoiceSettings", () => ({
  useInvoiceSettings: () => ({
    settings: {},
    loading: false,
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: { success: true, data: [], pagination: { pages: 0, total: 0 } },
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe("PreparationQueue page render regression", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it("renders without crashing (guards against TDZ and uninitialized variable errors like selectedOrders)", () => {
    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <PreparationQueue />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    }).not.toThrow();
  });
});
