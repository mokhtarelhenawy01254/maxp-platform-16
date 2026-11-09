const controller = require('../../controller/educationSettingsController');

describe('educationSettingsController tests', () => {
  let mockCompany;
  let mockCompanyApp;
  let mockPrisma;

  beforeEach(() => {
    mockCompany = {
      id: 'comp-123',
      settings: JSON.stringify({
        currency: 'EGP',
        sidebarSettings: [
          { key: 'dashboard', order: 0, visible: true, labelAr: 'لوحة التحكم' }
        ]
      })
    };

    mockCompanyApp = {
      id: 'ca-1',
      companyId: 'comp-123',
      appId: 'education-app',
      customName: null
    };

    mockPrisma = {
      company: {
        findUnique: jest.fn(async () => ({ ...mockCompany })),
        update: jest.fn(async ({ data }) => {
          mockCompany.settings = data.settings;
          return { ...mockCompany };
        })
      },
      companyApp: {
        findFirst: jest.fn(async () => mockCompanyApp),
        updateMany: jest.fn(async ({ data }) => {
          if (mockCompanyApp) {
            mockCompanyApp.customName = data.customName;
          }
          return { count: 1 };
        })
      }
    };

    jest.spyOn(require('../../services/sharedDatabase'), 'getSharedPrismaClient').mockReturnValue(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getSettings returns default system title and tabs when no settings are saved', async () => {
    const req = {
      user: { id: 'user-1', role: 'OWNER', companyId: 'comp-123' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await controller.getSettings(req, res);

    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data.systemTitle).toBe('النظام التعليمي');
    expect(Array.isArray(result.data.tabs)).toBe(true);
    expect(result.data.tabs.length).toBe(controller.DEFAULT_EDUCATION_TABS.length);

    // Verify key tabs exist
    const tabIds = result.data.tabs.map(t => t.id);
    expect(tabIds).toContain('dashboard');
    expect(tabIds).toContain('subjects');
    expect(tabIds).toContain('packages');
    expect(tabIds).toContain('students');
    expect(tabIds).toContain('teachers');
    expect(tabIds).toContain('teacher-schedule');
    expect(tabIds).toContain('teacher-payments');
    expect(tabIds).toContain('sessions');
    expect(tabIds).toContain('calendar');
    expect(tabIds).toContain('funnel');
    expect(tabIds).toContain('settings');
  });

  test('updateSettings updates systemTitle and tabs, syncing into company.settings and companyApp', async () => {
    const req = {
      user: { id: 'user-1', role: 'OWNER', companyId: 'comp-123' },
      body: {
        systemTitle: 'أكاديمية البرمجة الهندسية',
        systemTitleEn: 'Engineering Academy',
        tabs: [
          {
            id: 'teachers',
            labelAr: 'المحاضرين والمدربين',
            labelEn: 'Instructors',
            visible: true,
            order: 0
          },
          {
            id: 'teacher-payments',
            labelAr: 'المستحقات المالية',
            labelEn: 'Instructor Payroll',
            visible: false,
            order: 1
          }
        ]
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await controller.updateSettings(req, res);

    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data.systemTitle).toBe('أكاديمية البرمجة الهندسية');
    expect(mockCompanyApp.customName).toBe('أكاديمية البرمجة الهندسية');

    // Verify persisted in mockCompany.settings
    const saved = JSON.parse(mockCompany.settings);
    expect(saved.currency).toBe('EGP'); // preserved existing settings
    expect(saved.educationSettings.systemTitle).toBe('أكاديمية البرمجة الهندسية');

    const teachersTab = saved.educationSettings.tabs.find(t => t.id === 'teachers');
    expect(teachersTab.labelAr).toBe('المحاضرين والمدربين');

    const paymentsTab = saved.educationSettings.tabs.find(t => t.id === 'teacher-payments');
    expect(paymentsTab.visible).toBe(false);

    // Verify synced into sidebarSettings
    expect(Array.isArray(saved.sidebarSettings)).toBe(true);
    const sidebarTeachers = saved.sidebarSettings.find(s => s.key === '/admin/education/teachers');
    expect(sidebarTeachers).toBeDefined();
    expect(sidebarTeachers.labelAr).toBe('المحاضرين والمدربين');
    expect(sidebarTeachers.visible).toBe(true);

    const sidebarPayments = saved.sidebarSettings.find(s => s.key === '/admin/education/teacher-payments');
    expect(sidebarPayments).toBeDefined();
    expect(sidebarPayments.visible).toBe(false);

    // Verify main section item in sidebar
    const sidebarSection = saved.sidebarSettings.find(s => s.key === 'education');
    expect(sidebarSection).toBeDefined();
    expect(sidebarSection.labelAr).toBe('أكاديمية البرمجة الهندسية');
  });

  test('updateSettings blocks unauthorized non-admin employee', async () => {
    const req = {
      user: { id: 'user-2', role: 'EMPLOYEE', permissions: [], companyId: 'comp-123' },
      body: { systemTitle: 'اختراق' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await controller.updateSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(false);
  });
});
