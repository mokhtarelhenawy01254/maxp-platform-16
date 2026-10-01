/**
 * ⏰ Attendance Service
 * خدمة إدارة الحضور والانصراف
 */

const {
  getSharedPrismaClient,
  executeWithRetry,
} = require("../sharedDatabase");
const { validateAttendanceData } = require("../../utils/hrValidation");
const {
  DuplicateAttendanceError,
  AttendanceError,
  NotFoundError,
} = require("../../utils/hrErrors");
const { v4: uuidv4 } = require("uuid");
const {
  isWithinGeofence,
  formatGeofenceError,
} = require("../../utils/geoUtils");
const {
  getNowInEgypt,
  getStartOfDayInEgypt,
  getEndOfDayInEgypt,
  getNowInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  getDateStringInTimezone,
  toStartOfDay,
  toEndOfDay,
  combineDateAndTime,
  normalizeDateForDb,
  getDateRange,
} = require("../../utils/dateUtils");
const {
  getEffectiveShiftAssignmentForDate,
  getEffectiveShiftForDate,
} = require("./shiftAssignmentResolver");
// تفعيل بعد تحويل autoDeductionService لاستخدام Prisma
const autoDeductionService = require("./autoDeductionService");
const whatsAppNotificationService = require("../whatsapp/WhatsAppNotificationService");
const socketService = require("../socketService");
const hrNotificationService = require("./hrNotificationService");
const businessGoalService = require("../businessGoalService");

const AUTO_CLOSE_REVIEW_STATUSES = [
  "PENDING",
  "REVIEWED",
  "ADJUSTED",
  "DISMISSED",
];

