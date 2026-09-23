const { getSharedPrismaClient } = require('./sharedDatabase');

const logAction = async (action, actorId, companyId, details) => {
  try {
    await getSharedPrismaClient().activityLog.create({
      data: {
        userId: actorId,
        companyId,
        category: 'permissions',
        action,
        description: details.description || action,
        metadata: JSON.stringify(details.metadata || {}),
        severity: details.severity || 'INFO',
        targetType: details.targetType || 'role',
        targetId: details.targetId || null,
        targetName: details.targetName || null,
      },
    });
  } catch (e) {
    console.warn('[AUDIT] Failed to log permission action:', e.message);
  }
};

const getPermissions = async (domain) => {
  const where = { isActive: true };
  if (domain) where.domain = domain;
  return getSharedPrismaClient().permission.findMany({
    where,
    orderBy: [{ domain: 'asc' }, { key: 'asc' }],
  });
};

const getCompanyRoles = async (companyId) => {
  return getSharedPrismaClient().role.findMany({
    where: {
      OR: [
        { companyId: '__system__', isBuiltIn: true },
        { companyId: null, isBuiltIn: true },
        { companyId },
      ],
      isActive: true,
    },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
    orderBy: { priority: 'desc' },
  });
};

const getCompanyRoleByKey = async (companyId, key) => {
  const role = await getSharedPrismaClient().role.findFirst({
    where: {
      key,
      OR: [
        { companyId: '__system__', isBuiltIn: true },
        { companyId: null, isBuiltIn: true },
        { companyId },
      ],
    },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });
  return role;
};

