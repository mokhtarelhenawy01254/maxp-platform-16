const test = require('node:test');
const assert = require('node:assert');
const sharedDb = require('../../services/sharedDatabase');

test('settingsRoutes GET /sidebar & educationSettingsRoutes integration (node:test)', async (t) => {
  const originalGetSharedPrisma = sharedDb.getSharedPrismaClient;

  await t.test('educationSettingsRoutes mounts authenticateToken, requireEducationAppInstalled, and requireSettingsManage', async () => {
    const educationSettingsRoutes = require('../../routes/educationSettingsRoutes');
    const getLayer = educationSettingsRoutes.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.get);
    const putLayer = educationSettingsRoutes.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.put);

    assert.ok(getLayer, 'GET / route should exist');
    assert.ok(putLayer, 'PUT / route should exist');
    // GET has authenticateToken, requireEducationAppInstalled, getSettings
    assert.strictEqual(getLayer.route.stack.length, 3);
    // PUT has authenticateToken, requireEducationAppInstalled, requireSettingsManage, updateSettings
    assert.strictEqual(putLayer.route.stack.length, 4);
  });

  await t.test('settingsRoutes GET /sidebar returns educationSettings and avoids mutating Array items', async () => {
    const mockCompanyData = {
      id: 'comp-sidebar-1',
      sidebarLayout: 'classic',
      settings: JSON.stringify({
        educationSettings: {
          systemTitle: 'أكاديمية التجربة',
          systemTitleEn: 'Trial Academy',
          educationMode: 'ACADEMIC',
          enableSubjects: true,
          tabs: [
            { id: 'teachers', labelAr: 'المدربين', labelEn: 'Coaches', visible: true, order: 0, iconName: 'Users' }
          ]
        },
        sidebarSettings: {
          sections: { education: { visible: true, order: 1 } },
          items: [{ key: 'existing-array-item', visible: true, order: 0 }]
        }
      })
    };

    sharedDb.getSharedPrismaClient = () => ({
      company: {
        findUnique: async () => ({ ...mockCompanyData })
      },
      companyApp: {
        findMany: async () => ([
          {
            id: 'ca-edu',
            appId: 'education-app',
            customName: 'أكاديمية التجربة',
            app: { id: 'app-1', slug: 'education-app', name: 'Education', category: 'education', icon: null, logo: null }
          }
        ])
      }
    });

    const settingsRoutes = require('../../routes/settingsRoutes');
    const getSidebarLayer = settingsRoutes.stack.find(
      (l) => l.route && l.route.path === '/sidebar' && l.route.methods.get
    );
    assert.ok(getSidebarLayer, 'GET /sidebar route should exist');

    const handler = getSidebarLayer.route.stack[getSidebarLayer.route.stack.length - 1].handle;
    let payload = null;
    const req = { user: { id: 'u1', role: 'OWNER', companyId: 'comp-sidebar-1' }, headers: {}, query: {} };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { payload = body; return this; }
    };

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(payload.success, true);
    assert.ok(payload.data.educationSettings, 'data.educationSettings should be included');
    assert.strictEqual(payload.data.educationSettings.systemTitle, 'أكاديمية التجربة');
    assert.strictEqual(payload.educationSettings.tabs[0].labelAr, 'المدربين');
    // Verify sidebarSettings.items remained an Array without unexpected string keys attached
    assert.strictEqual(Array.isArray(payload.data.settings.items), true);
    assert.strictEqual(payload.data.settings.items['education-subjects'], undefined);
  });

  sharedDb.getSharedPrismaClient = originalGetSharedPrisma;
});
