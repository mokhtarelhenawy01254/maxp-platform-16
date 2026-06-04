const express = require("express");
const request = require("supertest");

let mockCurrentUser = {
  id: "owner-user",
  companyId: "company-1",
  role: "OWNER",
};

const commissionService = require("../../services/commissionService");

const mockPrisma = {
  commission: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("../../utils/verifyToken", () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockCurrentUser;
    next();
  },
}));

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/commissionService", () => ({
  getCommissionStats: jest.fn(),
}));

const commissionRoutes = require("../../routes/commissionRoutes");

describe("commission routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: "owner-user",
      companyId: "company-1",
      role: "OWNER",
    };
    app = express();
    app.use(express.json());
    app.use("/commissions", commissionRoutes);
  });

  test("lists company commissions using the current company scope", async () => {
    commissionService.getCommissionStats.mockResolvedValue({
      commissions: [{ id: "commission-1", companyId: "company-1" }],
      stats: { total: 1, totalAmount: 50, byType: {}, byStatus: {} },
    });

    const response = await request(app).get("/commissions");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(commissionService.getCommissionStats).toHaveBeenCalledWith(
      "company-1",
      expect.any(Object),
    );
  });

  test("updates commission status only when the commission belongs to the current company", async () => {
    mockPrisma.commission.findFirst.mockResolvedValue({ id: "commission-1" });
    mockPrisma.commission.update.mockResolvedValue({
      id: "commission-1",
      status: "PAID",
    });

    const response = await request(app)
      .put("/commissions/commission-1/status")
      .send({ status: "PAID" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.commission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "commission-1",
          companyId: "company-1",
        },
      }),
    );
    expect(mockPrisma.commission.update).toHaveBeenCalledWith({
      where: { id: "commission-1" },
      data: {
        status: "PAID",
        paidAt: expect.any(Date),
      },
    });
  });

  test("rejects invalid commission status values", async () => {
    const response = await request(app)
      .put("/commissions/commission-1/status")
      .send({ status: "NOT_A_STATUS" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(mockPrisma.commission.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.commission.update).not.toHaveBeenCalled();
  });

  test("returns 404 when updating another company's commission", async () => {
    mockPrisma.commission.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .put("/commissions/commission-2/status")
      .send({ status: "PAID" });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(mockPrisma.commission.update).not.toHaveBeenCalled();
  });

  test("blocks affiliate users from commission management APIs", async () => {
    mockCurrentUser = {
      id: "affiliate-user",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    const scenarios = [
      { method: "get", path: "/commissions" },
      { method: "get", path: "/commissions/stats" },
      {
        method: "put",
        path: "/commissions/commission-1/status",
        payload: { status: "PAID" },
      },
    ];

    for (const scenario of scenarios) {
      let req = request(app)[scenario.method](scenario.path);
      if (scenario.payload) {
        req = req.send(scenario.payload);
      }

      const response = await req;
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    }
  });
});
