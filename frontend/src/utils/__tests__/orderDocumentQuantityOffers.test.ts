import {
  getOrderDocumentQuantityOffer,
  groupOrderDocumentQuantityOffers,
  summarizeOrderDocumentItems,
} from "../orderDocumentQuantityOffers";

describe("orderDocumentQuantityOffers", () => {
  it("extracts quantity offer metadata from serialized metadata", () => {
    const result = getOrderDocumentQuantityOffer({
      productName: "Sneakers",
      quantity: 1,
      price: 305,
      metadata: JSON.stringify({
        quantityOffer: {
          groupId: "group-1",
          offerLabel: "اشتري القطعتين بدل 800",
          offerQuantity: 2,
          slotIndex: 1,
          freeShipping: true,
        },
      }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        groupId: "group-1",
        offerLabel: "اشتري القطعتين بدل 800",
        freeShipping: true,
      }),
    );
  });

  it("groups document items by quantity offer group id", () => {
    const grouped = groupOrderDocumentQuantityOffers([
      {
        productName: "Sneakers",
        quantity: 1,
        price: 305,
        total: 305,
        metadata: {
          quantityOffer: {
            groupId: "group-1",
            offerLabel: "اشتري القطعتين بدل 800",
            offerQuantity: 2,
            slotIndex: 2,
            freeShipping: true,
          },
        },
      },
      {
        productName: "Sneakers",
        quantity: 1,
        price: 305,
        total: 305,
        metadata: {
          quantityOffer: {
            groupId: "group-1",
            offerLabel: "اشتري القطعتين بدل 800",
            offerQuantity: 2,
            slotIndex: 1,
            freeShipping: true,
          },
        },
      },
      {
        productName: "Single Product",
        quantity: 1,
        price: 120,
        total: 120,
      },
    ]);

    expect(grouped.groups).toHaveLength(1);
    expect(grouped.singles).toHaveLength(1);
    expect(grouped.groups[0]).toEqual(
      expect.objectContaining({
        groupId: "group-1",
        offerLabel: "اشتري القطعتين بدل 800",
        offerQuantity: 2,
        freeShipping: true,
        total: 610,
        selectedPieces: 2,
      }),
    );
    expect(grouped.groups[0].items[0].slotIndex).toBe(1);
    expect(grouped.groups[0].items[1].slotIndex).toBe(2);
  });

  it("builds a compact summary for orders with quantity offers", () => {
    const summary = summarizeOrderDocumentItems([
      {
        productName: "Sneakers",
        quantity: 1,
        price: 305,
        total: 305,
        metadata: {
          quantityOffer: {
            groupId: "group-1",
            offerLabel: "اشتري القطعتين بدل 800",
            offerQuantity: 2,
            slotIndex: 1,
            freeShipping: true,
          },
        },
      },
      {
        productName: "Sneakers",
        quantity: 1,
        price: 305,
        total: 305,
        metadata: {
          quantityOffer: {
            groupId: "group-1",
            offerLabel: "اشتري القطعتين بدل 800",
            offerQuantity: 2,
            slotIndex: 2,
            freeShipping: true,
          },
        },
      },
      {
        productName: "Cleaner",
        quantity: 1,
        price: 50,
        total: 50,
      },
    ]);

    expect(summary).toEqual(
      expect.objectContaining({
        hasQuantityOffers: true,
        quantityOfferCount: 1,
        totalItemCount: 3,
        primaryLabel: "اشتري القطعتين بدل 800",
      }),
    );
    expect(summary.secondaryLabel).toContain("2/2 قطع");
    expect(summary.secondaryLabel).toContain("+1 منتجات منفصلة");
  });
});
