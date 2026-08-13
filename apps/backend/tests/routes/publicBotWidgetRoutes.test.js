const express = require("express");
const request = require("supertest");

const mockPrisma = {
  botAutomationSettings: { findUnique: jest.fn() },
  whatsAppSession: { findFirst: jest.fn() },
  facebookPage: { findFirst: jest.fn() },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/botLinkService", () => ({
  getWhatsAppPhone: jest.fn(async () => "201012345678"),
  getFacebookPage: jest.fn(async () => ({ pageId: "page-1", pageName: "Swan" })),
  waLink: (phone) => (phone ? `https://wa.me/${phone}` : null),
  meLink: (pageId) => (pageId ? `https://m.me/${pageId}?ref=widget` : null),
}));

const publicBotWidgetRoutes = require("../../routes/publicBotWidgetRoutes");

describe("publicBotWidgetRoutes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use("/api/v1/public/bot-widget", publicBotWidgetRoutes);
  });

  test("returns disabled when widget not enabled", async () => {
    mockPrisma.botAutomationSettings.findUnique.mockResolvedValue({ widgetEnabled: false });
    const res = await request(app).get("/api/v1/public/bot-widget/co-1");
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
    expect(res.body.data.buttons).toEqual([]);
  });

  test("returns enabled buttons when widget on with both channels", async () => {
    mockPrisma.botAutomationSettings.findUnique.mockResolvedValue({
      widgetEnabled: true,
      widgetColor: "#123456",
      channels: JSON.stringify(["WHATSAPP", "FACEBOOK"]),
    });
    const res = await request(app).get("/api/v1/public/bot-widget/co-1");
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(true);
    expect(res.body.data.color).toBe("#123456");
    expect(res.body.data.buttons).toHaveLength(2);
    expect(res.body.data.buttons[0].url).toContain("wa.me");
    expect(res.body.data.buttons[1].url).toContain("m.me");
  });

  test("respects channels filter", async () => {
    mockPrisma.botAutomationSettings.findUnique.mockResolvedValue({
      widgetEnabled: true,
      widgetColor: "#4f46e5",
      channels: JSON.stringify(["WHATSAPP"]),
    });
    const res = await request(app).get("/api/v1/public/bot-widget/co-1");
    expect(res.body.data.buttons).toHaveLength(1);
    expect(res.body.data.buttons[0].channel).toBe("WHATSAPP");
  });
});
