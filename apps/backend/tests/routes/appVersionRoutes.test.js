const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');

const mockGetSharedPrismaClient = jest.fn();
jest.mock('../../services/sharedDatabase', () => {
  const actual = jest.requireActual('../../services/sharedDatabase');
  return {
    ...actual,
    getSharedPrismaClient: (...args) => mockGetSharedPrismaClient(...args),
  };
});

const sharedDatabaseActual = jest.requireActual('../../services/sharedDatabase');
const appVersionRoutes = require('../../routes/appVersionRoutes');

describe('App Version Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    mockGetSharedPrismaClient.mockReset();
    mockGetSharedPrismaClient.mockImplementation(() =>
      sharedDatabaseActual.getSharedPrismaClient(),
    );
    app = express();
    app.use(express.json());
    app.use('/api/v1/app/version', appVersionRoutes);
    app.use('/api/v1/version', (req, res) => {
      res.status(200).json({
        status: 'OK',
        version: '1.0.0',
        service: 'maxp-backend',
        timestamp: new Date().toISOString(),
      });
    });
  });

  afterEach(() => {
    delete process.env.MAXP_DOWNLOADS_DIR;
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/app/version/android', () => {
    it('returns 200 with Android version metadata and download URL', async () => {
      const res = await request(app).get('/api/v1/app/version/android');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.source).toBeDefined();
      expect(['default', 'db']).toContain(res.body.source);
      expect(res.body.data).toBeDefined();

      const { data } = res.body;
      expect(data.platform).toBe('android');
      expect(data.appName).toBe('MaxP');
      expect(data.appId).toBe('online.maxp.app');
      expect(typeof data.latestVersion).toBe('string');
      expect(typeof data.latestVersionCode).toBe('number');
      expect(typeof data.forceUpdate).toBe('boolean');
      expect(data.downloadUrl).toMatch(/https:\/\/maxp\.online\/(?:download|downloads)\/maxp\.apk/);
      expect(data.releaseNotesAr).toBeDefined();
    });

    it('supports multi-app flavors via ?app= and ?flavor= (parent, portal, courier, customer)', async () => {
      const expected = [
        { query: 'app=parent', appId: 'online.maxp.parent', apk: 'maxp-parent.apk', appName: 'بوابة ولي الأمر - MaxP' },
        { query: 'app=student', appId: 'online.maxp.student', apk: 'maxp-parent.apk', appName: 'بوابة الطالب - MaxP' },
        { query: 'flavor=portal', appId: 'online.maxp.portal', apk: 'maxp-portal.apk', appName: 'بوابات MaxP' },
        { query: 'app=doctor', appId: 'online.maxp.doctor', apk: 'maxp-portal.apk', appName: 'بوابة الطبيب - MaxP' },
        { query: 'app=patient', appId: 'online.maxp.patient', apk: 'maxp-portal.apk', appName: 'بوابة المريض - MaxP' },
        { query: 'app=dental', appId: 'online.maxp.dental', apk: 'maxp-portal.apk', appName: 'بوابة معامل الأسنان - MaxP' },
        { query: 'app=courier', appId: 'online.maxp.courier', apk: 'maxp-courier.apk', appName: 'مندوب ماكس بي' },
        { query: 'flavor=customer', appId: 'online.maxp.customer', apk: 'maxp-customer.apk', appName: 'ماكس بي للشحن والعملاء' },
      ];

      for (const item of expected) {
        const res = await request(app).get(`/api/v1/app/version/android?${item.query}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.appId).toBe(item.appId);
        expect(res.body.data.appName).toBe(item.appName);
        expect(res.body.data.downloadUrl).toBe(`https://maxp.online/downloads/${item.apk}`);
        expect(res.body.data.latestVersion).toBe('1.0.0');
        expect(res.body.data.latestVersionCode).toBe(1);
      }
    });

    it('overrides stale defaults with CI-published latest-android-<app>.json metadata when present on disk', async () => {
      const tmpDownloads = fs.mkdtempSync(path.join(os.tmpdir(), 'maxp-dl-test-'));
      process.env.MAXP_DOWNLOADS_DIR = tmpDownloads;
      fs.writeFileSync(
        path.join(tmpDownloads, 'latest-android-parent.json'),
        JSON.stringify({
          latestVersion: '1.0.4',
          latestVersionCode: 5,
          releaseNotesEn: 'CI build #5',
        }),
        'utf8',
      );

      try {
        const res = await request(app).get('/api/v1/app/version/android?app=parent');
        expect(res.status).toBe(200);
        expect(res.body.data.appId).toBe('online.maxp.parent');
        expect(res.body.data.latestVersion).toBe('1.0.4');
        expect(res.body.data.latestVersionCode).toBe(5);
        expect(res.body.data.releaseNotesEn).toBe('CI build #5');
      } finally {
        fs.rmSync(tmpDownloads, { recursive: true, force: true });
      }
    });

    it('reads per-flavor systemSettings key android_app_version_<app> and android_app_version for maxp', async () => {
      const findUniqueMock = jest.fn(async ({ where }) => {
        if (where.systemName === 'android_app_version_parent') {
          return {
            isEnabled: true,
            updatedAt: '2026-11-12T00:00:00.000Z',
            config: JSON.stringify({ latestVersion: '1.1.0', latestVersionCode: 9, forceUpdate: true }),
          };
        }
        return null;
      });
      mockGetSharedPrismaClient.mockReturnValue({
        systemSettings: { findUnique: findUniqueMock },
      });

      const parentRes = await request(app).get('/api/v1/app/version/android?app=parent');
      expect(findUniqueMock).toHaveBeenCalledWith({ where: { systemName: 'android_app_version_parent' } });
      expect(parentRes.body.source).toBe('db');
      expect(parentRes.body.data.latestVersion).toBe('1.1.0');
      expect(parentRes.body.data.latestVersionCode).toBe(9);
      expect(parentRes.body.data.forceUpdate).toBe(true);

      const mainRes = await request(app).get('/api/v1/app/version/android');
      expect(findUniqueMock).toHaveBeenCalledWith({ where: { systemName: 'android_app_version' } });
      expect(mainRes.body.source).toBe('default');
      expect(mainRes.body.data.appId).toBe('online.maxp.app');
    });
  });

  describe('GET /api/v1/app/version & GET /api/v1/app/version/latest', () => {
    it('handles query parameter platform=android and ?app= properly', async () => {
      const res = await request(app).get('/api/v1/app/version?platform=android');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.platform).toBe('android');
      expect(res.body.data.latestVersion).toBeDefined();

      const parentRes = await request(app).get('/api/v1/app/version?platform=android&app=parent');
      expect(parentRes.status).toBe(200);
      expect(parentRes.body.data.appId).toBe('online.maxp.parent');

      const latestRes = await request(app).get('/api/v1/app/version/latest?flavor=courier');
      expect(latestRes.status).toBe(200);
      expect(latestRes.body.success).toBe(true);
      expect(latestRes.body.data.appId).toBe('online.maxp.courier');
    });
  });

  describe('GET /api/v1/version', () => {
    it('returns general system version information', async () => {
      const res = await request(app).get('/api/v1/version');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.service).toBe('maxp-backend');
    });
  });
});
