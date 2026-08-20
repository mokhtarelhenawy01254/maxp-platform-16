const mockPrisma = {
  whatsAppContact: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: jest.fn((op) => op()),
}));

jest.mock("../../services/socketService", () => ({
  getIO: jest.fn(() => null),
}));

jest.mock("../../services/whatsapp/DatabaseAuthState", () => ({
  useDatabaseAuthState: jest.fn(),
}));

jest.mock("@whiskeysockets/baileys", () => ({}));

const WhatsAppManager = require("../../services/whatsapp/WhatsAppManager");

const CONTACT_ROW = {
  id: "c1",
  sessionId: "s1",
  jid: "201010000001@s.whatsapp.net",
  phoneNumber: "201010000001",
  name: "Ahmed",
  pushName: "Ahmed",
  profilePicUrl: null,
  isGroup: false,
  customerId: null,
  lastMessageAt: new Date("2026-08-01T10:00:00Z"),
  lastMessagePreview: "hello",
  totalMessages: 5,
};

describe("WhatsAppManager.getLabelContacts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("queries contacts whose labels JSON contains the quoted label id and returns them", async () => {
    mockPrisma.whatsAppContact.findMany.mockResolvedValue([CONTACT_ROW]);
    mockPrisma.whatsAppContact.count.mockResolvedValue(1);

    const result = await WhatsAppManager.getLabelContacts("s1", "label-1", {
      page: 1,
      limit: 50,
    });

    const args = mockPrisma.whatsAppContact.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      sessionId: "s1",
      labels: { contains: '"label-1"' },
      NOT: { jid: { contains: "@lid" } },
    });
    expect(args.skip).toBe(0);
    expect(args.take).toBe(50);
    expect(result.total).toBe(1);
    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].jid).toBe(CONTACT_ROW.jid);
    expect(result.sessionConnected).toBe(false);
  });

  test("adds OR search conditions when search is provided", async () => {
    mockPrisma.whatsAppContact.findMany.mockResolvedValue([]);
    mockPrisma.whatsAppContact.count.mockResolvedValue(0);

    await WhatsAppManager.getLabelContacts("s1", "label-1", {
      page: 1,
      limit: 50,
      search: "0111",
    });

    const args = mockPrisma.whatsAppContact.findMany.mock.calls[0][0];
    expect(args.where.OR).toEqual([
      { name: { contains: "0111" } },
      { pushName: { contains: "0111" } },
      { phoneNumber: { contains: "0111" } },
    ]);
  });

  test("returns empty result when the label has no contacts", async () => {
    mockPrisma.whatsAppContact.findMany.mockResolvedValue([]);
    mockPrisma.whatsAppContact.count.mockResolvedValue(0);

    const result = await WhatsAppManager.getLabelContacts("s1", "label-x");

    expect(result.contacts).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
