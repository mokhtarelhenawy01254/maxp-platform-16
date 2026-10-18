import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HeldOrdersBanner } from "./HeldOrdersBanner";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "u-1", role: "OWNER" },
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe("HeldOrdersBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders held orders banner when held orders exist", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          heldOrders: {
            count: 3,
            amount: 450,
            subscriptionCount: 0,
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <HeldOrdersBanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/طلب معلّق/)).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("مزيد المعلومات")).toBeInTheDocument();
    });
  });

  it("does not render when held count is 0", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          heldOrders: {
            count: 0,
            amount: 0,
            subscriptionCount: 0,
          },
        },
      },
    });

    const { container } = render(
      <MemoryRouter>
        <HeldOrdersBanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
