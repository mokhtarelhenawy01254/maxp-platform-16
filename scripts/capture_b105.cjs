const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_booking_service_modal',
    path: '/admin/booking/services',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("إضافة خدمة")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger service modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_booking_service_detail_modal',
    path: '/admin/booking/services',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("عرض")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger service detail modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_booking_patient_detail_modal',
    path: '/admin/booking/patients',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("عرض")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.error('Trigger patient detail modal failed', e.message);
      }
    }
  },
  {
    name: 'adm_booking_medical_history',
    path: '/admin/booking/patients',
    action: async (page) => {
      try {
        const btn = page.locator('button:has-text("عرض")').first();
        if (await btn.isVisible({ timeout: 4000 })) {
          await btn.click();
          await page.waitForTimeout(800);
          const tabBtn = page.locator('button:has-text("التاريخ الطبي")').first();
          if (await tabBtn.isVisible({ timeout: 3000 })) {
            await tabBtn.click();
            await page.waitForTimeout(800);
          }
        }
      } catch (e) {
        console.error('Trigger medical history failed', e.message);
      }
    }
  },
  {
    name: 'adm_settings_bosta',
    path: '/settings/bosta',
    action: async (page) => {
      await page.waitForTimeout(1200);
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
  {
    id: 'srv-1',
    name: 'كشف أسنان واستشارة',
    description: 'كشف وفحص شامل للأسنان واللثة مع خطة علاجية',
    durationMinutes: 30,
    basePrice: 300,
    price: 300,
    categoryId: 'cat-1',
    category: mockCategories[0],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    branchServices: [
      {
        id: 'bs-1',
        branchId: 'br-1',
        isActive: true,
        hasPackages: true,
        branch: { id: 'br-1', name: 'فرع مدينة نصر' },
        packages: [
          { count: 3, price: 800, originalPrice: 900 },
          { count: 5, price: 1200, originalPrice: 1500 }
        ]
      }
    ],
    doctorServices: [
      { id: 'ds-1', doctorId: 'doc-1', fee: 300, doctor: { id: 'doc-1', title: 'دكتور', name: 'أحمد محمود' } }
    ]
  },
];

const mockPatients = [
  {
    id: 'p-1',
    firstName: 'محمد',
    lastName: 'علي',
    phone: '01011223344',
    email: 'mohamed@example.com',
    gender: 'male',
    status: 'ACTIVE',
    isActive: true,
    nationalId: '29001011234567',
    address: 'شارع الثورة، مصر الجديدة، القاهرة',
    bloodType: 'A+',
    birthDate: '1990-05-15T00:00:00Z',
    maritalStatus: 'MARRIED',
    city: 'القاهرة',
    occupation: 'مهندس برمجيات',
    allergies: ['بنسلين', 'سلفا'],
    chronicDiseases: ['ضغط مرتفع'],
    medications: ['كونكور 5 مجم'],
    notes: 'يفضل المواعيد المسائية بعد الساعة 5',
    visitCount: 4,
    medicalHistory: {
      conditions: [
        { code: 'hypertension', label: 'ضغط مرتفع', checked: true },
        { code: 'diabetes', label: 'سكر', checked: false }
      ],
      allergies: [
        { code: 'penicillin', label: 'حساسية بنسلين', checked: true },
        { code: 'sulfa', label: 'سلفا', checked: true }
      ]
    },
    financialSummary: {
      invoiceCount: 2,
      totalBilled: 1200,
      totalPaid: 800,
      outstanding: 400,
      unpaidInvoices: 1
    },
    invoices: [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-001',
        total: 1200,
        discount: 0,
        amountPaid: 800,
        net: 1200,
        remaining: 400,
        status: 'PARTIAL',
        createdAt: '2026-10-15T12:00:00Z'
      }
    ],
    appointments: [
      {
        id: 'apt-1',
        appointmentDate: '2026-10-12T00:00:00Z',
        startTime: '10:00',
        endTime: '10:30',
        status: 'COMPLETED',
        branch: { id: 'br-1', name: 'فرع مدينة نصر' },
        doctor: { id: 'doc-1', title: 'دكتور', name: 'أحمد محمود' },
        serviceName: 'كشف أسنان واستشارة',
        diagnosis: 'تسوس بسيط في الضرس العلوي الأيمن',
        treatmentPlan: 'حشو ضوئي مركب وجلسة تنظيف جير',
        vitals: JSON.stringify({ pressure: '120/80', weight: '78kg', temp: '37C' }),
        paymentStatus: 'paid'
      }
    ]
  },
];

(async () => {
  console.log(`Starting Batch 105 capture in mode: ${mode}...`);
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
      if (text.includes("socket") || text.includes("WebSocket") || text.includes("favicon") || text.includes("Failed to load resource")) {
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

      if (url.includes('store-settings/bosta') || url.includes('/bosta')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              bostaEnabled: true,
              hasApiKey: true,
              maskedApiKey: 'bosta_live_••••••••••••••••3a7f',
              bostaWebhookToken: 'whsec_••••••••••••••••9c2d'
            }
          })
        });
      }

      if (url.includes('/branches')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockBranches }) });
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
      if (url.includes('/patients/p-1') || url.includes('/patients/')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockPatients[0] }) });
      }
      if (url.includes('/patients')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockPatients, meta: { total: 1 } }) });
      }
      if (url.includes('/invoices')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockPatients[0].invoices }) });
      }
      if (url.includes('/appointments')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockPatients[0].appointments }) });
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
      localStorage.setItem('token', 'mock-token-xyz');
      localStorage.setItem('accessToken', 'mock-token-xyz');
      localStorage.setItem('refreshToken', 'mock-token-xyz');
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('activeCompanyId', 'comp-1');
      localStorage.setItem('companyId', 'comp-1');
      sessionStorage.setItem('token', 'mock-token-xyz');
      sessionStorage.setItem('accessToken', 'mock-token-xyz');
      sessionStorage.setItem('user', JSON.stringify(mockUser));
      sessionStorage.setItem('activeCompanyId', 'comp-1');
    });

    try {
      console.log(`Navigating to http://127.0.0.1:5173${pageInfo.path}...`);
      await page.goto(`http://127.0.0.1:5173${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(1500);

      if (pageInfo.action) {
        await pageInfo.action(page);
      }

      const screenshotFile = path.join(ARTIFACTS_DIR, `${pageInfo.name}_${mode}.png`);
      await page.screenshot({ path: screenshotFile, fullPage: false });
      console.log(`Saved screenshot: ${screenshotFile}`);
    } catch (err) {
      console.error(`Failed to capture ${pageInfo.name}:`, err.message);
      fatalErrors++;
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log(`Finished Batch 105 capture in mode ${mode}. Fatal errors: ${fatalErrors}`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
})();
