const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_booking_category_modal',
    path: '/admin/booking/services',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("قسم جديد")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger category modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_booking_doctor_availability_modal',
    path: '/admin/booking/doctors',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("الأوقات")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger doctor availability modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_booking_doctor_modal',
    path: '/admin/booking/doctors',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("إضافة طبيب")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger doctor modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_booking_invoice_modal',
    path: '/admin/booking/invoices',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("فاتورة جديدة")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger invoice modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_booking_payment_modal',
    path: '/admin/booking/invoices',
    action: async (page) => {
      try {
        const btn = page.locator('button[title="تسجيل دفعة"]').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger payment modal failed', e.message);
      }
    }
  },
];

const mockBranches = [
  { id: 'br-1', name: 'فرع مدينة نصر', address: 'شارع عباس العقاد، القاهرة', phone: '01012345678', phones: ['01012345678'], workingDays: 'sat,mon,wed', workStart: '09:00', workEnd: '22:00', isActive: true, createdAt: '2026-01-01T00:00:00Z', facilityType: 'clinic', maxBookingsPerSlot: 1 },
];

const mockDoctors = [
  { id: 'doc-1', title: 'دكتور', name: 'أحمد محمود', specialty: 'طب وجراحة الأسنان', phone: '01099887766', email: 'ahmed@example.com', branchId: 'br-1', serviceIds: ['srv-1'], isActive: true, consultationFee: 300, commissionRate: 15 },
];

const mockCategories = [
  { id: 'cat-1', name: 'الأسنان وجراحة الفم', color: '#3b82f6', icon: 'tooth', sortOrder: 1, isActive: true },
  { id: 'cat-2', name: 'الجلدية والليزر', color: '#ec4899', icon: 'sparkles', sortOrder: 2, isActive: true },
];

const mockServices = [
  { id: 'srv-1', name: 'كشف أسنان واستشارة', durationMinutes: 30, price: 300, categoryId: 'cat-1', isActive: true, branchServices: [{ branchId: 'br-1', isActive: true, branch: { id: 'br-1', name: 'فرع مدينة نصر' } }] },
];

const mockPatients = [
  { id: 'p-1', firstName: 'محمد', lastName: 'علي', phone: '01011223344', email: 'mohamed@example.com', gender: 'male', status: 'ACTIVE', isActive: true, nationalId: '29001011234567', address: 'القاهرة' },
];

const mockInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    patientId: 'p-1',
    total: 1000,
    discount: 100,
    additionAmount: 0,
    net: 900,
    amountPaid: 400,
    remaining: 500,
    status: 'PARTIAL',
    expenseSplit: 'PATIENT',
    createdAt: '2026-10-15T12:00:00Z',
    patient: mockPatients[0],
    payments: [{ id: 'pay-1', amount: 400, method: 'CASH', createdAt: '2026-10-15T12:05:00Z' }]
  }
];

const mockAvailability = [
  { dayOfWeek: 0, isAvailable: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 1, isAvailable: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 2, isAvailable: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 3, isAvailable: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 4, isAvailable: false, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 5, isAvailable: false, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 6, isAvailable: true, startTime: '10:00', endTime: '18:00' },
];

(async () => {
  console.log(`Starting Batch 104 capture in mode: ${mode}...`);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  let fatalErrors = 0;

  for (const pageInfo of pagesToTest) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'ar-EG',
      colorScheme: 'light'
    });

    const page = await context.newPage();

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (
        text.includes("Failed to load resource") ||
        text.toLowerCase().includes("websocket") ||
        text.includes("[SOCKET]") ||
        text.includes("Error fetching company") ||
        text.includes("vite:preload") ||
        text.includes("ResilientLazy") ||
        text.includes("favicon") ||
        text.includes("404") ||
        text.includes("401")
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

      if (url.includes('companies/current')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'comp-1', name: 'مركز الرعاية المتكاملة', slug: 'care-center' }
          })
        });
      }

      if (url.includes('/branches')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockBranches }) });
      }
      if (url.includes('/doctors/availability')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockAvailability }) });
      }
      if (url.includes('/doctors')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockDoctors }) });
      }
      if (url.includes('/categories')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockCategories }) });
      }
      if (url.includes('/services')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockServices }) });
      }
      if (url.includes('/patients')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockPatients }) });
      }
      if (url.includes('/invoices/cashier-shifts')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) });
      }
      if (url.includes('/invoices')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockInvoices }) });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
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
      localStorage.setItem('refreshToken', 'mock-refresh-token');
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

      await page.waitForTimeout(1000);

      const shotPath = path.join(ARTIFACTS_DIR, `${pageInfo.name}_${mode}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`Saved screenshot to ${shotPath}`);
    } catch (e) {
      console.error(`Failed on ${pageInfo.path}:`, e.message);
      fatalErrors++;
    }

    await context.close();
  }

  await browser.close();
  console.log(`Finished Batch 104 capture with ${fatalErrors} fatal error(s).`);
  if (fatalErrors > 0 && mode === 'after') {
    process.exit(1);
  }
})();
