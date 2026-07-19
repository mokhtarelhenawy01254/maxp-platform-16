import React from "react";
import { render, screen } from "@testing-library/react";
import { ProductsTab } from "../ProductsTab";
import { useWooCommerceProducts } from "../../hooks/useWooCommerceProducts";

jest.mock("../../hooks/useWooCommerceProducts", () => ({
  useWooCommerceProducts: jest.fn(),
}));

jest.mock("../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (price: number) => `${price} EGP`,
  }),
}));

jest.mock("../../../../utils/imageUrl", () => ({
  getImageUrl: (value: string) => value,
}));

const mockedUseWooCommerceProducts =
  useWooCommerceProducts as jest.MockedFunction<
    typeof useWooCommerceProducts
  >;

const baseSettings = {
  id: "woo-settings-1",
  storeUrl: "https://demo-store.test",
  hasCredentials: true,
  syncEnabled: true,
  syncDirection: "both",
  webhookEnabled: false,
  syncInterval: 15,
};

describe("ProductsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a bulk select action while keeping per-product checkboxes", () => {
    mockedUseWooCommerceProducts.mockReturnValue({
      wooProducts: [
        {
          wooCommerceId: "woo-1",
          name: "T-Shirt",
          description: "",
          price: 250,
          sku: "TS-01",
          stock: 4,
          images: [],
          isActive: true,
          isVariable: false,
        },
        {
          wooCommerceId: "woo-2",
          name: "Sneakers",
          description: "",
          price: 480,
          sku: "SN-02",
          stock: 6,
          images: [],
          isActive: true,
          isVariable: false,
        },
      ],
      fetchingProducts: false,
      importingProducts: false,
      selectedWooProducts: new Set(["woo-1"]),
      selectedVariants: new Map(),
      expandedProduct: null,
      setExpandedProduct: jest.fn(),
      variantFilter: "all",
      setVariantFilter: jest.fn(),
      fetchWooProducts: jest.fn(),
      importSelectedProducts: jest.fn(),
      toggleVariantSelection: jest.fn(),
      selectAllVariantsForProduct: jest.fn(),
      deselectAllVariantsForProduct: jest.fn(),
      selectAllWooProducts: jest.fn(),
      deselectAllWooProducts: jest.fn(),
      groupVariantsByType: jest.fn(() => ({})),
      selectVariantsByType: jest.fn(),
      setSelectedWooProducts: jest.fn(),
      setSelectedVariants: jest.fn(),
    });

    render(<ProductsTab settings={baseSettings} />);

    expect(screen.getByText("التحديد الحالي")).toBeInTheDocument();
    expect(screen.getByText("1 من 2 منتج ظاهر")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /تحديد كل المنتجات/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("surfaces hidden selections when the current filter hides some products", () => {
    mockedUseWooCommerceProducts.mockReturnValue({
      wooProducts: [
        {
          wooCommerceId: "woo-1",
          name: "Color Shirt",
          description: "",
          price: 320,
          sku: "CS-01",
          stock: 3,
          images: [],
          isActive: true,
          isVariable: true,
          variations: [
            {
              wooCommerceVariationId: "var-1",
              name: "Red",
              type: "color",
              price: 320,
              stock: 3,
              trackInventory: true,
              images: [],
              isActive: true,
              attributes: [
                {
                  name: "Color",
                  option: "Red",
                  type: "color",
                  colorHex: "#ff0000",
                },
              ],
            },
          ],
        },
        {
          wooCommerceId: "woo-2",
          name: "Plain Shirt",
          description: "",
          price: 290,
          sku: "PS-02",
          stock: 7,
          images: [],
          isActive: true,
          isVariable: false,
        },
      ],
      fetchingProducts: false,
      importingProducts: false,
      selectedWooProducts: new Set(["woo-1", "woo-2"]),
      selectedVariants: new Map([
        ["woo-1", new Set(["var-1"])],
      ]),
      expandedProduct: null,
      setExpandedProduct: jest.fn(),
      variantFilter: "color",
      setVariantFilter: jest.fn(),
      fetchWooProducts: jest.fn(),
      importSelectedProducts: jest.fn(),
      toggleVariantSelection: jest.fn(),
      selectAllVariantsForProduct: jest.fn(),
      deselectAllVariantsForProduct: jest.fn(),
      selectAllWooProducts: jest.fn(),
      deselectAllWooProducts: jest.fn(),
      groupVariantsByType: jest.fn(() => ({ color: true })),
      selectVariantsByType: jest.fn(),
      setSelectedWooProducts: jest.fn(),
      setSelectedVariants: jest.fn(),
    });

    render(<ProductsTab settings={baseSettings} />);

    expect(screen.getByText("1 من 1 منتج ظاهر")).toBeInTheDocument();
    expect(screen.getByText("+1 محدد خارج التصفية الحالية")).toBeInTheDocument();
  });
});
