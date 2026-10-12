/**
 * Utility functions for identifying Post-Purchase Offer items and orders
 */

export const isPostPurchaseOfferItem = (item: any): boolean => {
  if (!item) return false;
  if (item.isPostPurchaseOffer === true || item.addedPostPurchase === true) return true;
  if (item.metadata?.isPostPurchaseOffer === true || item.metadata?.addedPostPurchase === true) return true;
  if (
    typeof item.metadata === "string" &&
    (item.metadata.includes('"isPostPurchaseOffer":true') ||
      item.metadata.includes('"addedPostPurchase":true') ||
      item.metadata.includes("isPostPurchaseOffer") ||
      item.metadata.includes("addedPostPurchase"))
  ) {
    return true;
  }
  return false;
};

export const hasPostPurchaseOffer = (order: any): boolean => {
  if (!order) return false;
  if (order.hasPostPurchaseOffer === true) return true;
  if (order.metadata?.postPurchaseOfferAccepted === true) return true;
  if (
    typeof order.metadata === "string" &&
    (order.metadata.includes('"postPurchaseOfferAccepted":true') ||
      order.metadata.includes("postPurchaseOfferAccepted"))
  ) {
    return true;
  }
  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.orderItems)
    ? order.orderItems
    : [];

  return items.some(isPostPurchaseOfferItem);
};
