import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SimplifiedProductSelectionModal from "./SimplifiedProductSelectionModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../../config", () => ({
  config: {
    apiUrl: "https://mock.api",
  },
}));

jest.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../services/authService", () => ({
  authService: {
    getAccessToken: () => "mock-token",
  },
}));

describe("SimplifiedProductSelectionModal", () => {
  const mockOnClose = jest.fn();
  const mockOnProductSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: "prod-1",
                name: "T-Shirt Black",
                price: 150,
                stock: 10,
                sku: "TS-BLK",
                variants: [],
              },
            ],
            pagination: { total: 1, totalPages: 1 },
          }),
      }),
    ) as jest.Mock;
  });

  it("renders modal header when isOpen is true", async () => {
    render(
      <SimplifiedProductSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onProductSelected={mockOnProductSelected}
      />,
    );

    expect(screen.getByText("إضافة منتج للطلب")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("بحث باسم المنتج أو SKU..."),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("T-Shirt Black")).toBeInTheDocument();
    });
  });

  it("calls onProductSelected when clicking a product without variants", async () => {
    render(
      <SimplifiedProductSelectionModal
        isOpen={true}
        onClose={mockOnClose}
        onProductSelected={mockOnProductSelected}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("T-Shirt Black")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("T-Shirt Black"));

    expect(mockOnProductSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prod-1",
        name: "T-Shirt Black",
        price: 150,
      }),
    );
  });
});
