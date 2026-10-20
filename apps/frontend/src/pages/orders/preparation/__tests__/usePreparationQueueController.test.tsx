// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { usePreparationQueueController } from "../usePreparationQueueController";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

vi.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: "COMPANY_ADMIN", companyId: "company-1" },
  }),
}));

vi.mock("../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (amount: number | null | undefined) => `${amount ?? 0} EGP`,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (date: Date | string | number) => String(date).slice(0, 10),
    formatDateTime: (date: Date | string | number) => String(date),
  }),
}));

vi.mock("../../../../hooks/useInvoiceSettings", () => ({
  useInvoiceSettings: () => ({
    settings: {},
    loading: false,
  }),
}));

vi.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: { success: true, data: [], pagination: { pages: 0, total: 0 } },
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe("usePreparationQueueController (Batch 371)", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  it("initializes without throwing and returns all required section props", () => {
    const { result } = renderHook(() => usePreparationQueueController(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.isMerchantUser).toBe(false);
    expect(typeof result.current.formatPrice).toBe("function");
    expect(typeof result.current.formatDate).toBe("function");
    expect(result.current.alertBannersProps).toBeDefined();
    expect(result.current.filtersContainerProps).toBeDefined();
    expect(result.current.selectionBarProps).toBeDefined();
    expect(result.current.ordersContainerProps).toBeDefined();
    expect(result.current.dialogsProps).toBeDefined();
  });
});
