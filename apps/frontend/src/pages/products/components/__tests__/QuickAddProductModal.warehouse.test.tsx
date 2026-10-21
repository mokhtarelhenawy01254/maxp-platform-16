import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QuickAddProductModal } from "../QuickAddProductModal";
import CreateInventoryProductDialog from "../../../inventory/components/CreateInventoryProductDialog";

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
    get: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: jest.fn().mockResolvedValue({ data: { success: true, data: { id: "p1" } } }),
  },
}));

describe("QuickAddProductModal - Warehouse Selection", () => {
  const warehousesMock = [
    { id: "wh-1", name: "المخزن الرئيسي" },
    { id: "wh-2", name: "مخزن الإسكندرية" },
  ];

  it("does not show warehouse dropdown when showWarehouseSelect is false", async () => {
    render(
      <QuickAddProductModal
        open={true}
        onClose={jest.fn()}
        showWarehouseSelect={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("إنشاء طلب سريع")).toBeInTheDocument();
    });
    expect(screen.queryByText("المخزن")).not.toBeInTheDocument();
  });

  it("shows warehouse selector and selects defaultWarehouseId when showWarehouseSelect is true", async () => {
    render(
      <QuickAddProductModal
        open={true}
        onClose={jest.fn()}
        warehouses={warehousesMock}
        defaultWarehouseId="wh-2"
        showWarehouseSelect={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("إنشاء طلب سريع")).toBeInTheDocument();
    });
    expect(screen.getByText("المخزن")).toBeInTheDocument();
    expect(screen.getByText("المخزن الرئيسي")).toBeInTheDocument();
    expect(screen.getByText("مخزن الإسكندرية")).toBeInTheDocument();

    const select = screen.getByDisplayValue("مخزن الإسكندرية") as HTMLSelectElement;
    expect(select.value).toBe("wh-2");
  });

  it("CreateInventoryProductDialog delegates to QuickAddProductModal with showWarehouseSelect enabled", async () => {
    render(
      <CreateInventoryProductDialog
        open={true}
        onClose={jest.fn()}
        onCreated={jest.fn()}
        warehouses={warehousesMock}
        defaultWarehouseId="wh-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("إنشاء طلب سريع")).toBeInTheDocument();
    });
    expect(screen.getByText("المخزن")).toBeInTheDocument();
    const select = screen.getByDisplayValue("المخزن الرئيسي") as HTMLSelectElement;
    expect(select.value).toBe("wh-1");
  });
});

