let mockPrisma;

const mockNormalizeToDateOnlyUtc = (value) => {
  const date = new Date(value);
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/socketService", () => ({
  sendToUser: jest.fn(),
}));

jest.mock("../../services/hr/hrOwnerNotificationAgent", () => ({
  sendOwnerNotification: jest.fn().mockResolvedValue({ success: true }),
}));

const mockGetNowInTimezone = jest.fn();

jest.mock("../../utils/dateUtils", () => ({
  normalizeDateForDb: jest.fn((value) => mockNormalizeToDateOnlyUtc(value)),
  getNowInTimezone: (...args) => mockGetNowInTimezone(...args),
  combineDateAndTime: jest.fn((date, time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const combined = mockNormalizeToDateOnlyUtc(date);
    combined.setUTCHours(hours, minutes, 0, 0);
    return combined;
  }),
  getEndOfDayInTimezone: jest.fn((date) => {
    const end = mockNormalizeToDateOnlyUtc(date);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }),
}));

const socketService = require("../../services/socketService");
const hrOwnerNotificationAgent = require("../../services/hr/hrOwnerNotificationAgent");
const attendanceAutoCheckoutCron = require("../../cron/attendanceAutoCheckoutCron");

const createPrismaMock = () => ({
  attendance: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  attendanceAutoCloseAudit: {
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
  },
  hRSettings: {
    findUnique: jest.fn(),
  },
  shiftAssignment: {
    findFirst: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
});

const buildAttendance = (overrides = {}) => ({
  id: "attendance-1",
  companyId: "company-1",
  userId: "user-1",
  date: new Date("2026-04-06T00:00:00.000Z"),
  checkIn: new Date("2026-04-06T09:05:00.000Z"),
  checkOut: null,
  checkOutMethod: null,
  notes: null,
  company: {
    id: "company-1",
    timezone: "Africa/Cairo",
  },
  autoCloseAudit: null,
  ...overrides,
});

describe("attendanceAutoCheckoutCron", () => {
  let setImmediateSpy;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    setImmediateSpy = jest
      .spyOn(global, "setImmediate")
      .mockImplementation((fn, ...args) => fn(...args));

    mockPrisma.hRSettings.findUnique.mockResolvedValue({
      autoCheckoutEnabled: true,
      autoCheckoutPolicy: "SCHEDULED_END_AT_DAY_ROLLOVER",
      autoCheckoutReminderMinutes: 30,
      autoCheckoutNotificationsEnabled: true,
      workStartTime: "09:00",
      workEndTime: "17:00",
    });
    mockPrisma.shiftAssignment.findFirst.mockResolvedValue({
      shift: {
        startTime: "09:00",
        endTime: "17:00",
        breakDuration: 60,
      },
    });
    mockPrisma.notification.create.mockResolvedValue({ id: "notification-1" });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstName: "Ali",
    });
    mockPrisma.attendanceAutoCloseAudit.upsert.mockResolvedValue({
      id: "audit-1",
      reviewStatus: "PENDING",
      reminderSentAt: null,
      autoClosedAt: new Date("2026-04-07T00:02:00.000Z"),
    });
  });

  afterEach(() => {
    setImmediateSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test("auto-closes a forgotten checkout after day rollover and records audit data once", async () => {
    mockGetNowInTimezone.mockReturnValue(new Date("2026-04-07T00:02:00.000Z"));
    mockPrisma.attendance.findMany.mockResolvedValue([buildAttendance()]);
    mockPrisma.attendance.updateMany.mockResolvedValue({ count: 1 });

    await attendanceAutoCheckoutCron.closeOpenAttendances();

    expect(mockPrisma.attendance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "attendance-1", checkOut: null },
      }),
    );
    expect(mockPrisma.attendanceAutoCloseAudit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { attendanceId: "attendance-1" },
        update: expect.objectContaining({
          autoCloseReason: "DAY_ROLLOVER_FORGOTTEN_CHECKOUT",
        }),
      }),
    );
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "ATTENDANCE_AUTO_CLOSED",
          userId: "user-1",
        }),
      }),
    );
    expect(socketService.sendToUser).toHaveBeenCalled();
    expect(hrOwnerNotificationAgent.sendOwnerNotification).toHaveBeenCalled();
  });

  test("does not auto-close an overnight shift before its scheduled end", async () => {
    mockGetNowInTimezone.mockReturnValue(new Date("2026-04-07T03:00:00.000Z"));
    mockPrisma.attendance.findMany.mockResolvedValue([buildAttendance()]);
    mockPrisma.shiftAssignment.findFirst.mockResolvedValue({
      shift: {
        startTime: "22:00",
        endTime: "06:00",
        breakDuration: 30,
      },
    });

    await attendanceAutoCheckoutCron.closeOpenAttendances();

    expect(mockPrisma.attendance.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  test("sends a reminder shortly before scheduled checkout without closing the same-day record", async () => {
    mockGetNowInTimezone.mockReturnValue(new Date("2026-04-06T16:40:00.000Z"));
    mockPrisma.attendance.findMany.mockResolvedValue([buildAttendance()]);
    mockPrisma.attendanceAutoCloseAudit.upsert.mockResolvedValue({
      id: "audit-reminder-1",
      reviewStatus: "PENDING",
      reminderSentAt: new Date("2026-04-06T16:40:00.000Z"),
      autoClosedAt: null,
    });

    await attendanceAutoCheckoutCron.closeOpenAttendances();

    expect(mockPrisma.attendance.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.attendanceAutoCloseAudit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          reminderSentAt: new Date("2026-04-06T16:40:00.000Z"),
        }),
      }),
    );
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "ATTENDANCE_CHECKOUT_REMINDER",
        }),
      }),
    );
  });
});
