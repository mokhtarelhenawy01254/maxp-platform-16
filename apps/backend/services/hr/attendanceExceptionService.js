/**
 * 📍 Attendance Exception Service
 * خدمة إدارة طلبات استثناء البصمة الجغرافية
 */

const { getSharedPrismaClient } = require("../sharedDatabase");
const { normalizeDateForDb, combineDateAndTime } = require("../../utils/dateUtils");
const hrNotificationService = require("./hrNotificationService");
const auditService = require("./auditService");

/**
 * Get company timezone helper
 * @param {string} companyId
 * @param {object} prisma
 * @returns {Promise<string>}
 */
async function getCompanyTimezone(companyId, prisma) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    return company?.timezone || "Africa/Cairo";
  } catch (error) {
    return "Africa/Cairo";
  }
}

/**
 * تحويل وقت محلي (HH:mm) وتاريخ إلى كائن Date بـ UTC مع مراعاة التوقيت الصيفي للمنطقة الزمنية بدقة
 */
function parseLocalTimeToUtc(dateVal, timeStr, timezone = "Africa/Cairo") {
  if (!timeStr || !/^(\d{1,2}):(\d{2})/.test(timeStr.trim())) {
    return new Date();
  }
  const [h, m] = timeStr.trim().split(":").map(Number);
  const baseDateObj = new Date(dateVal);
  const y = baseDateObj.getUTCFullYear();
  const mon = String(baseDateObj.getUTCMonth() + 1).padStart(2, "0");
  const day = String(baseDateObj.getUTCDate()).padStart(2, "0");
  const isoLocal = `${y}-${mon}-${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

  try {
    const testDate = new Date(isoLocal + "Z");
    const localDate = new Date(testDate.toLocaleString("en-US", { timeZone: timezone }));
    const utcDate = new Date(testDate.toLocaleString("en-US", { timeZone: "UTC" }));
    const offsetMs = localDate.getTime() - utcDate.getTime();
    return new Date(testDate.getTime() - offsetMs);
  } catch (err) {
    try {
      return combineDateAndTime(dateVal, timeStr, timezone) || new Date(dateVal);
    } catch {
      return new Date(dateVal);
    }
  }
}

class AttendanceExceptionService {
  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء طلب استثناء بصمة
   * @param {string} companyId
   * @param {string} userId
   * @param {object} params
   * @param {string} params.attemptId
   * @param {string} params.reason
   * @returns {Promise<object>}
   */
  /**
   * إنشاء طلب استثناء أو اعتماد بصمة (مسار طلب بصمة معتمدة للعضو)
   * @param {string} companyId
   * @param {string} userId
   * @param {object} params
   * @param {string} [params.attemptId]
   * @param {string} params.reason
   * @param {string|Date} [params.attendanceDate]
   * @param {string} [params.requestedTime]
   * @param {"CHECK_IN"|"CHECK_OUT"} [params.action]
   * @param {object} [params.context]
   * @returns {Promise<object>}
   */
  async createExceptionRequest(companyId, userId, { attemptId, reason, attendanceDate, requestedTime, action, context } = {}) {
    if (!reason || !reason.trim()) {
      const error = new Error("سبب طلب الاستثناء/الاعتماد مطلوب");
      error.statusCode = 400;
      throw error;
    }

    const timezone = await getCompanyTimezone(companyId, this.prisma);
    const todayForDb = normalizeDateForDb(new Date(), timezone);

    let attempt = null;

    if (attemptId) {
      attempt = await this.prisma.hrAttendanceAttempt.findUnique({
        where: { id: attemptId },
      });

      if (!attempt || attempt.companyId !== companyId || attempt.userId !== userId) {
        const error = new Error("محاولة البصمة غير موجودة أو غير مصرح بها");
        error.statusCode = 404;
        throw error;
      }

      const allowedResults = ["GEOFENCE_FAILED", "WEAK_ACCURACY", "LOCATION_MISSING", "ERROR", "EXCEPTION_PENDING"];
      if (!allowedResults.includes(attempt.result)) {
        const error = new Error("لا يمكن تقديم طلب استثناء لمحاولة بصمة ناجحة");
        error.statusCode = 400;
        throw error;
      }
    } else {
      // 🚀 مسار «طلب بصمة معتمدة» بدون محاولة سابقة (الموظف يرفع الوقت والسبب للاعتماد بضغطة زر)
      const targetDate = attendanceDate ? new Date(attendanceDate) : new Date();
      const targetDateForDb = normalizeDateForDb(targetDate, timezone);

      let requestedPunchTime = new Date();
      if (requestedTime && /^(\d{1,2}):(\d{2})/.test(requestedTime.trim())) {
        requestedPunchTime = parseLocalTimeToUtc(targetDateForDb, requestedTime, timezone);
      }

      const actionType = action === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN";
      const reasonWithTime = `${reason.trim()}${requestedTime ? ` (وقت البصمة المطلوب: ${requestedTime})` : ""}`;

      const synthAttempt = await this.prisma.hrAttendanceAttempt.create({
        data: {
          companyId,
          userId,
          action: actionType,
          attendanceDate: targetDateForDb,
          attemptedAt: requestedPunchTime,
          result: "ERROR",
          reason: `طلب بصمة معتمدة: ${reasonWithTime}`,
          clientIp: context?.ip || null,
          userAgent: context?.userAgent || null,
          deviceType: context?.deviceType || null,
          method: "regularization_request",
          workMode: "OFFICE",
        },
      });

      attempt = synthAttempt;
      attemptId = synthAttempt.id;
    }

    const todayMs = todayForDb.getTime();
    const attemptMs = attempt.attendanceDate.getTime();
    const diffDays = Math.round((todayMs - attemptMs) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const error = new Error("لا يمكن تقديم طلب استثناء لتاريخ مستقبلي");
      error.statusCode = 400;
      throw error;
    }

    if (diffDays > 45) {
      const error = new Error("لا يمكن تقديم طلب استثناء لتاريخ يتجاوز 45 يوماً سابقة");
      error.statusCode = 400;
      throw error;
    }

    // Check duplicate attempt
    const existingForAttempt = await this.prisma.hrAttendanceExceptionRequest.findUnique({
      where: { attemptId },
    });
    if (existingForAttempt) {
      const error = new Error("عندك طلب مقدم بالفعل لهذا اليوم/المحاولة");
      error.statusCode = 409;
      throw error;
    }

    // Check duplicate for user on attendanceDate (PENDING or APPROVED)
    const existingForDate = await this.prisma.hrAttendanceExceptionRequest.findFirst({
      where: {
        companyId,
        userId,
        attendanceDate: attempt.attendanceDate,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (existingForDate) {
      const error = new Error("عندك طلب معتمد أو قيد المراجعة بالفعل لهذا اليوم");
      error.statusCode = 409;
      throw error;
    }

    const fullReason = `${reason.trim()}${requestedTime && !reason.includes(requestedTime) ? ` (وقت البصمة المطلوب: ${requestedTime})` : ""}`;

    const request = await this.prisma.hrAttendanceExceptionRequest.create({
      data: {
        companyId,
        userId,
        attemptId,
        attendanceDate: attempt.attendanceDate,
        status: "PENDING",
        reason: fullReason,
        distanceMeters: attempt.effectiveDistanceMeters ?? attempt.distanceMeters ?? null,
        accuracyMeters: attempt.accuracyMeters ?? null,
        clientIp: attempt.clientIp ?? null,
      },
    });

    try {
      await hrNotificationService.notifyHrEvent({
        companyId,
        notificationKey: "notifyOnAttendanceIssue",
        employeeUserId: userId,
        includeManagers: true,
        title: "طلب استثناء بصمة جديد",
        message: `قدم الموظف طلب استثناء لتسجيل الحضور: ${reason.trim()}`,
        type: "HR_ATTENDANCE_EXCEPTION",
        data: {
          requestId: request.id,
          attemptId: attempt.id,
          attendanceDate: request.attendanceDate,
          reason: reason.trim(),
        },
      }, this.prisma);
    } catch (notifyErr) {
      console.warn("⚠️ [EXCEPTION-NOTIFY] Failed to notify HR event:", notifyErr?.message || notifyErr);
    }

    return request;
  }

  /**
   * عرض قائمة طلبات استثناء البصمة
   * @param {string} companyId
   * @param {object} [filter]
   * @param {string} [filter.status]
   * @param {string|Date} [filter.from]
   * @param {string|Date} [filter.to]
   * @returns {Promise<Array<object>>}
   */
  async listExceptionRequests(companyId, { status, from, to } = {}) {
    const where = { companyId };
    if (status) {
      where.status = status;
    }

    const timezone = await getCompanyTimezone(companyId, this.prisma);
    if (from || to) {
      where.attendanceDate = {};
      if (from) where.attendanceDate.gte = normalizeDateForDb(new Date(from), timezone);
      if (to) where.attendanceDate.lte = normalizeDateForDb(new Date(to), timezone);
    }

    const requests = await this.prisma.hrAttendanceExceptionRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      take: 200,
    });

    if (requests.length === 0) return [];

    const userIds = [...new Set(requests.map((r) => r.userId).filter(Boolean))];

    const [users, employees] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          role: true,
        },
      }),
      this.prisma.employee.findMany({
        where: {
          companyId,
          userId: { in: userIds },
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          firstNameEn: true,
          lastNameEn: true,
          employeeNumber: true,
          department: { select: { id: true, name: true } },
          position: { select: { id: true, title: true } },
        },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const employeeMap = new Map(employees.map((e) => [e.userId, e]));

    return requests.map((req) => {
      const user = userMap.get(req.userId) || null;
      const emp = employeeMap.get(req.userId) || null;
      const employeeName = emp
        ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
        : (user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "موظف");

      return {
        ...req,
        user,
        employee: emp,
        employeeName,
      };
    });
  }

  /**
   * اتخاذ قرار بشأن طلب استثناء بصمة (موافقة أو رفض)
   * @param {string} companyId
   * @param {string} requestId
   * @param {object} params
   * @param {"APPROVED" | "REJECTED"} params.decision
   * @param {string} [params.note]
   * @param {string} params.decidedById
   * @returns {Promise<object>}
   */
  async decideExceptionRequest(companyId, requestId, { decision, note, decidedById }) {
    if (!["APPROVED", "REJECTED"].includes(decision)) {
      const error = new Error("قرار غير صالح. يجب أن يكون APPROVED أو REJECTED");
      error.statusCode = 400;
      throw error;
    }

    const request = await this.prisma.hrAttendanceExceptionRequest.findFirst({
      where: { id: requestId, companyId },
    });

    if (!request) {
      const error = new Error("طلب الاستثناء غير موجود");
      error.statusCode = 404;
      throw error;
    }

    // Idempotent: if already decided, return current state
    if (request.status !== "PENDING") {
      return request;
    }

    if (decision === "REJECTED") {
      const updated = await this.prisma.hrAttendanceExceptionRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          decidedById: decidedById || null,
          decidedAt: new Date(),
          decisionNote: note || null,
        },
      });

      try {
        await auditService.logAction(
          companyId,
          decidedById,
          "REJECT",
          "ATTENDANCE",
          requestId,
          { requestId, reason: request.reason, note }
        );
      } catch (auditErr) {
        console.warn("⚠️ [EXCEPTION-AUDIT] Failed to log audit:", auditErr?.message || auditErr);
      }

      return updated;
    }

    // decision === "APPROVED"
    const attempt = await this.prisma.hrAttendanceAttempt.findUnique({
      where: { id: request.attemptId },
    });

    const timezone = await getCompanyTimezone(companyId, this.prisma);
    const attendanceDate = normalizeDateForDb(new Date(request.attendanceDate), timezone);

    const existing = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: request.userId,
          date: attendanceDate,
        },
      },
    });

    let punchTime = attempt?.attemptedAt || request.requestedAt || new Date();
    const timeMatch = request.reason?.match(/وقت البصمة المطلوب:\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      punchTime = parseLocalTimeToUtc(attendanceDate, timeMatch[1], timezone);
    }

    const noteParts = [
      request.reason ? `سبب الاستثناء: ${request.reason}` : null,
      request.distanceMeters != null ? `المسافة: ${request.distanceMeters}م` : null,
      request.accuracyMeters != null ? `دقة الموقع: ${request.accuracyMeters}م` : null,
      request.clientIp ? `IP: ${request.clientIp}` : null,
      note ? `ملاحظة الاعتماد: ${note}` : null,
    ].filter(Boolean);
    const noteDetails = noteParts.join(" | ");

    const isCheckOutAction = attempt?.action === "CHECK_OUT";

    let attendance;
    if (existing) {
      const updateData = isCheckOutAction
        ? {
            checkOut: existing.checkOut || punchTime,
            checkOutMethod: "exception_approved",
            notes: existing.notes ? `${existing.notes}\n${noteDetails}` : noteDetails,
          }
        : {
            checkIn: existing.checkIn || punchTime,
            checkInMethod: "exception_approved",
            isApproved: true,
            approvedBy: decidedById || null,
            status: "PRESENT",
            notes: existing.notes ? `${existing.notes}\n${noteDetails}` : noteDetails,
          };

      attendance = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      const createData = isCheckOutAction
        ? {
            companyId,
            userId: request.userId,
            date: attendanceDate,
            checkOut: punchTime,
            checkOutMethod: "exception_approved",
            isApproved: true,
            approvedBy: decidedById || null,
            notes: noteDetails,
            status: "PRESENT",
          }
        : {
            companyId,
            userId: request.userId,
            date: attendanceDate,
            checkIn: punchTime,
            checkInMethod: "exception_approved",
            isApproved: true,
            approvedBy: decidedById || null,
            notes: noteDetails,
            status: "PRESENT",
          };

      attendance = await this.prisma.attendance.create({
        data: createData,
      });
    }

    const updatedRequest = await this.prisma.hrAttendanceExceptionRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        decidedById: decidedById || null,
        decidedAt: new Date(),
        decisionNote: note || null,
        attendanceId: attendance.id,
      },
    });

    if (attempt) {
      await this.prisma.hrAttendanceAttempt.update({
        where: { id: attempt.id },
        data: { attendanceId: attendance.id, result: "SUCCESS" },
      }).catch((err) => console.warn("⚠️ Failed to link attendanceId on attempt:", err?.message || err));
    }

    try {
      await auditService.logAction(
        companyId,
        decidedById,
        "APPROVE",
        "ATTENDANCE",
        attendance.id,
        { requestId, attendanceId: attendance.id, reason: request.reason, note }
      );
    } catch (auditErr) {
      console.warn("⚠️ [EXCEPTION-AUDIT] Failed to log audit:", auditErr?.message || auditErr);
    }

    return updatedRequest;
  }
}

module.exports = new AttendanceExceptionService();