function parseDbDateInput(value, timezone = "Africa/Cairo") {
  if (!value) return null;

  if (value instanceof Date) {
    return normalizeDateForDb(value, timezone);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return normalizeDateForDb(new Date(value), timezone);
}

class AttendanceService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  async getActiveCompanyUserIds(companyId) {
    if (!companyId) return [];

    const userCompanyRows = await this.prisma.userCompany.findMany({
      where: {
        companyId: String(companyId),
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    return userCompanyRows.map((r) => r.userId);
  }

  /**
   * الحصول على المنطقة الزمنية للشركة
   */
  async getCompanyTimezone(companyId) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { timezone: true },
      });
      return company?.timezone || "Africa/Cairo";
    } catch (error) {
      console.error("❌ Error fetching company timezone:", error);
      return "Africa/Cairo";
    }
  }

  /**
   * جلب تعيين المناوبة الساري للموظف لتاريخ معين
   * إذا لم يوجد تعيين لنفس اليوم، نستخدم آخر تعيين سابق له.
   */
  async getEmployeeShiftAssignmentForDate(
    companyId,
    employeeId,
    date,
    timezone = null,
  ) {
    try {
      const targetTimezone =
        timezone || (await this.getCompanyTimezone(companyId));
      return await getEffectiveShiftAssignmentForDate(
        this.prisma,
        companyId,
        employeeId,
        date,
        targetTimezone,
      );
    } catch (error) {
      console.error("❌ Error getting employee shift assignment:", error);
      return null;
    }
  }

  /**
   * جلب مناوبة الموظف السارية لتاريخ معين
   * إذا لم يوجد تعيين لنفس اليوم، نستخدم آخر تعيين سابق له.
   */
  async getEmployeeShiftForDate(companyId, employeeId, date, timezone = null) {
    try {
      const targetTimezone =
        timezone || (await this.getCompanyTimezone(companyId));
      return await getEffectiveShiftForDate(
        this.prisma,
        companyId,
        employeeId,
        date,
        targetTimezone,
      );
    } catch (error) {
      console.error("❌ Error getting employee shift:", error);
      return null;
    }
  }

  formatAutoCloseAudit(audit) {
    if (!audit) {
      return null;
    }

    return {
      ...audit,
      isAutoClosed: Boolean(audit.autoClosedAt),
    };
  }

  isMissingAutoCloseAuditTable(error) {
    return (
      error?.code === "P2021" &&
      (error?.meta?.modelName === "AttendanceAutoCloseAudit" ||
        error?.meta?.table === "public.hr_attendance_auto_close_audits")
    );
  }

  getDefaultAutoCloseSummary() {
    return {
      total: 0,
      pending: 0,
      reviewed: 0,
      adjusted: 0,
      dismissed: 0,
    };
  }

  async createInAppNotification(
    companyId,
    userId,
    title,
    message,
    type,
    data = {},
  ) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          companyId,
          userId,
          title,
          message,
          type,
          data,
        },
      });

      socketService.sendToUser(userId, "notification:new", notification);
      return notification;
    } catch (error) {
      console.error("❌ Error creating in-app notification:", error);
      return null;
    }
  }

  buildAutoCloseAuditWhere(
    companyId,
    options = {},
    validUserIds = null,
    timezone = "Africa/Cairo",
  ) {
    const where = {
      companyId,
      autoClosedAt: { not: null },
    };

    if (options.employeeId) {
      if (
        Array.isArray(validUserIds) &&
        validUserIds.length > 0 &&
        !validUserIds.includes(options.employeeId)
      ) {
        where.userId = { in: [] };
      } else {
        where.userId = options.employeeId;
      }
    } else if (Array.isArray(validUserIds)) {
      where.userId = { in: validUserIds };
    }

    if (options.startDate || options.endDate) {
      where.attendanceDate = {};

      if (options.startDate) {
        where.attendanceDate.gte = parseDbDateInput(
          options.startDate,
          timezone,
        );
      }

      if (options.endDate) {
        where.attendanceDate.lte = parseDbDateInput(options.endDate, timezone);
      }
    }

    return where;
  }

  async getAutoCloseSummary(
    companyId,
    options = {},
    validUserIds = null,
    timezone = "Africa/Cairo",
  ) {
    try {
      const baseWhere = this.buildAutoCloseAuditWhere(
        companyId,
        options,
        validUserIds,
        timezone,
      );

      const [total, pending, reviewed, adjusted, dismissed] = await Promise.all(
        [
          this.prisma.attendanceAutoCloseAudit.count({ where: baseWhere }),
          this.prisma.attendanceAutoCloseAudit.count({
            where: {
              ...baseWhere,
              reviewStatus: "PENDING",
            },
          }),
          this.prisma.attendanceAutoCloseAudit.count({
            where: {
              ...baseWhere,
              reviewStatus: "REVIEWED",
            },
          }),
          this.prisma.attendanceAutoCloseAudit.count({
            where: {
              ...baseWhere,
              reviewStatus: "ADJUSTED",
            },
          }),
          this.prisma.attendanceAutoCloseAudit.count({
            where: {
              ...baseWhere,
              reviewStatus: "DISMISSED",
            },
          }),
        ],
      );

      return {
        total,
        pending,
        reviewed,
        adjusted,
        dismissed,
      };
    } catch (error) {
      if (this.isMissingAutoCloseAuditTable(error)) {
        return this.getDefaultAutoCloseSummary();
      }

      throw error;
    }
  }

  /**
   * تسجيل حضور
   */
  async checkIn(companyId, employeeId, data = {}) {
    // 1. Fetch Company Timezone
    const timezone = await this.getCompanyTimezone(companyId);

    // 2. Get "Today" and "Now" in that timezone
    // ✅ FIX: Use normalizeDateForDb for the @db.Date column (always YYYY-MM-DDT00:00:00Z)
    // This ensures PostgreSQL DATE truncation lands on the correct calendar day.
    // getStartOfDayInTimezone returns timezone-offset UTC (e.g. T22:00Z) which PostgreSQL
    // truncates to the WRONG day for UTC+ timezones.
    const todayForDb = normalizeDateForDb(new Date(), timezone);
    const todayForCalc = getStartOfDayInTimezone(new Date(), timezone); // for time math only
    const now = getNowInTimezone(timezone);

    try {
      // Normalize location data to JSON string for database storage
      const normalizedLocation =
        data.location && typeof data.location === "object"
          ? JSON.stringify(data.location)
          : data.location;

      // جلب إعدادات HR للتحقق من إعدادات Geofencing
      const hrSettings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
        select: {
          geofenceEnabled: true,
          officeLatitude: true,
          officeLongitude: true,
          geofenceRadius: true,
          lateGracePeriod: true,
        },
      });

      // تجهيز بيانات الموقع للتخزين
      // Already normalized above

      // التحقق من النطاق الجغرافي إذا كان مفعلاً (يُستثنى العمل من المنزل والتسجيل اليدوي من الإدارة)
      if (hrSettings && hrSettings.geofenceEnabled && data.workMode !== "HOME" && data.method !== "manual") {
        if (!data.location) {
          const error = new AttendanceError(
            "يجب السماح بالوصول للموقع لتسجيل الحضور من المكتب",
          );
          error.statusCode = 403;
          error.geofenceData = { requiresLocation: true };
          throw error;
        }

        let userLocation;
        try {
          userLocation =
            typeof data.location === "string"
              ? JSON.parse(data.location)
              : data.location;
        } catch (e) {
          throw new AttendanceError("بيانات الموقع غير صحيحة");
        }

        if (!hrSettings.officeLatitude || !hrSettings.officeLongitude) {
          throw new AttendanceError(
            "لم يتم تحديد موقع المكتب. يرجى التواصل مع الإدارة.",
          );
        }

        const geofenceCheck = isWithinGeofence(
          userLocation.latitude,
          userLocation.longitude,
          Number(hrSettings.officeLatitude),
          Number(hrSettings.officeLongitude),
          hrSettings.geofenceRadius || 200,
          userLocation.accuracy,
        );

        if (!geofenceCheck.isWithin) {
          const error = new AttendanceError(
            formatGeofenceError(
              geofenceCheck.effectiveDistance,
              geofenceCheck.allowedRadius,
              geofenceCheck.accuracy,
            ),
          );
          error.statusCode = 403;
          error.geofenceData = {
            distance: geofenceCheck.effectiveDistance,
            allowedRadius: geofenceCheck.allowedRadius,
            isWithin: false,
          };
          throw error;
        }
      }

      // التحقق من عدم وجود تسجيل حضور لنفس اليوم
      const existing = await this.prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: employeeId,
            date: todayForDb,
          },
        },
      });

      if (existing && existing.checkIn) {
        // If we want to allow re-checkin? Current logic throws error.
        throw new DuplicateAttendanceError(
          todayForDb.toISOString().split("T")[0],
        );
      }

      // جلب مناوبة الموظف لهذا اليوم
      const shift = await this.getEmployeeShiftForDate(
        companyId,
        employeeId,
        todayForDb,
        timezone,
      );

      // جلب إعدادات HR
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
      });

      // استخدام وقت المناوبة أو وقت افتراضي
      const workStartTime =
        shift?.startTime || settings?.workStartTime || "09:00";

      // Calculate Work Start Time relative to THIS DAY in COMPANY TIMEZONE
      // Use todayForCalc (actual midnight UTC for timezone) for time arithmetic
      const workStart = combineDateAndTime(
        todayForCalc,
        workStartTime,
        timezone,
      );

      // حساب دقائق التأخير
      let lateMinutes = 0;
      const gracePeriod = settings?.lateGracePeriod || settings?.lateThresholdMinutes || 15;
      const graceTime = new Date(workStart.getTime() + gracePeriod * 60000);

      if (now > graceTime) {
        lateMinutes = Math.floor((now - workStart) / 60000);
      }

      const attendance = existing
        ? await this.prisma.attendance.update({
            where: { id: existing.id },
            data: {
              checkIn: now,
              checkInLocation: normalizedLocation,
              checkInMethod: data.method || "manual",
              workMode: data.workMode || "OFFICE",
              lateMinutes,
              status: lateMinutes > 0 ? "LATE" : "PRESENT",
            },
          })
        : await this.prisma.attendance.create({
            data: {
              id: uuidv4(),
              companyId,
              userId: employeeId,
              date: todayForDb, // ✅ FIX: Use normalized date for @db.Date column
              checkIn: now,
              checkInLocation: normalizedLocation,
              checkInMethod: data.method || "manual",
              workMode: data.workMode || "OFFICE",
              lateMinutes,
              status: lateMinutes > 0 ? "LATE" : "PRESENT",
            },
          });

      // معالجة الخصم التلقائي للتأخير
      // TODO: تفعيل بعد تحويل autoDeductionService لاستخدام Prisma
      if (lateMinutes > 0) {
        try {
          const deductionResult =
            await autoDeductionService.processLateAttendance(
              companyId,
              employeeId,
              attendance.id,
              now,
              workStart,
            );

          console.log(
            "✅ [Attendance] Auto deduction processed:",
            deductionResult,
          );

          // إضافة معلومات الخصم لنتيجة الحضور
          attendance.autoDeduction = deductionResult;
        } catch (deductionError) {
          console.error(
            "❌ [Attendance] Error processing auto deduction:",
            deductionError,
          );
          // لا نوقف عملية تسجيل الحضور إذا فشل الخصم التلقائي
        }
      }

      // جلب بيانات الموظف (لإرسال إشعار الواتساب)
      const employee = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: { id: true, firstName: true, phone: true },
      });

      // إرسال إشعار الواتساب
      if (employee && employee.phone) {
        try {
          const totalDeduction =
            attendance.autoDeduction?.calculation?.totalDeduction || 0;

          // إرسال إشعار التأخير المناسب
          if (attendance.status === "LATE" && totalDeduction > 0) {
            await whatsAppNotificationService.sendAttendanceLateWithDeductionNotification(
              attendance,
              employee,
              companyId,
              totalDeduction,
            );
          } else if (attendance.status === "LATE") {
            // إشعار تأخير بدون خصم (أو استخدام رصيد المرونة) - سيظهر الخصم 0.00
            await whatsAppNotificationService.sendAttendanceLateNotification(
              attendance,
              employee,
              companyId,
              totalDeduction,
            );
          } else {
            // إشعار حضور عادي
            await whatsAppNotificationService.sendAttendanceConfirmedNotification(
              attendance,
              employee,
              companyId,
            );
          }
        } catch (waError) {
          console.error(
            "❌ [Attendance] Error sending WhatsApp check-in notification:",
            waError,
          );
        }
      }

      // Send WhatsApp notification to owner
      setImmediate(async () => {
        try {
          const employeeName = employee
            ? `${employee.firstName || ""}`
            : "موظف";
          const isLate = lateMinutes > 0;
          if (isLate) {
            await hrNotificationService.notifyHrEvent({
              companyId,
              notificationKey: "notifyOnAttendanceIssue",
              employeeUserId: employeeId,
              includeManagers: true,
              title: "مشكلة حضور جديدة",
              message: `سجّل ${employeeName} حضورًا متأخرًا اليوم بمقدار ${lateMinutes} دقيقة.`,
              type: "HR_ATTENDANCE_ISSUE",
              data: {
                attendanceId: attendance.id,
                employeeId,
                issue: "LATE_CHECK_IN",
                lateMinutes,
                attendanceDate: todayForDb.toISOString(),
                checkInAt: now.toISOString(),
              },
              whatsApp: {
                employeeName,
                actionId: "ATTENDANCE",
                actionName: "مشكلة حضور",
                details: `الحدث: تسجيل حضور متأخر\nوقت الحضور: ${now.toLocaleTimeString("ar-EG")}\nالتأخير: ${lateMinutes} دقيقة${attendance.autoDeduction?.calculation?.totalDeduction ? `\nخصم: ${attendance.autoDeduction.calculation.totalDeduction} EGP` : ""}`,
                requiresApproval: false,
              },
            });
          }
        } catch (waOwnerError) {
          console.error("❌ [Attendance-Owner-Notify] Error:", waOwnerError);
        }
      });

      try {
        await businessGoalService.ensureTodayDailyGoalsForUser(
          companyId,
          employeeId,
          attendance.id,
          todayForDb,
        );
      } catch (goalError) {
        console.error(
          "❌ [Attendance] Error ensuring daily goals after check-in:",
          goalError,
        );
      }

      return attendance;
    } catch (error) {
      // Handle Unique Constraint Violation
      if (
        error.code === "P2002" ||
        error.message.includes("Unique constraint")
      ) {
        throw new DuplicateAttendanceError(
          todayForDb.toISOString().split("T")[0],
        );
      }
      console.error("❌ Error checking in:", error);
      throw error;
    }
  }

  /**
   * تسجيل انصراف
   */
  async checkOut(companyId, employeeId, data = {}) {
    // 1. Fetch Company Timezone
    const timezone = await this.getCompanyTimezone(companyId);

    // 2. Get "Today" and "Now" in that timezone
    // ✅ FIX: Use normalizeDateForDb for @db.Date lookups
    const today = normalizeDateForDb(new Date(), timezone);
    const now = getNowInTimezone(timezone);

    try {
      // Normalize location data to JSON string for database storage
      const normalizedLocation =
        data.location && typeof data.location === "object"
          ? JSON.stringify(data.location)
          : data.location;

      // جلب إعدادات HR للتحقق من إعدادات Geofencing
      const hrSettings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
        select: {
          geofenceEnabled: true,
          officeLatitude: true,
          officeLongitude: true,
          geofenceRadius: true,
          earlyLeaveGracePeriod: true,
        },
      });

      // تجهيز بيانات الموقع للتخزين
      // Already normalized above

      // التحقق من النطاق الجغرافي إذا كان مفعلاً (يُستثنى العمل من المنزل والتسجيل اليدوي من الإدارة)
      if (hrSettings && hrSettings.geofenceEnabled && data.workMode !== "HOME" && data.method !== "manual") {
        if (!data.location) {
          const error = new AttendanceError(
            "يجب السماح بالوصول للموقع لتسجيل الانصراف من المكتب",
          );
          error.statusCode = 403;
          error.geofenceData = { requiresLocation: true };
          throw error;
        }

        let userLocation;
        try {
          userLocation =
            typeof data.location === "string"
              ? JSON.parse(data.location)
              : data.location;
        } catch (e) {
          throw new AttendanceError("بيانات الموقع غير صحيحة");
        }

        if (!hrSettings.officeLatitude || !hrSettings.officeLongitude) {
          throw new AttendanceError(
            "لم يتم تحديد موقع المكتب. يرجى التواصل مع الإدارة.",
          );
        }

        const geofenceCheck = isWithinGeofence(
          userLocation.latitude,
          userLocation.longitude,
          Number(hrSettings.officeLatitude),
          Number(hrSettings.officeLongitude),
          hrSettings.geofenceRadius || 200,
          userLocation.accuracy,
        );

        if (!geofenceCheck.isWithin) {
          const error = new AttendanceError(
            formatGeofenceError(
              geofenceCheck.effectiveDistance,
              geofenceCheck.allowedRadius,
              geofenceCheck.accuracy,
            ),
          );
          error.statusCode = 403;
          error.geofenceData = {
            distance: geofenceCheck.effectiveDistance,
            allowedRadius: geofenceCheck.allowedRadius,
            isWithin: false,
          };
          throw error;
        }
      }

      console.log(
        `⏰ [CHECKOUT] Starting resilient check-out look-up for employee: ${employeeId}`,
      );

      // ✅ FIX: البحث عن آخر بصمة حضور "مفتوحة" (بدون انصراف) للموظف
      // لا نعتمد على التاريخ بدقة لتجنب مشاكل فروق التوقيت (البحث عن سجل حيث checkOut هو null)

      let attendance = await this.prisma.attendance.findFirst({
        where: {
          companyId,
          userId: employeeId,
          checkOut: null,
        },
        orderBy: { date: "desc" },
      });

      // إذا لم نجد سجل مفتوح، نحاول البحث عن أي سجل في نطاق الـ 48 ساعة الأخيرة
      if (!attendance) {
        const startOfSearch = new Date(today);
        startOfSearch.setDate(startOfSearch.getDate() - 1);
        const endOfSearch = new Date(today);
        endOfSearch.setDate(endOfSearch.getDate() + 1);

        attendance = await this.prisma.attendance.findFirst({
          where: {
            companyId,
            userId: employeeId,
            date: {
              gte: startOfSearch,
              lte: endOfSearch,
            },
          },
          orderBy: { date: "desc" },
        });
      }

      if (!attendance) {
        console.error(
          `❌ [CHECKOUT] No attendance record found for user ${employeeId} in any recent range`,
        );
        throw new Error("لم يتم تسجيل الحضور لهذا اليوم أو لا يوجد سجل مفتوح");
      }

      if (attendance.checkOut) {
        throw new Error("تم تسجيل الانصراف مسبقاً لهذا السجل");
      }

      // حماية البصمة المزدوجة (Double-Punch Bounce Guard)
      // إذا تمت محاولة تسجيل الانصراف خلال أقل من 5 دقائق من تسجيل الدخول
      if (attendance.checkIn) {
        const checkInDate = new Date(attendance.checkIn);
        const elapsedMs = now.getTime() - checkInDate.getTime();
        const elapsedMinutes = elapsedMs / 60000;
        if (elapsedMinutes < 5) {
          console.warn(
            `⚠️ [CHECKOUT] Ignored checkout attempt within ${Math.round(elapsedMs / 1000)}s of check-in (double-punch debounce protection for user ${employeeId})`,
          );
          return {
            ...attendance,
            debounced: true,
            message: "تم تجاهل بصمة الانصراف لأنها تمت خلال أقل من 5 دقائق من بصمة الحضور (حماية البصمة المزدوجة)",
          };
        }
      }

      // جلب مناوبة الموظف لتاريخ السجل
      const attendanceDayForCalc = getStartOfDayInTimezone(
        new Date(attendance.date),
        timezone,
      );
      const attendanceDayForDb = normalizeDateForDb(
        new Date(attendance.date),
        timezone,
      );
      const shift = await this.getEmployeeShiftForDate(
        companyId,
        employeeId,
        attendanceDayForDb,
        timezone,
      );

      // جلب إعدادات HR
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
      });

      // استخدام وقت المناوبة أو وقت افتراضي
      const workEndTime = shift?.endTime || settings?.workEndTime || "17:00";
      const [startHour, startMinute] = (shift?.startTime || "09:00")
        .split(":")
        .map(Number);
      const [endHour, endMinute] = workEndTime.split(":").map(Number);

      // Calculate Work End Time using the same timezone-aware wall clock logic as check-in.
      const workEnd = combineDateAndTime(
        attendanceDayForCalc,
        workEndTime,
        timezone,
      );
      if (!workEnd) {
        throw new Error("تعذر حساب وقت نهاية المناوبة");
      }

      // Handle overnight shifts (e.g., 22:00 - 06:00)
      if (
        shift &&
        (endHour < startHour ||
          (endHour === startHour && endMinute < startMinute))
      ) {
        workEnd.setUTCDate(workEnd.getUTCDate() + 1);
      }

      console.log(
        `⏰ [CHECKOUT] Record Date: ${attendanceDayForCalc.toISOString()}, Work End: ${workEnd.toISOString()}, Now: ${now.toISOString()}`,
      );

      // حساب ساعات العمل الفعلية
      const checkInDate = new Date(attendance.checkIn);
      const actualWorkMinutes = Math.max(0, (now - checkInDate) / 60000);

      // حساب دقائق الخروج المبكر
      let earlyLeaveMinutes = 0;
      if (actualWorkMinutes >= 5 && now < workEnd) {
        earlyLeaveMinutes = Math.floor((workEnd - now) / 60000);
      }
      console.log(
        `📏 [CHECKOUT] Early Leave Minutes calculated: ${earlyLeaveMinutes} (Now: ${now.toISOString()}, WorkEnd: ${workEnd.toISOString()})`,
      );

      // حساب ساعات العمل الفعلية
      // في مصر وساعات العمل القياسية (10:00-18:00 = 8ساعات)، الراحة وساعة الغداء ضمن ساعات العمل ولا تُخصم من الراتب
      // لا يتم خصم الراحة إلا إذا كان الشيفت يحدد صراحةً راحة غير مدفوعة (unpaidBreak === true)
      const breakDuration = (shift?.unpaidBreak === true) ? (shift?.breakDuration || 0) : 0;
      const workHours = Math.max(0, (actualWorkMinutes - breakDuration) / 60);

      // حساب ساعات إضافية
      let overtimeHours = 0;
      const minOvertimeHours = parseFloat(settings?.overtimeMinHours) || 1;
      if (now > workEnd) {
        const overtime = (now - workEnd) / 3600000;
        if (overtime >= minOvertimeHours) {
          overtimeHours = overtime;
        }
      }

      const updated = await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOut: now,
          checkOutLocation: normalizedLocation,
          checkOutMethod: data.method || "manual",
          workMode: data.workMode || attendance.workMode || "OFFICE",
          earlyLeaveMinutes,
          workHours: Math.max(0, Math.round(workHours * 100) / 100),
          overtimeHours: Math.round(overtimeHours * 100) / 100,
        },
      });

      // ⏱️ الربط الحتمي: إيقاف جميع مؤقتات المهام النشطة للموظف فور تسجيل بصمة الانصراف
      try {
        const taskTimerService = require("../taskTimerService");
        await taskTimerService.stopUserActiveTimers({
          companyId,
          userId: employeeId,
          endTime: now,
          reason: `ATTENDANCE_CHECKOUT_${String(data.method || 'manual').toUpperCase()}`,
        });
      } catch (timerStopErr) {
        console.warn("[Attendance] Cascade stop task timers warning:", timerStopErr?.message);
      }

      // معالجة الخصم التلقائي للانصراف المبكر
      if (earlyLeaveMinutes > 0 && actualWorkMinutes >= 5) {
        try {
          const deductionResult =
            await autoDeductionService.processEarlyCheckout(
              companyId,
              employeeId,
              updated.id,
              now,
              workEnd,
              earlyLeaveMinutes,
            );

          console.log(
            "✅ [Attendance] Auto deduction for early checkout processed:",
            deductionResult,
          );

          // إضافة معلومات الخصم لنتيجة الانصراف
          updated.autoDeduction = deductionResult;
        } catch (deductionError) {
          console.error(
            "❌ [Attendance] Error processing auto deduction for checkout:",
            deductionError,
          );
          // لا نوقف عملية تسجيل الانصراف إذا فشل الخصم التلقائي
        }
      }

      // جلب بيانات الموظف (لإرسال إشعار الواتساب)
      const employee = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: { id: true, firstName: true, phone: true },
      });

      // إرسال إشعار الواتساب
      if (employee && employee.phone) {
        try {
          const checkoutDeduction =
            updated.autoDeduction?.calculation?.totalDeduction || 0;
          console.log(
            `📱 [CHECKOUT] Sending WhatsApp. Deduction Amount: ${checkoutDeduction}, Work Hours: ${workHours}`,
          );
          await whatsAppNotificationService.sendCheckoutConfirmedNotification(
            updated,
            employee,
            companyId,
            workHours,
            checkoutDeduction,
          );
        } catch (waError) {
          console.error(
            "❌ [Attendance] Error sending WhatsApp check-out notification:",
            waError,
          );
        }
      }

      // Send WhatsApp notification to owner
      setImmediate(async () => {
        try {
          const employeeName = employee
            ? `${employee.firstName || ""}`
            : "موظف";
          const checkoutDeduction =
            updated.autoDeduction?.calculation?.totalDeduction || 0;
          if (earlyLeaveMinutes > 0) {
            await hrNotificationService.notifyHrEvent({
              companyId,
              notificationKey: "notifyOnAttendanceIssue",
              employeeUserId: employeeId,
              includeManagers: true,
              title: "مشكلة حضور جديدة",
              message: `سجّل ${employeeName} انصرافًا مبكرًا اليوم بمقدار ${earlyLeaveMinutes} دقيقة.`,
              type: "HR_ATTENDANCE_ISSUE",
              data: {
                attendanceId: updated.id,
                employeeId,
                issue: "EARLY_CHECK_OUT",
                earlyLeaveMinutes,
                attendanceDate: attendanceDayForDb.toISOString(),
                checkOutAt: now.toISOString(),
              },
              whatsApp: {
                employeeName,
                actionId: "ATTENDANCE",
                actionName: "مشكلة حضور",
                details: `الحدث: انصراف مبكر\nالوقت: ${now.toLocaleTimeString("ar-EG")}\nالانصراف المبكر: ${earlyLeaveMinutes} دقيقة\nساعات العمل: ${workHours.toFixed(2)} ساعة${overtimeHours > 0 ? `\nساعات إضافية: ${overtimeHours.toFixed(2)} ساعة` : ""}${checkoutDeduction > 0 ? `\nخصم: ${checkoutDeduction} EGP` : ""}`,
                requiresApproval: false,
              },
            });
          }
        } catch (waOwnerError) {
          console.error("❌ [Attendance-Owner-Notify] Error:", waOwnerError);
        }
      });

      return updated;
    } catch (error) {
      console.error("❌ Error checking out:", error);
      throw error;
    }
  }

  /**
   * جلب سجل الحضور
   */
  async getAttendance(companyId, options = {}) {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        status,
        autoClosedOnly,
        autoCloseReviewStatus,
        page = 1,
        limit = 50,
      } = options;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const where = {};

      // 🛡️ [SAAS] Strict multi-tenancy enforcement
      if (!companyId) {
        console.error(
          "❌ [AttendanceService] getAttendance called without companyId!",
        );
        throw new Error("يجب تحديد معرف الشركة لجلب البيانات");
      }

      where.companyId = companyId;

      if (employeeId) where.userId = employeeId;
      if (status) where.status = status;

      const timezone = await this.getCompanyTimezone(companyId);
      const normalizedAutoCloseReviewStatus =
        AUTO_CLOSE_REVIEW_STATUSES.includes(autoCloseReviewStatus)
          ? autoCloseReviewStatus
          : null;
      const autoClosedFilterEnabled =
        autoClosedOnly === true || autoClosedOnly === "true";

      if (startDate || endDate) {
        if (startDate === endDate) {
          where.date = normalizeDateForDb(new Date(startDate), timezone);
        } else {
          where.date = {};
          if (startDate) {
            where.date.gte = normalizeDateForDb(new Date(startDate), timezone);
          }
          if (endDate) {
            where.date.lte = normalizeDateForDb(new Date(endDate), timezone);
          }
        }
      }

      if (autoClosedFilterEnabled || normalizedAutoCloseReviewStatus) {
        where.autoCloseAudit = {
          is: {
            autoClosedAt: { not: null },
            ...(normalizedAutoCloseReviewStatus
              ? { reviewStatus: normalizedAutoCloseReviewStatus }
              : {}),
          },
        };
      }

      // ✅ Filter out attendance records with invalid userId (orphaned records)
      // Use a subquery to only get attendance records where userId exists in users table
      let whereWithValidUser = { ...where };
      let validUserIds = [];

      // If we have companyId, filter by users in that company
      if (companyId) {
        validUserIds = await this.getActiveCompanyUserIds(companyId);

        if (validUserIds.length > 0) {
          // إذا كان هناك employeeId محدد، نتأكد أنه ضمن validUserIds
          if (employeeId) {
            // فقط نستخدم employeeId إذا كان موجود في validUserIds
            if (validUserIds.includes(employeeId)) {
              whereWithValidUser.userId = employeeId;
            } else {
              // employeeId غير صالح، نرجع نتيجة فارغة
              whereWithValidUser.userId = { in: [] };
            }
          } else {
            // لا يوجد employeeId محدد، نستخدم جميع validUserIds
            whereWithValidUser.userId = { in: validUserIds };
          }
        } else {
          // No valid users, return empty result
          whereWithValidUser.userId = { in: [] };
        }
      }

      const buildAttendanceInclude = (includeAutoCloseAudit = true) => ({
        ...(includeAutoCloseAudit ? { autoCloseAudit: true } : {}),
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            employeeNumber: true,
            departmentRelation: {
              select: { name: true },
            },
          },
        },
      });

      const fetchAttendancePage = async (
        attendanceWhere,
        includeAutoCloseAudit = true,
      ) =>
        executeWithRetry(async () => {
          return await Promise.all([
            this.prisma.attendance.findMany({
              where: attendanceWhere,
              include: buildAttendanceInclude(includeAutoCloseAudit),
              orderBy: { date: "desc" },
              skip: (pageNum - 1) * limitNum,
              take: limitNum,
            }),
            this.prisma.attendance.count({ where: attendanceWhere }),
          ]);
        });

      let records;
      let total;
      let autoCloseAuditTableAvailable = true;

      try {
        [records, total] = await fetchAttendancePage(whereWithValidUser, true);
      } catch (error) {
        if (!this.isMissingAutoCloseAuditTable(error)) {
          throw error;
        }

        autoCloseAuditTableAvailable = false;

        if (autoClosedFilterEnabled || normalizedAutoCloseReviewStatus) {
          records = [];
          total = 0;
        } else {
          const whereWithoutAutoCloseAudit = { ...whereWithValidUser };
          delete whereWithoutAutoCloseAudit.autoCloseAudit;
          [records, total] = await fetchAttendancePage(
            whereWithoutAutoCloseAudit,
            false,
          );
        }
      }

      // Map to frontend format (record.employee instead of record.user)
      let mappedRecords = records.map((record) => {
        const { user, autoCloseAudit, ...rest } = record;
        return {
          ...rest,
          autoCloseAudit: autoCloseAuditTableAvailable
            ? this.formatAutoCloseAudit(autoCloseAudit)
            : null,
          isAutoClosed: autoCloseAuditTableAvailable
            ? Boolean(autoCloseAudit?.autoClosedAt)
            : false,
          employee: user
            ? {
                ...user,
                department: user.departmentRelation,
              }
            : null,
        };
      });

      const isSingleDay = startDate && endDate && startDate === endDate;
      // Change: Only inject missing users if the single day selected is TODAY, not any past date.
      const isTodayDate = startDate
        ? normalizeDateForDb(new Date(startDate), timezone).getTime() ===
          normalizeDateForDb(new Date(), timezone).getTime()
        : false;
      if (
        isSingleDay &&
        isTodayDate &&
        !employeeId &&
        (!status || status === "ABSENT") &&
        !autoClosedFilterEnabled &&
        !normalizedAutoCloseReviewStatus &&
        pageNum === 1 &&
        companyId
      ) {
        const activeUserIds =
          validUserIds.length > 0
            ? validUserIds
            : await this.getActiveCompanyUserIds(companyId);

        const allUsers = await executeWithRetry(async () => {
          return await this.prisma.user.findMany({
            where: {
              id: { in: activeUserIds },
              isActive: true,
              employeeNumber: { not: null },
            },
            include: {
              departmentRelation: { select: { name: true } },
            },
          });
        });

        // دمج الموظفين اللي مسجلوش حضور
        const hasAttendanceIds = new Set(mappedRecords.map((r) => r.userId));
        const missingUserRecords = allUsers
          .filter((u) => !hasAttendanceIds.has(u.id))
          .map((user) => ({
            id: `temp-${user.id}`,
            userId: user.id,
            companyId,
            date: new Date(startDate),
            status: "ABSENT",
            checkIn: null,
            checkOut: null,
            employee: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              employeeNumber: user.employeeNumber,
              department: user.departmentRelation,
            },
          }));

        mappedRecords = [...mappedRecords, ...missingUserRecords];
      }

      const autoCloseSummary = autoCloseAuditTableAvailable
        ? await this.getAutoCloseSummary(
            companyId,
            {
              employeeId,
              startDate,
              endDate,
            },
            validUserIds,
            timezone,
          )
        : this.getDefaultAutoCloseSummary();

      const calculatedTotal = Math.max(total, mappedRecords.length);

      return {
        records: mappedRecords,
        timezone,
        autoCloseSummary,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: calculatedTotal,
          totalPages: Math.ceil(calculatedTotal / limitNum),
        },
      };
    } catch (error) {
      console.error("❌ Error getting attendance:", error);
      throw error;
    }
  }

  async reviewAutoClosedAttendance(
    companyId,
    attendanceId,
    reviewerUserId,
    data = {},
  ) {
    try {
      const reviewStatus = AUTO_CLOSE_REVIEW_STATUSES.includes(
        data.reviewStatus,
      )
        ? data.reviewStatus
        : "REVIEWED";
      const reviewNotes = data.reviewNotes?.trim() || null;

      const existingAudit =
        await this.prisma.attendanceAutoCloseAudit.findFirst({
          where: {
            companyId,
            attendanceId,
            autoClosedAt: { not: null },
          },
          include: {
            attendance: true,
            employee: {
              select: {
                id: true,
                firstName: true,
              },
            },
          },
        });

      if (!existingAudit) {
        const error = new Error(
          "سجل الإغلاق التلقائي غير موجود أو لم يتم إغلاقه تلقائياً بعد",
        );
        error.statusCode = 404;
        throw error;
      }

      const updatedAudit = await this.prisma.attendanceAutoCloseAudit.update({
        where: {
          attendanceId,
        },
        data: {
          reviewStatus,
          reviewNotes,
          reviewedByUserId: reviewerUserId,
        },
        include: {
          attendance: true,
          employee: {
            select: {
              id: true,
              firstName: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      let reviewMessage = "تمت مراجعة سجل الانصراف المغلق تلقائياً من الإدارة.";
      if (reviewStatus === "ADJUSTED") {
        reviewMessage =
          "تمت مراجعة سجل الانصراف المغلق تلقائياً وتعديل السجل بواسطة الإدارة.";
      } else if (reviewStatus === "DISMISSED") {
        reviewMessage =
          "تمت مراجعة سجل الانصراف المغلق تلقائياً واعتماده كما هو من الإدارة.";
      }

      await this.createInAppNotification(
        companyId,
        existingAudit.userId,
        "مراجعة سجل حضور تلقائي",
        reviewMessage,
        "ATTENDANCE_AUTO_CLOSE_REVIEWED",
        {
          attendanceId,
          reviewStatus,
          reviewNotes,
        },
      );

      return this.formatAutoCloseAudit(updatedAudit);
    } catch (error) {
      console.error("❌ Error reviewing auto-closed attendance:", error);
      throw error;
    }
  }

  /**
   * جلب حضور اليوم
   */
  async getTodayAttendance(companyId) {
    try {
      // ✅ FIX: Use company timezone, not hardcoded Egypt
      const timezone = await this.getCompanyTimezone(companyId);
      // Use normalizeDateForDb for @db.Date column matching (YYYY-MM-DDT00:00:00Z)
      const today = normalizeDateForDb(new Date(), timezone);
      const startOfSearch = new Date(today);
      const endOfSearch = new Date(today);
      endOfSearch.setHours(23, 59, 59, 999);

      const activeUserIds = await this.getActiveCompanyUserIds(companyId);

      const [attendance, totalEmployees] = await executeWithRetry(async () => {
        return await Promise.all([
          this.prisma.attendance.findMany({
            where: {
              companyId,
              date: {
                gte: startOfSearch,
                lte: endOfSearch,
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  employeeNumber: true,
                  departmentRelation: {
                    select: { name: true },
                  },
                },
              },
            },
          }),
          this.prisma.user.count({
            where: {
              id: { in: activeUserIds },
              isActive: true,
              employeeNumber: { not: null },
            },
          }),
        ]);
      });

      // تجنب التكرار في الحساب إذا كان هناك سجلين لنفس الموظف في النطاق (نأخذ الأحدث)
      const uniqueAttendance = [];
      const userIdsSeen = new Set();
      attendance
        .sort(
          (a, b) =>
            new Date(b.checkIn || b.createdAt || b.date) -
            new Date(a.checkIn || a.createdAt || a.date),
        )
        .forEach((record) => {
          if (!userIdsSeen.has(record.userId)) {
            userIdsSeen.add(record.userId);
            uniqueAttendance.push(record);
          }
        });

      const present = uniqueAttendance.filter((a) => a.checkIn).length;
      const late = uniqueAttendance.filter((a) => a.status === "LATE").length;
      const absent = Math.max(0, totalEmployees - present);

      return {
        date: today,
        totalEmployees,
        present,
        late,
        absent,
        records: uniqueAttendance.map((record) => {
          const { user, ...rest } = record;
          return {
            ...rest,
            employee: user
              ? {
                  ...user,
                  department: user.departmentRelation,
                }
              : null,
          };
        }),
      };
    } catch (error) {
      console.error("❌ Error getting today attendance:", error);
      throw error;
    }
  }

  /**
   * تحديث سجل حضور يدوياً
   */
  async updateAttendance(companyId, attendanceId, data) {
    try {
      const existing = await this.prisma.attendance.findFirst({
        where: { id: attendanceId, companyId },
      });

      if (!existing) {
        throw new Error("السجل غير موجود");
      }

      // Build update data carefully to avoid spreading unwanted fields
      const updateData = {};
      if (data.employeeId) updateData.userId = data.employeeId;
      if (data.date) updateData.date = new Date(data.date + "T00:00:00.000Z");
      if (data.status) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes || null;
      if (data.workMode) updateData.workMode = data.workMode;

      if (data.lateMinutes !== undefined)
        updateData.lateMinutes = parseInt(data.lateMinutes);
      if (data.earlyLeaveMinutes !== undefined)
        updateData.earlyLeaveMinutes = parseInt(data.earlyLeaveMinutes);

      const timezone = await this.getCompanyTimezone(companyId);

      // Handle Date: Force it to be exactly 00:00:00 UTC for the @db.Date field
      if (data.date) {
        // data.date is expected to be "YYYY-MM-DD"
        updateData.date = new Date(data.date + "T00:00:00.000Z");
      }

      // Handle checkIn/checkOut: frontend sends time-only (e.g. "09:00"), combine with date
      const attendanceDate = updateData.date || existing.date;

      if (data.checkIn) {
        const checkInDate = combineDateAndTime(
          attendanceDate,
          data.checkIn,
          timezone,
        );
        if (checkInDate) {
          updateData.checkIn = checkInDate;
          updateData.checkInMethod = "manual";
        }
      }

      if (data.checkOut !== undefined) {
        if (!data.checkOut) {
          updateData.checkOut = null; // Clear checkout if empty string sent
        } else {
          const checkOutDate = combineDateAndTime(
            attendanceDate,
            data.checkOut,
            timezone,
          );
          if (checkOutDate) {
            updateData.checkOut = checkOutDate;
            updateData.checkOutMethod = "manual";
          }
        }
      }

      // Calculate work hours if both checkIn and checkOut are available
      const finalCheckIn = updateData.checkIn || existing.checkIn;
      const finalCheckOut =
        updateData.checkOut !== undefined
          ? updateData.checkOut
          : existing.checkOut;

      if (finalCheckIn && finalCheckOut) {
        const workMs = finalCheckOut.getTime() - finalCheckIn.getTime();
        if (workMs > 0) {
          updateData.workHours = parseFloat((workMs / 3600000).toFixed(2));
        } else {
          updateData.workHours = 0;
        }
      }

      const metrics = await this._calculateManualMetrics(
        companyId,
        data.employeeId || existing.userId,
        attendanceDate,
        finalCheckIn,
        finalCheckOut,
        timezone,
        data,
        true, // isUpdate
      );

      updateData.status = metrics.status;
      updateData.lateMinutes = metrics.lateMinutes;
      updateData.earlyLeaveMinutes = metrics.earlyLeaveMinutes;
      updateData.workHours = metrics.workHours;
      updateData.overtimeHours = metrics.overtimeHours;

      const updated = await this.prisma.attendance.update({
        where: { id: attendanceId },
        data: updateData,
      });

      // إلغاء الخصومات التلقائية المربوطة بالسجل في حالة تصفير التأخير أو الانصراف المبكر
      try {
        const autoDeductionService = require("./autoDeductionService");

        // 1. إذا تم تصفير التأخير أو أصبحت الحالة حاضراً بدون تأخير
        if (metrics.lateMinutes === 0 || metrics.status === "PRESENT") {
          const lateDeductions = await this.prisma.manualDeduction.findMany({
            where: {
              companyId,
              employeeId: existing.userId,
              notes: { contains: attendanceId },
              category: "AUTO_DEDUCTION",
              type: "LATE",
              status: { in: ["PENDING", "APPROVED"] },
            },
          });
          for (const d of lateDeductions) {
            console.log(`🔄 [AttendanceService] Cancelling late auto-deduction ${d.id} for attendance ${attendanceId}`);
            await autoDeductionService.cancelAutoDeduction(
              companyId,
              d.id,
              "ADMIN_MANUAL_EDIT",
              "تم تصفير دقائق التأخير من سجل الحضور",
            ).catch(e => console.warn(`Warn cancelling deduction ${d.id}:`, e.message));
          }
        }

        // 2. إذا تم تصفير الانصراف المبكر أو أصبحت الحالة حاضراً
        if (metrics.earlyLeaveMinutes === 0 || metrics.status === "PRESENT") {
          const earlyDeductions = await this.prisma.manualDeduction.findMany({
            where: {
              companyId,
              employeeId: existing.userId,
              notes: { contains: attendanceId },
              category: "AUTO_DEDUCTION",
              type: "EARLY_LEAVE",
              status: { in: ["PENDING", "APPROVED"] },
            },
          });
          for (const d of earlyDeductions) {
            console.log(`🔄 [AttendanceService] Cancelling early leave auto-deduction ${d.id} for attendance ${attendanceId}`);
            await autoDeductionService.cancelAutoDeduction(
              companyId,
              d.id,
              "ADMIN_MANUAL_EDIT",
              "تم تصفير دقائق الانصراف المبكر من سجل الحضور",
            ).catch(e => console.warn(`Warn cancelling early deduction ${d.id}:`, e.message));
          }
        }
      } catch (err) {
        console.error("⚠️ [AttendanceService] Error cancelling related auto-deductions:", err);
      }

      return updated;
    } catch (error) {
      console.error("❌ Error updating attendance:", error);
      throw error;
    }
  }

  /**
   * حذف سجل حضور
   */
  async deleteAttendance(companyId, attendanceId) {
    try {
      const where = { id: attendanceId };
      if (companyId) {
        where.companyId = companyId;
      }

      const existing = await this.prisma.attendance.findFirst({
        where,
      });

      if (!existing) {
        throw new Error("السجل غير موجود");
      }

      await this.prisma.attendance.delete({
        where: { id: attendanceId },
      });

      // إلغاء أي خصم تلقائي مربوط بالسجل المحذوف
      try {
        await this.prisma.manualDeduction.updateMany({
          where: {
            companyId: existing.companyId,
            notes: { contains: attendanceId },
            category: "AUTO_DEDUCTION",
            status: { in: ["PENDING", "APPROVED"] },
          },
          data: {
            status: "CANCELLED",
            notes: `Cancelled automatically: Attendance record ${attendanceId} was deleted`,
          },
        });
      } catch (e) {
        console.warn(`Warn cancelling deductions for deleted attendance ${attendanceId}:`, e.message);
      }

      return true;
    } catch (error) {
      console.error("❌ Error deleting attendance:", error);
      throw error;
    }
  }

  /**
   * إنشاء سجل حضور يدوي
   */
  async createManualAttendance(companyId, data) {
    try {
      console.log("📝 [SERVICE] createManualAttendance called");
      console.log("📝 [SERVICE] companyId:", companyId);
      console.log("📝 [SERVICE] data:", JSON.stringify(data, null, 2));

      // Validate employee belongs to company (avoid Prisma relation errors -> 500)
      const activeUserIds = await this.getActiveCompanyUserIds(companyId);
      if (!activeUserIds.includes(data.employeeId)) {
        const error = new Error("الموظف غير تابع لهذه الشركة أو غير نشط");
        error.statusCode = 400;
        throw error;
      }

      // Parse date - Ensure it's exactly 00:00:00 UTC for Postgres DATE column
      const timezone = await this.getCompanyTimezone(companyId);
      const attendanceDate = new Date(data.date + "T00:00:00.000Z");
      console.log(
        "📝 [SERVICE] attendanceDate (UTC normalized):",
        attendanceDate,
      );

      // Parse checkIn time (format: "HH:mm") - استخدام combineDateAndTime
      const checkInDateTime = combineDateAndTime(
        attendanceDate,
        data.checkIn,
        timezone,
      );
      console.log(
        "📝 [SERVICE] checkInDateTime (Normalized):",
        checkInDateTime,
      );

      // Parse checkOut time (format: "HH:mm") - استخدام combineDateAndTime
      const checkOutDateTime = combineDateAndTime(
        attendanceDate,
        data.checkOut,
        timezone,
      );
      console.log(
        "📝 [SERVICE] checkOutDateTime (Normalized):",
        checkOutDateTime,
      );

      // Validate checkOut is after checkIn
      if (
        checkInDateTime &&
        checkOutDateTime &&
        checkOutDateTime <= checkInDateTime
      ) {
        console.log("❌ [SERVICE] Validation failed: checkOut <= checkIn");
        throw new Error("وقت الانصراف يجب أن يكون بعد وقت الحضور");
      }

      // Check if attendance already exists for this employee and date
      const existing = await this.prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: data.employeeId,
            date: attendanceDate,
          },
        },
      });

      // Build metric data
      const metrics = await this._calculateManualMetrics(
        companyId,
        data.employeeId,
        attendanceDate,
        checkInDateTime,
        checkOutDateTime,
        timezone,
        data,
        false,
      );

      if (existing) {
        // تحديث السجل الموجود بدلاً من رفضه
        console.log(
          "📝 [SERVICE] Updating existing attendance record:",
          existing.id,
        );
        const attendance = await this.prisma.attendance.update({
          where: {
            id: existing.id,
          },
          data: {
            checkIn: checkInDateTime || existing.checkIn,
            checkOut: checkOutDateTime || existing.checkOut,
            status: metrics.status,
            notes: data.notes || existing.notes,
            workMode: data.workMode || existing.workMode,
            lateMinutes: metrics.lateMinutes,
            earlyLeaveMinutes: metrics.earlyLeaveMinutes,
            workHours: metrics.workHours || existing.workHours,
            overtimeHours: metrics.overtimeHours || existing.overtimeHours,
            checkInMethod: checkInDateTime ? "manual" : existing.checkInMethod,
            checkOutMethod: checkOutDateTime
              ? "manual"
              : existing.checkOutMethod,
          },
        });
        console.log("✅ [SERVICE] Attendance record updated successfully");
        return attendance;
      }

      // Create new record
      console.log("📝 [SERVICE] Creating new attendance record");
      const attendance = await this.prisma.attendance.create({
        data: {
          id: uuidv4(),
          companyId,
          userId: data.employeeId,
          date: attendanceDate,
          checkIn: checkInDateTime,
          checkOut: checkOutDateTime,
          status: metrics.status,
          notes: data.notes || null,
          workMode: data.workMode || "OFFICE",
          lateMinutes: metrics.lateMinutes,
          earlyLeaveMinutes: metrics.earlyLeaveMinutes,
          workHours: metrics.workHours,
          overtimeHours: metrics.overtimeHours,
          checkInMethod: "manual",
          checkOutMethod: "manual",
        },
      });
      console.log(
        "✅ [SERVICE] Attendance record created successfully:",
        attendance.id,
      );

      return attendance;
    } catch (error) {
      console.error("❌ Error creating manual attendance:", error);
      throw error;
    }
  }

  /**
   * Helper to calculate metrics for manual attendance
   * @private
   */
  async _calculateManualMetrics(
    companyId,
    employeeId,
    date,
    checkIn,
    checkOut,
    timezone,
    originalData,
    isUpdate = false,
  ) {
    let lateMinutes =
      originalData.lateMinutes !== undefined
        ? parseInt(originalData.lateMinutes)
        : 0;
    let status = originalData.status || "PRESENT";
    let earlyLeaveMinutes =
      originalData.earlyLeaveMinutes !== undefined
        ? parseInt(originalData.earlyLeaveMinutes)
        : 0;
    let workHours = null;
    let overtimeHours = 0;

    const shift = await this.getEmployeeShiftForDate(
      companyId,
      employeeId,
      date,
      timezone,
    );
    const settings = await this.prisma.hRSettings.findUnique({
      where: { companyId },
    });

    const workStartTime =
      shift?.startTime || settings?.workStartTime || "09:00";
    const workEndTime = shift?.endTime || settings?.workEndTime || "17:00";
    const workStart = combineDateAndTime(date, workStartTime, timezone);
    const workEnd = combineDateAndTime(date, workEndTime, timezone);

    console.log(
      `📝 [METRICS] workStartTime: ${workStartTime}, workStartObj: ${workStart?.toISOString()}`,
    );
    console.log(`📝 [METRICS] checkIn: ${checkIn?.toISOString()}`);

    // If checkIn is provided and we should auto-calculate (lateMinutes is 0 or not provided)
    const originalLateMinutes =
      originalData.lateMinutes !== undefined
        ? parseInt(originalData.lateMinutes)
        : 0;

    // Only auto-calculate lateMinutes if it's NOT an update OR it wasn't explicitly provided
    // If it's an update and originalLateMinutes is 0, we trust the HR wanted 0.
    const shouldAutoCalculateLate = isUpdate
      ? false // Do not auto-calculate for updates, trust frontend
      : originalData.lateMinutes === undefined || originalLateMinutes === 0;

    if (checkIn && shouldAutoCalculateLate) {
      const gracePeriod = settings?.lateGracePeriod || settings?.lateThresholdMinutes || 15;
      const graceTime = new Date(workStart.getTime() + gracePeriod * 60000);

      console.log(
        `📝 [METRICS] gracePeriod: ${gracePeriod}, graceTime: ${graceTime.toISOString()}`,
      );

      if (checkIn > graceTime) {
        lateMinutes = Math.floor((checkIn - workStart) / 60000);
        status = "LATE";
        console.log(
          `✅ [METRICS] Status set to LATE, lateMinutes: ${lateMinutes}`,
        );
      } else {
        console.log(`ℹ️ [METRICS] Not late. checkIn <= graceTime`);
      }
    }

    // If checkOut is provided and we should auto-calculate
    if (checkOut) {
      const elapsedWorkMinutes = checkIn ? Math.max(0, (checkOut - checkIn) / 60000) : 999;
      // Early leave (only if presence is >= 5 minutes to avoid false early checkout on accidental double punches)
      if (
        elapsedWorkMinutes >= 5 &&
        (originalData.earlyLeaveMinutes === undefined ||
        parseInt(originalData.earlyLeaveMinutes) === 0)
      ) {
        const earlyGrace = settings?.earlyLeaveGracePeriod || 15;
        const graceTimeOut = new Date(workEnd.getTime() - earlyGrace * 60000);
        if (checkOut < graceTimeOut) {
          earlyLeaveMinutes = Math.floor((workEnd - checkOut) / 60000);
        }
      } else if (elapsedWorkMinutes < 5) {
        earlyLeaveMinutes = 0;
      }

      // Overtime
      const overtime = (checkOut - workEnd) / 3600000;
      const minOvertime = parseFloat(settings?.overtimeMinHours) || 1;
      if (overtime >= minOvertime) {
        overtimeHours = overtime;
      }
    }

    // Work hours: standard shift includes paid break unless shift explicitly marks unpaidBreak === true
    if (checkIn && checkOut) {
      const actualWorkMinutes = Math.max(0, (checkOut - checkIn) / 60000);
      const breakDuration = (shift?.unpaidBreak === true) ? (shift?.breakDuration || 0) : 0;
      workHours = Math.max(0, (actualWorkMinutes - breakDuration) / 60);
    }

    // Final status check to ensure consistency
    if (lateMinutes > 0) {
      if (status === "PRESENT" && originalData.status === "PRESENT") {
        console.log(
          `✅ [METRICS] Keeping status PRESENT as requested by user override, despite lateMinutes = ${lateMinutes}`,
        );
      } else {
        status = "LATE";
        console.log(
          `✅ [METRICS] Final status forced to LATE because lateMinutes > 0`,
        );
      }
    } else if (earlyLeaveMinutes > 0 && status === "PRESENT") {
      if (originalData.status === "PRESENT") {
        console.log(
          `✅ [METRICS] Keeping status PRESENT as requested by user override, despite early leave`,
        );
      } else {
        status = "EARLY_LEAVE";
      }
    }

    // ⭐ FIX: If HR explicitly provided `lateMinutes` as 0 in edit mode, trust it.
    // However, we identify "explicit 0" by checking if 'isEditMode' was passed or just keeping it simple:
    // Actually, to not break manual creation, if it's already recalculated we just return it.

    return {
      lateMinutes,
      status,
      earlyLeaveMinutes,
      workHours: workHours !== null ? Math.round(workHours * 100) / 100 : null,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
    };
  }

  /**
   * إعادة حساب الحضور والانصراف عند تغيير تفاصيل المناوبة
   */
  async recalculateShiftAttendances(companyId, shiftId) {
    try {
      console.log(
        `🔄 [AttendanceService] Started recalculating attendance for shift ${shiftId}`,
      );

      // جلب المهام المرتبطة بهذه المناوبة الشهر الحالي والسابق
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const assignments = await this.prisma.shiftAssignment.findMany({
        where: {
          companyId,
          shiftId,
          date: { gte: thirtyDaysAgo },
        },
      });

      if (assignments.length === 0) {
        console.log(
          `✅ [AttendanceService] No assignments found for shift ${shiftId} in the last 30 days.`,
        );
        return;
      }

      // لكل مهمة، نبحث عن سجل حضور في نفس اليوم ونعيد حسابه
      let updatedCount = 0;

      const timezone = await this.getCompanyTimezone(companyId);

      for (const assignment of assignments) {
        // Find attendance record
        const attendance = await this.prisma.attendance.findUnique({
          where: {
            userId_date: {
              userId: assignment.userId,
              date: assignment.date,
            },
          },
        });

        if (attendance && attendance.checkIn) {
          console.log(`🔄 Recalculating attendance id: ${attendance.id}`);

          const metrics = await this._calculateManualMetrics(
            companyId,
            attendance.userId,
            attendance.date,
            attendance.checkIn,
            attendance.checkOut,
            timezone,
            { lateMinutes: 0, earlyLeaveMinutes: 0 }, // Force recalculation
          );

          await this.prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              status: metrics.status,
              lateMinutes: metrics.lateMinutes,
              earlyLeaveMinutes: metrics.earlyLeaveMinutes,
              workHours: metrics.workHours,
              overtimeHours: metrics.overtimeHours,
            },
          });

          updatedCount++;
        }
      }

      console.log(
        `✅ [AttendanceService] Finished recalculating ${updatedCount} attendance records for shift ${shiftId}`,
      );
    } catch (error) {
      console.error(
        "❌ [AttendanceService] Error in recalculateShiftAttendances:",
        error,
      );
    }
  }

  /**
   * تقرير الحضور الشهري
   */
  async getMonthlyReport(
    companyId,
    year,
    month,
    employeeId = null,
    departmentId = null,
  ) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const userWhere = {
        employeeNumber: { not: null },
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } },
        ],
      };

      if (employeeId) userWhere.id = employeeId;
      if (departmentId) userWhere.departmentId = departmentId;

      // 1. Get all relevant employees (from User table)
      const activeEmployees = await this.prisma.user.findMany({
        where: userWhere,
        include: {
          departmentRelation: {
            select: { id: true, name: true },
          },
          positionRelation: {
            select: { title: true },
          },
        },
      });

      const totalEmployeesCount = activeEmployees.length;
      if (totalEmployeesCount === 0) {
        return {
          totalEmployees: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          averageWorkHours: 0,
          attendanceRate: 0,
          byDepartment: [],
          employees: [],
        };
      }

      // 2. Get attendance records for the period
      const attendance = await this.prisma.attendance.findMany({
        where: {
          companyId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          userId: employeeId
            ? employeeId
            : { in: activeEmployees.map((e) => e.id) },
        },
      });

      // 3. Process data per employee
      const employeeStats = {};
      activeEmployees.forEach((emp) => {
        employeeStats[emp.id] = {
          id: emp.id,
          userId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          department: emp.departmentRelation?.name || "بدون قسم",
          departmentId: emp.departmentRelation?.id,
          position: emp.positionRelation?.title || "-",
          presentDays: 0,
          lateDays: 0,
          absentDays: 0,
          totalWorkHours: 0,
          totalLateMinutes: 0,
          attendanceRate: 0,
        };
      });

      // Track occurrences for global stats
      let totalPresent = 0;
      let totalLate = 0;
      let totalAbsent = 0;
      let totalWorkHoursSum = 0;

      attendance.forEach((record) => {
        const stats = employeeStats[record.userId];
        if (!stats) return;

        if (
          record.status === "PRESENT" ||
          record.status === "LATE" ||
          record.status === "REMOTE"
        ) {
          stats.presentDays++;
          totalPresent++;
        } else if (record.status === "ABSENT") {
          stats.absentDays++;
          totalAbsent++;
        }

        if (record.status === "LATE") {
          stats.lateDays++;
          totalLate++;
        }

        const workH = parseFloat(record.workHours) || 0;
        stats.totalWorkHours += workH;
        totalWorkHoursSum += workH;
        stats.totalLateMinutes += record.lateMinutes || 0;
      });

      // Calculate rates per employee (assuming 22 working days if month is not full yet or using month total days)
      const daysInMonth = endDate.getDate();
      Object.values(employeeStats).forEach((stats) => {
        stats.attendanceRate =
          daysInMonth > 0
            ? parseFloat(((stats.presentDays / daysInMonth) * 100).toFixed(1))
            : 0;
        // If they have 0 present but it's middle of month, maybe handle differently, but this is a simple report
      });

      // 4. Calculate Department Breakdown
      const departmentData = {};
      Object.values(employeeStats).forEach((stats) => {
        const deptName = stats.department;
        if (!departmentData[deptName]) {
          departmentData[deptName] = {
            department: deptName,
            employees: 0,
            totalPresent: 0,
            totalDays: 0,
          };
        }
        departmentData[deptName].employees++;
        departmentData[deptName].totalPresent += stats.presentDays;
        departmentData[deptName].totalDays += daysInMonth;
      });

      const byDepartment = Object.values(departmentData).map((dept) => ({
        department: dept.department,
        employees: dept.employees,
        rate:
          dept.totalDays > 0
            ? parseFloat(
                ((dept.totalPresent / dept.totalDays) * 100).toFixed(1),
              )
            : 0,
      }));

      // 5. Global Aggregates
      const totalPotentialDays = totalEmployeesCount * daysInMonth;
      const globalAttendanceRate =
        totalPotentialDays > 0
          ? parseFloat(((totalPresent / totalPotentialDays) * 100).toFixed(1))
          : 0;

      return {
        totalEmployees: totalEmployeesCount,
        presentDays: totalPresent,
        absentDays: totalAbsent,
        lateDays: totalLate,
        averageWorkHours:
          totalPresent > 0
            ? parseFloat((totalWorkHoursSum / totalPresent).toFixed(1))
            : 0,
        attendanceRate: globalAttendanceRate,
        byDepartment,
        employees: Object.values(employeeStats),
      };
    } catch (error) {
      console.error("❌ Error getting monthly report:", error);
      throw error;
    }
  }

  /**
   * تقرير أيام الغياب التفصيلي لكل موظف
   * يعرض التواريخ الفعلية لأيام الغياب في الشهر
   */
  async getAbsentDaysReport(
    companyId,
    year,
    month,
    employeeId = null,
    departmentId = null,
  ) {
    try {
      const timezone = await this.getCompanyTimezone(companyId);

      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
        select: { workDays: true, publicHolidays: true },
      });

      let workDaysConfig = [1, 2, 3, 4, 5];
      try {
        if (settings?.workDays) {
          workDaysConfig =
            typeof settings.workDays === "string"
              ? JSON.parse(settings.workDays)
              : settings.workDays;
        }
      } catch (e) {
        console.error("⚠️ [AbsentDays] Error parsing workDays:", e);
      }

      let publicHolidays = [];
      try {
        if (settings?.publicHolidays) {
          publicHolidays = JSON.parse(settings.publicHolidays);
        }
      } catch (e) {
        console.error("⚠️ [AbsentDays] Error parsing publicHolidays:", e);
      }

      const holidaySet = new Set(
        (Array.isArray(publicHolidays) ? publicHolidays : []).map((h) =>
          String(h).split("T")[0],
        ),
      );

      const dateKeyOf = (d) =>
        getDateStringInTimezone(new Date(d), timezone);

      const now = new Date();
      const isCurrentMonth =
        now.getFullYear() === year && now.getMonth() + 1 === month;
      const daysInMonth = new Date(year, month, 0).getDate();
      const limitDay = isCurrentMonth ? now.getDate() : daysInMonth;

      const workingDates = [];
      for (let day = 1; day <= limitDay; day++) {
        const date = new Date(year, month - 1, day);
        const dateKey = dateKeyOf(date);
        if (workDaysConfig.includes(date.getDay()) && !holidaySet.has(dateKey)) {
          workingDates.push(dateKey);
        }
      }

      const userWhere = {
        employeeNumber: { not: null },
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } },
        ],
      };
      if (employeeId) userWhere.id = employeeId;
      if (departmentId) userWhere.departmentId = departmentId;

      const activeEmployees = await this.prisma.user.findMany({
        where: userWhere,
        include: {
          departmentRelation: { select: { id: true, name: true } },
          positionRelation: { select: { title: true } },
        },
      });

      if (activeEmployees.length === 0) {
        return {
          month,
          year,
          totalEmployees: 0,
          totalAbsentDays: 0,
          totalWorkingDays: workingDates.length,
          attendanceRate: 0,
          employees: [],
        };
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const attendanceRecords = await this.prisma.attendance.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate },
          userId: employeeId
            ? employeeId
            : { in: activeEmployees.map((e) => e.id) },
        },
        select: { userId: true, date: true, status: true },
      });

      const attendedByUser = {};
      attendanceRecords.forEach((r) => {
        if (r.status === "ABSENT") return;
        const key = dateKeyOf(r.date);
        if (!attendedByUser[r.userId]) attendedByUser[r.userId] = new Set();
        attendedByUser[r.userId].add(key);
      });

      const approvedLeaves = await this.prisma.leaveRequest.findMany({
        where: {
          companyId,
          status: "APPROVED",
          userId: employeeId
            ? employeeId
            : { in: activeEmployees.map((e) => e.id) },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        select: { userId: true, startDate: true, endDate: true },
      });

      const leaveByUser = {};
      approvedLeaves.forEach((l) => {
        if (!leaveByUser[l.userId]) leaveByUser[l.userId] = new Set();
        let cur = new Date(l.startDate);
        const last = new Date(l.endDate);
        while (cur <= last) {
          leaveByUser[l.userId].add(dateKeyOf(cur));
          cur.setDate(cur.getDate() + 1);
        }
      });

      const employeesReport = activeEmployees.map((emp) => {
        const hireDate = emp.hireDate ? dateKeyOf(emp.hireDate) : null;
        const attendedSet = attendedByUser[emp.id] || new Set();
        const leaveSet = leaveByUser[emp.id] || new Set();

        const absentDates = workingDates.filter((d) => {
          if (leaveSet.has(d)) return false;
          if (attendedSet.has(d)) return false;
          if (hireDate && d < hireDate) return false;
          return true;
        });

        return {
          id: emp.id,
          userId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          department: emp.departmentRelation?.name || "بدون قسم",
          departmentId: emp.departmentRelation?.id,
          position: emp.positionRelation?.title || "-",
          absentDays: absentDates.length,
          absentDates,
          attendanceRate:
            workingDates.length > 0
              ? parseFloat(
                  ((1 - absentDates.length / workingDates.length) * 100).toFixed(
                    1,
                  ),
                )
              : 0,
        };
      });

      const sorted = employeesReport.sort(
        (a, b) => b.absentDays - a.absentDays,
      );
      const totalAbsentDays = sorted.reduce(
        (sum, e) => sum + e.absentDays,
        0,
      );

      return {
        month,
        year,
        totalEmployees: sorted.length,
        totalAbsentDays,
        totalWorkingDays: workingDates.length,
        attendanceRate:
          sorted.length > 0 && workingDates.length > 0
            ? parseFloat(
                (
                  (1 -
                    totalAbsentDays / (sorted.length * workingDates.length)) *
                  100
                ).toFixed(1),
              )
            : 0,
        employees: sorted,
      };
    } catch (error) {
      console.error("❌ Error getting absent days report:", error);
      throw error;
    }
  }

  /**
   * كشف الحضور الشهري التفصيلي (موظف × يوم)
   * يعرض حالة كل موظف في كل يوم: حاضر/متأخر/غائب/إجازة/عطلة + وقت الحضور والانصراف
   */
  async getMonthlyAttendanceSheet(
    companyId,
    year,
    month,
    employeeId = null,
    departmentId = null,
  ) {
    try {
      const timezone = await this.getCompanyTimezone(companyId);

      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
        select: { workDays: true, publicHolidays: true },
      });

      let workDaysConfig = [1, 2, 3, 4, 5];
      try {
        if (settings?.workDays) {
          workDaysConfig =
            typeof settings.workDays === "string"
              ? JSON.parse(settings.workDays)
              : settings.workDays;
        }
      } catch (e) {
        console.error("⚠️ [Sheet] Error parsing workDays:", e);
      }

      let publicHolidays = [];
      try {
        if (settings?.publicHolidays) {
          publicHolidays = JSON.parse(settings.publicHolidays);
        }
      } catch (e) {
        console.error("⚠️ [Sheet] Error parsing publicHolidays:", e);
      }

      const holidaySet = new Set(
        (Array.isArray(publicHolidays) ? publicHolidays : []).map((h) =>
          String(h).split("T")[0],
        ),
      );

      const dateKeyOf = (d) => getDateStringInTimezone(new Date(d), timezone);
      const timeOf = (d) => {
        if (!d) return null;
        return new Intl.DateTimeFormat("en-GB", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date(d));
      };

      const now = new Date();
      const isCurrentMonth =
        now.getFullYear() === year && now.getMonth() + 1 === month;
      const daysInMonth = new Date(year, month, 0).getDate();
      const limitDay = isCurrentMonth ? now.getDate() : daysInMonth;

      const days = [];
      for (let day = 1; day <= limitDay; day++) {
        const date = new Date(year, month - 1, day);
        const key = dateKeyOf(date);
        days.push({
          day,
          date: key,
          weekday: new Intl.DateTimeFormat("ar-EG", {
            weekday: "short",
          }).format(date),
          isWorkingDay: workDaysConfig.includes(date.getDay()),
          isHoliday: holidaySet.has(key),
        });
      }

      const userWhere = {
        employeeNumber: { not: null },
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } },
        ],
      };
      if (employeeId) userWhere.id = employeeId;
      if (departmentId) userWhere.departmentId = departmentId;

      const activeEmployees = await this.prisma.user.findMany({
        where: userWhere,
        include: {
          departmentRelation: { select: { id: true, name: true } },
          positionRelation: { select: { title: true } },
        },
      });

      if (activeEmployees.length === 0) {
        return {
          month,
          year,
          days,
          totalEmployees: 0,
          totals: { present: 0, late: 0, absent: 0, leave: 0 },
          employees: [],
        };
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const attendanceRecords = await this.prisma.attendance.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate },
          userId: employeeId
            ? employeeId
            : { in: activeEmployees.map((e) => e.id) },
        },
        select: {
          userId: true,
          date: true,
          status: true,
          checkIn: true,
          checkOut: true,
          lateMinutes: true,
          earlyLeaveMinutes: true,
          workHours: true,
        },
      });

      const attendanceByUser = {};
      attendanceRecords.forEach((r) => {
        if (!attendanceByUser[r.userId]) attendanceByUser[r.userId] = {};
        attendanceByUser[r.userId][dateKeyOf(r.date)] = r;
      });

      const approvedLeaves = await this.prisma.leaveRequest.findMany({
        where: {
          companyId,
          status: "APPROVED",
          userId: employeeId
            ? employeeId
            : { in: activeEmployees.map((e) => e.id) },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        select: { userId: true, startDate: true, endDate: true },
      });

      const leaveByUser = {};
      approvedLeaves.forEach((l) => {
        if (!leaveByUser[l.userId]) leaveByUser[l.userId] = new Set();
        let cur = new Date(l.startDate);
        const last = new Date(l.endDate);
        while (cur <= last) {
          leaveByUser[l.userId].add(dateKeyOf(cur));
          cur.setDate(cur.getDate() + 1);
        }
      });

      let totalPresent = 0;
      let totalLate = 0;
      let totalAbsent = 0;
      let totalLeave = 0;

      const employees = activeEmployees
        .map((emp) => {
          const hireDate = emp.hireDate ? dateKeyOf(emp.hireDate) : null;
          const attended = attendanceByUser[emp.id] || {};
          const leaves = leaveByUser[emp.id] || new Set();

          let present = 0;
          let late = 0;
          let absent = 0;
          let leaveDays = 0;

          const cells = days.map((d) => {
            if (hireDate && d.date < hireDate) {
              return {
                status: "BEFORE_HIRE",
                checkIn: null,
                checkOut: null,
                lateMinutes: 0,
              };
            }
            if (d.isHoliday) {
              return { status: "HOLIDAY", checkIn: null, checkOut: null, lateMinutes: 0 };
            }
            if (!d.isWorkingDay) {
              return { status: "WEEKEND", checkIn: null, checkOut: null, lateMinutes: 0 };
            }
            if (leaves.has(d.date)) {
              leaveDays++;
              return { status: "LEAVE", checkIn: null, checkOut: null, lateMinutes: 0 };
            }

            const rec = attended[d.date];
            if (!rec || rec.status === "ABSENT") {
              absent++;
              return {
                status: "ABSENT",
                checkIn: rec ? timeOf(rec.checkIn) : null,
                checkOut: rec ? timeOf(rec.checkOut) : null,
                lateMinutes: rec?.lateMinutes || 0,
              };
            }

            const st =
              rec.status === "LATE"
                ? "LATE"
                : rec.status === "REMOTE"
                  ? "REMOTE"
                  : "PRESENT";
            if (st === "LATE") late++;
            else present++;

            return {
              status: st,
              checkIn: timeOf(rec.checkIn),
              checkOut: timeOf(rec.checkOut),
              lateMinutes: rec.lateMinutes || 0,
            };
          });

          totalPresent += present;
          totalLate += late;
          totalAbsent += absent;
          totalLeave += leaveDays;

          return {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            employeeNumber: emp.employeeNumber,
            department: emp.departmentRelation?.name || "بدون قسم",
            position: emp.positionRelation?.title || "-",
            totals: { present, late, absent, leave: leaveDays },
            cells,
          };
        })
        .sort((a, b) => a.department.localeCompare(b.department, "ar") || a.name.localeCompare(b.name, "ar"));

      return {
        month,
        year,
        days,
        totalEmployees: employees.length,
        totals: { present: totalPresent, late: totalLate, absent: totalAbsent, leave: totalLeave },
        employees,
      };
    } catch (error) {
      console.error("❌ Error getting monthly attendance sheet:", error);
      throw error;
    }
  }

  /**
   * تصدير سجل الحضور لملف Excel
   */
  async exportAttendance(companyId, options = {}) {
    try {
      const xlsx = require("xlsx");
      const {
        employeeId,
        startDate,
        endDate,
        status,
        autoClosedOnly,
        autoCloseReviewStatus,
      } = options;

      const where = { companyId };
      const timezone = await this.getCompanyTimezone(companyId);
      const normalizedAutoCloseReviewStatus =
        AUTO_CLOSE_REVIEW_STATUSES.includes(autoCloseReviewStatus)
          ? autoCloseReviewStatus
          : null;
      const autoClosedFilterEnabled =
        autoClosedOnly === true || autoClosedOnly === "true";

      if (employeeId) where.userId = employeeId;
      if (status && status !== "ALL") where.status = status;

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = parseDbDateInput(startDate, timezone);
        if (endDate) {
          where.date.lte = parseDbDateInput(endDate, timezone);
        }
      }

      if (autoClosedFilterEnabled || normalizedAutoCloseReviewStatus) {
        where.autoCloseAudit = {
          is: {
            autoClosedAt: { not: null },
            ...(normalizedAutoCloseReviewStatus
              ? { reviewStatus: normalizedAutoCloseReviewStatus }
              : {}),
          },
        };
      }

      let records;
      let autoCloseAuditTableAvailable = true;

      try {
        records = await this.prisma.attendance.findMany({
          where,
          include: {
            autoCloseAudit: true,
          },
          orderBy: { date: "desc" },
        });
      } catch (error) {
        if (!this.isMissingAutoCloseAuditTable(error)) {
          throw error;
        }

        autoCloseAuditTableAvailable = false;

        if (autoClosedFilterEnabled || normalizedAutoCloseReviewStatus) {
          records = [];
        } else {
          const whereWithoutAutoCloseAudit = { ...where };
          delete whereWithoutAutoCloseAudit.autoCloseAudit;
          records = await this.prisma.attendance.findMany({
            where: whereWithoutAutoCloseAudit,
            orderBy: { date: "desc" },
          });
        }
      }

      // جلب بيانات المستخدمين بشكل منفصل
      const userIds = [...new Set(records.map((r) => r.userId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          departmentRelation: { select: { name: true } },
        },
      });
      const usersMap = new Map(users.map((u) => [u.id, u]));

      // تحويل البيانات لصيغة Excel
      const statusLabels = {
        PRESENT: "حاضر",
        ABSENT: "غائب",
        LATE: "متأخر",
        HALF_DAY: "نصف يوم",
        ON_LEAVE: "إجازة",
        HOLIDAY: "عطلة",
        WEEKEND: "عطلة أسبوعية",
        REMOTE: "عن بُعد",
      };
      const autoCloseReviewLabels = {
        PENDING: "بانتظار المراجعة",
        REVIEWED: "تمت المراجعة",
        ADJUSTED: "تم التعديل",
        DISMISSED: "اعتماد كما هو",
      };

      const data = records.map((record) => {
        const user = usersMap.get(record.userId);
        return {
          "رقم الموظف": user?.employeeNumber || "-",
          "اسم الموظف":
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "-",
          القسم: user?.departmentRelation?.name || "-",
          التاريخ: record.date
            ? new Date(record.date).toLocaleDateString("ar-EG")
            : "-",
          "وقت الحضور": record.checkIn
            ? new Date(record.checkIn).toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
          "وقت الانصراف": record.checkOut
            ? new Date(record.checkOut).toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
          "ساعات العمل": record.workHours ? record.workHours.toFixed(1) : "-",
          "ساعات إضافية": record.overtimeHours
            ? record.overtimeHours.toFixed(1)
            : "-",
          "دقائق التأخير": record.lateMinutes || 0,
          "دقائق الخروج المبكر": record.earlyLeaveMinutes || 0,
          الحالة: statusLabels[record.status] || record.status,
          "مغلق تلقائيًا":
            autoCloseAuditTableAvailable && record.autoCloseAudit?.autoClosedAt
              ? "نعم"
              : "لا",
          "حالة مراجعة الإغلاق":
            autoCloseAuditTableAvailable && record.autoCloseAudit?.autoClosedAt
              ? autoCloseReviewLabels[record.autoCloseAudit.reviewStatus] ||
                record.autoCloseAudit.reviewStatus
              : "-",
          "سبب الإغلاق التلقائي":
            autoCloseAuditTableAvailable && record.autoCloseAudit?.autoClosedAt
              ? record.autoCloseAudit.autoCloseReason || "-"
              : "-",
          "وقت الإغلاق التلقائي":
            autoCloseAuditTableAvailable &&
            record.autoCloseAudit?.scheduledCheckOut
              ? new Date(
                  record.autoCloseAudit.scheduledCheckOut,
                ).toLocaleTimeString("ar-EG", {
                  timeZone: timezone,
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
          ملاحظات: record.notes || "-",
        };
      });

      // إنشاء workbook
      const ws = xlsx.utils.json_to_sheet(data, {
        header: [
          "رقم الموظف",
          "اسم الموظف",
          "القسم",
          "التاريخ",
          "وقت الحضور",
          "وقت الانصراف",
          "ساعات العمل",
          "ساعات إضافية",
          "دقائق التأخير",
          "دقائق الخروج المبكر",
          "الحالة",
          "مغلق تلقائيًا",
          "حالة مراجعة الإغلاق",
          "سبب الإغلاق التلقائي",
          "وقت الإغلاق التلقائي",
          "ملاحظات",
        ],
      });

      // تعيين عرض الأعمدة
      ws["!cols"] = [
        { wch: 12 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 },
        { wch: 12 },
        { wch: 14 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 30 },
      ];

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "سجل الحضور");

      // تحويل لـ buffer
      const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      return buffer;
    } catch (error) {
      console.error("❌ Error exporting attendance:", error);
      throw error;
    }
  }

  /**
   * إحصائيات الحضور
   */
  async getAttendanceStats(companyId, startDate, endDate) {
    try {
      const where = {
        companyId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };

      const [totalRecords, byStatus, avgWorkHours, totalOvertime] =
        await Promise.all([
          this.prisma.attendance.count({ where }),
          this.prisma.attendance.groupBy({
            by: ["status"],
            where,
            _count: true,
          }),
          this.prisma.attendance.aggregate({
            where,
            _avg: { workHours: true },
          }),
          this.prisma.attendance.aggregate({
            where,
            _sum: { overtimeHours: true },
          }),
        ]);

      return {
        totalRecords,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        avgWorkHours: avgWorkHours._avg.workHours || 0,
        totalOvertimeHours: totalOvertime._sum.overtimeHours || 0,
      };
    } catch (error) {
      console.error("❌ Error getting attendance stats:", error);
      throw error;
    }
  }

  /**
   * جلب حضور اليوم لموظف محدد
   */
  async getTodayAttendanceForEmployee(companyId, employeeId, date) {
    try {
      const timezone = await this.getCompanyTimezone(companyId);
      const attendanceDate = date
        ? parseDbDateInput(date, timezone)
        : normalizeDateForDb(new Date(), timezone);

      const attendance = await this.prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: employeeId,
            date: attendanceDate,
          },
        },
      });

      return attendance;
    } catch (error) {
      console.error("❌ Error getting today attendance for employee:", error);
      throw error;
    }
  }

  /**
   * جلب إحصائيات الحضور لموظف محدد
   */
  async getAttendanceStatsForEmployee(
    companyId,
    employeeId,
    startDate,
    endDate,
  ) {
    try {
      const timezone = await this.getCompanyTimezone(companyId);
      const normalizedEndDate =
        parseDbDateInput(endDate, timezone) ||
        normalizeDateForDb(new Date(), timezone);
      const normalizedStartDate =
        parseDbDateInput(startDate, timezone) ||
        (() => {
          const rangeStart = new Date(normalizedEndDate);
          rangeStart.setUTCDate(rangeStart.getUTCDate() - 30);
          return rangeStart;
        })();

      const where = {
        companyId,
        userId: employeeId,
        date: {
          gte: normalizedStartDate,
          lte: normalizedEndDate,
        },
      };

      const [
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        workHours,
        overtimeHours,
      ] = await Promise.all([
        this.prisma.attendance.count({ where }),
        this.prisma.attendance.count({
          where: {
            ...where,
            status: { in: ["PRESENT", "LATE", "HALF_DAY"] },
          },
        }),
        this.prisma.attendance.count({
          where: { ...where, lateMinutes: { gt: 0 } },
        }),
        this.prisma.attendance.count({ where: { ...where, status: "ABSENT" } }),
        this.prisma.attendance.aggregate({ where, _sum: { workHours: true } }),
        this.prisma.attendance.aggregate({
          where,
          _sum: { overtimeHours: true },
        }),
      ]);

      const attendanceRate =
        totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        totalWorkHours: workHours._sum.workHours || 0,
        totalOvertimeHours: overtimeHours._sum.overtimeHours || 0,
        attendanceRate,
      };
    } catch (error) {
      console.error("❌ Error getting attendance stats for employee:", error);
      throw error;
    }
  }

  /**
   * جلب سجل الحضور الأخير لموظف محدد
   */
  async getRecentAttendanceForEmployee(companyId, employeeId, options = 10) {
    try {
      const normalizedOptions =
        typeof options === "number" ? { limit: options } : options || {};
      const timezone = await this.getCompanyTimezone(companyId);
      const limit = Math.max(
        1,
        Number.parseInt(normalizedOptions.limit, 10) || 10,
      );
      const page = Math.max(
        1,
        Number.parseInt(normalizedOptions.page, 10) || 1,
      );
      const where = {
        companyId,
        userId: employeeId,
      };

      if (normalizedOptions.startDate || normalizedOptions.endDate) {
        where.date = {};

        if (normalizedOptions.startDate) {
          where.date.gte = parseDbDateInput(
            normalizedOptions.startDate,
            timezone,
          );
        }

        if (normalizedOptions.endDate) {
          where.date.lte = parseDbDateInput(
            normalizedOptions.endDate,
            timezone,
          );
        }
      }

      const attendance = await this.prisma.attendance.findMany({
        where: {
          ...where,
        },
        orderBy: [{ date: "desc" }, { checkIn: "desc" }],
        skip: (page - 1) * limit,
        take: limit + 1,
      });

      return {
        records: attendance.slice(0, limit),
        page,
        limit,
        hasMore: attendance.length > limit,
      };
    } catch (error) {
      console.error("❌ Error getting recent attendance for employee:", error);
      throw error;
    }
  }

  /**
   * حساب سلسلة الحضور المتواصل (Attendance Streak)
   */
  async calculateAttendanceStreak(companyId, userId, type = "PRESENT") {
    try {
      // جلب إعدادات الشركة لمعرفة أيام العمل
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
        select: { workDays: true },
      });

      let workDays = [1, 2, 3, 4, 5];
      try {
        if (settings?.workDays) {
          workDays =
            typeof settings.workDays === "string"
              ? JSON.parse(settings.workDays)
              : settings.workDays;
        }
      } catch (e) {
        console.error("⚠️ [Attendance] Error parsing workDays settings:", e);
      }

      // جلب آخر 60 سجل حضور
      const records = await this.prisma.attendance.findMany({
        where: {
          companyId,
          userId,
        },
        orderBy: { date: "desc" },
        take: 60,
      });

      if (records.length === 0) return 0;

      let streak = 0;
      let checkDate = getStartOfDayInEgypt();

      // التراجع لأقرب يوم عمل إذا كان اليوم إجازة
      while (!workDays.includes(checkDate.getDay())) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const recordMap = {};
      records.forEach((r) => {
        const d = getStartOfDayInEgypt(r.date).getTime();
        recordMap[d] = r.status;
      });

      const today = getStartOfDayInEgypt();

      while (true) {
        if (!workDays.includes(checkDate.getDay())) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }

        const status = recordMap[checkDate.getTime()];
        const isMatch =
          type === "PRESENT"
            ? status === "PRESENT"
            : status && status !== "ABSENT";

        if (isMatch) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          if (checkDate.getTime() === today.getTime() && !status) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }

        if (streak >= 60) break;
      }

      return streak;
    } catch (error) {
      console.error("❌ [Attendance] Error calculating streak:", error);
      return 0;
    }
  }
}

module.exports = new AttendanceService();
