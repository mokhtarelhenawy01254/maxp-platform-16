// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Orders from "../Orders";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

vi.mock("../../../components/common/ErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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

vi.mock("../../../contexts/CompanyContext", () => ({
  useCompany: () => ({
    company: { id: "company-1", settings: {} },
    user: { id: "admin-1" },
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

vi.mock("../../../hooks/useSocket", () => ({
  __esModule: true,
  default: () => ({
    socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    isConnected: false,
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

vi.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
    measureElement: vi.fn(),
    options: { scrollMargin: 0 },
  }),
}));

vi.mock("../../../components/orders/EnhancedOrderModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../../components/orders/InvoiceModal", () => ({
  __esModule: true,
  default: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("Orders page render regression", () => {
  it("renders without crashing (guards against helper-init/TDZ ordering bugs)", async () => {
    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("orders.noOrders").length).toBeGreaterThan(0);
    });
  });
});
