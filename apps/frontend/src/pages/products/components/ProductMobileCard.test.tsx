import { render, screen } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import ProductMobileCard from "./ProductMobileCard";
import type { Product } from "./ProductsTypes";

jest.mock("../../../utils/imageUrl", () => ({
  getImageUrl: (value: string) => value,
}));

const baseProduct: Product = {
  id: "product-101",
  slug: "swan-sneakers",
  name: "سنيكرات سوان",
  description: "حذاء رياضي",
  price: 499,
  sku: "SW-101",
  category: "أحذية",
  images: ["https://example.com/shoe.jpg"],
  mainImage: "https://example.com/shoe.jpg",
  stock: 25,
  lowStockThreshold: 5,
  isActive: true,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-08T00:00:00.000Z"),
  tags: [],
  workflow: {
    status: "published",
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    publishedAt: null,
    unpublishedAt: null,
    rejectionReason: null,
    lastActionAt: null,
    lastActionById: null,
    lastActionByName: null,
    lastActionByRole: null,
  },
  productType: "simple",
  variantsCount: 0,
};

const renderCard = (product: Product = baseProduct, isEditing = false) =>
  render(
    <BrowserRouter>
      <ProductMobileCard
        product={product}
        selected={false}
        canSelect={true}
        onSelect={jest.fn()}
        formatPrice={(p) => `${p} ج.م`}
        formatDate={() => "2026-05-08"}
        getStorefrontUrl={() => "/store/swan-sneakers"}
        prepareStorefrontContext={jest.fn()}
        isEditing={isEditing}
        editPrice="499"
        editStock="25"
        editSku="SW-101"
        onEditPriceChange={jest.fn()}
        onEditStockChange={jest.fn()}
        onEditSkuChange={jest.fn()}
        onSaveQuickEdit={jest.fn()}
        onCancelQuickEdit={jest.fn()}
        onStartQuickEdit={jest.fn()}
        onDuplicate={jest.fn()}
        duplicatingProductId={null}
        workflowLoadingId={null}
        onWorkflowAction={jest.fn()}
        canManageWorkflow={true}
        canSubmitReviewWorkflow={true}
        canDelete={true}
        onDelete={jest.fn()}
      />
    </BrowserRouter>,
  );

describe("ProductMobileCard", () => {
  it("renders product name as a link to full product edit page", () => {
    renderCard();
    const nameLink = screen.getByRole("link", { name: /سنيكرات سوان/i });
    expect(nameLink).toBeInTheDocument();
    expect(nameLink).toHaveAttribute("href", "/products/product-101/edit");
  });

  it("renders a dedicated full Edit button pointing to /products/:id/edit", () => {
    renderCard();
    const editBtn = screen.getByRole("link", { name: /تعديل/i });
    expect(editBtn).toBeInTheDocument();
    expect(editBtn).toHaveAttribute("href", "/products/product-101/edit");
  });

  it("renders full edit link inside quick edit mode", () => {
    renderCard(baseProduct, true);
    const fullEditLink = screen.getByRole("link", { name: /تعديل كامل للتفاصيل/i });
    expect(fullEditLink).toBeInTheDocument();
    expect(fullEditLink).toHaveAttribute("href", "/products/product-101/edit");
  });
});
