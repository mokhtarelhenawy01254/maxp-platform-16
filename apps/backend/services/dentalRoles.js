const { getSharedPrismaClient } = require('./sharedDatabase');
const { parseSettingValue } = require('../utils/dentalLabHelpers');

const DENTAL_ROLES = ['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN', 'ACCOUNTANT'];

const PLATFORM_OWNER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'ADMIN', 'LAB_ADMIN'];

function resolveDentalRole(user, teamRoles) {
  const platformRole = user && user.role;
  if (PLATFORM_OWNER_ROLES.includes(platformRole)) return 'OWNER';
  const role = teamRoles && teamRoles[user && user.id];
  return role || null;
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
    let role = resolveDentalRole(req.user, teamRoles);
    if (!role && req.user?.id) {
      // Check if user is an active technician in this company
      const prisma = getSharedPrismaClient();
      const tech = await prisma.dentalTechnician.findFirst({
        where: { companyId, userId: req.user.id, isActive: true },
      });
      if (tech) role = 'TECHNICIAN';
    }
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ success: false, error: 'غير مصرح بهذا الدور' });
    }
    req.dentalRole = role;
    if (next) next();
  } catch (error) {
    console.error('Error in dental role guard:', error);
    return res.status(403).json({ success: false, error: 'غير مصرح بهذا الدور' });
  }
};

async function checkDentalTechnicianUser(userId, companyId) {
  if (!userId || !companyId) return { isTechnician: false, dentalRole: null };
  try {
    const prisma = getSharedPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user && PLATFORM_OWNER_ROLES.includes(user.role)) {
      return { isTechnician: false, dentalRole: 'OWNER', technician: null };
    }
    const tech = await prisma.dentalTechnician.findFirst({
      where: { companyId, userId, isActive: true },
      select: { id: true, name: true, role: true },
    });
    if (tech) return { isTechnician: true, dentalRole: 'TECHNICIAN', technician: tech };
    const teamRoles = await loadTeamRoles(companyId);
    if (teamRoles && teamRoles[userId] === 'TECHNICIAN') {
      return { isTechnician: true, dentalRole: 'TECHNICIAN', technician: null };
    }
    return { isTechnician: false, dentalRole: teamRoles ? teamRoles[userId] || null : null, technician: null };
  } catch {
    return { isTechnician: false, dentalRole: null, technician: null };
  }
}

module.exports = { DENTAL_ROLES, resolveDentalRole, loadTeamRoles, dentalRoleGuard, checkDentalTechnicianUser };