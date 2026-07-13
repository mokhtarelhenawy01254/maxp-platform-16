const mockPrisma = {
  rewardRecord: {
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const rewardManagementService = require("../../services/hr/rewardManagementService");

describe("rewardManagementService.deleteRewardRecord", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rewardManagementService.prisma = null;
  });

  test("deletes an unlocked reward that is not in payroll", async () => {
    mockPrisma.rewardRecord.findFirst.mockResolvedValue({
      id: "reward-1",
      companyId: "company-1",
      status: "PENDING",
      isLocked: false,
      isIncludedInPayroll: false,
    });
    mockPrisma.rewardRecord.delete.mockResolvedValue({ id: "reward-1" });

    const result = await rewardManagementService.deleteRewardRecord(
      "company-1",
      "reward-1",
      "admin-1",
    );

    expect(mockPrisma.rewardRecord.findFirst).toHaveBeenCalledWith({
      where: {
        id: "reward-1",
        companyId: "company-1",
      },
    });
    expect(mockPrisma.rewardRecord.delete).toHaveBeenCalledWith({
      where: { id: "reward-1" },
    });
    expect(result).toEqual({
      success: true,
      message: "تم حذف المكافأة بنجاح",
    });
  });

  test("deletes applied rewards when they are not locked and not linked to payroll", async () => {
    mockPrisma.rewardRecord.findFirst.mockResolvedValue({
      id: "reward-1",
      companyId: "company-1",
      status: "GIVEN",
      isLocked: false,
      isIncludedInPayroll: false,
    });
    mockPrisma.rewardRecord.delete.mockResolvedValue({ id: "reward-1" });

    const result = await rewardManagementService.deleteRewardRecord(
      "company-1",
      "reward-1",
      "admin-1",
    );

    expect(mockPrisma.rewardRecord.delete).toHaveBeenCalledWith({
      where: { id: "reward-1" },
    });
    expect(result).toEqual({
      success: true,
      message: "تم حذف المكافأة بنجاح",
    });
  });

  test("deletes locked rewards (backward compatible)", async () => {
    mockPrisma.rewardRecord.findFirst.mockResolvedValue({
      id: "reward-1",
      companyId: "company-1",
      status: "APPROVED",
      isLocked: true,
      isIncludedInPayroll: false,
    });
    mockPrisma.rewardRecord.delete.mockResolvedValue({ id: "reward-1" });

    const result = await rewardManagementService.deleteRewardRecord(
      "company-1",
      "reward-1",
      "admin-1",
    );

    expect(mockPrisma.rewardRecord.delete).toHaveBeenCalledWith({
      where: { id: "reward-1" },
    });
    expect(result).toEqual({
      success: true,
      message: "تم حذف المكافأة بنجاح",
    });
  });

  test("deletes payroll-linked rewards (backward compatible)", async () => {
    mockPrisma.rewardRecord.findFirst.mockResolvedValue({
      id: "reward-1",
      companyId: "company-1",
      status: "GIVEN",
      isLocked: true,
      isIncludedInPayroll: true,
    });
    mockPrisma.rewardRecord.delete.mockResolvedValue({ id: "reward-1" });

    const result = await rewardManagementService.deleteRewardRecord(
      "company-1",
      "reward-1",
      "admin-1",
    );

    expect(mockPrisma.rewardRecord.delete).toHaveBeenCalledWith({
      where: { id: "reward-1" },
    });
    expect(result).toEqual({
      success: true,
      message: "تم حذف المكافأة بنجاح",
    });
  });
});
