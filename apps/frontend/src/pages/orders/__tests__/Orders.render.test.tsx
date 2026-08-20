import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Orders from "../Orders";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock("../../../components/common/ErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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

jest.mock("../../../contexts/CompanyContext", () => ({
  useCompany: () => ({
    company: { id: "company-1", settings: {} },
    user: { id: "admin-1" },
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

jest.mock("../../../hooks/useSocket", () => ({
  __esModule: true,
  default: () => ({
    socket: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    isConnected: false,
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

jest.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
    measureElement: jest.fn(),
    options: { scrollMargin: 0 },
  }),
}));

jest.mock("../../../components/orders/EnhancedOrderModal", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../../../components/orders/InvoiceModal", () => ({
  __esModule: true,
  default: () => null,
}));

describe("Orders page render regression", () => {
  it("renders without crashing (guards against helper-init/TDZ ordering bugs)", async () => {
    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>,
    );

    // Wait for the orders fetch (empty result) to settle and render the
    // empty state. If any helper is referenced before its declaration the
    // component body throws synchronously on the first render and this
    // test fails.
    await waitFor(() => {
      expect(screen.getAllByText("orders.noOrders").length).toBeGreaterThan(0);
    });
  });
});
