/**
 * اختبارات facebookSystemUserTokenService — منطق الأولوية والوضعين والتدهور الآمن
 */

jest.mock("axios");
jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(),
}));

const axios = require("axios");
const { getSharedPrismaClient } = require("../../services/sharedDatabase");
const {
  encryptField,
  decryptField,
} = require("../../utils/fieldEncryption");
const {
  saveSystemUserToken,
  clearSystemUserToken,
  getSystemUserTokenStatus,
  resolveEffectiveSystemUserToken,
  resolveSystemUserPageToken,
  invalidateSystemUserTokenCache,
} = require("../../services/facebookSystemUserTokenService");

const COMPANY_ID = "company_test_123";

const buildRow = (overrides = {}) => ({
  id: "row-1",
  companyId: COMPANY_ID,
  scope: "TENANT",
  label: null,
  tokenEncrypted: encryptField("EAAfakeSystemUserTokenForTests123456"),
  tokenLast4: "3456",
  businessId: null,
  appId: null,
  appKey: null,
  scopes: null,
  mode: "FALLBACK",
  isActive: true,
  priority: 100,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("facebookSystemUserTokenService", () => {
  let queryResults;
  let executedStatements;

  beforeAll(() => {
    process.env.DATA_ENCRYPTION_KEY = "test-data-encryption-key";
  });

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateSystemUserTokenCache();

    queryResults = { tenantRows: [], centralRows: [] };
    executedStatements = [];

    const prisma = {
      $queryRawUnsafe: jest.fn(async (sql) => {
        if (sql.includes("IS NULL")) return queryResults.centralRows;
        return queryResults.tenantRows;
      }),
      $executeRawUnsafe: jest.fn(async (sql) => {
        executedStatements.push(sql);
        return 1;
      }),
    };
    getSharedPrismaClient.mockReturnValue(prisma);
  });

  test("tenant token wins over central (ai_keys-style priority)", async () => {
    queryResults.tenantRows = [buildRow({ tokenEncrypted: encryptField("EAAtenantToken") })];
    queryResults.centralRows = [
      buildRow({ id: "row-central", companyId: null, scope: "CENTRAL", tokenEncrypted: encryptField("EAAcentralToken") }),
    ];

    const effective = await resolveEffectiveSystemUserToken(COMPANY_ID);

    expect(effective).not.toBeNull();
    expect(effective.token).toBe("EAAtenantToken");
    expect(effective.scope).toBe("TENANT");
  });

  test("falls back to central when no tenant token exists", async () => {
    queryResults.tenantRows = [];
    queryResults.centralRows = [
      buildRow({ id: "row-central", companyId: null, scope: "CENTRAL", tokenEncrypted: encryptField("EAAcentralToken") }),
    ];

    const effective = await resolveEffectiveSystemUserToken(COMPANY_ID);

    expect(effective).not.toBeNull();
    expect(effective.token).toBe("EAAcentralToken");
    expect(effective.scope).toBe("CENTRAL");
  });

  test("FALLBACK mode: token used only when page token is missing", async () => {
    queryResults.tenantRows = [buildRow({ mode: "FALLBACK", tokenEncrypted: encryptField("EAAsystemUser") })];

    const withPageToken = await resolveSystemUserPageToken({
      pageId: "page-1",
      companyId: COMPANY_ID,
      pageAccessToken: "EAAexistingPageToken",
    });
    expect(withPageToken).toBeNull();

    const withoutPageToken = await resolveSystemUserPageToken({
      pageId: "page-1",
      companyId: COMPANY_ID,
      pageAccessToken: null,
    });
    expect(withoutPageToken).toBe("EAAsystemUser");
  });

  test("PRIMARY mode: token overrides an existing page token", async () => {
    queryResults.tenantRows = [buildRow({ mode: "PRIMARY", tokenEncrypted: encryptField("EAAsystemUser") })];

    const override = await resolveSystemUserPageToken({
      pageId: "page-1",
      companyId: COMPANY_ID,
      pageAccessToken: "EAAexistingPageToken",
    });
    expect(override).toBe("EAAsystemUser");
  });

  test("graceful degradation: DB failures never throw to callers", async () => {
    getSharedPrismaClient.mockReturnValue({
      $queryRawUnsafe: jest.fn(async () => {
        throw new Error("connection refused");
      }),
      $executeRawUnsafe: jest.fn(),
    });

    await expect(resolveEffectiveSystemUserToken(COMPANY_ID)).resolves.toBeNull();
    await expect(
      resolveSystemUserPageToken({ pageId: "p", companyId: COMPANY_ID, pageAccessToken: null }),
    ).resolves.toBeNull();
  });

  test("save validates against Graph, encrypts at rest, and deactivates previous rows", async () => {
    axios.get.mockImplementation(async (url) => {
      if (url.includes("/me/permissions")) {
        return { data: { data: [{ permission: "pages_messaging" }, { permission: "pages_show_list" }] } };
      }
      return { data: { id: "su-100", name: "MaxP System User" } };
    });

    const saved = await saveSystemUserToken({
      companyId: COMPANY_ID,
      scope: "TENANT",
      token: "  EAAfreshSystemUserTokenAbCdEf9999  ",
      mode: "PRIMARY",
      label: "الأساسي",
    });

    expect(saved.scope).toBe("TENANT");
    expect(saved.mode).toBe("PRIMARY");
    expect(saved.identity).toEqual({ id: "su-100", name: "MaxP System User" });
    expect(saved.permissions).toEqual(["pages_messaging", "pages_show_list"]);

    // بيان التعطيل ثم بيان الإدراج
    expect(executedStatements.length).toBeGreaterThanOrEqual(2);
    expect(executedStatements[0]).toContain("UPDATE");
    expect(executedStatements[1]).toContain("INSERT INTO");

    // التقاط وسائط الإدراج: التوكن مشفّر + آخر 4 محارف صريحة
    // (الفهرس 0 هو نص SQL نفسه، ثم المعاملات $1..$13 بالترتيب)
    const prisma = getSharedPrismaClient();
    const insertCall = prisma.$executeRawUnsafe.mock.calls[1];
    const insertedEncrypted = insertCall[5];
    expect(insertedEncrypted.startsWith("enc:v1:")).toBe(true);
    expect(decryptField(insertedEncrypted)).toBe("EAAfreshSystemUserTokenAbCdEf9999");
    expect(insertCall[6]).toBe("9999"); // tokenLast4
  });

  test("save rejects invalid tokens (Graph code 190) without touching the DB", async () => {
    axios.get.mockRejectedValue({
      response: { data: { error: { code: 190, message: "Invalid OAuth access token" } } },
    });

    await expect(
      saveSystemUserToken({
        companyId: COMPANY_ID,
        token: "EAAinvalidTokenXXXXXXXXXXXX",
      }),
    ).rejects.toThrow("INVALID_TOKEN");

    expect(executedStatements).toHaveLength(0);
  });

  test("clear deactivates the tenant scope and reports the count", async () => {
    const result = await clearSystemUserToken({ companyId: COMPANY_ID, scope: "TENANT" });

    expect(result.cleared).toBe(1);
    expect(executedStatements[0]).toContain("UPDATE");
    expect(executedStatements[0]).toContain("TENANT");
  });

  test("status masks secrets and reports the effective source", async () => {
    queryResults.tenantRows = [buildRow({ mode: "PRIMARY" })];

    const status = await getSystemUserTokenStatus(COMPANY_ID);

    expect(status.tenant).not.toBeNull();
    expect(status.tenant.mode).toBe("PRIMARY");
    expect(status.tenant.tokenLast4).toBe("3456");
    expect(status.tenant.tokenEncrypted).toBeUndefined();
    expect(status.effective).toEqual({ source: "TENANT", mode: "PRIMARY" });
  });
});
