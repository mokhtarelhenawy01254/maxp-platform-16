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
const applicationFormController = require("../../controller/applicationFormController");

const createPrismaMock = () => ({
  $transaction: jest.fn((callback) => callback(createPrismaMock.current)),
  applicant: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  recruitmentForm: {
    findFirst: jest.fn(),
    delete: jest.fn().mockResolvedValue({ id: "form-1" }),
  },
  recruitmentFormResponse: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn().mockResolvedValue({ id: "response-1" }),
  },
});

describe("applicationFormController recruitment response cleanup", () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    createPrismaMock.current = prisma;
    getSharedPrismaClient.mockReturnValue(prisma);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test("deleting a form response also removes its linked applicant", async () => {
    prisma.recruitmentFormResponse.findFirst.mockResolvedValue({
      id: "response-1",
    });

    const req = {
      user: { companyId: "company-1" },
      params: { responseId: "response-1" },
    };
    const res = createResponseMock();

    await applicationFormController.deleteResponse(req, res);

    expect(prisma.applicant.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        formResponseId: { in: ["response-1"] },
      },
    });
    expect(prisma.recruitmentFormResponse.delete).toHaveBeenCalledWith({
      where: { id: "response-1" },
    });
    expect(res.payload).toEqual({
      success: true,
      message: "تم حذف الرد بنجاح",
    });
  });

  test("deleting a form removes applicants created from that form before cascading responses", async () => {
    prisma.recruitmentForm.findFirst.mockResolvedValue({ id: "form-1" });
    prisma.recruitmentFormResponse.findMany.mockResolvedValue([
      { id: "response-1" },
      { id: "response-2" },
    ]);

    const req = {
      user: { companyId: "company-1" },
      params: { id: "form-1" },
    };
    const res = createResponseMock();

    await applicationFormController.deleteForm(req, res);

    expect(prisma.recruitmentFormResponse.findMany).toHaveBeenCalledWith({
      where: { formId: "form-1" },
      select: { id: true },
    });
    expect(prisma.applicant.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        formResponseId: { in: ["response-1", "response-2"] },
      },
    });
    expect(prisma.recruitmentForm.delete).toHaveBeenCalledWith({
      where: { id: "form-1" },
    });
    expect(res.payload).toEqual({
      success: true,
      message: "تم حذف الاستبيان بنجاح",
    });
  });
});
