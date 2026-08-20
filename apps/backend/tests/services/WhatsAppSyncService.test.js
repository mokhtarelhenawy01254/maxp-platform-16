const mockPrisma = {
  customer: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  // ≡ƒÜ¿ fix: findOrCreateCustomer wraps its DB work in executeWithRetry ΓÇö without it
  // the call throws `executeWithRetry is not a function`.
  executeWithRetry: jest.fn((op) => op()),
  getNormalizedSettings: jest.fn(async () => ({})),
}));

const WhatsAppSyncService = require("../../services/whatsapp/WhatsAppSyncService");

describe("WhatsAppSyncService findOrCreateCustomer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("searches by phone, whatsappId, canonical and variants so a legacy local-phone customer is found", async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: "legacy-customer",
      phone: "01019046551",
      phoneNormalized: null,
      avatar: null,
    });
    mockPrisma.customer.update.mockResolvedValue({
      id: "legacy-customer",
      phone: "01019046551",
      phoneNormalized: "+201019046551",
    });

    const result = await WhatsAppSyncService.findOrCreateCustomer(
      "company-1",
      "201019046551",
      "Heba Mohamed",
      "http://avatar"
    );

    expect(mockPrisma.customer.findFirst).toHaveBeenCalled();
    // legacy customer gets phoneNormalized + whatsappId backfilled + avatar
    expect(mockPrisma.customer.update).toHaveBeenCalledWith({
      where: { id: "legacy-customer" },
      data: { phoneNormalized: "+201019046551", avatar: "http://avatar", whatsappId: "201019046551" },
    });
    expect(result.phoneNormalized).toBe("+201019046551");
  });

  test("creates a customer with split name and canonical phone when none found", async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    mockPrisma.customer.create.mockResolvedValue({
      id: "new",
      firstName: "Heba",
      lastName: "Mohamed",
      phone: "201019046551",
      phoneNormalized: "+201019046551",
    });

    const result = await WhatsAppSyncService.findOrCreateCustomer(
      "company-1",
      "201019046551",
      "Heba Mohamed",
      null
    );

    expect(mockPrisma.customer.create).toHaveBeenCalledWith({
      data: {
        companyId: "company-1",
        firstName: "Heba",
        lastName: "Mohamed",
        phone: "201019046551",
        phoneNormalized: "+201019046551",
        whatsappId: "201019046551",
        avatar: null,
        status: "LEAD",
      },
    });
    expect(result.id).toBe("new");
  });

  test("strips decorative characters from the WhatsApp profile name", async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    mockPrisma.customer.create.mockResolvedValue({
      id: "new",
      firstName: "Heba",
      lastName: "",
    });

    await WhatsAppSyncService.findOrCreateCustomer("company-1", "201019046551", "~ Heba ~", null);

    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ firstName: "Heba", lastName: "" }),
      })
    );
  });
});
