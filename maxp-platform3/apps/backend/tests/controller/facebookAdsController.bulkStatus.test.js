const mockUpdateCampaign = jest.fn();
const mockUpdateAdSet = jest.fn();
const mockUpdateAd = jest.fn();

jest.mock("../../services/facebookAdsService", () =>
  jest.fn().mockImplementation(() => ({
    updateCampaign: mockUpdateCampaign,
    updateAdSet: mockUpdateAdSet,
    updateAd: mockUpdateAd,
  })),
);

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  facebookCampaign: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  facebookAdset: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  facebookAd: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

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

describe("facebookAdsController.bulkUpdateStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({
      facebookAdsAccessToken: "ads-token",
      facebookUserAccessToken: null,
    });
    mockUpdateCampaign.mockResolvedValue({ success: true, data: { success: true } });
    mockUpdateAdSet.mockResolvedValue({ success: true, data: { success: true } });
    mockUpdateAd.mockResolvedValue({ success: true, data: { success: true } });
  });

  test("pauses synced ads through Meta before updating local status", async () => {
    mockPrisma.facebookAd.findMany.mockResolvedValue([
      {
        id: "ad-local-1",
        companyId: "company-1",
        facebookAdId: "120-meta-ad",
        status: "ACTIVE",
      },
    ]);
    mockPrisma.facebookAd.update.mockResolvedValue({
      id: "ad-local-1",
      status: "PAUSED",
    });

    const req = {
      user: { companyId: "company-1" },
      body: {
        entityType: "ad",
        ids: ["ad-local-1"],
        action: "pause",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.bulkUpdateStatus(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockUpdateAd).toHaveBeenCalledWith("120-meta-ad", {
      status: "PAUSED",
    });
    expect(mockPrisma.facebookAd.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ad-local-1" },
        data: expect.objectContaining({ status: "PAUSED" }),
      }),
    );
    expect(res.payload).toEqual(
      expect.objectContaining({
        success: true,
        entityType: "ad",
        updatedCount: 1,
        failedCount: 0,
      }),
    );
  });

  test("rejects bulk delete instead of exposing destructive batch deletes", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: {
        entityType: "campaign",
        ids: ["campaign-1"],
        action: "delete",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.bulkUpdateStatus(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.error).toContain("Bulk delete is not enabled");
    expect(mockPrisma.facebookCampaign.findMany).not.toHaveBeenCalled();
    expect(mockUpdateCampaign).not.toHaveBeenCalled();
  });

  test("reports per-item failures without updating local rows after Meta failure", async () => {
    mockPrisma.facebookCampaign.findMany.mockResolvedValue([
      {
        id: "campaign-1",
        companyId: "company-1",
        facebookCampaignId: "120-campaign",
        status: "ACTIVE",
      },
    ]);
    mockUpdateCampaign.mockResolvedValue({
      success: false,
      error: "Permission denied",
    });

    const req = {
      user: { companyId: "company-1" },
      body: {
        entityType: "campaign",
        ids: ["campaign-1", "missing-campaign"],
        status: "PAUSED",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.bulkUpdateStatus(req, res);

    expect(res.statusCode).toBe(207);
    expect(mockPrisma.facebookCampaign.update).not.toHaveBeenCalled();
    expect(res.payload).toEqual(
      expect.objectContaining({
        success: false,
        updatedCount: 0,
        failedCount: 2,
      }),
    );
  });
});
