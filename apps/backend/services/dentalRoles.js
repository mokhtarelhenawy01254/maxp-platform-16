const { getSharedPrismaClient } = require('./sharedDatabase');
const { parseSettingValue } = require('../utils/dentalLabHelpers');

const DENTAL_ROLES = ['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN', 'ACCOUNTANT'];

const PLATFORM_OWNER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'];

function resolveDentalRole(user, teamRoles) {
  const platformRole = user && user.role;
  if (PLATFORM_OWNER_ROLES.includes(platformRole)) return 'OWNER';
  const role = teamRoles && teamRoles[user && user.id];
  return role || 'RECEPTION';
}

async function loadTeamRoles(companyId) {
  const prisma = getSharedPrismaClient();
  const rows = await prisma.dentalSetting.findMany({ where: { companyId } });
  const row = (rows || []).find((r) => r && r.key === 'teamRoles');
  const value = parseSettingValue(row);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

const dentalRoleGuard = (allowed = []) => async (req, res, next) => {
  try {
    const companyId = req && req.user && req.user.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'غير مصرح بهذا الدور' });
    }
    const teamRoles = await loadTeamRoles(companyId);
    const role = resolveDentalRole(req.user, teamRoles);
    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, error: 'غير مصرح بهذا الدور' });
    }
    if (next) next();
  } catch (error) {
    console.error('Error in dental role guard:', error);
    return res.status(403).json({ success: false, error: 'غير مصرح بهذا الدور' });
  }
};

module.exports = { DENTAL_ROLES, resolveDentalRole, loadTeamRoles, dentalRoleGuard };