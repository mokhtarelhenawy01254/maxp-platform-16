// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useStorefrontProductRouteScrollReset } from "../hooks/useStorefrontProductRouteScrollReset";

const ScrollResetHarness = () => {
  useStorefrontProductRouteScrollReset();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div>
      <button type="button" onClick={() => navigate("/product/swan-lush")}>
        Go to Swan Lush
      </button>
      <button type="button" onClick={() => navigate("/product/swan-fit")}>
        Go to Swan Fit
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Go back
      </button>
      <div data-testid="pathname">{location.pathname}</div>
      <Routes>
        <Route path="/shop" element={<h1>Shop</h1>} />
        <Route path="/product/:id" element={<h1>Product</h1>} />
      </Routes>
    </div>
  );
};

describe("useStorefrontProductRouteScrollReset", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
  });

  it("resets scroll when navigating to a new product but leaves browser back alone", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/shop"]}>
        <ScrollResetHarness />
      </MemoryRouter>,
    );

    const scrollToMock = vi.mocked(window.scrollTo);
    expect(scrollToMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Go to Swan Lush" }));

    await waitFor(() => {
      expect(screen.getByTestId("pathname")).toHaveTextContent("/product/swan-lush");
    });

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenLastCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    await user.click(screen.getByRole("button", { name: "Go to Swan Fit" }));

    await waitFor(() => {
      expect(screen.getByTestId("pathname")).toHaveTextContent("/product/swan-fit");
    });

    expect(scrollToMock).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Go back" }));

    await waitFor(() => {
      expect(screen.getByTestId("pathname")).toHaveTextContent("/product/swan-lush");
    });

    expect(scrollToMock).toHaveBeenCalledTimes(2);
  });
});
