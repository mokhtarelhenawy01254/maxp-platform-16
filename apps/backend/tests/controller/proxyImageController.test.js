const sharp = require("sharp");

const mockGetSharedPrismaClient = jest.fn(() => ({}));

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: mockGetSharedPrismaClient,
}));

const {
  normalizeImageTransformOptions,
  proxyImage,
} = require("../../controller/proxyImageController");

const createHeaders = (headers = {}) => ({
  get: (name) => headers[String(name).toLowerCase()] || null,
});

const createRemoteImageResponse = (buffer, headers = {}) => ({
  ok: true,
  status: 200,
  headers: createHeaders(headers),
  arrayBuffer: jest.fn(async () =>
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  ),
});

const createJsonResponse = (payload, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: createHeaders(headers),
  json: jest.fn(async () => payload),
  text: jest.fn(async () => JSON.stringify(payload)),
});

const createResponseMock = () => {
  const res = {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader: jest.fn((key, value) => {
      res.headers[key] = value;
      return res;
    }),
    removeHeader: jest.fn((key) => {
      delete res.headers[key];
      return res;
    }),
    status: jest.fn((statusCode) => {
      res.statusCode = statusCode;
      return res;
    }),
    send: jest.fn((body) => {
      res.body = body;
      return res;
    }),
    json: jest.fn((body) => {
      res.body = body;
      return res;
    }),
    end: jest.fn(() => res),
  };

  return res;
};

