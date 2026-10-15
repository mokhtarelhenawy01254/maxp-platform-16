const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_workflow_transitions',
    path: '/settings/order-workflow?tab=transitions',
  },
  {
    name: 'adm_workflow_audit',
    path: '/settings/order-workflow?tab=audit',
  },
  {
    name: 'adm_booking_branches_modal',
    path: '/admin/booking/branches',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("إضافة فرع")').first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // modal trigger fallback
      }
    }
  },
  {
    name: 'adm_booking_patients_modal',
    path: '/admin/booking/patients',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("إضافة مريض")').first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // modal trigger fallback
      }
    }
  },
  {
    name: 'adm_booking_appointments_modal',
    path: '/admin/booking/appointments',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("حجز موعد"), button:has-text("حجز جديد")').first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // modal trigger fallback
      }
    }
  },
];

const mockWorkflowConfig = {
  id: 'wf-cfg-1',
  companyId: 'comp-1',
  enabled: true,
  overrideRoles: JSON.stringify(['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN']),
  strictMode: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-10-15T00:00:00Z'
};

const mockStatuses = [
  { id: 'st-1', name: 'قيد المراجعة والتحقق', code: 'PENDING_REVIEW', color: '#f59e0b', isInitial: true, isFinal: false, requiresApproval: false, isActive: true },
  { id: 'st-2', name: 'تم التأكيد وتجهيز الطلب', code: 'CONFIRMED', color: '#3b82f6', isInitial: false, isFinal: false, requiresApproval: false, isActive: true },
  { id: 'st-3', name: 'تم الشحن مع مندوب بوسطة', code: 'SHIPPED', color: '#8b5cf6', isInitial: false, isFinal: false, requiresApproval: false, isActive: true },
  { id: 'st-4', name: 'تم التسليم بنجاح للعميل', code: 'DELIVERED', color: '#10b981', isInitial: false, isFinal: true, requiresApproval: false, isActive: true },
  { id: 'st-5', name: 'ملغي بناء على طلب العميل', code: 'CANCELLED', color: '#ef4444', isInitial: false, isFinal: true, requiresApproval: true, isActive: true },
];

const mockTransitions = [
  {
    id: 'tr-1',
    fromStatusId: 'st-1',
    toStatusId: 'st-2',
    allowedRoles: JSON.stringify(['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']),
    requiresApproval: false,
    allowOverride: true,
    restrictBackward: true
  },
  {
    id: 'tr-2',
    fromStatusId: 'st-2',
    toStatusId: 'st-3',
    allowedRoles: JSON.stringify(['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT']),
    requiresApproval: false,
    allowOverride: false,
    restrictBackward: false
  },
  {
    id: 'tr-3',
    fromStatusId: 'st-2',
    toStatusId: 'st-5',
    allowedRoles: JSON.stringify(['OWNER', 'SUPER_ADMIN']),
    requiresApproval: true,
    allowOverride: true,
    restrictBackward: false
  }
];

const mockAuditLogs = [
  {
    id: 'log-1',
    order: { orderNumber: '1042' },
    fromStatus: { name: 'قيد المراجعة' },
    toStatus: { name: 'تم التأكيد' },
    changeType: 'normal',
    changedBy: 'أحمد سامي',
    user: { id: 'u-1', firstName: 'أحمد', lastName: 'سامي' },
    createdAt: '2026-10-15T11:30:00Z',
    reason: 'تأكيد هاتفي مع العميل'
  },
  {
    id: 'log-2',
    order: { orderNumber: '1039' },
    fromStatus: { name: 'تم التأكيد' },
    toStatus: { name: 'ملغي' },
    changeType: 'approval',
    changedBy: 'سارة محمود',
    user: { id: 'u-2', firstName: 'سارة', lastName: 'محمود' },
    approver: { firstName: 'مدير', lastName: 'النظام' },
    createdAt: '2026-10-15T10:15:00Z',
    reason: 'إلغاء لعدم توفر المقاس المطلوب'
  }
];

const mockBranches = [
  {
    id: 'br-1',
    name: 'الفرع الرئيسي - مصر الجديدة',
    address: '١٢ شارع الثورة، مصر الجديدة، القاهرة',
    phone: '0224156789',
    phones: ['0224156789', '01011223344'],
    workingDays: 'sat,sun,mon,tue,wed,thu',
    workStart: '09:00',
    workEnd: '21:00',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    maxBookingsPerSlot: 2,
    facilityType: 'clinic'
  }
];

const mockDoctors = [
  { id: 'doc-1', name: 'أحمد سامي', title: 'د.', specialty: 'جراحة الفم والأسنان', branchId: 'br-1', isActive: true }
];

const mockServices = [
  { id: 'srv-1', name: 'كشف واستشارة طبية', basePrice: 400, durationMinutes: 30, branchId: 'br-1', isActive: true }
];

