/**
 * Agent Reports Acceptance Test Suite (Ticket AR-1)
 *
 * Verifies:
 * Gate 2: Isolation & multi-tenant security:
 *   - No auth -> 401
 *   - No app access -> 403
 *   - Cross-company access -> 404
 *   - Super admin with companyId -> 200
 * Gate 3: Real Upload of large self-contained HTML (0.5MB - 2MB):
 *   - POST /reports returns 201 with generated slug & sizeBytes
 *   - GET /reports/:id/html returns exact identical raw HTML content (byte-matching)
 * Gate 4: Sorting & Pagination:
 *   - 3 reports in type -> returned newest first (createdAt DESC) and total=3
 * Gate 5: Deleting type with existing reports -> 409 Conflict
 * Guard: HTML > 12MB -> 400 with Arabic error message
 * Guard: Empty HTML -> 400 with Arabic error message
 */

const mockPrisma = {
  agentReportType: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  agentReport: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-1',
  companyId: 'company-1',
  role: 'COMPANY_ADMIN',
  name: 'Merchant Admin',
};

let appAccessGranted = true;

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    if (!mockUser) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }
    req.user = { ...mockUser };
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => {
  const checkAppAccess = (slug) => (req, res, next) => {
    if (req.user?.role === 'SUPER_ADMIN') {
      return next();
    }
    if (!appAccessGranted) {
      return res.status(403).json({ success: false, message: `تطبيق ${slug} غير مفعّل` });
    }
    next();
  };
  checkAppAccess.checkAppAccess = checkAppAccess;
  return checkAppAccess;
});

const express = require('express');
const request = require('supertest');
const agentReportsRoutes = require('../../routes/agentReportsRoutes');

const app = express();
app.use('/api/v1/agent-reports', agentReportsRoutes);

