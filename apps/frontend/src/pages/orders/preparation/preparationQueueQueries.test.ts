import {
  buildOrdersQueryKey,
  fetchOrdersData,
  fetchInventoryData,
  fetchWarehousesData,
  EMPTY_STAGE_COUNTS,
  EMPTY_PAGINATION,
  EMPTY_SUMMARY,
  PREPARATION_QUERY_KEYS,
} from "./preparationQueueQueries";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe("preparationQueueQueries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constants and query keys", () => {
    it("provides empty fallback defaults", () => {
      expect(EMPTY_STAGE_COUNTS.ALL).toBe(0);
      expect(EMPTY_PAGINATION.page).toBe(1);
      expect(EMPTY_SUMMARY.filteredTotal).toBe(0);
    });

    it("builds consistent query keys", () => {
      const keys = PREPARATION_QUERY_KEYS.warehouses("c1");
      expect(keys).toEqual(["preparation-queue", "c1", "warehouses"]);

      const ordersKey = buildOrdersQueryKey(
        {
          companyId: "c1",
          page: 1,
          pageSize: 20,
          activeStage: "ALL",
          selectedWarehouseId: "w1",
          stockFilter: "all",
          shortageReasonFilter: "all",
          shortageFollowUpFilter: "all",
          shortageOwnerFilter: "owner1",
          productFilter: "prod",
          productColorFilter: "red",
          productSizeFilter: "xl",
          productIdFilter: "pid",
          variantIdFilter: "vid",
          itemCountFilter: "all",
          notPrintedFilter: "all",
          noShippingCodeFilter: "all",
          search: "123",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        true,
      );

      expect(ordersKey[0]).toBe("preparation-queue");
      expect(ordersKey[1]).toBe("c1");
      expect(ordersKey[2]).toBe("orders");
      expect(ordersKey).toContain("prioritized");
    });
  });

  describe("fetchOrdersData", () => {
    it("fetches orders and filters terminal non-preparation statuses", async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          data: [
            { id: "o1", orderNumber: "ORD-1", status: "PENDING_PREPARATION" },
            { id: "o2", orderNumber: "ORD-2", status: "DELIVERED" }, // terminal
          ],
          pagination: { total: 1, page: 1, limit: 20, pages: 1 },
          summary: { filteredTotal: 1 },
        },
      });

      const res = await fetchOrdersData(
        {
          companyId: "c1",
          page: 1,
          pageSize: 20,
          activeStage: "ALL",
          selectedWarehouseId: "",
          stockFilter: "all",
          shortageReasonFilter: "all",
          shortageFollowUpFilter: "all",
          shortageOwnerFilter: "",
          productFilter: "",
          productColorFilter: "",
          productSizeFilter: "",
          productIdFilter: "",
          variantIdFilter: "",
          itemCountFilter: "all",
          notPrintedFilter: "all",
          noShippingCodeFilter: "all",
          search: "",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        false,
      );

      expect(res.orders.length).toBe(1);
      expect(res.orders[0].orderNumber).toBe("ORD-1");
    });
  });

  describe("fetchInventoryData", () => {
    it("returns empty array when productIds is empty", async () => {
      const res = await fetchInventoryData([]);
      expect(res).toEqual([]);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it("fetches inventory for productIds", async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          data: [{ productId: "p1", quantity: 10, availableQuantity: 8 }],
        },
      });

      const res = await fetchInventoryData(["p1"]);
      expect(res.length).toBe(1);
      expect(apiClient.get).toHaveBeenCalledWith("/inventory", {
        params: { productIds: "p1" },
      });
    });
  });

  describe("fetchWarehousesData", () => {
    it("fetches warehouses list", async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          data: [{ id: "w1", name: "Main Warehouse" }],
        },
      });

      const res = await fetchWarehousesData();
      expect(res.length).toBe(1);
      expect(res[0].id).toBe("w1");
    });
  });
});
