jest.mock("../../../i18n", () => ({
  __esModule: true,
  default: {
    t: (k: string) => k,
    changeLanguage: jest.fn(),
  },
}));

jest.mock("../../../services/facebookAdsService", () => ({
  facebookAdsService: {
    sendConversionEvent: jest.fn(),
  },
}));

import {
  buildConversionPayload,
  getConversionResponseDetails,
  summarizeConversionAttempts,
  type ConversionFormData,
} from "../ConversionApiDashboard";

const baseFormData: ConversionFormData = {
  pixelId: " 123456789 ",
  eventName: "Purchase",
  eventSourceUrl: " https://swan.maxp.online/product/swan ",
  eventId: "purchase-dedupe-1",
  email: "buyer@example.com",
  phone: "+201000000000",
  firstName: "Sara",
  lastName: "Ali",
  city: "Cairo",
  country: "EG",
  fbp: "fb.1.123.456",
  fbc: "fb.1.123.click",
  testEventCode: "TEST123",
  value: 499,
  currency: "EGP",
  contentIds: "sku-1, sku-2",
  contentType: "product",
  contentName: "Swan Sneaker",
  numItems: 2,
  orderId: "ORD-1",
  actionSource: "website",
};

describe("ConversionApiDashboard diagnostics helpers", () => {
  it("builds the current conversions endpoint payload with browser IDs and Meta diagnostics fields", () => {
    expect(buildConversionPayload(baseFormData)).toEqual({
      pixelId: "123456789",
      eventName: "Purchase",
      eventSourceUrl: "https://swan.maxp.online/product/swan",
      eventId: "purchase-dedupe-1",
      testEventCode: "TEST123",
      actionSource: "website",
      userData: {
        email: "buyer@example.com",
        phone: "+201000000000",
        firstName: "Sara",
        lastName: "Ali",
        city: "Cairo",
        country: "EG",
        fbp: "fb.1.123.456",
        fbc: "fb.1.123.click",
      },
      customData: {
        value: 499,
        currency: "EGP",
        contentIds: ["sku-1", "sku-2"],
        contentType: "product",
        contentName: "Swan Sneaker",
        numItems: 2,
        orderId: "ORD-1",
      },
    });
  });

  it("does not send commerce defaults for non-commerce events", () => {
    const payload = buildConversionPayload({
      ...baseFormData,
      eventName: "Lead",
      value: 0,
      contentIds: "",
      contentName: "",
      orderId: "",
      numItems: 1,
    });

    expect(payload.customData).toBeUndefined();
  });

  it("normalizes backend and raw Meta response details", () => {
    expect(
      getConversionResponseDetails({
        success: true,
        data: {
          events_received: 1,
          fbtrace_id: "trace-1",
          messages: ["ok"],
        },
      }),
    ).toEqual({
      eventsReceived: 1,
      fbtraceId: "trace-1",
      messages: ["ok"],
    });

    expect(
      getConversionResponseDetails({
        eventsReceived: 2,
        fbtraceId: "trace-2",
      }),
    ).toMatchObject({
      eventsReceived: 2,
      fbtraceId: "trace-2",
    });
  });

  it("derives dashboard KPIs from the current session attempt history", () => {
    expect(
      summarizeConversionAttempts([
        {
          id: "1",
          eventId: "event-1",
          eventName: "Purchase",
          timestamp: "2026-05-08T08:00:00.000Z",
          status: "success",
          eventsReceived: 1,
          pixelId: "123",
          actionSource: "website",
          sentFields: {
            fbp: true,
            fbc: false,
            eventId: true,
            testEventCode: true,
          },
        },
        {
          id: "2",
          eventId: "event-2",
          eventName: "Lead",
          timestamp: "2026-05-08T08:01:00.000Z",
          status: "failed",
          pixelId: "123",
          actionSource: "website",
          sentFields: {
            fbp: false,
            fbc: false,
            eventId: false,
            testEventCode: false,
          },
        },
      ]),
    ).toEqual({
      total: 2,
      succeeded: 1,
      failed: 1,
      eventsReceived: 1,
      successRate: 50,
    });
  });
});