const mockPatients = [
  { id: 'p-1', firstName: 'محمود', lastName: 'عبد السلام', phone: '01001234567', gender: 'male', status: 'ACTIVE', isActive: true }
];

async function run() {
  console.log(`Starting Batch 103 capture in mode: ${mode}...`);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });

  let fatalErrors = 0;

  for (const pageInfo of pagesToTest) {
    const page = await context.newPage();

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (
        text.includes("401") ||
        text.includes("Refresh token") ||
        text.includes("Authentication failed") ||
        text.includes("Failed to load resource") ||
        text.toLowerCase().includes("websocket") ||
        text.includes("[SOCKET]") ||
        text.includes("Error fetching company") ||
        text.includes("vite:preload") ||
        text.includes("ResilientLazy") ||
        text.includes("favicon") ||
        text.includes("404")
      ) {
        return;
      }
      if (type === 'error') {
        console.error(`[CONSOLE ERROR on ${pageInfo.name}]:`, text);
        fatalErrors++;
      }
    });

    page.on('pageerror', err => {
      const text = err.message || '';
      if (text.includes("ResilientLazy") || text.includes("dynamically imported module")) {
        return;
      }
      console.error(`[PAGE ERROR on ${pageInfo.name}]:`, text);
      fatalErrors++;
    });

    await page.route('**/api/**', async route => {
      const url = route.request().url();

      if (url.includes('/auth/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: { id: 'u-admin', name: 'مدير النظام', role: 'SUPER_ADMIN', email: 'admin@maxp.online', companyId: 'comp-1' },
              company: { id: 'comp-1', name: 'مركز الرعاية المتكاملة', slug: 'care-center', activeApps: ['booking', 'order-workflow', 'store'], installedApps: ['booking', 'order-workflow', 'store'] }
            }
          })
        });
      }

      if (url.includes('order-workflow/config') || url.includes('workflow/config')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockWorkflowConfig })
        });
      }

      if (url.includes('order-workflow/statuses') || url.includes('workflow/statuses')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockStatuses })
        });
      }

      if (url.includes('order-workflow/transitions') || url.includes('workflow/transitions')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockTransitions })
        });
      }

      if (url.includes('order-workflow/audit') || url.includes('workflow/audit')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockAuditLogs })
        });
      }

      if (url.includes('/booking/branches') || url.includes('/branches')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockBranches })
        });
      }

      if (url.includes('/booking/doctors') || url.includes('/doctors')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockDoctors })
        });
      }

      if (url.includes('/booking/services') || url.includes('/services')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockServices })
        });
      }

      if (url.includes('/booking/patients') || url.includes('/patients')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockPatients })
        });
      }

      if (url.includes('companies/comp-1/users') || url.includes('/users')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              users: [
                { id: 'u-1', firstName: 'أحمد', lastName: 'سامي' },
                { id: 'u-2', firstName: 'سارة', lastName: 'محمود' }
              ]
            }
          })
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.addInitScript(() => {
      const mockUser = {
        id: 'u-admin',
        name: 'مدير النظام',
        role: 'SUPER_ADMIN',
        email: 'admin@maxp.online',
        companyId: 'comp-1',
        company: { id: 'comp-1', name: 'مركز الرعاية المتكاملة', slug: 'care-center' },
        companies: [{ id: 'comp-1', name: 'مركز الرعاية المتكاملة', role: 'SUPER_ADMIN' }],
        currentCompany: { id: 'comp-1', name: 'مركز الرعاية المتكاملة', slug: 'care-center', activeApps: ['booking', 'order-workflow', 'store'], installedApps: ['booking', 'order-workflow', 'store'] },
        permissions: ['*'],
      };
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
      localStorage.setItem('token', mockJwt);
      localStorage.setItem('accessToken', mockJwt);
      localStorage.setItem('user', JSON.stringify(mockUser));
      sessionStorage.setItem('token', mockJwt);
      sessionStorage.setItem('accessToken', mockJwt);
      sessionStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('activeCompanyId', 'comp-1');
    });

    console.log(`Navigating to ${pageInfo.path}...`);
    try {
      await page.goto(`http://127.0.0.1:5173${pageInfo.path}`, {
        waitUntil: 'networkidle',
        timeout: 25000,
      });

      if (pageInfo.action) {
        await pageInfo.action(page);
      }

      await page.waitForTimeout(1500);

      const shotPath = path.join(ARTIFACTS_DIR, `${pageInfo.name}_${mode}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`Saved screenshot to ${shotPath}`);
    } catch (e) {
      console.error(`Failed on ${pageInfo.path}:`, e.message);
      fatalErrors++;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`Finished Batch 103 capture with ${fatalErrors} fatal error(s).`);
  process.exit(fatalErrors > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