const createCustomRole = async (companyId, { key, name, description, permissionKeys, isActive }, actorId) => {
  const existing = await getSharedPrismaClient().role.findUnique({
    where: { key_companyId: { key, companyId } },
  });
  if (existing) throw new Error(`Role "${key}" already exists in this company`);

  const permissions = await getSharedPrismaClient().permission.findMany({
    where: { key: { in: permissionKeys }, isActive: true },
  });

  const role = await getSharedPrismaClient().role.create({
    data: {
      key,
      name,
      description,
      companyId,
      isBuiltIn: false,
      isSystem: false,
      isActive: isActive !== false,
      permissions: {
        create: permissions.map(p => ({ permissionId: p.id })),
      },
    },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  await logAction('role.create', actorId, companyId, {
    description: `إنشاء دور جديد: ${name}`,
    targetType: 'role',
    targetId: role.id,
    targetName: name,
    metadata: { key, permissionKeys, permissionCount: permissions.length },
  });

  return role;
};

const updateCustomRole = async (companyId, roleId, { name, description, permissionKeys, isActive }, actorId) => {
  const role = await getSharedPrismaClient().role.findFirst({
    where: {
      id: roleId,
      OR: [
        { companyId },
        { companyId: '__system__', isBuiltIn: true },
        { companyId: null, isBuiltIn: true },
      ],
    },
  });
  if (!role) throw new Error('Role not found');

  const permissions = await getSharedPrismaClient().permission.findMany({
    where: { key: { in: permissionKeys }, isActive: true },
  });

  await getSharedPrismaClient().rolePermission.deleteMany({
    where: { roleId },
  });

  const updated = await getSharedPrismaClient().role.update({
    where: { id: roleId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
      permissions: {
        create: permissions.map(p => ({ permissionId: p.id })),
      },
    },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  await logAction('role.update', actorId, companyId, {
    description: `تحديث دور: ${name || role.name}`,
    targetType: 'role',
    targetId: roleId,
    targetName: name || role.name,
    metadata: { oldName: role.name, newName: name, permissionKeys, permissionCount: permissions.length },
  });

  return updated;
};

const deleteCustomRole = async (companyId, roleId, actorId) => {
  const role = await getSharedPrismaClient().role.findFirst({
    where: { id: roleId, companyId, isBuiltIn: false },
  });
  if (!role) throw new Error('Custom role not found');

  const roleName = role.name;
  await getSharedPrismaClient().role.delete({ where: { id: roleId } });

  await logAction('role.delete', actorId, companyId, {
    description: `حذف دور: ${roleName}`,
    targetType: 'role',
    targetId: roleId,
    targetName: roleName,
    severity: 'WARNING',
  });
};

const setUserRole = async (userId, companyId, roleId, actorId) => {
  const role = await getSharedPrismaClient().role.findUnique({
    where: { id: roleId },
  });
  if (!role) throw new Error('Role not found');
  if (role.companyId && role.companyId !== companyId) throw new Error('Role does not belong to this company');

  const userCompany = await getSharedPrismaClient().userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!userCompany) throw new Error('User not found in company');

  const oldRoleId = userCompany.roleId;
  const oldRole = oldRoleId ? await getSharedPrismaClient().role.findUnique({ where: { id: oldRoleId } }) : null;

  const VALID_ROLE_ENUMS = ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'AFFILIATE'];
  const ucData = { roleId };
  if (VALID_ROLE_ENUMS.includes(role.key)) {
    ucData.role = role.key;
  }

  await getSharedPrismaClient().userCompany.update({
    where: { userId_companyId: { userId, companyId } },
    data: ucData,
  });

  await logAction('role.assign', actorId, companyId, {
    description: `تعيين دور "${role.name}" لمستخدم`,
    targetType: 'user',
    targetId: userId,
    targetName: role.name,
    metadata: { userId, oldRole: oldRole?.name || null, newRole: role.name },
  });
};

const getUserPermissions = async (userId, companyId) => {
  const prisma = getSharedPrismaClient();
  const userCompany = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: {
      roleRef: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!userCompany) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, companyId: true },
      });
      if (user && user.companyId === companyId) {
        const roleKey = user.role === 'OWNER' ? 'OWNER' : (user.role || 'AGENT');
        const dbRole = await prisma.role.findFirst({
          where: { key: roleKey, isBuiltIn: true, OR: [{ companyId: '__system__' }, { companyId: null }] },
          include: { permissions: { include: { permission: true } } },
        });
        const VALID_ROLE_ENUMS = ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'AFFILIATE'];
        userCompany = await prisma.userCompany.create({
          data: {
            userId,
            companyId,
            role: VALID_ROLE_ENUMS.includes(roleKey) ? roleKey : 'AGENT',
            roleId: dbRole?.id || null,
            isActive: true,
            isDefault: true,
          },
          include: {
            roleRef: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }).catch(() => null);

        if (dbRole?.permissions?.length) {
          return dbRole.permissions.map(rp => rp.permission.key);
        }
      }
    } catch (e) {
      console.warn('[PERMISSIONS] Auto-heal userCompany failed:', e.message);
    }
    return [];
  }

  if (userCompany.roleRef) {
    const perms = userCompany.roleRef.permissions.map(rp => rp.permission.key);
    if (perms.length > 0) return perms;
    // ponytail: roleRef exists but is empty (auto-created without permissions).
    // Fall through to lazy fix below so we attempt to resolve from role enum.
  }

  // ponytail: auto-fix missing roleId — lazy resolution
  if (userCompany.roleId || userCompany.role) {
    try {
      let resolvedRole;

      // Priority 1: try finding by roleId (handles custom + built-in roles)
      if (userCompany.roleId) {
        resolvedRole = await prisma.role.findUnique({
          where: { id: userCompany.roleId },
          include: { permissions: { include: { permission: true } } },
        });
      }

      // Priority 2: try built-in role by legacy role enum
      if (!resolvedRole && userCompany.role) {
        resolvedRole = await prisma.role.findFirst({
          where: {
            key: userCompany.role,
            isBuiltIn: true,
            OR: [
              { companyId: '__system__' },
              { companyId: null },
            ],
          },
          include: { permissions: { include: { permission: true } } },
        });
      }

      // Priority 3: try custom role by key + companyId
      if (!resolvedRole && userCompany.role) {
        resolvedRole = await prisma.role.findFirst({
          where: { key: userCompany.role, companyId, isBuiltIn: false },
          include: { permissions: { include: { permission: true } } },
        });
      }

      if (resolvedRole) {
        await prisma.userCompany.update({
          where: { userId_companyId: { userId, companyId } },
          data: { roleId: resolvedRole.id },
        });
        return resolvedRole.permissions.map(rp => rp.permission.key);
      }
    } catch (e) {
      console.warn('[PERMISSIONS] Auto-fix roleId failed:', e.message);
    }
  }

  return [];
};

const hasPermission = (permissions, permissionKey) => {
  return permissions.includes(permissionKey);
};

module.exports = {
  getPermissions,
  getCompanyRoles,
  getCompanyRoleByKey,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  setUserRole,
  getUserPermissions,
  hasPermission,
};
