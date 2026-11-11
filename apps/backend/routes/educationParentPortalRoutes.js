const express = require('express');
const router = express.Router();
const authController = require('../controller/educationParentAuthController');
const portalController = require('../controller/educationParentPortalController');
const { authenticateParentToken } = require('../utils/verifyParentToken');
const verifyToken = require('../utils/verifyToken');
const { extractSubdomainMiddleware } = require('../middleware/subdomainMiddleware');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// 🌐 Multi-tenant Subdomain Resolution
router.use(extractSubdomainMiddleware);

// Parent auth routes
router.post('/login', authController.login);
// 🔗 تفعيل حساب ولي الأمر (عام — التوكن في الرابط)
router.get('/activate', authController.validateActivation);
router.post('/activate', authController.activateAccount);
// (أدمن) توليد رابط تفعيل لولي أمر
router.post('/activation-link',
  verifyToken.authenticateToken,
  verifyToken.requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  authController.createActivationLink);
router.get('/me', authenticateParentToken, authController.me);
router.put('/me/password', authenticateParentToken, authController.changePassword);

// Wallet routes
router.get('/wallet', authenticateParentToken, portalController.getWallet);
router.post('/wallet/topup', authenticateParentToken, portalController.topupWallet);

// Package purchase
router.get('/subjects', authenticateParentToken, portalController.getSubjects);
router.post('/purchase-package', authenticateParentToken, portalController.purchasePackage);

// Parent's children
router.get('/children', authenticateParentToken, async (req, res) => {
  try {
    const parentId = req.parent.id;
    const companyId = req.parent.companyId;
    const data = await getSharedPrismaClient().educationStudent.findMany({
      where: { customerId: parentId, companyId, isActive: true },
      include: {
        enrollments: {
          where: { companyId, remainingHours: { gt: 0 } },
          include: {
            package: { select: { id: true, name: true, hoursCount: true, price: true } },
            teacher: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ParentPortal] Children error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب بيانات الأبناء' });
  }
});

// Sessions for a specific child
router.get('/children/:studentId/sessions', authenticateParentToken, async (req, res) => {
  try {
    const parentId = req.parent.id;
    const companyId = req.parent.companyId;
    const { studentId } = req.params;

    const student = await getSharedPrismaClient().educationStudent.findFirst({
      where: { id: studentId, customerId: parentId, companyId }
    });
    if (!student) return res.status(404).json({ success: false, message: 'الطالب غير موجود' });

    const data = await getSharedPrismaClient().educationSession.findMany({
      where: { studentId, companyId },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        enrollment: { select: { id: true, remainingHours: true, totalHours: true } }
      },
      orderBy: { scheduledAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ParentPortal] Child sessions error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الحصص' });
  }
});

// Enrollments for a specific child
router.get('/children/:studentId/enrollments', authenticateParentToken, async (req, res) => {
  try {
    const parentId = req.parent.id;
    const companyId = req.parent.companyId;
    const { studentId } = req.params;

    const student = await getSharedPrismaClient().educationStudent.findFirst({
      where: { id: studentId, customerId: parentId, companyId }
    });
    if (!student) return res.status(404).json({ success: false, message: 'الطالب غير موجود' });

    const enrollments = await getSharedPrismaClient().educationEnrollment.findMany({
      where: { studentId, companyId },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            hoursCount: true,
            price: true,
            subject: { select: { id: true, name: true } }
          }
        },
        teacher: { select: { id: true, name: true } }
      },
      orderBy: { enrollmentDate: 'desc' }
    });
    const data = enrollments.map(item => ({
      ...item,
      subject: item.package?.subject || null
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ParentPortal] Child enrollments error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب التسجيلات' });
  }
});

// Dashboard stats
router.get('/dashboard', authenticateParentToken, async (req, res) => {
  try {
    const parentId = req.parent.id;
    const companyId = req.parent.companyId;
    const prisma = getSharedPrismaClient();

    const children = await prisma.educationStudent.findMany({
      where: { customerId: parentId, companyId, isActive: true },
      select: { id: true, firstName: true, lastName: true }
    });
    const childIds = children.map(c => c.id);

    const [totalEnrollments, activeEnrollments, upcomingSessions, totalSessions] = await Promise.all([
      prisma.educationEnrollment.count({ where: { companyId, studentId: { in: childIds } } }),
      prisma.educationEnrollment.count({ where: { companyId, studentId: { in: childIds }, remainingHours: { gt: 0 } } }),
      prisma.educationSession.count({ where: { companyId, studentId: { in: childIds }, status: 'SCHEDULED', scheduledAt: { gte: new Date() } } }),
      prisma.educationSession.count({ where: { companyId, studentId: { in: childIds } } })
    ]);

    res.json({
      success: true,
      data: { children: children.length, totalEnrollments, activeEnrollments, upcomingSessions, totalSessions }
    });
  } catch (error) {
    console.error('[ParentPortal] Dashboard error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الإحصائيات' });
  }
});

module.exports = router;
