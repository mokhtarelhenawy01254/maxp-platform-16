const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

router.use(verifyToken.authenticateToken);

/**
 * @route GET /api/v1/team/members
 * @desc Get company team members (id, name, role, phone) for authorized users
 */
router.get('/members', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة غير متوفر',
        code: 'NO_COMPANY_ID'
      });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } }
        ],
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatar: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const members = users.map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'عضو فريق',
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role || 'MEMBER',
      phone: u.phone || '',
      email: u.email || '',
      avatar: u.avatar || null
    }));

    return res.status(200).json({
      success: true,
      data: members,
      members,
      count: members.length
    });
  } catch (error) {
    console.error('[TeamRoutes] GET /members error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب أعضاء فريق العمل'
    });
  }
});

module.exports = router;
