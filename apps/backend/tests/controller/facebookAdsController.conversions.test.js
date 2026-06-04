const mockSendConversionEvent = jest.fn();

jest.mock("../../services/facebookAdsService", () =>
  jest.fn().mockImplementation(() => ({
    sendConversionEvent: mockSendConversionEvent,
  })),
);

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  facebookAdAccount: {
    findFirst: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const FacebookAdsService = require("../../services/facebookAdsService");
const facebookAdsController = require("../../controller/facebookAdsController");

function createResponseMock() {
  return {
    statusCode: 200,
    payload: null,
    status: jest.fn(function setStatus(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function setJson(payload) {
      this.payload = payload;
      return this;
    }),
  };
}

describe("facebookAdsController.sendConversionEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({
      facebookAdsAccessToken: "ads-token",
      facebookUserAccessToken: null,
    });
    mockPrisma.facebookAdAccount.findFirst.mockResolvedValue({
      accountId: "1120545302307751",
      isActive: true,
    });
    mockSendConversionEvent.mockResolvedValue({
      success: true,
      data: {
        events_received: 1,
        fbtrace_id: "trace-1",
      },
    });
  });

  test("forwards event IDs and test event codes for CAPI diagnostics", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: {
        pixelId: "pixel-1",
        eventName: "Purchase",
        eventId: "purchase-dedupe-1",
        eventTime: 1778236800,
        testEventCode: "TEST123",
        eventSourceUrl: "https://swan.maxp.online/product/swan",
        userData: {
          email: "buyer@example.com",
          fbp: "fb.1.123.456",
        },
        customData: {
          value: 499,
          currency: "EGP",
        },
        actionSource: "website",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.sendConversionEvent(req, res);

    expect(FacebookAdsService).toHaveBeenCalledWith(
      "ads-token",
      "1120545302307751",
    );
    expect(mockSendConversionEvent).toHaveBeenCalledWith(
      "pixel-1",
      expect.objectContaining({
        eventName: "Purchase",
        eventId: "purchase-dedupe-1",
        eventTime: 1778236800,
        testEventCode: "TEST123",
        eventSourceUrl: "https://swan.maxp.online/product/swan",
        actionSource: "website",
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      success: true,
      data: {
        events_received: 1,
        fbtrace_id: "trace-1",
      },
    });
  });
});
