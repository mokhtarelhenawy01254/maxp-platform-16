import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddProductModal } from "../QuickAddProductModal";
import { apiClient } from "../../../../services/apiClient";
import { productApi } from "../../../../utils/apiHelpers";

jest.mock("../../../../config", () => ({
  config: {
    apiUrl: "http://localhost:5000/api",
  },
}));

jest.mock("../../../../utils/apiHelpers", () => ({
  uploadFiles: jest.fn().mockResolvedValue([]),
  productApi: {
    createVariant: jest.fn().mockResolvedValue({ id: "v1" }),
  },
}));

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({ currency: "EGP" }),
}));

jest.mock("../../../../utils/currency", () => ({
  getCurrencySymbol: () => "ج.م",
  getCurrencyByCode: () => ({ symbol: "ج.م" }),
}));

jest.mock("../../../../utils/imageUrl", () => ({
  getImageUrl: (val: string) => val,
  normalizeImagePath: (val: string) => val,
}));

jest.mock("../../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: [{ id: "cat-1", name: "ملابس رجالي" }],
      },
    }),
    post: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: { id: "p-new-123", name: "تيشرت صيفي" },
      },
    }),
  },
}));

describe("QuickAddProductModal - Attribute and Variation Generation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders attribute cards with values underneath and generates Cartesian product variants", async () => {
    render(
      <QuickAddProductModal
        open={true}
        onClose={jest.fn()}
        defaultWarehouseId="wh-main"
      />
    );

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText("إنشاء طلب سريع")).toBeInTheDocument();
    });

    // Fill basic fields
    fireEvent.change(screen.getByPlaceholderText("مثال: تيشرت قطن أوفر سايز"), {
      target: { value: "تيشرت صيفي" },
    });
    const priceInputs = screen.getAllByPlaceholderText("0.00");
    fireEvent.change(priceInputs[0], {
      target: { value: "250" },
    });

    // Toggle options switch
    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);

    // When toggled, default attribute "المقاس" appears
    await waitFor(() => {
      expect(screen.getByText("1. تحديد المتغيرات والخصائص (Attributes)")).toBeInTheDocument();
      expect(screen.getAllByText("المقاس").length).toBeGreaterThan(0);
    });

    // Values M, L, XL are under "المقاس"
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByText("XL")).toBeInTheDocument();

    // Add Color template attribute
    const colorTemplateBtn = screen.getAllByText("اللون")[0].closest("button");
    expect(colorTemplateBtn).toBeInTheDocument();
    fireEvent.click(colorTemplateBtn!);

    // Color attribute now appears with values: أسود، أبيض، كحلي
    await waitFor(() => {
      expect(screen.getAllByText("اللون").length).toBeGreaterThan(1);
      expect(screen.getByText("أسود")).toBeInTheDocument();
      expect(screen.getByText("أبيض")).toBeInTheDocument();
    });

    // Generate Cartesian combinations button should be present (3 sizes x 3 colors = 9 combinations)
    const generateBtn = screen.getByRole("button", { name: /توليد المتغيرات \(9\)/i });
    expect(generateBtn).toBeInTheDocument();

    // Click Generate Variations
    fireEvent.click(generateBtn);

    // Variations list should appear with combinations
    await waitFor(() => {
      expect(screen.getByText(/قائمة المتغيرات المولدة \(9\)/i)).toBeInTheDocument();
      expect(screen.getByText("M - أسود")).toBeInTheDocument();
      expect(screen.getByText("L - أبيض")).toBeInTheDocument();
    });

    // Submit the form
    const publishBtn = screen.getByText("حفظ ونشر فوراً");
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/products",
        expect.objectContaining({
          name: "تيشرت صيفي",
          price: 250,
          category: "cat-1",
          stock: 90, // 9 variants * 10 stock each
          metadata: expect.stringContaining('"forVariations":true'),
        }),
        expect.anything()
      );
    });

    // Ensure 9 variants were created via productApi.createVariant
    await waitFor(() => {
      expect(productApi.createVariant).toHaveBeenCalledTimes(9);
      expect(productApi.createVariant).toHaveBeenCalledWith(
        "p-new-123",
        expect.objectContaining({
          name: "M - أسود",
          price: 250,
          stock: 10,
          type: "combination",
        })
      );
    });
  });
});
