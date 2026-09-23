/**
 * 🚨 System Incident Routes
 * مسارات حوادث وتنبيهات السيستم الحرجة
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const systemIncidentAlertService = require('../services/systemIncidentAlertService');

// المصادقة والتحقق من الشركة
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);

/**
 * جلب ملخص حوادث وتنبيهات السيستم الأخيرة للشركة
 * GET /api/v1/system-incidents/summary
 */
router.get('/summary', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const prisma = getSharedPrismaClient();

        const incidentTypes = [
            'system_incident',
            'order_sync_stoppage',
            'ad_campaign_stoppage',
            'automation_lifecycle'
        ];

        // جلب آخر 20 إشعار حوادث
        const incidents = await prisma.notification.findMany({
            where: {
                companyId,
                type: { in: incidentTypes }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        // عدد التنبيهات غير المقروءة
        const unreadCount = await prisma.notification.count({
            where: {
                companyId,
                type: { in: incidentTypes },
                isRead: false
            }
        });

        // تصنيف الإحصائيات
        const stats = {
            orderIncidents: incidents.filter(i => i.type === 'order_sync_stoppage').length,
            adsIncidents: incidents.filter(i => i.type === 'ad_campaign_stoppage').length,
            automationIncidents: incidents.filter(i => i.type === 'automation_lifecycle').length,
            systemIncidents: incidents.filter(i => i.type === 'system_incident').length,
            unreadCount
        };

        res.json({
            success: true,
            data: {
                stats,
                incidents
            }
        });
    } catch (error) {
        console.error('❌ [SYSTEM-INCIDENTS-API] Error fetching summary:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء جلب ملخص تنبيهات السيستم'
        });
    }
});

/**
 * إرسال إشعار تجريبي لاختبار وصول التنبيهات فوراً عبر القنوات
 * POST /api/v1/system-incidents/test
 */
router.post('/test', verifyToken.requireRole(['OWNER', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { scenario = 'order_stoppage' } = req.body || {};

        let testConfig = {};

        switch (scenario) {
            case 'order_stoppage':
                testConfig = {
                    incidentType: systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE,
                    title: '🚨 تنبيه تجريبي: توقف نزول الأوردرات',
                    message: 'هذا إشعار تجريبي لاختبار تنبيهات توقف المزامنة وركود الطلبات بالمتجر.',
                    severity: systemIncidentAlertService.SEVERITIES.CRITICAL,
                    url: '/orders'
                };
                break;

            case 'ads_stoppage':
                testConfig = {
                    incidentType: systemIncidentAlertService.INCIDENT_TYPES.AD_CAMPAIGN_STOPPED,
                    title: '⚠️ تنبيه تجريبي: توقف الإعلانات / ميزانية منتهية',
                    message: 'هذا إشعار تجريبي لاختبار تنبيهات توقف حملات Meta Ads ونفاد الرصيد.',
                    severity: systemIncidentAlertService.SEVERITIES.WARNING,
                    url: '/facebook-ads'
                };
                break;

            case 'automation_ended':
                testConfig = {
                    incidentType: systemIncidentAlertService.INCIDENT_TYPES.AUTOMATION_ENDED,
                    title: '✅ تنبيه تجريبي: اكتمال خطوات الأتمتة',
                    message: 'هذا إشعار تجريبي لاختبار تنبيهات انتهاء جميع خطوات أتمتة المتابعة للعميل.',
                    severity: systemIncidentAlertService.SEVERITIES.INFO,
                    url: '/whatsapp-automation'
                };
                break;

            case 'automation_step_failed':
                testConfig = {
                    incidentType: systemIncidentAlertService.INCIDENT_TYPES.AUTOMATION_STEP_FAILED,
                    title: '⚠️ تنبيه تجريبي: تعثر إرسال خطوة أتمتة',
                    message: 'هذا إشعار تجريبي لاختبار تنبيهات فشل تسليم رسائل أتمتة المتابعة للعميل.',
                    severity: systemIncidentAlertService.SEVERITIES.WARNING,
                    url: '/whatsapp-automation'
                };
                break;

            case 'whatsapp_disconnected':
                testConfig = {
                    incidentType: systemIncidentAlertService.INCIDENT_TYPES.WHATSAPP_DISCONNECTED,
                    title: '🚨 تنبيه تجريبي: انقطاع رقم الواتساب',
                    message: 'هذا إشعار تجريبي لاختبار إنذار خروج وانقطاع جلسة الواتساب وتوقف البوت.',
                    severity: systemIncidentAlertService.SEVERITIES.CRITICAL,
                    url: '/whatsapp'
                };
                break;

            default:
                testConfig = {
                    incidentType: systemIncidentAlertService.INCIDENT_TYPES.SYSTEM_ERROR,
                    title: '🚨 تنبيه تجريبي: خطأ في السيستم',
                    message: 'هذا إشعار تجريبي لاختبار إنذارات حوادث السيستم الشاملة.',
                    severity: systemIncidentAlertService.SEVERITIES.WARNING,
                    url: '/notification-settings'
                };
        }

        const result = await systemIncidentAlertService.dispatchIncident({
            companyId,
            ...testConfig,
            force: true, // تجاوز الـ Cooldown للتجربة
            metadata: {
                testTriggeredBy: req.user?.email || req.user?.id,
                scenario
            }
        });

        res.json({
            success: true,
            message: 'تم إرسال الإشعار التجريبي بنجاح عبر كافة القنوات',
            data: result
        });
    } catch (error) {
        console.error('❌ [SYSTEM-INCIDENTS-API] Error sending test incident:', error);
        res.status(500).json({
            success: false,
            error: 'فشل إرسال الإشعار التجريبي: ' + error.message
        });
    }
});

module.exports = router;
