jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');

  return {
    ...actualFs,
    existsSync: jest.fn((targetPath) => {
      const normalizedPath = String(targetPath || '').replace(/\\/g, '/');
      if (
        normalizedPath.endsWith('/backend/.env') ||
        normalizedPath.endsWith('/backend/.env.local')
      ) {
        return false;
      }

      return actualFs.existsSync(targetPath);
    }),
  };
});

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => {
    throw new Error('Prisma should not be used when VAPID keys are missing');
  }),
}));

describe('browserPushService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.WEB_PUSH_PUBLIC_KEY;
    delete process.env.WEB_PUSH_PRIVATE_KEY;
    delete process.env.WEB_PUSH_SUBJECT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test('sendBrowserPushToCompany skips cleanly when VAPID keys are not configured', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getSharedPrismaClient } = require('../../services/sharedDatabase');
    const { sendBrowserPushToCompany } = require('../../services/browserPushService');

    const result = await sendBrowserPushToCompany({
      companyId: 'company-1',
      typeId: 'customer_message',
      title: 'رسالة جديدة',
      body: 'لديك رسالة جديدة من عميل',
    });

    expect(result).toEqual({
      attempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      disabled: true,
      reason: 'missing_vapid_keys',
    });
    expect(getSharedPrismaClient).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '⚠️ [WEB-PUSH] VAPID keys are not configured. Browser push delivery will stay disabled.',
    );
  });

  test('missing VAPID keys warning is logged only once per process', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { sendBrowserPushToCompany, sendBrowserPushToUser } = require('../../services/browserPushService');

    await sendBrowserPushToCompany({
      companyId: 'company-1',
      typeId: 'customer_message',
      title: 'رسالة جديدة',
      body: 'لديك رسالة جديدة من عميل',
    });

    await sendBrowserPushToUser({
      companyId: 'company-1',
      userId: 'user-1',
      typeId: 'order_created',
      title: 'طلب جديد',
      body: 'تم استلام طلب جديد',
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
