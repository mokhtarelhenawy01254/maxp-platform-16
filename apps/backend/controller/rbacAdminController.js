const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { PERMISSIONS, normalizeRole } = require('../middleware/rbacMiddleware');

const teamDetailsInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          role: true,
          isActive: true,
        },
      },
    },
  },
};

const shapeTeamResponse = (team) => {
  const leaderMember =
    team?.members?.find((member) => member.isTeamLeader && member.user) || null;

  return {
    ...team,
    leader: leaderMember
      ? {
          id: leaderMember.id,
          user: leaderMember.user,
        }
      : null,
  };
};

/**
 * @route GET /api/v1/admin/teams
 * @desc Get all teams for the company
 */
exports.getTeams = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const teams = await prisma.moderatorTeam.findMany({
      where: { companyId: req.user.companyId },
      include: teamDetailsInclude,
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, teams: teams.map(shapeTeamResponse) });
  } catch (error) {
    console.error('[RBACController] getTeams error:', error.message);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

/**
 * @route POST /api/v1/admin/teams
 * @desc Create a new team
 */
exports.createTeam = async (req, res) => {
  try {
    const { name, description, leaderUserId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const prisma = getSharedPrismaClient();

    const team = await prisma.moderatorTeam.create({
      data: { name, description, companyId: req.user.companyId }
    });

    if (leaderUserId) {
      await prisma.moderatorTeamMember.create({
        data: {
          teamId: team.id,
          userId: leaderUserId,
          companyId: req.user.companyId,
          isTeamLeader: true
        }
      });
    }

    const created = await prisma.moderatorTeam.findUnique({
      where: { id: team.id },
      include: teamDetailsInclude
    });

    res.status(201).json({ success: true, team: shapeTeamResponse(created) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A team with this name already exists' });
    }
    console.error('[RBACController] createTeam error:', error.message);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

/**
 * @route PUT /api/v1/admin/teams/:teamId
 * @desc Update a team
 */
exports.updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description } = req.body;
    const prisma = getSharedPrismaClient();

    const team = await prisma.moderatorTeam.findFirst({
      where: { id: teamId, companyId: req.user.companyId }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const updated = await prisma.moderatorTeam.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description })
      }
    });

    res.json({ success: true, team: updated });
  } catch (error) {
    console.error('[RBACController] updateTeam error:', error.message);
    res.status(500).json({ error: 'Failed to update team' });
  }
};

/**
 * @route DELETE /api/v1/admin/teams/:teamId
 * @desc Delete a team
 */
exports.deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const prisma = getSharedPrismaClient();

    const team = await prisma.moderatorTeam.findFirst({
      where: { id: teamId, companyId: req.user.companyId }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    await prisma.moderatorTeam.delete({ where: { id: teamId } });
    res.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error('[RBACController] deleteTeam error:', error.message);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

/**
 * @route POST /api/v1/admin/teams/:teamId/members
 * @desc Add member to team
 */
exports.addTeamMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId, isTeamLeader } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const prisma = getSharedPrismaClient();

    const team = await prisma.moderatorTeam.findFirst({
      where: { id: teamId, companyId: req.user.companyId }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // If setting as team leader, remove previous leader
    if (isTeamLeader) {
      await prisma.moderatorTeamMember.updateMany({
        where: { teamId, companyId: req.user.companyId, isTeamLeader: true },
        data: { isTeamLeader: false }
      });
    }

    const member = await prisma.moderatorTeamMember.upsert({
      where: {
        teamId_userId: { teamId, userId }
      },
      create: {
        teamId,
        userId,
        companyId: req.user.companyId,
        isTeamLeader: isTeamLeader || false
      },
      update: {
        isActive: true,
        isTeamLeader: isTeamLeader || false,
        joinedAt: new Date()
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true } }
      }
    });

    res.json({ success: true, member });
  } catch (error) {
    console.error('[RBACController] addTeamMember error:', error.message);
    res.status(500).json({ error: 'Failed to add team member' });
  }
};

