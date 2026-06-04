import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MerchantsList from "../MerchantsList";
import MerchantRegister from "../MerchantRegister";
import MerchantProfile from "../MerchantProfile";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

jest.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({
    actualTheme: "light",
  }),
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("merchant management pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads the merchant list for admins", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/merchants") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "merchant-1",
                name: "Merchant Co",
                email: "merchant@example.com",
                phone: "01000000000",
                isActive: true,
                commissionRate: 10,
                fulfillmentMode: "COMPANY_WAREHOUSE",
                inventorySummary: {
                  linkedProducts: 2,
                  availableForSale: 18,
                  merchantProductStock: 18,
                  physicalQuantity: 24,
                  physicalAvailable: 18,
                  reservedQuantity: 6,
                  stockLocation: "COMPANY_WAREHOUSE",
                  stockLocationLabel: "من مخزن الشركة",
                  warehouseNames: ["Main Warehouse"],
                },
                operationsSummary: {
                  summary: {
                    assignedOrdersCount: 3,
                    assignedPieces: 7,
                    preparationOrdersCount: 1,
                    inShippingOrdersCount: 1,
                    deliveredOrdersCount: 1,
                    notDeliveredOrdersCount: 0,
                    payablePieces: 2,
                    pendingPayablePieces: 3,
                    deliveredPayableAmount: 450,
                    inShippingAmount: 320,
                    paidAmount: 0,
                  },
                  rows: [],
                },
                _count: {
                  orders: 3,
                },
              },
            ],
          },
        });
      }

      if (url === "/merchants/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "payout-1",
                amount: 450,
                currency: "EGP",
                status: "PENDING",
                paymentMethod: "WALLET",
                createdAt: "2026-05-04T00:00:00.000Z",
                merchant: {
                  id: "merchant-1",
                  name: "Merchant Co",
                  email: "merchant@example.com",
                },
                commissions: [{ id: "commission-1", amount: 450, status: "CONFIRMED" }],
              },
            ],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(
      <MemoryRouter>
        <MerchantsList />
      </MemoryRouter>,
    );

    expect(await screen.findByText("إدارة تجار الدروب شيبنج")).toBeInTheDocument();
    expect(screen.getAllByText("Merchant Co").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("merchant@example.com").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("مركز تشغيل التجار")).toBeInTheDocument();
    expect(screen.getByText("الطلبات الموحدة")).toBeInTheDocument();
    expect(screen.getByText("مستحقات التجار")).toBeInTheDocument();
    expect(screen.getByText("تسجيل تحويل")).toBeInTheDocument();
  });

  test("records a pending merchant payout transfer from the list", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/merchants") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "merchant-1",
                name: "Merchant Co",
                email: "merchant@example.com",
                phone: "01000000000",
                isActive: true,
                commissionRate: 10,
                fulfillmentMode: "MERCHANT",
                inventorySummary: {
                  linkedProducts: 1,
                  availableForSale: 9,
                  merchantProductStock: 9,
                  physicalQuantity: 9,
                  physicalAvailable: 9,
                  reservedQuantity: 0,
                  stockLocation: "MERCHANT",
                  stockLocationLabel: "عند التاجر",
                },
                operationsSummary: {
                  summary: {
                    assignedOrdersCount: 3,
                    preparationOrdersCount: 0,
                    inShippingOrdersCount: 1,
                    deliveredOrdersCount: 2,
                    notDeliveredOrdersCount: 0,
                    deliveredPayableAmount: 450,
                  },
                },
                _count: {
                  orders: 3,
                },
              },
            ],
          },
        });
      }

      if (url === "/merchants/payouts") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "payout-1",
                amount: 450,
                currency: "EGP",
                status: "PENDING",
                paymentMethod: "WALLET",
                createdAt: "2026-05-04T00:00:00.000Z",
                merchant: {
                  id: "merchant-1",
                  name: "Merchant Co",
                  email: "merchant@example.com",
                },
                commissions: [{ id: "commission-1", amount: 450, status: "CONFIRMED" }],
              },
            ],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "payout-1",
          status: "PROCESSED",
        },
      },
    });

    render(
      <MemoryRouter>
        <MerchantsList />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("تسجيل تحويل"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/merchants/payouts/payout-1/record-external",
        expect.objectContaining({
          externalReference: "merchant-admin-ui",
        }),
      );
    });
  });

  test("submits the admin create-merchant form", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/warehouses" || url === "/shipping-companies") {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          data: [],
        },
      });
    });
    mockPost.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter>
        <MerchantRegister />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("اسم التاجر أو الشركة"), {
      target: { value: "New Merchant" },
    });
    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "new-merchant@example.com" },
    });

    fireEvent.click(screen.getByText("تسجيل كتاجر"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/merchants",
        expect.objectContaining({
          name: "New Merchant",
          email: "new-merchant@example.com",
          fulfillmentMode: "MERCHANT",
          isActive: true,
        }),
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/merchants");
  });

  test("loads and updates a merchant profile in edit mode", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/merchants/merchant-1") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: "merchant-1",
              name: "Merchant Co",
              email: "merchant@example.com",
              phone: "01000000000",
              address: "Cairo",
              commissionRate: 10,
              autoFulfill: false,
              fulfillmentMode: "COMPANY_WAREHOUSE",
              defaultWarehouseId: "warehouse-1",
              defaultShippingCompanyId: "shipping-1",
              webhookUrl: "",
              isActive: true,
              createdAt: "2026-05-01T10:00:00.000Z",
              products: [],
              operationsSummary: {
                summary: {
                  assignedOrdersCount: 5,
                  preparationOrdersCount: 1,
                  inShippingOrdersCount: 2,
                  deliveredOrdersCount: 2,
                  notDeliveredOrdersCount: 0,
                  payablePieces: 4,
                  deliveredPayableAmount: 800,
                  inShippingAmount: 500,
                  paidAmount: 300,
                },
                rows: [
                  {
                    id: "merchant-order-1",
                    orderNumber: "ORD-100",
                    customerName: "Test Customer",
                    operationStatus: "DELIVERED",
                    pieces: 2,
                    merchantAmount: 400,
                  },
                ],
              },
            },
          },
        });
      }

      if (url === "/products") {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
          },
        });
      }

      if (url === "/warehouses") {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: "warehouse-1", name: "Main Warehouse" }],
          },
        });
      }

      if (url === "/shipping-companies") {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: "shipping-1", name: "Turbo" }],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    mockPut.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(
      <MemoryRouter initialEntries={["/merchants/merchant-1/edit"]}>
        <Routes>
          <Route path="/merchants/:id/edit" element={<MerchantProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("تعديل بيانات التاجر")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Merchant Co"), {
      target: { value: "Merchant Co Updated" },
    });
    fireEvent.click(screen.getByText("حفظ التعديلات"));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/merchants/merchant-1",
        expect.objectContaining({
          name: "Merchant Co Updated",
          fulfillmentMode: "COMPANY_WAREHOUSE",
          defaultWarehouseId: "warehouse-1",
          defaultShippingCompanyId: "shipping-1",
        }),
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/merchants/merchant-1");
  });

  test("links a product to a merchant and triggers inventory sync from the profile", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/merchants/merchant-1") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: "merchant-1",
              name: "Merchant Co",
              email: "merchant@example.com",
              phone: "01000000000",
              address: "Cairo",
              commissionRate: 10,
              autoFulfill: true,
              fulfillmentMode: "MERCHANT",
              defaultWarehouseId: null,
              defaultShippingCompanyId: "shipping-1",
              webhookUrl: "",
              isActive: true,
              createdAt: "2026-05-01T10:00:00.000Z",
              operationsSummary: {
                summary: {
                  assignedOrdersCount: 1,
                  preparationOrdersCount: 0,
                  inShippingOrdersCount: 0,
                  deliveredOrdersCount: 1,
                  notDeliveredOrdersCount: 0,
                  payablePieces: 4,
                  deliveredPayableAmount: 300,
                  inShippingAmount: 0,
                  paidAmount: 0,
                },
                rows: [
                  {
                    id: "merchant-order-1",
                    orderNumber: "ORD-101",
                    customerName: "Existing Customer",
                    operationStatus: "DELIVERED",
                    pieces: 4,
                    merchantAmount: 300,
                  },
                ],
              },
              products: [
                {
                  id: "merchant-product-1",
                  merchantPrice: 75,
                  stock: 4,
                  syncEnabled: true,
                  lastSyncedAt: "2026-05-01T12:00:00.000Z",
                  product: {
                    id: "product-1",
                    name: "Existing Product",
                    price: 100,
                  },
                },
              ],
            },
          },
        });
      }

      if (url === "/products") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "product-1",
                name: "Existing Product",
                price: 100,
              },
              {
                id: "product-2",
                name: "New Product",
                price: 150,
              },
            ],
          },
        });
      }

      if (url === "/warehouses") {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: "warehouse-1", name: "Main Warehouse" }],
          },
        });
      }

      if (url === "/shipping-companies") {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: "shipping-1", name: "Turbo" }],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
      },
    });
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          synced: 1,
          timestamp: "2026-05-01T13:00:00.000Z",
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/merchants/merchant-1"]}>
        <Routes>
          <Route path="/merchants/:id" element={<MerchantProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("ربط منتج بالتاجر")).toBeInTheDocument();
    expect(screen.getByText("متابعة طلبات التاجر")).toBeInTheDocument();
    expect(screen.getByText("ORD-101")).toBeInTheDocument();

    const productSelect = screen
      .getAllByRole("combobox")
      .find((element) => !element.hasAttribute("disabled"));

    expect(productSelect).toBeTruthy();

    fireEvent.change(productSelect as Element, {
      target: { value: "product-2" },
    });
    fireEvent.change(screen.getByPlaceholderText("مثال: 150"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "9" },
    });
    fireEvent.change(screen.getByPlaceholderText("اختياري"), {
      target: { value: "SKU-NEW-2" },
    });

    fireEvent.click(screen.getByText("ربط المنتج بالتاجر"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/merchants/merchant-1/products", {
        productId: "product-2",
        merchantSku: "SKU-NEW-2",
        merchantPrice: 120,
        stock: 9,
        syncEnabled: true,
      });
    });

    fireEvent.click(screen.getByText("تشغيل مزامنة المخزون الآن"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/merchants/merchant-1/sync");
    });
  });
});
