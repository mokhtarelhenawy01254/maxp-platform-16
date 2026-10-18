import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PreparationQueue from "../PreparationQueue";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    useNavigate: () => jest.fn(),
  };
});

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: "COMPANY_ADMIN", companyId: "company-1" },
  }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (amount: number | null | undefined) => `${amount ?? 0} EGP`,
    isLoading: false,
    error: null,
  }),
}));

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (date: Date | string | number) => String(date).slice(0, 10),
    formatDateTime: (date: Date | string | number) => String(date),
  }),
}));

jest.mock("../../../hooks/useInvoiceSettings", () => ({
  useInvoiceSettings: () => ({
    settings: {},
    loading: false,
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: { success: true, data: [], pagination: { pages: 0, total: 0 } },
    }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
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