/**
 * @route DELETE /api/v1/admin/teams/:teamId/members/:memberId
 * @desc Remove member from team
 */
exports.removeTeamMember = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const prisma = getSharedPrismaClient();

    const member = await prisma.moderatorTeamMember.findFirst({
      where: { id: memberId, teamId, companyId: req.user.companyId }
    });
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    await prisma.moderatorTeamMember.delete({ where: { id: memberId } });
    res.json({ success: true, message: 'Member removed from team' });
  } catch (error) {
    console.error('[RBACController] removeTeamMember error:', error.message);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
};

/**
 * @route GET /api/v1/admin/users
 * @desc Get company users for management
 */
exports.getUsers = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const users = await prisma.user.findMany({
      where: { companyId: req.user.companyId },
      select: {
        id: true, firstName: true, lastName: true, email: true, avatar: true,
        role: true, isActive: true, phone: true, createdAt: true, lastLoginAt: true,
        department: true, skills: true, timezone: true, availability: true
      },
      orderBy: { firstName: 'asc' }
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('[RBACController] getUsers error:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * @route PATCH /api/v1/admin/users/:userId/role
 * @desc Update user role
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const validRoles = ['AGENT', 'MANAGER', 'COMPANY_ADMIN', 'OWNER'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const prisma = getSharedPrismaClient();
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    // SUPER_ADMIN has no companyId on their token — look up by userId only
    const userWhere = isSuperAdmin
      ? { id: userId }
      : { id: userId, companyId: req.user.companyId };

    const user = await prisma.user.findFirst({ where: userWhere });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    // Also update UserCompany role (use user's actual companyId for SUPER_ADMIN)
    const targetCompanyId = isSuperAdmin ? user.companyId : req.user.companyId;
    if (targetCompanyId) {
      await prisma.userCompany.updateMany({
        where: { userId, companyId: targetCompanyId },
        data: { role: role }
      });
    }

    res.json({
      success: true,
      user: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        role: updated.role
      }
    });
  } catch (error) {
    console.error('[RBACController] updateUserRole error:', error.message);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

/**
 * @route PATCH /api/v1/admin/users/:userId/status
 * @desc Activate/deactivate user
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    const prisma = getSharedPrismaClient();

    // SUPER_ADMIN has no companyId on their token — look up by userId only
    const userWhere = isSuperAdmin
      ? { id: userId }
      : { id: userId, companyId: req.user.companyId };

    const user = await prisma.user.findFirst({ where: userWhere });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle if no explicit value provided
    const nextIsActive = typeof isActive === 'boolean' ? isActive : !user.isActive;

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isActive: nextIsActive }
      }),
      prisma.userCompany.updateMany({
        where: { userId },
        data: { isActive: nextIsActive }
      })
    ]);

    res.json({
      success: true,
      user: { id: updated.id, firstName: updated.firstName, lastName: updated.lastName, isActive: updated.isActive }
    });
  } catch (error) {
    console.error('[RBACController] toggleUserStatus error:', error.message);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

/**
 * @route GET /api/v1/admin/activity-log
 * @desc Get moderator activity log
 */
exports.getActivityLog = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { companyId: req.user.companyId };
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      prisma.moderatorActivityLog.findMany({
        where: filter,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.moderatorActivityLog.count({ where: filter })
    ]);

    res.json({
      success: true,
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('[RBACController] getActivityLog error:', error.message);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
};

/**
 * @route GET /api/v1/admin/permissions
 * @desc Get available permissions and roles
 */
exports.getPermissionsMatrix = async (req, res) => {
  try {
    const roles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT'];

    const matrix = {};
    for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
      matrix[permission] = {};
      for (const role of roles) {
        matrix[permission][role] = allowedRoles.includes(normalizeRole(role));
      }
    }

    res.json({ success: true, roles, permissions: matrix });
  } catch (error) {
    console.error('[RBACController] getPermissionsMatrix error:', error.message);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};
