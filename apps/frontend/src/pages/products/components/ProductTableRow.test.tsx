import { render, screen } from "@testing-library/react";
import React from "react";
import ProductTableRow from "./ProductTableRow";
import type { Product } from "./ProductsTypes";

jest.mock("../../../utils/imageUrl", () => ({
  getImageUrl: (value: string) => value,
}));

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));


const baseProduct: Product = {
  id: "product-1",
  slug: "swan-speaker",
  name: "Swan Speaker",
  description: "Portable speaker",
  price: 499,
  sku: "S33-copy-1776246914315",
  category: "Audio",
  images: [],
  stock: 179,
  lowStockThreshold: 10,
  isActive: true,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-08T00:00:00.000Z"),
  tags: [],
  workflow: {
    status: "DRAFT",
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

const renderProductRow = (product: Product = baseProduct) =>
  render(
    <table>
      <tbody>
        <ProductTableRow
          product={product}
          selected={false}
          canSelect={true}
          onSelect={jest.fn()}
          formatPrice={(price) => `${price} EGP`}
          formatDate={() => "May 8, 2026"}
          getStorefrontUrl={(item) =>
            typeof item === "string" ? `/store/${item}` : `/store/${item.slug || item.id}`
          }
          prepareStorefrontContext={jest.fn()}
          isEditing={false}
          editPrice=""
          editStock=""
          onEditPriceChange={jest.fn()}
          onEditStockChange={jest.fn()}
          onSaveQuickEdit={jest.fn()}
          onCancelQuickEdit={jest.fn()}
          onStartQuickEdit={jest.fn()}
          onDuplicate={jest.fn()}
          duplicatingProductId={null}
          workflowLoadingId={null}
          onWorkflowAction={jest.fn()}
          canManageWorkflow={true}
          canDelete={true}
          onDelete={jest.fn()}
        />
      </tbody>
    </table>,
  );

describe("ProductTableRow", () => {
  it("renders product name, category, and SKU in the table row", () => {
    renderProductRow();

    expect(screen.getByText("Swan Speaker")).toBeInTheDocument();
    expect(screen.getByText("Audio")).toBeInTheDocument();
    expect(screen.getByText(baseProduct.sku)).toBeInTheDocument();
    expect(screen.queryByText(/عروض كميات/i)).not.toBeInTheDocument();
  });

  it("renders quantity offers badge when product has active quantity offers", () => {
    const productWithOffers: Product = {
      ...baseProduct,
      hasQuantityOffers: true,
      quantityOffersCount: 2,
      quantityOffers: [
        {
          id: "qo-1",
          quantity: 2,
          unitPrice: 400,
          buyText: "اشتري 2 بـ 800",
          isActive: true,
        },
        {
          id: "qo-2",
          quantity: 3,
          unitPrice: 350,
          buyText: "اشتري 3 بـ 1050",
          isActive: true,
        },
      ],
    };

    renderProductRow(productWithOffers);

    expect(screen.getByText(/عروض كميات/i)).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });
});
