const FacebookConversionsService = require("../../services/facebookConversionsService");

describe("FacebookConversionsService", () => {
  test("testConnection sends raw user data for the SDK path", async () => {
    const service = new FacebookConversionsService("pixel-id", "token");
    service.sendEvent = jest.fn().mockResolvedValue({
      success: true,
      events_received: 1,
      messages: [],
      fbtrace_id: "trace-id",
    });

    const result = await service.testConnection();

    expect(result.success).toBe(true);
    expect(service.sendEvent).toHaveBeenCalledTimes(1);
    expect(service.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "PageView",
        event_source_url: "https://maxp.online/facebook-capi-test",
        user_data: expect.objectContaining({
          client_ip_address: "1.1.1.1",
          client_user_agent: "Test User Agent",
        }),
        _raw_user_data: {
          ip: "1.1.1.1",
          userAgent: "Test User Agent",
        },
      }),
    );
  });

  test("sendEvent uses HTTP for product contents payloads", async () => {
    const service = new FacebookConversionsService("pixel-id", "token");
    service.sdkAvailable = true;
    service.EventRequest = jest.fn();
    service.sendEventViaHTTP = jest.fn().mockResolvedValue({
      success: true,
      events_received: 1,
      messages: [],
      fbtrace_id: "trace-id",
    });

    const event = {
      event_name: "Purchase",
      event_time: 1778390000,
      event_id: "purchase-test",
      event_source_url: "https://swan.maxp.online/thank-you",
      action_source: "website",
      user_data: {
        client_ip_address: "1.1.1.1",
        client_user_agent: "Test User Agent",
      },
      custom_data: {
        contents: [{ id: "product-id", quantity: 1, item_price: 499 }],
        currency: "EGP",
        value: 499,
      },
    };

    await expect(service.sendEvent(event)).resolves.toEqual({
      success: true,
      events_received: 1,
      messages: [],
      fbtrace_id: "trace-id",
    });
    expect(service.sendEventViaHTTP).toHaveBeenCalledWith(event);
    expect(service.EventRequest).not.toHaveBeenCalled();
  });
});
