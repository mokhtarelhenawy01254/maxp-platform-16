const monitorService = require('../../services/monitorService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

async function getSummary(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const employeeId = req.params.employeeId === 'me' ? (req.user.employeeId || userId) : req.params.employeeId;
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
    const { companyId, id: userId } = req.user;
    const employeeId = req.params.employeeId === 'me' ? (req.user.employeeId || userId) : req.params.employeeId;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const timeline = await monitorService.getEmployeeTimeline(companyId, employeeId, date);
    return res.status(200).json({ data: timeline });
  } catch (error) {
    console.error('Error in getTimeline:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTeamOverview(req, res) {
  try {
    const { companyId } = req.user;
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
    const { companyId } = req.user;
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
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();
    const alerts = await prisma.monitorAlert.findMany({
      where: { companyId },
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
    
    const alert = await prisma.monitorAlert.update({
      where: { id, companyId },
      data: { isRead: true, readAt: new Date() }
    });
    return res.status(200).json({ data: alert });
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
