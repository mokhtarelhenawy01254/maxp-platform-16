const axios = require("axios");

jest.mock("axios");
jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(),
}));

const FacebookAdsService = require("../../services/facebookAdsService");

describe("FacebookAdsService.getFacebookPages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("marks the result as reduced when retrying after Meta payload-size errors", async () => {
    axios.get
      .mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message:
                "Please reduce the amount of data you're asking for, then retry your request",
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "page-1",
              name: "Swan",
            },
          ],
        },
      });

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const service = new FacebookAdsService("token");
    const result = await service.getFacebookPages();

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        payloadReduced: true,
        payloadReductionError:
          "Please reduce the amount of data you're asking for, then retry your request",
        data: [expect.objectContaining({ id: "page-1" })],
      }),
    );
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get.mock.calls[0][1].params.fields).toBe("id,name,category");
    expect(axios.get.mock.calls[0][1].params.limit).toBe(100);
    expect(axios.get.mock.calls[1][1].params.fields).toBe("id,name");
    expect(axios.get.mock.calls[1][1].params.limit).toBe(25);

    warnSpy.mockRestore();
  });

  test("downgrades handled payload-size page discovery failures to warnings", async () => {
    const payloadError = {
      response: {
        data: {
          error: {
            message:
              "Please reduce the amount of data you're asking for, then retry your request",
          },
        },
      },
    };
    axios.get.mockRejectedValue(payloadError);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const service = new FacebookAdsService("token");
    const result = await service.getFacebookPages();

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error:
          "Please reduce the amount of data you're asking for, then retry your request",
        data: [],
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "⚠️ Facebook Pages unavailable after reduced payload retry:",
      "Please reduce the amount of data you're asking for, then retry your request",
    );
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
