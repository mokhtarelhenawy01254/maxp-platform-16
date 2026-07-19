const axios = require("axios");

jest.mock("axios");
jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(),
}));

const FacebookAdsService = require("../../services/facebookAdsService");

describe("FacebookAdsService.getAdAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("falls back to minimal fields when business_management fields are blocked", async () => {
    axios.get
      .mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message:
                "(#100) Requires business_management permission to access the field.",
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "act_740961211416460",
              name: "swan-1",
              account_id: "740961211416460",
              currency: "EGP",
            },
          ],
        },
      });

    const service = new FacebookAdsService("token");
    const result = await service.getAdAccounts();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      expect.objectContaining({
        account_id: "740961211416460",
        name: "swan-1",
      }),
    ]);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get.mock.calls[0][1].params.fields).toContain("business");
    expect(axios.get.mock.calls[0][1].params.fields).toContain(
      "funding_source_details",
    );
    expect(axios.get.mock.calls[0][1].params.fields).toContain("balance");
    expect(axios.get.mock.calls[0][1].params.fields).toContain("spend_cap");
    expect(axios.get.mock.calls[1][1].params.fields).toBe(
      "id,name,account_id,account_status,currency,timezone_name,amount_spent,balance,spend_cap",
    );
  });
});
