import { render, screen } from "@testing-library/react";
import React from "react";
import ProductTableRow from "./ProductTableRow";
import type { Product } from "./ProductsTypes";

jest.mock("../../../utils/imageUrl", () => ({
  getImageUrl: (value: string) => value,
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
  it("keeps SKU hidden in the products management table row", () => {
    renderProductRow();

    expect(screen.getByText("Swan Speaker")).toBeInTheDocument();
    expect(screen.getByText("Audio")).toBeInTheDocument();
    expect(screen.queryByText(/SKU:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(baseProduct.sku)).not.toBeInTheDocument();
  });
});
