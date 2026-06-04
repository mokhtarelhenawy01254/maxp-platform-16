import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CheckoutColumn from "../components/CheckoutColumn";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { role: "OWNER" },
  }),
}));

jest.mock("../../../../services/customerService", () => ({
  customerService: {
    searchCustomers: jest.fn(),
  },
}));

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { customerService } = require("../../../../services/customerService") as {
  customerService: {
    searchCustomers: jest.Mock;
  };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiClient } = require("../../../../services/apiClient") as {
  apiClient: {
    get: jest.Mock;
    post: jest.Mock;
  };
};

const cartItems = [
  {
    productId: "product-1",
    name: "Elegance Boot",
    variantName: "أسود / 39",
    price: 420,
    originalPrice: 420,
    markup: 0,
    quantity: 1,
    image: "https://example.com/boot.jpg",
    stock: 10,
    sku: "BOOT-1",
    color: "أسود",
    size: "39",
  },
];

const getControlForLabel = (
  labelPattern: RegExp,
  selector = "input, select, textarea",
) => {
  const label = screen.getByText(labelPattern, { selector: "label" });
  const control = label.parentElement?.querySelector(selector);

  if (!control) {
    throw new Error(`Unable to find control for label ${labelPattern}`);
  }

  return control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
};

describe("CheckoutColumn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    customerService.searchCustomers.mockResolvedValue([]);

    apiClient.get.mockImplementation((url: string) => {
      if (url === "/turbo/governments") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              governments: [{ id: 1, name: "القاهرة" }],
            },
          },
        });
      }

      if (url === "/turbo/areas/1") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              areas: [{ id: 11, name: "مدينة نصر" }],
            },
          },
        });
      }

      if (
        url ===
        "/shipping-zones/find-price?governorate=%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9"
      ) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              zoneId: "zone-cairo",
              price: 70,
              deliveryTime: "3-5 أيام",
              governorate: "القاهرة",
            },
          },
        });
      }

      return Promise.resolve({ data: { success: false, data: {} } });
    });

    apiClient.post.mockResolvedValue({
      data: {
        success: true,
        order: { id: "order-1" },
        data: { id: "order-1" },
      },
    });
  });

  it("shows the area field and includes it in the manual order payload", async () => {
    await act(async () => {
      render(
        <CheckoutColumn cartItems={cartItems as any} onClearCart={jest.fn()} />,
      );
    });

    expect(
      screen.getByText(/المنطقة \/ الزون داخل المحافظة/),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("01xxxxxxxxx"), {
      target: { value: "01098716347" },
    });
    fireEvent.change(getControlForLabel(/الاسم الأول/), {
      target: { value: "هبة" },
    });
    fireEvent.change(getControlForLabel(/^المحافظة/), {
      target: { value: "القاهرة" },
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/turbo/areas/1");
    });

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "مدينة نصر" }),
      ).toBeInTheDocument();
    });

    fireEvent.change(getControlForLabel(/المنطقة \/ الزون داخل المحافظة/, "select"), {
      target: { value: "مدينة نصر" },
    });
    fireEvent.change(getControlForLabel(/العنوان بالتفصيل/, "textarea"), {
      target: { value: "6 أ شارع النزهة" },
    });

    const createButton = screen.getByRole("button", {
      name: /إنشاء الطلب/,
    });

    await waitFor(() => {
      expect(createButton).not.toBeDisabled();
    });

    fireEvent.click(createButton);

    expect(screen.getByText("Elegance Boot")).toBeInTheDocument();
    expect(screen.getByText("اللون: أسود")).toBeInTheDocument();
    expect(screen.getByText("المقاس: 39")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/orders-enhanced",
        expect.objectContaining({
          governorate: "القاهرة",
          city: "مدينة نصر",
          area: "مدينة نصر",
          customerAddress: "6 أ شارع النزهة",
        }),
      );
    });
  });
});
