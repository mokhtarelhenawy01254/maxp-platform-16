const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_booking_branches',
    path: '/admin/booking/branches',
  },
  {
    name: 'adm_booking_doctors',
    path: '/admin/booking/doctors',
  },
  {
    name: 'adm_booking_services',
    path: '/admin/booking/services',
  },
  {
    name: 'adm_booking_invoices',
    path: '/admin/booking/invoices',
  },
  {
    name: 'adm_booking_price_lists',
    path: '/admin/booking/price-lists',
  },
];

const mockBranches = [
  {
    id: 'br-1',
    name: 'الفرع الرئيسي - المهندسين',
    address: 'شارع جامعة الدول العربية',
    phone: '01001234567',
    phones: ['01001234567', '0233445566'],
    isActive: true,
    facilityType: 'clinic',
    workingDays: { sat: '09:00-21:00', sun: '09:00-21:00', mon: '09:00-21:00', tue: '09:00-21:00', wed: '09:00-21:00', thu: '09:00-21:00' },
    location: 'https://maps.google.com/?q=30.05,31.20'
  },
  {
    id: 'br-2',
    name: 'فرع التجمع الخامس',
    address: 'شارع التسعين الشمالي - مبنى سنترال بوينت',
    phone: '01009876543',
    phones: ['01009876543'],
    isActive: true,
    facilityType: 'clinic',
    workingDays: { sat: '10:00-22:00', sun: '10:00-22:00', mon: '10:00-22:00', tue: '10:00-22:00', wed: '10:00-22:00' },
    location: 'https://maps.google.com/?q=30.02,31.45'
  },
];

const mockDoctors = [
  { id: 'doc-1', name: 'أحمد سامي', title: 'د.', specialty: 'استشاري جراحة وتجميل الأسنان', phone: '01111222333', branchId: 'br-1', isActive: true, serviceIds: ['srv-1', 'srv-2'] },
  { id: 'doc-2', name: 'منى عبد الرحمن', title: 'د.', specialty: 'أخصائية تقويم وزراعة الأسنان', phone: '01222333444', branchId: 'br-2', isActive: true, serviceIds: ['srv-1'] },
  { id: 'doc-3', name: 'خالد عبد الله', title: 'د.', specialty: 'أخصائي علاج الجذور واللثة', phone: '01003334455', branchId: 'br-1', isActive: false, serviceIds: [] },
];

const mockCategories = [
  { id: 'cat-1', name: 'تجميل الأسنان', description: 'خدمات التبييض والفينيرز والابتسامة الرقمية', color: 'bg-blue-100 text-blue-700' },
  { id: 'cat-2', name: 'العلاج الوقائي واللثة', description: 'تنظيف الجير وعلاج التهابات اللثة', color: 'bg-emerald-100 text-emerald-700' },
];

const mockServices = [
  {
    id: 'srv-1',
    name: 'جلسة تنظيف وتبييض الأسنان بالليزر',
    description: 'إزالة الترسبات الجيرية والتبييض بتقنية زوم المتطورة بجلسة واحدة',
    basePrice: 1500,
    durationMinutes: 45,
    categoryId: 'cat-1',
    isActive: true,
    branchServices: [
      { id: 'bs-1', serviceId: 'srv-1', branchId: 'br-1', branch: { id: 'br-1', name: 'الفرع الرئيسي' }, isActive: true, hasPackages: true, packages: [{ count: 3, price: 3800 }] },
      { id: 'bs-2', serviceId: 'srv-1', branchId: 'br-2', branch: { id: 'br-2', name: 'فرع التجمع' }, isActive: true, hasPackages: false, packages: [] }
    ],
    doctorServices: [
      { id: 'ds-1', doctorId: 'doc-1', doctor: { id: 'doc-1', name: 'أحمد سامي', title: 'د.' } },
      { id: 'ds-2', doctorId: 'doc-2', doctor: { id: 'doc-2', name: 'منى عبد الرحمن', title: 'د.' } }
    ]
  },
  {
    id: 'srv-2',
    name: 'كشف واستشارة طبية تخصصية',
    description: 'فحص شامل وتصوير رقمي للفكين مع خطة علاجية متكاملة',
    basePrice: 400,
    durationMinutes: 30,
    categoryId: 'cat-2',
    isActive: true,
    branchServices: [
      { id: 'bs-3', serviceId: 'srv-2', branchId: 'br-1', branch: { id: 'br-1', name: 'الفرع الرئيسي' }, isActive: true, hasPackages: false, packages: [] }
    ],
    doctorServices: [
      { id: 'ds-3', doctorId: 'doc-1', doctor: { id: 'doc-1', name: 'أحمد سامي', title: 'د.' } }
    ]
  },
];

const mockPatients = [
  { id: 'pat-1', firstName: 'طارق', lastName: 'محمود', phone: '01005556677', gender: 'male', bloodType: 'O+', visitCount: 4, status: 'ACTIVE', source: 'إعلان فيسبوك' },
  { id: 'pat-2', firstName: 'نوران', lastName: 'حسني', phone: '01224448899', gender: 'female', bloodType: 'A+', visitCount: 2, status: 'ACTIVE', source: 'ترشيح صديق' },
];

const mockInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    total: 1500,
    discount: 100,
    net: 1400,
    amountPaid: 1400,
    remaining: 0,
    status: 'PAID',
    expenseSplit: 'PATIENT',
    createdAt: '2026-10-15T10:00:00Z',
    patient: mockPatients[0],
    payments: [{ id: 'pmt-1', amount: 1400, method: 'CASH', reason: 'دفعة كاملة' }]
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    total: 800,
    discount: 0,
    net: 800,
    amountPaid: 400,
    remaining: 400,
    status: 'PARTIAL',
    expenseSplit: 'INSURANCE',
    createdAt: '2026-10-15T11:30:00Z',
    patient: mockPatients[1],
    payments: [{ id: 'pmt-2', amount: 400, method: 'CARD', reason: 'دفعة مقدمة' }]
  },
];

