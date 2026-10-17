export const sourceTypeLabels: Record<string, string> = {
  ai_conversation: "orders.sourceAutoConversation",
  manual: "orders.sourceManual",
  storefront: "orders.sourceStorefront",
  woocommerce: "orders.sourceWooCommerce",
  pos: "orders.sourcePOS",
  api: "orders.sourceAPI",
  import: "orders.sourceImport",
  unknown: "orders.sourceUnknown",
};

export const extractionLabels: Record<string, string> = {
  ai_enhanced: "orders.aiEnhanced",
  ai_basic: "orders.basicExtraction",
  manual: "orders.manual",
};

export const fulfillmentLabels: Record<string, string> = {
  MERCHANT: "orders.fromMerchant",
  COMPANY_WAREHOUSE: "orders.fromCompanyWarehouse",
};

export const merchantOperationLabels: Record<string, string> = {
  PREPARATION: "orders.preparation",
  IN_SHIPPING: "orders.inShipping",
  DELIVERED: "orders.delivered",
  NOT_DELIVERED: "orders.returnedOrNotDelivered",
};

export const settlementLabels: Record<string, string> = {
  PAYABLE: "orders.settlementPayable",
  PAID: "orders.settlementPaid",
  NOT_PAYABLE: "orders.settlementNotPayable",
};
