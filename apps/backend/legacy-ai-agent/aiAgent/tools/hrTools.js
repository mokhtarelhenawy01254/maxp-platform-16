/**
 * @module hrTools
 * @description HR and Attendance tools.
 */

const {
  getSharedPrismaClient,
} = require('../utils/toolHelpers');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

function getAttendanceService() {
  return require('../../../services/hr/attendanceService');
}

async function hrAttendanceTodayHandler(companyId) {
  /**
   * Return today attendance summary from the HR system.
   */
  const attendanceService = getAttendanceService();
  const summary = await attendanceService.getTodayAttendance(companyId);
  const records = Array.isArray(summary.records) ? summary.records : [];
  const presentUserIds = new Set(records.filter((record) => record.checkIn).map((record) => record.userId));
  let absentEmployees = [];

  if (summary.absent > 0 && typeof attendanceService.getActiveCompanyUserIds === 'function') {
    const activeUserIds = await attendanceService.getActiveCompanyUserIds(companyId);
    const missingUserIds = activeUserIds.filter((id) => !presentUserIds.has(id));

    if (missingUserIds.length > 0) {
      const prisma = getSharedPrismaClient();
      const users = await prisma.user.findMany({
        where: {
          id: { in: missingUserIds },
          isActive: true,
          employeeNumber: { not: null },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeNumber: true,
          departmentRelation: { select: { name: true } },
        },
      });

      absentEmployees = users.map((user) => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.employeeNumber,
        email: user.email,
        employeeNumber: user.employeeNumber,
        department: user.departmentRelation?.name || null,
      }));
    }
  }

  return {
    date: summary.date instanceof Date ? summary.date.toISOString().slice(0, 10) : summary.date,
    totalEmployees: summary.totalEmployees || 0,
    present: summary.present || 0,
    late: summary.late || 0,
    absent: summary.absent || 0,
    absentEmployees,
    presentEmployees: records
      .filter((record) => record.checkIn)
      .map((record) => ({
        id: record.userId,
        name: record.employee
          ? `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.trim()
          : null,
        employeeNumber: record.employee?.employeeNumber || null,
        department: record.employee?.department?.name || null,
        status: record.status,
        checkIn: record.checkIn,
      })),
  };
}

const TOOLS = {
  'hr.attendance_today': createToolFromFunction('hr.attendance_today', hrAttendanceTodayHandler, {
    description: 'Return today attendance summary from the HR system.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),
};

module.exports = TOOLS;
