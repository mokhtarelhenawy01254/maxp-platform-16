jest.mock("../../utils/dateUtils", () => ({
  normalizeDateForDb: jest.fn((value) => {
    const date = new Date(value);
    return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
  }),
}));

const {
  getEffectiveShiftAssignmentForDate,
  getEffectiveShiftForDate,
} = require("../../services/hr/shiftAssignmentResolver");

describe("shiftAssignmentResolver", () => {
  test("returns the same-day assignment when it exists", async () => {
    const prisma = {
      shiftAssignment: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: "assignment-today",
            date: new Date("2026-04-07T00:00:00.000Z"),
            shift: {
              id: "shift-1",
              startTime: "10:00",
              endTime: "18:00",
            },
          }),
      },
    };

    const assignment = await getEffectiveShiftAssignmentForDate(
      prisma,
      "company-1",
      "user-1",
      new Date("2026-04-07T11:26:00.000Z"),
      "Africa/Cairo"
    );

    expect(prisma.shiftAssignment.findFirst).toHaveBeenCalledTimes(1);
    expect(assignment?.id).toBe("assignment-today");
    expect(assignment?.shift?.startTime).toBe("10:00");
  });

  test("falls back to the latest previous assignment when today has no explicit assignment", async () => {
    const prisma = {
      shiftAssignment: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "assignment-yesterday",
            date: new Date("2026-04-06T00:00:00.000Z"),
            shift: {
              id: "shift-1",
              startTime: "10:00",
              endTime: "18:00",
            },
          }),
      },
    };

    const shift = await getEffectiveShiftForDate(
      prisma,
      "company-1",
      "user-1",
      new Date("2026-04-07T11:26:00.000Z"),
      "Africa/Cairo"
    );

    expect(prisma.shiftAssignment.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.shiftAssignment.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          userId: "user-1",
          date: new Date("2026-04-07T00:00:00.000Z"),
        }),
      })
    );
    expect(prisma.shiftAssignment.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          userId: "user-1",
          date: {
            lte: new Date("2026-04-07T00:00:00.000Z"),
          },
        }),
      })
    );
    expect(shift?.startTime).toBe("10:00");
  });
});
