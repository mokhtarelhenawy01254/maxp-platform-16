const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeStatusAlertSettings,
  validateStatusAlertSettings,
  isStatusAlertEnabled,
  alertStatusChange,
} = require('../../services/orderStatusAlertService');
const { clearStatusAlertDedupCache } = require('../../utils/statusAlertDedup');

test('TASK 1eff9f7a: statusAlertSettings normalization, validation, and gating', async (t) => {
  t.beforeEach(() => {
    clearStatusAlertDedupCache();
  });

  await t.test('new company defaults to SHIPPED only, both channels true, 5m window', () => {
    const settings = normalizeStatusAlertSettings(undefined);
    assert.equal(settings.enabled, true);
    assert.deepEqual(settings.statuses, ['SHIPPED']);
    assert.deepEqual(settings.channels, { inApp: true, whatsapp: true });
    assert.deepEqual(settings.recipients, { roles: ['COMPANY_ADMIN', 'MANAGER'], phones: [] });
    assert.equal(settings.windowMinutes, 5);

    assert.equal(isStatusAlertEnabled(settings, 'SHIPPED'), true);
    assert.equal(isStatusAlertEnabled(settings, 'shipped'), true);
    assert.equal(isStatusAlertEnabled(settings, 'DELIVERED'), false);
    assert.equal(isStatusAlertEnabled(settings, 'CONFIRMED'), false);
  });

  await t.test('master toggle off blocks all statuses including SHIPPED', () => {
    const settings = normalizeStatusAlertSettings({ enabled: false, statuses: ['SHIPPED'] });
    assert.equal(isStatusAlertEnabled(settings, 'SHIPPED'), false);
  });

  await t.test('preserves explicit empty statuses list (locking SHIPPED off)', () => {
    const settings = normalizeStatusAlertSettings({
      enabled: true,
      statuses: [],
      channels: { inApp: true, whatsapp: false },
      recipients: { roles: [], phones: '201012345678, 201098765432\n201012345678' },
      windowMinutes: 15,
    });
    assert.deepEqual(settings.statuses, []);
    assert.deepEqual(settings.channels, { inApp: true, whatsapp: false });
    assert.deepEqual(settings.recipients.roles, []);
    assert.deepEqual(settings.recipients.phones, ['201012345678', '201098765432']);
    assert.equal(settings.windowMinutes, 15);
    assert.equal(isStatusAlertEnabled(settings, 'SHIPPED'), false);
  });

  await t.test('validates payloads cleanly', () => {
    assert.equal(validateStatusAlertSettings({ enabled: true, statuses: ['SHIPPED'], windowMinutes: 5 }).isValid, true);
    assert.equal(validateStatusAlertSettings(null).isValid, false);
    assert.equal(validateStatusAlertSettings({ statuses: 'SHIPPED' }).isValid, false);
    assert.equal(validateStatusAlertSettings({ windowMinutes: 5000 }).isValid, false);
    assert.equal(validateStatusAlertSettings({ channels: [] }).isValid, false);
    assert.equal(validateStatusAlertSettings({ recipients: { roles: 'MANAGER' } }).isValid, false);
  });

  await t.test('alertStatusChange sends in-app + WhatsApp for SHIPPED and emits zero alerts for unselected status', async () => {
    const createdNotifications = [];
    const sentWhatsApps = [];

    const stubPrisma = {
      company: {
        findUnique: async () => ({
          settings: JSON.stringify({}),
          phone: '201000000001',
          name: 'Test Co',
        }),
      },
      userCompany: { findMany: async () => [] },
      user: { findMany: async () => [] },
      hRSettings: { findUnique: async () => null },
    };

    const stubNotificationSvc = {
      createNotification: async (payload) => {
        createdNotifications.push(payload);
        return { id: 'notif-1', ...payload };
      },
    };

    const stubWhatsappSvc = {
      sendNotification: async (payload) => {
        sentWhatsApps.push(payload);
        return { success: true };
      },
    };

    const order = {
      id: 'ord-100',
      orderNumber: 'ORD-100',
      customer: { firstName: 'أحمد', lastName: 'علي' },
    };

    // Unselected status -> 0 notifications, 0 WhatsApp
    const skippedRes = await alertStatusChange({
      companyId: 'comp-1',
      order,
      oldStatus: 'SHIPPED',
      newStatus: 'DELIVERED',
      changedByName: 'محمد',
      prisma: stubPrisma,
      notificationSvc: stubNotificationSvc,
      whatsappService: stubWhatsappSvc,
      now: 1_700_000_000_000,
    });
    assert.equal(skippedRes.skipped, true);
    assert.equal(skippedRes.reason, 'status_not_enabled');
    assert.equal(createdNotifications.length, 0);
    assert.equal(sentWhatsApps.length, 0);

    // Selected default status SHIPPED -> 1 company-wide notification + 1 ADMIN ANNOUNCEMENT WhatsApp
    const sentRes = await alertStatusChange({
      companyId: 'comp-1',
      order,
      oldStatus: 'PROCESSING',
      newStatus: 'SHIPPED',
      changedByName: 'محمد',
      prisma: stubPrisma,
      notificationSvc: stubNotificationSvc,
      whatsappService: stubWhatsappSvc,
      now: 1_700_000_010_000,
    });
    assert.equal(sentRes.skipped, false);
    assert.equal(sentRes.inApp, true);
    assert.equal(sentRes.whatsapp.success, true);
    assert.equal(createdNotifications.length, 1);
    assert.equal(createdNotifications[0].type, 'order_status_alert');
    assert.equal(createdNotifications[0].userId, null);
    assert.equal(createdNotifications[0].metadata.orderId, 'ord-100');
    assert.equal(sentWhatsApps.length, 1);
    assert.equal(sentWhatsApps[0].recipientType, 'ADMIN');
    assert.equal(sentWhatsApps[0].category, 'ORDER');
    assert.equal(sentWhatsApps[0].eventType, 'ANNOUNCEMENT');

    // Second call within 5 min -> deduplicated
    const dupRes = await alertStatusChange({
      companyId: 'comp-1',
      order,
      oldStatus: 'PROCESSING',
      newStatus: 'SHIPPED',
      changedByName: 'محمد',
      prisma: stubPrisma,
      notificationSvc: stubNotificationSvc,
      whatsappService: stubWhatsappSvc,
      now: 1_700_000_020_000,
    });
    assert.equal(dupRes.skipped, true);
    assert.equal(dupRes.reason, 'deduplicated');
    assert.equal(createdNotifications.length, 1);
    assert.equal(sentWhatsApps.length, 1);
  });

  await t.test('short-circuits non-retryable WhatsApp reason and skips dedup when both channels disabled', async () => {
    let waAttempts = 0;
    const stubPrismaNoChannels = {
      company: {
        findUnique: async () => ({
          settings: JSON.stringify({
            statusAlerts: {
              enabled: true,
              statuses: ['SHIPPED'],
              channels: { inApp: false, whatsapp: false },
              recipients: { roles: [], phones: ['201011111111', '201022222222'] },
              windowMinutes: 5,
            },
          }),
        }),
      },
      userCompany: { findMany: async () => [] },
      user: { findMany: async () => [] },
      hRSettings: { findUnique: async () => null },
    };

    const order = { id: 'ord-200', orderNumber: 'ORD-200' };
    const noChannelsRes = await alertStatusChange({
      companyId: 'comp-2',
      order,
      oldStatus: 'PROCESSING',
      newStatus: 'SHIPPED',
      prisma: stubPrismaNoChannels,
      now: 1_700_000_000_000,
    });
    assert.equal(noChannelsRes.skipped, true);
    assert.equal(noChannelsRes.reason, 'no_channels_enabled');

    // Now enable WhatsApp with 2 manual phones — dedup should NOT have been consumed,
    // and non-retryable 'no_template_configured' should stop after 1st recipient.
    const stubPrismaWa = {
      company: {
        findUnique: async () => ({
          settings: JSON.stringify({
            statusAlerts: {
              enabled: true,
              statuses: ['SHIPPED'],
              channels: { inApp: false, whatsapp: true },
              recipients: { roles: [], phones: ['201011111111', '201022222222'] },
              windowMinutes: 5,
            },
          }),
        }),
      },
      userCompany: { findMany: async () => [] },
      user: { findMany: async () => [] },
      hRSettings: { findUnique: async () => null },
    };

    const waRes = await alertStatusChange({
      companyId: 'comp-2',
      order,
      oldStatus: 'PROCESSING',
      newStatus: 'SHIPPED',
      prisma: stubPrismaWa,
      whatsappService: {
        sendNotification: async () => {
          waAttempts += 1;
          return { success: false, reason: 'no_template_configured' };
        },
      },
      now: 1_700_000_001_000,
    });

    assert.equal(waRes.skipped, false);
    assert.equal(waRes.whatsapp.success, false);
    assert.equal(waRes.whatsapp.reason, 'no_template_configured');
    assert.equal(waAttempts, 1);
  });
});
