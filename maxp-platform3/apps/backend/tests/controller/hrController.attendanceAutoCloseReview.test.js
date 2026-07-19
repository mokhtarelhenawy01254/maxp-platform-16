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
  }
});

jest.mock("../../services/hr/attendanceService", () => ({
  reviewAutoClosedAttendance: jest.fn(),
}));

const attendanceService = require("../../services/hr/attendanceService");
const hrController = require("../../controller/hrController");

describe("hrController reviewAutoClosedAttendance", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("returns the reviewed auto-close audit payload", async () => {
    attendanceService.reviewAutoClosedAttendance.mockResolvedValue({
      id: "audit-1",
      reviewStatus: "REVIEWED",
      isAutoClosed: true,
    });

    const req = {
      user: {
        companyId: "company-1",
        id: "reviewer-1",
      },
      params: {
        id: "attendance-1",
      },
      body: {
        reviewStatus: "REVIEWED",
        reviewNotes: "تمت المراجعة",
      },
    };
    const res = createResponseMock();

    await hrController.reviewAutoClosedAttendance(req, res);

    expect(attendanceService.reviewAutoClosedAttendance).toHaveBeenCalledWith(
      "company-1",
      "attendance-1",
      "reviewer-1",
      req.body,
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      success: true,
      audit: {
        id: "audit-1",
        reviewStatus: "REVIEWED",
        isAutoClosed: true,
      },
    });
  });

  test("uses the service status code when review fails", async () => {
    const error = new Error("not found");
    error.statusCode = 404;
    attendanceService.reviewAutoClosedAttendance.mockRejectedValue(error);

    const req = {
      user: {
        companyId: "company-1",
        id: "reviewer-1",
      },
      params: {
        id: "attendance-404",
      },
      body: {},
    };
    const res = createResponseMock();

    await hrController.reviewAutoClosedAttendance(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ error: "not found" });
  });
});
