const express = require('express');
const request = require('supertest');
const appVersionRoutes = require('../../routes/appVersionRoutes');

describe('App Version Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
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

  describe('GET /api/v1/app/version/android', () => {
    it('returns 200 with Android version metadata and download URL', async () => {
      const res = await request(app).get('/api/v1/app/version/android');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
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
  });

  describe('GET /api/v1/app/version?platform=android', () => {
    it('handles query parameter platform=android properly', async () => {
      const res = await request(app).get('/api/v1/app/version?platform=android');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.platform).toBe('android');
      expect(res.body.data.latestVersion).toBeDefined();
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
