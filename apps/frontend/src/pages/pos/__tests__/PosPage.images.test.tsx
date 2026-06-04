import { render, screen } from "@testing-library/react";
import PosPage from "../PosPage";

jest.mock("../../../config", () => ({
  config: {
    apiUrl: "/api/v1",
  },
}));

jest.mock("../../../config/environment", () => ({
  envConfig: {
    apiUrl: "/api/v1",
    backendUrl: "http://localhost:3007",
  },
}));

jest.mock("../../../services/authService", () => ({
  authService: {
    getAccessToken: jest.fn(() => "test-token"),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
    toggleTheme: jest.fn(),
  }),
}));

const buildProducts = () =>
  Array.from({ length: 9 }, (_, index) => ({
    id: `product-${index + 1}`,
    name: `Product ${index + 1}`,
    price: "100",
    sku: `SKU-${index + 1}`,
    category: { name: "Category" },
    mainImage: `/uploads/products/product-${index + 1}.jpg`,
    images: [],
    stock: 10,
  }));

describe("PosPage product images", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: buildProducts(),
      }),
    });
  });

  it("uses optimized responsive thumbnails instead of full product images", async () => {
    render(<PosPage />);

    const firstImage = await screen.findByAltText("Product 1");
    expect(firstImage.getAttribute("src")).toBe(
      "http://localhost:3007/uploads/products/product-1.jpg?format=webp&w=320&q=70",
    );
    expect(firstImage.getAttribute("srcset")).toContain("w=160&q=70 160w");
    expect(firstImage.getAttribute("srcset")).toContain("w=320&q=70 320w");
    expect(firstImage.getAttribute("sizes")).toContain("45vw");
    expect(firstImage).toHaveAttribute("loading", "eager");
    expect(firstImage).toHaveAttribute("decoding", "async");

    const belowFoldImage = await screen.findByAltText("Product 9");
    expect(belowFoldImage).toHaveAttribute("loading", "lazy");
  });
});
