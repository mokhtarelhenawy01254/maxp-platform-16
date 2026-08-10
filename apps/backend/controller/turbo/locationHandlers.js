const TurboService = require('../../services/turboService');
const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');

const getGovernments = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.headers['x-company-id'] || req.query.companyId;
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboEnabled: true } }), 3);
    const turboService = new TurboService(company?.turboApiKey || null, companyId);
    const result = await turboService.getGovernments();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting governments:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get governments' });
  }
};

const getAreas = async (req, res) => {
  try {
    const { governmentId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    if (!governmentId) return res.status(400).json({ success: false, error: 'Government ID is required' });
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboEnabled: true } }), 3);
    if (!company?.turboEnabled || !company?.turboApiKey) return res.json({ success: true, data: { areas: [] } });
    const turboService = new TurboService(company.turboApiKey, companyId);
    const result = await turboService.getAreas(governmentId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting areas:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get areas' });
  }
};

const getBranches = async (req, res) => {
  try {
    const { city, governorate } = req.query;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboEnabled: true } }), 3);
    if (!company?.turboEnabled || !company?.turboApiKey) return res.status(400).json({ success: false, error: 'Turbo is not enabled or API key is not configured' });
    const turboService = new TurboService(company.turboApiKey, companyId);
    const result = await turboService.getBranches(city, governorate);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting branches:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get branches' });
  }
};

const searchAreaByText = async (req, res) => {
  try {
    const q = req.query.q || req.query.query;
    const limit = req.query.limit;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    if (!q || !String(q).trim()) return res.status(400).json({ success: false, error: 'Search query is required' });
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboEnabled: true } }), 3);
    const turboService = new TurboService(company?.turboApiKey || null, companyId);
    const result = await turboService.searchAreaByText(q, { limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error searching area:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to search area' });
  }
};

const searchAreaByTextPublic = async (req, res) => {
  try {
    const q = req.query.q || req.query.query;
    const limit = req.query.limit;
    const companyId = req.query.companyId || req.headers?.['x-company-id'] || req.body?.companyId;
    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID is required' });
    if (!q || !String(q).trim()) return res.status(400).json({ success: false, error: 'Search query is required' });
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboEnabled: true } }), 3);
    const turboService = new TurboService(company?.turboApiKey || null, companyId);
    const result = await turboService.searchAreaByText(q, { limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error searching area (public):', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to search area' });
  }
};

module.exports = { getGovernments, getAreas, getBranches, searchAreaByText, searchAreaByTextPublic };
