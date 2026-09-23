const systemIncidentAlertService = require('../../services/systemIncidentAlertService');
const socketService = require('../../services/socketService');
const { sendBrowserPushToCompany } = require('../../services/browserPushService');
const telegramAlertService = require('../../services/telegramAlertService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/socketService', () => ({
    getIO: jest.fn()
}));

jest.mock('../../services/browserPushService', () => ({
    sendBrowserPushToCompany: jest.fn()
}));

jest.mock('../../services/telegramAlertService', () => ({
    sendAlert: jest.fn()
}));

describe('SystemIncidentAlertService', () => {
    let mockPrisma;
    let mockIo;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPrisma = {
            company: {
                findUnique: jest.fn().mockResolvedValue({ id: 'comp_1', name: 'متجر تجريبي' })
            },
            notification: {
                create: jest.fn().mockResolvedValue({
                    id: 'notif_123',
                    title: 'تنبيه تجريبي',
                    message: 'تفاصيل المشكلة',
                    companyId: 'comp_1',
                    createdAt: new Date()
                })
            }
        };
        getSharedPrismaClient.mockReturnValue(mockPrisma);

        mockIo = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn()
            })
        };
        socketService.getIO.mockReturnValue(mockIo);

        sendBrowserPushToCompany.mockResolvedValue({ attempted: 2, sent: 2, failed: 0 });
        telegramAlertService.sendAlert.mockResolvedValue(true);

        // Reset cooldowns
        systemIncidentAlertService.cooldowns.clear();
    });

    test('should reject dispatch if companyId is missing', async () => {
        const result = await systemIncidentAlertService.dispatchIncident({
            incidentType: systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE,
            title: 'تنبيه',
            message: 'رسالة'
        });

        expect(result.sent).toBe(false);
        expect(result.reason).toBe('missing_company_id');
        expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    test('should successfully dispatch incident across DB, Socket, WebPush, and Telegram', async () => {
        const result = await systemIncidentAlertService.dispatchIncident({
            companyId: 'comp_1',
            incidentType: systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE,
            title: '⚠️ تعطل مزامنة أوردرات WooCommerce',
            message: 'توقفت الأوردرات عن النزول بسبب خطأ 500 في السيرفر',
            severity: systemIncidentAlertService.SEVERITIES.CRITICAL,
            entityId: 'store_123',
            url: '/orders'
        });

        expect(result.sent).toBe(true);
        expect(result.dispatchResults.db).toBe(true);
        expect(result.dispatchResults.socket).toBe(true);
        expect(result.dispatchResults.browserPush).toBe(true);
        expect(result.dispatchResults.telegram).toBe(true);

        // Verify DB create
        expect(mockPrisma.notification.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                companyId: 'comp_1',
                userId: null,
                title: '⚠️ تعطل مزامنة أوردرات WooCommerce',
                type: 'order_sync_stoppage'
            })
        });

        // Verify Socket emit to company room
        expect(mockIo.to).toHaveBeenCalledWith('company_comp_1');

        // Verify Web Push
        expect(sendBrowserPushToCompany).toHaveBeenCalledWith(expect.objectContaining({
            companyId: 'comp_1',
            typeId: 'order_sync_stoppage',
            title: '⚠️ تعطل مزامنة أوردرات WooCommerce'
        }));

        // Verify Telegram
        expect(telegramAlertService.sendAlert).toHaveBeenCalledWith(
            expect.stringContaining('[SYSTEM ALERT - ORDER_SYNC_STOPPAGE]')
        );
    });

    test('should respect cooldown and suppress duplicate incidents', async () => {
        // First dispatch
        const res1 = await systemIncidentAlertService.dispatchIncident({
            companyId: 'comp_1',
            incidentType: systemIncidentAlertService.INCIDENT_TYPES.AD_CAMPAIGN_STOPPED,
            title: 'توقف الإعلان',
            message: 'نفدت الميزانية',
            entityId: 'camp_456'
        });
        expect(res1.sent).toBe(true);

        // Second dispatch within cooldown window
        const res2 = await systemIncidentAlertService.dispatchIncident({
            companyId: 'comp_1',
            incidentType: systemIncidentAlertService.INCIDENT_TYPES.AD_CAMPAIGN_STOPPED,
            title: 'توقف الإعلان',
            message: 'نفدت الميزانية',
            entityId: 'camp_456'
        });
        expect(res2.sent).toBe(false);
        expect(res2.reason).toBe('in_cooldown');

        // Force dispatch should bypass cooldown
        const res3 = await systemIncidentAlertService.dispatchIncident({
            companyId: 'comp_1',
            incidentType: systemIncidentAlertService.INCIDENT_TYPES.AD_CAMPAIGN_STOPPED,
            title: 'توقف الإعلان',
            message: 'نفدت الميزانية',
            entityId: 'camp_456',
            force: true
        });
        expect(res3.sent).toBe(true);
    });

    test('should handle automation ended incident correctly', async () => {
        const result = await systemIncidentAlertService.dispatchIncident({
            companyId: 'comp_1',
            incidentType: systemIncidentAlertService.INCIDENT_TYPES.AUTOMATION_ENDED,
            title: '✅ اكتمال خطوات الأتمتة',
            message: 'تم إنهاء جميع خطوات المتابعة للعميل أحمد',
            severity: systemIncidentAlertService.SEVERITIES.INFO,
            entityId: 'journey_789'
        });

        expect(result.sent).toBe(true);
        expect(mockPrisma.notification.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                type: 'automation_lifecycle',
                title: '✅ اكتمال خطوات الأتمتة'
            })
        });
    });
});
