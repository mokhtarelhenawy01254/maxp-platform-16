const createResponseMock = () => ({
  statusCode: 200,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(),
  executeWithRetry: jest.fn((operation) => operation()),
}));

const { getSharedPrismaClient } = require("../../services/sharedDatabase");
const recruitmentController = require("../../controller/recruitmentController");

const createPrismaMock = () => ({
  applicant: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
});

describe("recruitmentController applicants", () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    getSharedPrismaClient.mockReturnValue(prisma);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test("supports loading all applicants for a company without page truncation", async () => {
    prisma.applicant.findMany.mockResolvedValue([
      { id: "applicant-1", companyId: "company-1", name: "مرشح 1" },
      { id: "applicant-2", companyId: "company-1", name: "مرشح 2" },
    ]);
    prisma.applicant.count.mockResolvedValue(2);

    const req = {
      user: { companyId: "company-1" },
      query: { status: "NEW", limit: "all" },
    };
    const res = createResponseMock();

    await recruitmentController.getApplicants(req, res);

    const findManyArgs = prisma.applicant.findMany.mock.calls[0][0];
    expect(findManyArgs.where).toEqual({ companyId: "company-1", status: "NEW" });
    expect(findManyArgs).not.toHaveProperty("skip");
    expect(findManyArgs).not.toHaveProperty("take");
    expect(res.payload.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 2,
      totalPages: 1,
    });
  });

  test("deletes an applicant only inside the current company scope", async () => {
    const req = {
      user: { companyId: "company-1" },
      params: { id: "applicant-1" },
    };
    const res = createResponseMock();

    await recruitmentController.deleteApplicant(req, res);

    expect(prisma.applicant.deleteMany).toHaveBeenCalledWith({
      where: { id: "applicant-1", companyId: "company-1" },
    });
    expect(res.payload).toEqual({
      success: true,
      message: "تم حذف المتقدم بنجاح",
    });
  });
});