const mockPriceLists = [
  { id: 'pl-1', name: 'القائمة الأساسية القياسية', description: 'الأسعار القياسية المعتمدة لكافة الخدمات', isBase: true, isActive: true, itemCount: 2 },
  { id: 'pl-2', name: 'تعاقد شركة بوبا للتأمين الطبي', description: 'أسعار مخفضة لحاملي بطاقات بوبا الذهبية', isBase: false, baseListId: 'pl-1', isActive: true, itemCount: 1 },
];

const mockPriceListItems = [
  { id: 'pli-1', priceListId: 'pl-2', serviceId: 'srv-1', price: 1200, isActive: true, effectivePrice: 1200, service: mockServices[0] },
];

const mockShift = {
  id: 'sh-1',
  cashierName: 'محمد رضوان',
  openingBalance: 500,
  status: 'OPEN',
  openedAt: '2026-10-15T08:00:00Z'
};

const mockUser = {
  id: "u-mock-admin-100",
  name: "مدير العمليات السريرية",
  email: "ops@maxp.online",
  role: "SUPER_ADMIN",
  companyId: "c-mock-100-comp",
  company: { id: "c-mock-100-comp", name: "مركز ماكس للخدمات الطبية" },
  companies: [{ id: "c-mock-100-comp", name: "مركز ماكس للخدمات الطبية", role: "SUPER_ADMIN", logo: "/logo.png" }],
  currentCompany: { 
    id: "c-mock-100-comp", 
    name: "مركز ماكس للخدمات الطبية", 
    role: "SUPER_ADMIN", 
    logo: "/logo.png",
    activeApps: ['booking', 'store', 'invoices'],
    installedApps: ['booking', 'store', 'invoices']
  },
  permissions: ["*"]
};

async function run() {
  console.log(`Starting Batch 100 capture in mode: ${mode}...`);
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });

  const page = await context.newPage();

  let fatalErrors = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
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
      console.error(`[Browser Console ERROR]: ${text}`);
      fatalErrors++;
    }
  });

  page.on('pageerror', (err) => {
    const text = err.message || '';
    if (text.includes("ResilientLazy") || text.includes("dynamically imported module")) {
      return;
    }
    console.error(`[Browser Page ERROR]: ${text}`);
    fatalErrors++;
  });

  // Inject full auth context before any page loads
  await page.addInitScript(() => {
    try {
      const u = {
        id: "u-mock-admin-100",
        name: "مدير العمليات السريرية",
        email: "ops@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "c-mock-100-comp",
        company: { id: "c-mock-100-comp", name: "مركز ماكس للخدمات الطبية" },
        companies: [{ id: "c-mock-100-comp", name: "مركز ماكس للخدمات الطبية", role: "SUPER_ADMIN", logo: "/logo.png" }],
        currentCompany: { 
          id: "c-mock-100-comp", 
          name: "مركز ماكس للخدمات الطبية", 
          role: "SUPER_ADMIN", 
          logo: "/logo.png",
          activeApps: ['booking', 'store', 'invoices'],
          installedApps: ['booking', 'store', 'invoices']
        },
        permissions: ["*"]
      };
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
      localStorage.setItem("token", mockJwt);
      localStorage.setItem("accessToken", mockJwt);
      localStorage.setItem("user", JSON.stringify(u));
      sessionStorage.setItem("token", mockJwt);
      sessionStorage.setItem("accessToken", mockJwt);
      sessionStorage.setItem("user", JSON.stringify(u));
      localStorage.setItem("activeCompanyId", "c-mock-100-comp");
    } catch (e) {
      console.error("Failed to inject mock auth:", e);
    }
  });

  // Intercept all API calls with standard { success: true, data: ... }
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: mockUser,
            company: mockUser.currentCompany
          }
        })
      });
    }

    if (url.includes('/companies/current')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser.currentCompany)
      });
    }

    if (url.includes('/branches')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockBranches })
      });
    }

    if (url.includes('/doctors')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockDoctors })
      });
    }

    if (url.includes('/services/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockCategories })
      });
    }

    if (url.includes('/services')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockServices })
      });
    }

    if (url.includes('/patients')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockPatients })
      });
    }

    if (url.includes('/invoices/cashier-shifts/current')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockShift })
      });
    }

    if (url.includes('/invoices')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockInvoices })
      });
    }

    if (url.includes('/price-lists/pl-2/items')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockPriceListItems })
      });
    }

    if (url.includes('/price-lists')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockPriceLists })
      });
    }

    // Default fallback
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] })
    });
  });

  for (const pageConfig of pagesToTest) {
    const fullUrl = `http://127.0.0.1:5173${pageConfig.path}`;
    console.log(`Navigating to ${pageConfig.path}...`);
    try {
      await page.goto(fullUrl, {
        waitUntil: 'networkidle',
        timeout: 25000,
      });

      await page.waitForTimeout(1500);

      const screenshotPath = path.join(ARTIFACTS_DIR, `${pageConfig.name}_${mode}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved screenshot to ${screenshotPath}`);
    } catch (err) {
      console.error(`Failed on ${pageConfig.path}:`, err.message);
      fatalErrors++;
    }
  }

  await browser.close();

  console.log(`Finished Batch 100 capture with ${fatalErrors} fatal error(s).`);
  process.exit(fatalErrors > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
