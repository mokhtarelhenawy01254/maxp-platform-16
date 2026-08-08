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

import CustomerWalletRouteEntry from "../pages/wallet/WalletRouteEntry";

describe("wallet route split", () => {
  it("redirects customer users from /wallet to the customer portal cashback page", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      user: { role: "CUSTOMER" },
    });

    render(
      <MemoryRouter initialEntries={["/wallet"]}>
        <Routes>
          <Route path="/wallet" element={<CustomerWalletRouteEntry />} />
          <Route
            path="/account/cashback"
            element={<div>Customer Cashback Page</div>}
          />
          <Route path="/payments" element={<div>Payments Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Customer Cashback Page")).toBeTruthy();
  });

  it("redirects non-customer users away from /wallet to /payments", () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      user: { role: "OWNER" },
    });

    render(
      <MemoryRouter initialEntries={["/wallet"]}>
        <Routes>
          <Route path="/wallet" element={<CustomerWalletRouteEntry />} />
          <Route path="/payments" element={<div>Payments Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Payments Page")).toBeTruthy();
  });
});
