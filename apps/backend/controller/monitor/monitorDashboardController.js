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

module.exports = {
  getSummary,
  getTimeline,
  getTeamOverview,
  getCategories,
  updateCategory,
  getAlerts,
  markAlertRead
};
