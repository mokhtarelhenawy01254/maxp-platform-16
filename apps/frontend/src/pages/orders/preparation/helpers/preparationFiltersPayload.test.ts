import { buildPreparationFiltersPayload } from "./preparationFiltersPayload";
import type { PreparationQueueUiState } from "../usePreparationQueueUiState";

describe("buildPreparationFiltersPayload", () => {
  const baseUiState: PreparationQueueUiState = {
    page: 1,
    pageSize: 25,
    activeStage: "PENDING_PREPARATION",
    selectedWarehouseId: "wh-1",
    stockFilter: "ALL",
    shortageReasonFilter: "ALL",
    shortageFollowUpFilter: "ALL",
    shortageOwnerFilter: "Ahmed",
    productFilter: "Shirt",
    productColorFilter: "Blue",
    productSizeFilter: "XL",
    productIdFilter: "prod-1",
    variantIdFilter: "var-1",
    itemCountFilter: "single_item",
    notPrintedFilter: "not_printed",
    noShippingCodeFilter: "no_shipping_code",
    search: "test",
    sortBy: "date",
    sortOrder: "desc",
    statusSelections: {},
    bulkStatus: "",
  };

  it("builds query payload with normalized string booleans and filters", () => {
    const payload = buildPreparationFiltersPayload({
      uiState: baseUiState,
      deferredSearch: "deferred search term",
    });

    expect(payload.stage).toBe("PENDING_PREPARATION");
    expect(payload.warehouseId).toBe("wh-1");
    expect(payload.shortageOwner).toBe("Ahmed");
    expect(payload.colorFilter).toBe("Blue");
    expect(payload.sizeFilter).toBe("XL");
    expect(payload.productId).toBe("prod-1");
    expect(payload.variantId).toBe("var-1");
    expect(payload.itemCountFilter).toBe("single_item");
    expect(payload.notPrinted).toBe("true");
    expect(payload.noShippingCode).toBe("true");
    expect(payload.search).toBe("deferred search term");
  });

  it("sets undefined for empty optional filters", () => {
    const payload = buildPreparationFiltersPayload({
      uiState: {
        ...baseUiState,
        productColorFilter: "",
        productSizeFilter: "",
        productIdFilter: "",
        variantIdFilter: "",
        notPrintedFilter: "all",
        noShippingCodeFilter: "all",
      },
      deferredSearch: "",
    });

    expect(payload.colorFilter).toBeUndefined();
    expect(payload.sizeFilter).toBeUndefined();
    expect(payload.productId).toBeUndefined();
    expect(payload.variantId).toBeUndefined();
    expect(payload.notPrinted).toBeUndefined();
    expect(payload.noShippingCode).toBeUndefined();
  });
});
