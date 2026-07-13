const moderatorDashboardService = require('../services/moderatorDashboardService');

/**
 * @route GET /api/v1/moderator-dashboard
 * @desc Get dashboard data for current user
 */
exports.getMyDashboard = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const data = await moderatorDashboardService.getDashboardData(
      req.user.companyId,
      req.user.id,
      req.user.role,
      sessionId || null
    );
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[DashboardController] getMyDashboard error:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

/**
 * @route GET /api/v1/moderator-dashboard/admin
 * @desc Get admin overview dashboard (all numbers)
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const data = await moderatorDashboardService.getAllAdminDashboard(
      req.user.companyId
    );
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[DashboardController] getAdminDashboard error:', error.message);
    res.status(500).json({ error: 'Failed to fetch admin dashboard' });
  }
};

/**
 * @route GET /api/v1/moderator-dashboard/team/:teamId
 * @desc Get team dashboard for Team Leader
 */
exports.getTeamDashboard = async (req, res) => {
  try {
    const { teamId } = req.params;
    const data = await moderatorDashboardService.getTeamDashboard(
      req.user.companyId,
      teamId
    );
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[DashboardController] getTeamDashboard error:', error.message);
    res.status(500).json({ error: 'Failed to fetch team dashboard' });
  }
};
