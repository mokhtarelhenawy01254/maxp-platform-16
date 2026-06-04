// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";

const mockUseAuth = vi.fn();

vi.mock("../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../pages/wallet/CustomerWallet", () => ({
  default: () => <div>Customer Wallet Screen</div>,
}));

vi.mock("../pages/marketplace/Wallet", () => ({
  default: () => <div>Company Wallet Screen</div>,
}));

import CustomerWalletRouteEntry, { BillingWalletRouteEntry } from "../pages/wallet/WalletRouteEntry";

describe("wallet route split", () => {
  it("renders customer wallet on /wallet for customer users", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      user: { role: "CUSTOMER" },
    });

    render(
      <MemoryRouter initialEntries={["/wallet"]}>
        <Routes>
          <Route path="/wallet" element={<CustomerWalletRouteEntry />} />
          <Route path="/billing/wallet" element={<div>Billing Wallet Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Customer Wallet Screen")).toBeTruthy();
  });

  it("redirects non-customer users away from /wallet", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      user: { role: "OWNER" },
    });

    render(
      <MemoryRouter initialEntries={["/wallet"]}>
        <Routes>
          <Route path="/wallet" element={<CustomerWalletRouteEntry />} />
          <Route path="/billing/wallet" element={<div>Billing Wallet Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Billing Wallet Route")).toBeTruthy();
  });

  it("redirects customer users away from company billing wallet", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      user: { role: "CUSTOMER" },
    });

    render(
      <MemoryRouter initialEntries={["/billing/wallet"]}>
        <Routes>
          <Route path="/billing/wallet" element={<BillingWalletRouteEntry />} />
          <Route path="/wallet" element={<div>Customer Wallet Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Customer Wallet Route")).toBeTruthy();
  });
});
