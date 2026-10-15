const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_booking_insurance',
    path: '/admin/booking/insurance-companies',
  },
  {
    name: 'adm_booking_member_types',
    path: '/admin/booking/member-types',
  },
  {
    name: 'adm_booking_workflow',
    path: '/admin/booking/workflow',
  },
  {
    name: 'adm_booking_reports',
    path: '/admin/booking/reports',
  },
  {
    name: 'adm_booking_operations',
    path: '/admin/booking/operations',
  },
];

const mockInsuranceCompanies = [
  { id: 'ins-1', name: 'شركة بوبا للتأمين الطبي', priceListId: 'pl-1', phone1: '0223456789', fax: '0223456780', contactName: 'أحمد نبيل', contactPhone: '01011223344', isActive: true, priceList: { id: 'pl-1', name: 'قائمة بوبا للرعاية الممتازة', isActive: true } },
  { id: 'ins-2', name: 'ميدنت للرعاية الصحية', priceListId: 'pl-2', phone1: '0233445566', fax: '0233445560', contactName: 'سارة فوزي', contactPhone: '01222334455', isActive: true, priceList: { id: 'pl-2', name: 'قائمة ميدنت الأساسية', isActive: true } },
  { id: 'ins-3', name: 'أليانز مصر للتأمين', priceListId: '', phone1: '0227654321', fax: '', contactName: 'كريم محمود', contactPhone: '01111998877', isActive: false },
];

const mockMemberTypes = [
  { id: 'mem-1', name: 'الفئة الذهبية A+', coveragePercent: 90, isActive: true, _count: { patients: 142 } },
  { id: 'mem-2', name: 'الفئة الفضية B', coveragePercent: 80, isActive: true, _count: { patients: 88 } },
  { id: 'mem-3', name: 'الفئة البرونزية C', coveragePercent: 65, isActive: true, _count: { patients: 35 } },
  { id: 'mem-4', name: 'كبار الشخصيات VIP', coveragePercent: 100, isActive: false, _count: { patients: 12 } },
];

const mockWorkflowRows = [
  {
    id: 'app-wf-1',
    appointmentNumber: 'APT-1001',
    bookingStatus: 'UNCONFIRMED',
    status: 'pending',
    reportStatus: 'PENDING',
    appointmentDate: '2026-10-15',
    startTime: '10:00',
    patient: { id: 'p-1', name: 'محمود عبد السلام', phone: '01001234567' },
    doctorName: 'د. أحمد سامي',
    assignedDoctorName: 'د. أحمد سامي',
    branchName: 'الفرع الرئيسي',
    service: { name: 'تنظيف وتبييض الأسنان بالليزر' },
  },
  {
    id: 'app-wf-2',
    appointmentNumber: 'APT-1002',
    bookingStatus: 'CHECKED_IN',
    status: 'confirmed',
    reportStatus: 'NOTES_IN_PROGRESS',
    appointmentDate: '2026-10-15',
    startTime: '11:30',
    patient: { id: 'p-2', name: 'ياسمين حسن', phone: '01119876543' },
    doctorName: 'د. منى عبد الرحمن',
    assignedDoctorName: 'د. منى عبد الرحمن',
    branchName: 'فرع التجمع',
    service: { name: 'كشف واستشارة طبية' },
  },
];

const mockRevenueReport = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-15',
  totals: { billed: 48500, discounts: 3500, collected: 41000, outstanding: 4000, invoiceCount: 38 },
  byDoctor: [
    { id: 'doc-1', name: 'د. أحمد سامي', billed: 32000, discounts: 2000, collected: 28000, outstanding: 2000, invoiceCount: 24 },
    { id: 'doc-2', name: 'د. منى عبد الرحمن', billed: 16500, discounts: 1500, collected: 13000, outstanding: 2000, invoiceCount: 14 },
  ],
  byService: [
    { id: 'srv-1', name: 'تنظيف وتبييض الأسنان', billed: 28000, discounts: 1800, collected: 24200, outstanding: 2000, invoiceCount: 19 },
    { id: 'srv-2', name: 'كشف واستشارة', billed: 20500, discounts: 1700, collected: 16800, outstanding: 2000, invoiceCount: 19 },
  ],
};

const mockUnprintedLabels = [
  {
    appointmentId: 'app-wf-1',
    patientId: 'p-1',
    patientName: 'محمود عبد السلام',
    patientPhone: '01001234567',
    branchId: 'br-1',
    branchName: 'الفرع الرئيسي',
    serviceName: 'تنظيف وتبييض الأسنان',
    room: 'عيادة 1',
    ticketNumber: 'A-101',
    accessionNumber: 'ACC-8821',
    appointmentDate: '2026-10-15',
    startTime: '10:00',
  },
];