describe('Ticket AR-1 — Agent Reports Acceptance Gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appAccessGranted = true;
    mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      role: 'COMPANY_ADMIN',
      name: 'Merchant Admin',
    };
  });

  describe('Gate 2: Isolation & Multi-Tenant Security', () => {
    test('Without token / unauthenticated -> 401', async () => {
      mockUser = null;
      const res = await request(app).get('/api/v1/agent-reports/types');
      expect(res.status).toBe(401);
    });

    test('Company without app access -> 403', async () => {
      appAccessGranted = false;
      const res = await request(app).get('/api/v1/agent-reports/types');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Cross-tenant access: accessing report belonging to another company -> 404', async () => {
      // User is from company-1, report in DB belongs to company-2
      mockPrisma.agentReport.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/agent-reports/reports/report-other-tenant');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(mockPrisma.agentReport.findFirst).toHaveBeenCalledWith({
        where: { id: 'report-other-tenant', companyId: 'company-1' },
        include: expect.any(Object),
      });
    });

    test('SUPER_ADMIN can pass companyId query param and access company types -> 200', async () => {
      mockUser = {
        id: 'super-admin-1',
        role: 'SUPER_ADMIN',
        name: 'Super Admin',
      };
      mockPrisma.agentReportType.count.mockResolvedValue(1);
      mockPrisma.agentReportType.findMany.mockResolvedValue([
        {
          id: 'type-c2-1',
          companyId: 'company-2',
          slug: 'ai-update',
          name: 'إبديت الذكاء الاصطناعي',
          reportsCount: 0,
          _count: { reports: 0 },
        },
      ]);

      const res = await request(app).get('/api/v1/agent-reports/types?companyId=company-2');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.agentReportType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'company-2', isActive: true },
        }),
      );
    });
  });

  describe('Gate 3: Real Upload of large self-contained HTML (0.5MB - 2MB)', () => {
    test('POST /reports with ~1MB HTML -> 201, sizeBytes calculated, GET /html returns identical content', async () => {
      // Build a realistic self-contained HTML payload of ~1MB (1,048,576 bytes)
      const repeatCount = 20000;
      const repeatedRow = '<tr><td>Metric Item</td><td>98.5%</td><td>Active</td></tr>\n';
      const largeHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>تقرير الذكاء الاصطناعي الضخم</title>
  <style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; }</style>
</head>
<body>
  <h1>تقرير الأداء التشغيلي المجمع</h1>
  <table>
    <thead><tr><th>المؤشر</th><th>النسبة</th><th>الحالة</th></tr></thead>
    <tbody>
      ${repeatedRow.repeat(repeatCount)}
    </tbody>
  </table>
  <footer>نهاية التقرير المكتفي بذاته</footer>
</body>
</html>`;

      const expectedBytes = Buffer.byteLength(largeHtml, 'utf8');
      expect(expectedBytes).toBeGreaterThanOrEqual(500 * 1024); // >= 0.5MB
      expect(expectedBytes).toBeLessThanOrEqual(2 * 1024 * 1024); // <= 2MB

      const typeMock = {
        id: 'type-ai-1',
        companyId: 'company-1',
        slug: 'ai-update',
        name: 'إبديت الذكاء الاصطناعي',
      };
      mockPrisma.agentReportType.findFirst.mockResolvedValue(typeMock);

      let savedReportData = null;
      mockPrisma.agentReport.create.mockImplementation(async ({ data }) => {
        savedReportData = {
          id: 'report-large-123',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: { id: typeMock.id, slug: typeMock.slug, name: typeMock.name, icon: 'sparkles' },
        };
        return savedReportData;
      });

      // 1. Upload report
      const uploadRes = await request(app)
        .post('/api/v1/agent-reports/reports')
        .send({
          typeId: 'type-ai-1',
          title: 'تقرير تشغيل الذكاء الاصطناعي الأسبوعي',
          periodLabel: '2026-11-03',
          summary: 'تقرير يضم أكثر من 20,000 سجل تم تحليله بالكامل.',
          html: largeHtml,
        });

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.sizeBytes).toBe(expectedBytes);
      expect(uploadRes.body.data.slug).toMatch(/^ai-update-\d{4}-\d{2}-\d{2}-[a-f0-9]{6}$/);

      // 2. Fetch raw HTML via GET /reports/:id/html
      mockPrisma.agentReport.findFirst.mockResolvedValue({
        id: 'report-large-123',
        companyId: 'company-1',
        slug: uploadRes.body.data.slug,
        html: largeHtml,
      });

      const htmlRes = await request(app).get('/api/v1/agent-reports/reports/report-large-123/html');
      expect(htmlRes.status).toBe(200);
      expect(htmlRes.headers['content-type']).toContain('text/html');
      expect(htmlRes.text.length).toBe(largeHtml.length);
      // Byte-for-byte identity check
      expect(Buffer.from(htmlRes.text).equals(Buffer.from(largeHtml))).toBe(true);
      // Check start and end bytes
      expect(htmlRes.text.startsWith('<!DOCTYPE html>')).toBe(true);
      expect(htmlRes.text.endsWith('</html>')).toBe(true);
    });

    test('POST /reports with HTML > 12MB -> 400 error in Arabic', async () => {
      // Create string > 12MB (e.g. 12.5MB)
      const oversizedHtml = 'A'.repeat(12.5 * 1024 * 1024);

      const res = await request(app)
        .post('/api/v1/agent-reports/reports')
        .send({
          typeSlug: 'ai-update',
          title: 'تقرير متضخم جدا',
          html: oversizedHtml,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('12 ميجابايت');
    });

    test('POST /reports with empty HTML -> 400 error in Arabic', async () => {
      const res = await request(app)
        .post('/api/v1/agent-reports/reports')
        .send({
          typeSlug: 'ai-update',
          title: 'تقرير بدون محتوى',
          html: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('محتوى التقرير (HTML) مطلوب');
    });
  });

  describe('Gate 4: Sorting & Pagination', () => {
    test('Type with 3 reports returns newest first and total=3', async () => {
      const d1 = new Date('2026-11-01T10:00:00Z');
      const d2 = new Date('2026-11-02T10:00:00Z');
      const d3 = new Date('2026-11-03T10:00:00Z');

      const mockItems = [
        { id: 'rep-3', title: 'تقرير 3 الأحدث', createdAt: d3, typeId: 'type-1' },
        { id: 'rep-2', title: 'تقرير 2 الأوسط', createdAt: d2, typeId: 'type-1' },
        { id: 'rep-1', title: 'تقرير 1 الأقدم', createdAt: d1, typeId: 'type-1' },
      ];

      mockPrisma.agentReport.findMany.mockResolvedValue(mockItems);
      mockPrisma.agentReport.count.mockResolvedValue(3);

      const res = await request(app).get('/api/v1/agent-reports/reports?typeId=type-1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.items.length).toBe(3);
      // Newest first
      expect(res.body.data.items[0].id).toBe('rep-3');
      expect(res.body.data.items[1].id).toBe('rep-2');
      expect(res.body.data.items[2].id).toBe('rep-1');
      // Ordered by createdAt: 'desc'
      expect(mockPrisma.agentReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('Gate 5: Deleting Type with Reports', () => {
    test('DELETE /types/:id when type has reports -> 409 Conflict', async () => {
      mockPrisma.agentReportType.findFirst.mockResolvedValue({
        id: 'type-with-reports',
        companyId: 'company-1',
        name: 'نوع به تقارير',
        _count: { reports: 5 },
      });

      const res = await request(app).delete('/api/v1/agent-reports/types/type-with-reports');
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('لا يمكن حذف نوع التقرير لوجود تقارير مرتبطة به');
      expect(mockPrisma.agentReportType.delete).not.toHaveBeenCalled();
    });

    test('DELETE /types/:id when type has 0 reports -> 200 Success', async () => {
      mockPrisma.agentReportType.findFirst.mockResolvedValue({
        id: 'type-empty',
        companyId: 'company-1',
        name: 'نوع فارغ',
        _count: { reports: 0 },
      });
      mockPrisma.agentReportType.delete.mockResolvedValue({ id: 'type-empty' });

      const res = await request(app).delete('/api/v1/agent-reports/types/type-empty');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.agentReportType.delete).toHaveBeenCalledWith({
        where: { id: 'type-empty' },
      });
    });
  });
});