describe("proxyImageController image transforms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("normalizes transform query parameters to safe bounds", () => {
    expect(
      normalizeImageTransformOptions({
        w: "9999",
        q: "5",
        format: "gif",
      }),
    ).toEqual({
      shouldTransform: true,
      width: 1600,
      quality: 40,
      format: "webp",
    });
  });

  test("resizes external WooCommerce product images without initializing Prisma", async () => {
    const sourceBuffer = await sharp({
      create: {
        width: 900,
        height: 600,
        channels: 3,
        background: "#ffffff",
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    global.fetch.mockResolvedValue(
      createRemoteImageResponse(sourceBuffer, {
        "content-type": "image/jpeg",
        "content-length": String(sourceBuffer.length),
      }),
    );

    const req = {
      method: "GET",
      query: {
        url: "https://swan3.fiore.icu/wp-content/uploads/2025/03/photo.jpg",
        w: "240",
        q: "68",
        format: "webp",
      },
    };
    const res = createResponseMock();

    await proxyImage(req, res);

    expect(mockGetSharedPrismaClient).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://swan3.fiore.icu/wp-content/uploads/2025/03/photo.jpg",
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("image/webp");
    expect(res.headers["Cache-Control"]).toContain("max-age=604800");
    expect(res.headers["Content-Length"]).toBe(String(res.body.length));

    const metadata = await sharp(res.body).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(240);
  });

  test("resizes known storefront CDN image URLs without file extensions", async () => {
    const sourceBuffer = await sharp({
      create: {
        width: 1200,
        height: 900,
        channels: 3,
        background: "#f4ede4",
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();
    const targetUrl =
      "https://images.unsplash.com/photo-1700000000000?auto=format&fit=crop&w=1200&q=80";

    global.fetch.mockResolvedValue(
      createRemoteImageResponse(sourceBuffer, {
        "content-type": "image/jpeg",
      }),
    );

    const req = {
      method: "GET",
      query: {
        url: targetUrl,
        w: "320",
        q: "70",
        format: "webp",
      },
    };
    const res = createResponseMock();

    await proxyImage(req, res);

    expect(mockGetSharedPrismaClient).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      targetUrl,
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("image/webp");

    const metadata = await sharp(res.body).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(320);
  });

  test("refreshes expired Facebook message media URLs through Graph before falling back", async () => {
    const sourceBuffer = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: "#ffffff",
      },
    })
      .jpeg({ quality: 88 })
      .toBuffer();
    const expiredUrl =
      "https://scontent.xx.fbcdn.net/v/t1.15752-9/expired.jpg?oh=expired";
    const freshUrl =
      "https://scontent.xx.fbcdn.net/v/t1.15752-9/fresh.jpg?oh=fresh";

    const prisma = {
      message: {
        findUnique: jest.fn(async () => ({
          id: "msg-fb-image",
          content: expiredUrl,
          attachments: null,
          metadata: JSON.stringify({ facebookMessageId: "mid-fresh-1" }),
          conversation: {
            companyId: "company-1",
            metadata: JSON.stringify({ pageId: "page-1" }),
          },
        })),
      },
      facebookPage: {
        findFirst: jest.fn(async () => ({
          pageId: "page-1",
          pageAccessToken: "page-token",
        })),
      },
    };
    mockGetSharedPrismaClient.mockReturnValue(prisma);

    global.fetch
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            attachments: {
              data: [
                {
                  image_data: {
                    url: freshUrl,
                  },
                },
              ],
            },
          },
          200,
        ),
      )
      .mockResolvedValueOnce(createJsonResponse("URL signature expired", 403))
      .mockResolvedValueOnce(
        createRemoteImageResponse(sourceBuffer, {
          "content-type": "image/jpeg",
          "content-length": String(sourceBuffer.length),
        }),
      );

    const req = {
      method: "GET",
      query: {
        url: expiredUrl,
        messageId: "msg-fb-image",
      },
    };
    const res = createResponseMock();

    await proxyImage(req, res);

    expect(mockGetSharedPrismaClient).toHaveBeenCalledTimes(1);
    expect(prisma.message.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "msg-fb-image" } }),
    );
    expect(prisma.facebookPage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          pageId: "page-1",
        },
      }),
    );
    const { getMetaGraphApiVersion } = require("../../config/metaApi");
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(`https://graph.facebook.com/${getMetaGraphApiVersion()}/mid-fresh-1`),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expiredUrl,
      expect.objectContaining({ method: "GET" }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      freshUrl,
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("image/jpeg");
    expect(Buffer.isBuffer(res.body)).toBe(true);
  });

  test("proxies Meta Cloud WhatsApp image media by message id", async () => {
    const sourceBuffer = await sharp({
      create: {
        width: 480,
        height: 320,
        channels: 3,
        background: "#d9fdd3",
      },
    })
      .jpeg({ quality: 88 })
      .toBuffer();

    const prisma = {
      $queryRawUnsafe: jest.fn()
        .mockResolvedValueOnce([
        {
          column_name: "metadata",
        },
        {
          column_name: "metaAccessToken",
        },
        {
          column_name: "metaApiVersion",
        },
      ])
        .mockResolvedValueOnce([
          {
            metaAccessToken: "wa-token",
            metaApiVersion: "v21.0",
            metadata: null,
          },
        ]),
      whatsAppMessage: {
        findUnique: jest.fn(async () => ({
          id: "wa-msg-1",
          mediaUrl: "meta-media:1234567890",
          sessionId: "wa-session-1",
        })),
      },
    };
    mockGetSharedPrismaClient.mockReturnValue(prisma);

    global.fetch
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1234567890",
          },
          200,
          {
            "content-type": "application/json",
          },
        ),
      )
      .mockResolvedValueOnce(
        createRemoteImageResponse(sourceBuffer, {
          "content-type": "image/jpeg",
          "content-length": String(sourceBuffer.length),
        }),
      );

    const req = {
      method: "GET",
      query: {
        whatsAppMessageId: "wa-msg-1",
      },
    };
    const res = createResponseMock();

    await proxyImage(req, res);

    expect(mockGetSharedPrismaClient).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://graph.facebook.com/v21.0/1234567890",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer wa-token",
          Accept: "application/json",
        }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1234567890",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer wa-token",
          Accept: "*/*",
        }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("image/jpeg");
    expect(Buffer.isBuffer(res.body)).toBe(true);
  });
});