const mockDeliveries = [
  {
    id: 'del-1',
    appointmentId: 'app-wf-1',
    invoiceNumber: 'INV-2026-001',
    patientName: 'محمود عبد السلام',
    patientPhone: '01001234567',
    doctorName: 'د. أحمد سامي',
    branchName: 'الفرع الرئيسي',
    deliveryStatus: 'READY',
    paidStatus: 'PAID',
    net: 1500,
    amountPaid: 1500,
    remaining: 0,
    reportDate: '2026-10-15',
    deliveredAt: null,
    deliveredTo: null,
  },
];

const mockTransactions = [
  {
    id: 'tx-1',
    entityType: 'PAYMENT',
    action: 'CREATE',
    amount: 1500,
    invoiceNumber: 'INV-2026-001',
    patientName: 'محمود عبد السلام',
    userName: 'كاشير الفرع',
    createdAt: '2026-10-15T10:15:00Z',
    details: 'سداد نقدي كامل للفاتورة',
  },
];

async function run() {
  console.log(`Starting Batch 101 capture in mode: ${mode}...`);
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
              user: { id: 'u-admin', name: 'مدير النظام', role: 'ADMIN', email: 'admin@maxp.online', companyId: 'comp-1' },
              company: { id: 'comp-1', name: 'مركز الرعاية المتكاملة', slug: 'care-center', activeApps: ['booking', 'store'], installedApps: ['booking', 'store'] }
            }
          })
        });
      }

      if (url.includes('/companies/current')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'comp-1',
            name: 'مركز الرعاية المتكاملة',
            slug: 'care-center',
            activeApps: ['booking', 'store'],
            installedApps: ['booking', 'store']
          })
        });
      }

      if (url.includes('/insurance-companies')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockInsuranceCompanies }) });
      }

      if (url.includes('/insurance-member-types')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockMemberTypes }) });
      }

      if (url.includes('/price-lists')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [
          { id: 'pl-1', name: 'قائمة بوبا للرعاية الممتازة', isBase: false, isActive: true },
          { id: 'pl-2', name: 'قائمة ميدنت الأساسية', isBase: true, isActive: true }
        ] }) });
      }

      if (url.includes('/branches')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [
          { id: 'br-1', name: 'الفرع الرئيسي', isActive: true },
          { id: 'br-2', name: 'فرع التجمع', isActive: true }
        ] }) });
      }

      if (url.includes('/doctors')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [
          { id: 'doc-1', name: 'أحمد سامي', title: 'د.', specialty: 'استشاري جراحة وتجميل الأسنان', isActive: true },
          { id: 'doc-2', name: 'منى عبد الرحمن', title: 'د.', specialty: 'أخصائية تقويم الأسنان', isActive: true }
        ] }) });
      }

      if (url.includes('/services/categories')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [
          { id: 'cat-1', name: 'تجميل الأسنان' }
        ] }) });
      }

      if (url.includes('/services')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [
          { id: 'srv-1', name: 'تنظيف وتبييض الأسنان', basePrice: 1500, isActive: true },
          { id: 'srv-2', name: 'كشف واستشارة', basePrice: 400, isActive: true }
        ] }) });
      }

      if (url.includes('/workflow/queues')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockWorkflowRows }) });
      }

      if (url.includes('/reports/revenue') || url.includes('/reports/')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockRevenueReport }) });
      }

      if (url.includes('/operations/labels')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockUnprintedLabels }) });
      }

      if (url.includes('/operations/deliveries')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockDeliveries }) });
      }

      if (url.includes('/operations/transactions')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockTransactions }) });
      }

      if (url.includes('/appointments')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
      }

      if (url.includes('/patients')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
      }

      if (url.includes('/invoices')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
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
        currentCompany: { id: 'comp-1', name: 'مركز الرعاية المتكاملة', slug: 'care-center', activeApps: ['booking', 'store'], installedApps: ['booking', 'store'] },
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

      await page.waitForTimeout(2000);

      const screenshotName = `${pageInfo.name}_${mode}.png`;
      const screenshotPath = path.join(ARTIFACTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved screenshot to ${screenshotPath}`);
    } catch (e) {
      console.error(`Failed on ${pageInfo.path}:`, e.message);
      fatalErrors++;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`Finished Batch 101 capture with ${fatalErrors} fatal error(s).`);
  if (fatalErrors > 0) {
    process.exit(1);
  }
}

run();
