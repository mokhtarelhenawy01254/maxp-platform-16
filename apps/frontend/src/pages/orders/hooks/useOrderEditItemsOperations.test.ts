import { renderHook, act } from "@testing-library/react";
import { useOrderEditItemsOperations } from "./useOrderEditItemsOperations";
import { toast } from "sonner";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("useOrderEditItemsOperations", () => {
  const setShowAddProductModal = jest.fn();
  const t = (k: string) => k;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects product with price <= 0", () => {
    let editForm = { items: [] as any[] };
    const setEditForm = jest.fn((updater) => {
      editForm = typeof updater === "function" ? updater(editForm) : updater;
    });

    const { result } = renderHook(() =>
      useOrderEditItemsOperations({
        editForm,
        setEditForm,
        setShowAddProductModal,
        t,
      }),
    );

    act(() => {
      result.current.handleProductSelect({ id: "p1", name: "Free Item", price: 0 });
    });

    expect(toast.error).toHaveBeenCalledWith("orderDetails.priceMustBeGreaterThanZero");
    expect(setEditForm).not.toHaveBeenCalled();
    expect(setShowAddProductModal).not.toHaveBeenCalled();
  });

  it("rejects duplicate product addition", () => {
    let editForm = {
      items: [
        { productId: "p1", productColor: "Red", productSize: "XL", price: 100 },
      ],
    };
    const setEditForm = jest.fn();

    const { result } = renderHook(() =>
      useOrderEditItemsOperations({
        editForm,
        setEditForm,
        setShowAddProductModal,
        t,
      }),
    );

    act(() => {
      result.current.handleProductSelect(
        { id: "p1", name: "Shirt", price: 100 },
        { color: "Red", size: "XL", price: 100 },
      );
    });

    expect(toast.error).toHaveBeenCalledWith("orderDetails.productAlreadyExists");
    expect(setEditForm).not.toHaveBeenCalled();
  });

  it("adds new product with variant extraction successfully", () => {
    let editForm = { items: [] as any[] };
    const setEditForm = jest.fn((updater) => {
      editForm = typeof updater === "function" ? updater(editForm) : updater;
    });

    const { result } = renderHook(() =>
      useOrderEditItemsOperations({
        editForm,
        setEditForm,
        setShowAddProductModal,
        t,
      }),
    );

    const product = { id: "prod-10", name: "Premium Polo", price: 200, images: ["img1.jpg"] };
    const variant = {
      id: "var-1",
      color: "Navy",
      size: "L",
      price: 250,
      sku: "POLO-NVY-L",
    };

    act(() => {
      result.current.handleProductSelect(product, variant);
    });

    expect(setEditForm).toHaveBeenCalled();
    expect(setShowAddProductModal).toHaveBeenCalledWith(false);
    expect(editForm.items).toHaveLength(1);
    expect(editForm.items[0]).toEqual(
      expect.objectContaining({
        productId: "prod-10",
        variantId: "var-1",
        productName: "Premium Polo",
        price: 250,
        quantity: 1,
        total: 250,
        productColor: "Navy",
        productSize: "L",
        productSku: "POLO-NVY-L",
      }),
    );
  });

  it("updates item quantity and recalculates total", () => {
    let editForm = {
      items: [
        { productId: "p1", price: 150, quantity: 1, total: 150 },
      ],
    };
    const setEditForm = jest.fn((updater) => {
      editForm = typeof updater === "function" ? updater(editForm) : updater;
    });

    const { result } = renderHook(() =>
      useOrderEditItemsOperations({
        editForm,
        setEditForm,
        setShowAddProductModal,
        t,
      }),
    );

    act(() => {
      result.current.handleItemChange(0, "quantity", 3);
    });

    expect(editForm.items[0].quantity).toBe(3);
    expect(editForm.items[0].total).toBe(450);
  });

  it("removes item at index", () => {
    let editForm = {
      items: [
        { productId: "p1", name: "Item 1" },
        { productId: "p2", name: "Item 2" },
      ],
    };
    const setEditForm = jest.fn((updater) => {
      editForm = typeof updater === "function" ? updater(editForm) : updater;
    });

    const { result } = renderHook(() =>
      useOrderEditItemsOperations({
        editForm,
        setEditForm,
        setShowAddProductModal,
        t,
      }),
    );

    act(() => {
      result.current.handleRemoveItem(0);
    });

    expect(editForm.items).toHaveLength(1);
    expect(editForm.items[0].productId).toBe("p2");
  });
});
