const monitorService = require('../../services/monitorService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

async function getSummary(req, res) {
  try {
    const { companyId, id: userId, role } = req.user;
    const requestedId = req.params.employeeId;
    const isSelf = requestedId === 'me' || requestedId === userId || requestedId === req.user.employeeId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'OWNER'].includes(role);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view another employee summary' });
    }

    const employeeId = isSelf ? (req.user.employeeId || userId) : requestedId;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const summary = await monitorService.getDailySummary(companyId, employeeId, date);
    return res.status(200).json({ data: summary });
  } catch (error) {
    console.error('Error in getSummary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTimeline(req, res) {
  try {
    const { companyId, id: userId, role } = req.user;
    const requestedId = req.params.employeeId;
    const isSelf = requestedId === 'me' || requestedId === userId || requestedId === req.user.employeeId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'OWNER'].includes(role);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view another employee timeline' });
    }

    const employeeId = isSelf ? (req.user.employeeId || userId) : requestedId;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const timeline = await monitorService.getEmployeeTimeline(companyId, employeeId, date);
    return res.status(200).json({ data: timeline });
  } catch (error) {
    console.error('Error in getTimeline:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function checkIsAdminOrHR(role) {
  const norm = String(role || '').toUpperCase();
  return ['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'OWNER', 'MANAGER'].includes(norm);
}

async function getTeamOverview(req, res) {
  try {
    const { companyId, role } = req.user;
    if (!checkIsAdminOrHR(role)) {
      return res.status(403).json({ error: 'غير مصرح: استعراض إحصائيات الفريق متاح لإدارة الموارد البشرية والمدراء فقط' });
    }

    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const overview = await monitorService.getTeamOverview(companyId, date);
    return res.status(200).json({ data: overview });
  } catch (error) {
    console.error('Error in getTeamOverview:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCategories(req, res) {
  try {
    const { companyId } = req.user;
    const categories = await monitorService.getCategories(companyId);
    return res.status(200).json({ data: categories });
  } catch (error) {
    console.error('Error in getCategories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateCategory(req, res) {
  try {
    const { companyId, role } = req.user;
    if (!checkIsAdminOrHR(role)) {
      return res.status(403).json({ error: 'غير مصرح: تعديل تصنيفات البرامج والمواقع يتطلب صلاحية إدارية' });
    }

    const categoryData = req.body;
    const category = await monitorService.updateCategory(companyId, categoryData);
    return res.status(200).json({ data: category });
  } catch (error) {
    console.error('Error in updateCategory:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAlerts(req, res) {
  try {
    const { companyId, role, id: userId, employeeId } = req.user;
    const isManager = checkIsAdminOrHR(role);
    const prisma = getSharedPrismaClient();

    // Standard employees only see their own alerts
    const where = { companyId };
    if (!isManager) {
      where.employeeId = employeeId || userId;
    }

    const alerts = await prisma.monitorAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.status(200).json({ data: alerts });
  } catch (error) {
    console.error('Error in getAlerts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function markAlertRead(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    
    const result = await prisma.monitorAlert.updateMany({
      where: { id, companyId },
      data: { isRead: true, readAt: new Date() }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    return res.status(200).json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error in markAlertRead:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const monitorRetentionService = require('../../services/monitorRetentionService');

async function getAiDailyStandup(req, res) {
  try {
    const { companyId, role } = req.user;
    if (!checkIsAdminOrHR(role)) {
      return res.status(403).json({ error: 'غير مصرح: الملخص التنفيذي الذكي متاح للمدراء ومسؤولي الموارد البشرية فقط' });
    }

    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const prisma = getSharedPrismaClient();

    // 1. Fetch team overview for date
    const teamOverview = await monitorService.getTeamOverview(companyId, dateStr);
    const summaries = teamOverview?.summaries || [];

    // 2. Fetch completed tasks for company today
    let completedTasksCount = 0;
    try {
      completedTasksCount = await prisma.task.count({
        where: {
          companyId,
          status: 'COMPLETED',
          updatedAt: { gte: startOfDay, lte: endOfDay }
        }
      });
    } catch {}

    // 3. Aggregate productivity telemetry
    const totalActiveEmployees = summaries.length;
    let totalFocusSeconds = 0;
    let totalBreakSeconds = 0;
    let totalClockSeconds = 0;
    const attentionFlags = [];

    for (const s of summaries) {
      totalFocusSeconds += (s.totalProductiveSeconds || 0);
      totalBreakSeconds += (s.totalIdleSeconds || 0);
      totalClockSeconds += (s.totalClockSeconds || 0);

      // Burnout heuristic: working > 9 hours with < 20 min breaks
      if ((s.totalClockSeconds || 0) > 9 * 3600 && (s.totalIdleSeconds || 0) < 1200) {
        attentionFlags.push(`الموظف ${s.employeeId || 'عضو الفريق'} يعمل منذ أكثر من 9 ساعات بفرص راحة محدودة.`);
      }
      // Low activity on clock: active < 30% of clocked time
      else if ((s.totalClockSeconds || 0) > 4 * 3600 && (s.totalActiveSeconds || 0) < (s.totalClockSeconds * 0.3)) {
        attentionFlags.push(`انخفاض وتيرة التفاعل الموثقة لـ ${s.employeeId || 'عضو الفريق'} مقارنة بساعات الحضور.`);
      }
    }

    const avgFocusHours = totalActiveEmployees > 0 
      ? ((totalFocusSeconds / totalActiveEmployees) / 3600).toFixed(1)
      : '0.0';

    // 4. Synthesize crisp Executive Standup
    let headline = 'استقرار تشغيلي وتدفق عمل منضبط';
    let summaryText = '';

    if (totalActiveEmployees === 0) {
      headline = 'لا يوجد نشاط موثق حتى الآن';
      summaryText = `لم يتم رصد أي جلسات عمل نشطة للموظفين بتاريخ ${dateStr}. في انتظار بدء الجلسات الصباحية.`;
    } else {
      if (completedTasksCount > 0) {
        headline = `إنجاز ${completedTasksCount} مهمة اليوم بنسبة تركيز مستقرة`;
        summaryText = `حقق الفريق اليوم إنجاز ${completedTasksCount} مهمة مكتملة بمشاركة ${totalActiveEmployees} من أعضاء الفريق النشطين، وبمتوسط ساعات تركيز عميق يبلغ ${avgFocusHours} ساعة لكل موظف.`;
      } else {
        headline = `نشاط مستمر لـ ${totalActiveEmployees} من أعضاء الفريق`;
        summaryText = `يتواجد حالياً ${totalActiveEmployees} موظفاً في جلسات العمل المفتوحة بمتوسط ${avgFocusHours} ساعة عمل مركزة. وتجري متابعة استكمال المهام قيد التنفيذ.`;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        date: dateStr,
        headline,
        summary: summaryText,
        telemetry: {
          activeEmployees: totalActiveEmployees,
          completedTasks: completedTasksCount,
          avgFocusHours,
          totalClockHours: (totalClockSeconds / 3600).toFixed(1),
          totalBreakMinutes: Math.round(totalBreakSeconds / 60),
        },
        attentionFlags: attentionFlags.slice(0, 3),
        generatedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error in getAiDailyStandup:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function triggerDataArchival(req, res) {
  try {
    const { companyId, role } = req.user;
    const isSuperOrOwner = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(role);
    if (!isSuperOrOwner) {
      return res.status(403).json({ error: 'صلاحية مرفوضة: أرشفة البيانات محصورة بالمدير التنفيذي فقط' });
    }

    const retentionDays = Number(req.body.retentionDays || 60);
    const result = await monitorRetentionService.archiveAndPruneOldLogs(companyId, retentionDays);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in triggerDataArchival:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getSummary,
  getTimeline,
  getTeamOverview,
  getCategories,
  updateCategory,
  getAlerts,
  markAlertRead,
  getAiDailyStandup,
  triggerDataArchival
};
