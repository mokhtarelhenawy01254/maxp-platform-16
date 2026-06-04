// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ProductImageLandingPage from "../pages/ProductImageLandingPage";

const storefrontApiMocks = vi.hoisted(() => ({
  getProductLanding: vi.fn(),
  getProductLandingPreview: vi.fn(),
  createOrder: vi.fn(),
  trackProductLandingOrder: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../utils/storefrontApi", () => ({
  getCompanyId: () => "company-1",
  storefrontApi: storefrontApiMocks,
}));

const baseProduct = {
  id: "prod-1",
  companyId: "company-1",
  name: "Swan Sneaker",
  slug: "swan-sneaker",
  description: "<p>سنيكر يومي خفيف بنعل مريح ومناسب للمشاوير اليومية.</p>",
  price: 620,
  comparePrice: 750,
  mainImage: "https://cdn.example.com/product.jpg",
  images: ["https://cdn.example.com/product.jpg"],
  productVariants: [
    {
      id: "variant-37-black",
      productId: "prod-1",
      name: "Black - 37",
      price: 620,
      isActive: true,
      attributes: { Color: "Black", Size: "37" },
      attributeValues: { Color: "Black", Size: "37" },
    },
    {
      id: "variant-38-white",
      productId: "prod-1",
      name: "White - 38",
      price: 620,
      isActive: true,
      attributes: { Color: "White", Size: "38" },
      attributeValues: { Color: "White", Size: "38" },
    },
  ],
};

const renderLanding = (path = "/store/lp/swan-sneaker-flux?companyId=company-1&preview=1") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/store/lp/:id" element={<ProductImageLandingPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProductImageLandingPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("composes a product-first landing page from product data and generated campaign assets", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-1",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-sneaker-flux",
          title: "Swan Sneaker Flux",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [
            {
              id: "slice-1",
              src: "/uploads/studio_images/swan-ai.jpg",
              alt: "Generated clean sneaker asset",
              width: 1024,
              height: 1024,
            },
          ],
          formConfig: {
            orderKicker: "نموذج الطلب",
            orderTitle: "اطلب Swan Sneaker",
            orderCopy: "اختار المقاس واللون وسيتم التواصل معك للتأكيد.",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding();

    expect(
      await screen.findByRole("heading", { name: "Swan Sneaker" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "اطلب الآن" })).toHaveAttribute(
      "href",
      "#order",
    );
    expect(screen.getByText("دفع عند الاستلام")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("<p>");
    expect(screen.getByLabelText("الاسم")).toBeInTheDocument();
    expect(screen.getByLabelText("المقاس")).toBeInTheDocument();
    expect(screen.getByLabelText("اللون")).toBeInTheDocument();
  });

  it("still renders a usable landing page when only the product image is available", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-2",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-sneaker-product-only",
          title: "Swan Sneaker Product Only",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "NEEDS_IMAGES",
          slices: [],
          formConfig: {
            orderTitle: "اطلب Swan Sneaker",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding("/store/lp/swan-sneaker-product-only?companyId=company-1&preview=1");

    expect(
      await screen.findByRole("heading", { name: "Swan Sneaker" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("صفحة الهبوط المصورة غير جاهزة لهذا المنتج بعد."),
    ).not.toBeInTheDocument();
  });

  it("hides visually blank campaign slices instead of showing a broken black block", async () => {
    const originalImage = window.Image;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 48;
      naturalHeight = 48;
      crossOrigin = "";
      decoding = "async";

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }

    Object.defineProperty(window, "Image", {
      configurable: true,
      writable: true,
      value: MockImage,
    });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: () => ({
        data: new Uint8ClampedArray(Array.from({ length: 48 * 48 * 4 }, (_, index) =>
          (index + 1) % 4 === 0 ? 255 : 0,
        )),
      }),
    })) as typeof HTMLCanvasElement.prototype.getContext;

    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-3",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-sneaker-black-slice",
          title: "Swan Sneaker Black Slice",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [
            {
              id: "slice-black",
              src: "/uploads/studio_images/black-slice.jpg",
              alt: "Blank generated slice",
              width: 1024,
              height: 1024,
            },
          ],
          formConfig: {
            orderTitle: "اطلب Swan Sneaker",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding("/store/lp/swan-sneaker-black-slice?companyId=company-1&preview=1");

    await screen.findByRole("heading", { name: "Swan Sneaker" });
    await waitFor(() => {
      expect(screen.queryByAltText("Blank generated slice")).not.toBeInTheDocument();
    });

    Object.defineProperty(window, "Image", {
      configurable: true,
      writable: true,
      value: originalImage,
    });
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });
});
