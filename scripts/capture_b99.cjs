const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_booking_dashboard',
    path: '/admin/booking/dashboard',
  },
  {
    name: 'adm_booking_appointments',
    path: '/admin/booking/appointments',
  },
  {
    name: 'adm_booking_calendar',
    path: '/admin/booking/calendar',
  },
  {
    name: 'adm_booking_patients',
    path: '/admin/booking/patients',
  },
  {
    name: 'adm_booking_root',
    path: '/admin/booking',
  },
];

const mockBranches = [
  { id: 'br-1', name: 'الفرع الرئيسي - المهندسين', address: 'شارع جامعة الدول', phone: '01001234567', isActive: true, facilityType: 'clinic' },
  { id: 'br-2', name: 'فرع التجمع الخامس', address: 'شارع التسعين الشمالي', phone: '01009876543', isActive: true, facilityType: 'clinic' },
];

const mockDoctors = [
  { id: 'doc-1', name: 'د. أحمد سامي', specialty: 'استشاري جراحة وتجميل الأسنان', phone: '01111222333', branchId: 'br-1', isActive: true },
  { id: 'doc-2', name: 'د. منى عبد الرحمن', specialty: 'أخصائية تقويم وزراعة', phone: '01222333444', branchId: 'br-2', isActive: true },
];

const mockServices = [
  { id: 'srv-1', name: 'جلسة تنظيف وتبييض الأسنان بالليزر', description: 'إزالة الجير وتبييض متطور بتقنية الزوم', basePrice: 1200, durationMinutes: 45, isActive: true },
  { id: 'srv-2', name: 'كشف واستشارة تخصصية', description: 'فحص شامل مع صور رقمية', basePrice: 400, durationMinutes: 30, isActive: true },
];

const mockCategories = [
  { id: 'cat-1', name: 'تجميل الأسنان', description: 'خدمات التبييض والفينيرز' },
  { id: 'cat-2', name: 'العلاج الوقائي واللثة', description: 'تنظيف الجير وعلاج التهابات اللثة' },
];

const mockPatients = [
  { id: 'pat-1', firstName: 'طارق', lastName: 'محمود', phone: '01005556677', gender: 'male', bloodType: 'O+', visitCount: 4, status: 'ACTIVE', source: 'إعلان فيسبوك' },
  { id: 'pat-2', firstName: 'نوران', lastName: 'حسني', phone: '01224448899', gender: 'female', bloodType: 'A+', visitCount: 2, status: 'ACTIVE', source: 'ترشيح صديق' },
];

const mockInvoices = [
  { id: 'inv-1', invoiceNumber: 'INV-2026-001', total: 1600, paidAmount: 1600, status: 'PAID', createdAt: '2026-10-15T10:00:00Z', patient: mockPatients[0] },
  { id: 'inv-2', invoiceNumber: 'INV-2026-002', total: 800, paidAmount: 400, status: 'PARTIAL', createdAt: '2026-10-15T11:30:00Z', patient: mockPatients[1] },
];

const mockAppointments = [
  {
    id: 'apt-1',
    customerName: 'طارق محمود',
    customerPhone: '01005556677',
    customerGender: 'male',
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    duration: 45,
    status: 'confirmed',
    bookingStatus: 'confirmed',
    branchId: 'br-1',
    doctorId: 'doc-1',
    serviceId: 'srv-1',
    serviceName: 'جلسة تنظيف وتبييض الأسنان بالليزر',
    patientId: 'pat-1',
    room: 'عيادة 1',
  },
  {
    id: 'apt-2',
    customerName: 'نوران حسني',
    customerPhone: '01224448899',
    customerGender: 'female',
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '11:00',
    duration: 30,
    status: 'pending',
    bookingStatus: 'pending',
    branchId: 'br-1',
    doctorId: 'doc-1',
    serviceId: 'srv-2',
    serviceName: 'كشف واستشارة تخصصية',
    patientId: 'pat-2',
    room: 'عيادة 2',
  },
  {
    id: 'apt-3',
    customerName: 'عمر خالد',
    customerPhone: '01119998877',
    customerGender: 'male',
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '14:30',
    duration: 60,
    status: 'checked_in',
    bookingStatus: 'checked_in',
    branchId: 'br-2',
    doctorId: 'doc-2',
    serviceId: 'srv-1',
    serviceName: 'جلسة تنظيف وتبييض الأسنان بالليزر',
    patientId: 'pat-1',
    room: 'عيادة 3',
  },
];

const mockTimelineData = {
  resources: [
    {
      doctorId: 'doc-1',
      doctorName: 'د. أحمد سامي',
      specialty: 'استشاري جراحة وتجميل الأسنان',
      branchId: 'br-1',
      branchName: 'الفرع الرئيسي',
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
      slots: [{ time: '09:00' }, { time: '10:00' }, { time: '11:00' }, { time: '12:00' }]
    },
    {
      doctorId: 'doc-2',
      doctorName: 'د. منى عبد الرحمن',
      specialty: 'أخصائية تقويم وزراعة',
      branchId: 'br-2',
      branchName: 'فرع التجمع',
      startTime: '11:00',
      endTime: '19:00',
      isAvailable: true,
      slots: [{ time: '11:00' }, { time: '12:00' }, { time: '13:00' }, { time: '14:00' }]
    }
  ],
  appointments: mockAppointments
};

const mockReportsSummary = {
  financials: {
    totalRevenue: 18500,
    collected: 14200,
    outstanding: 4300,
    invoiceCount: 18,
    unpaidInvoices: 3
  },
  doctorPerformance: [
    { doctorId: 'doc-1', doctorName: 'د. أحمد سامي', total: 12 },
    { doctorId: 'doc-2', doctorName: 'د. منى عبد الرحمن', total: 9 }
  ],
  patientStats: {
    totalPatients: 142,
    newPatients: 18,
    returningPatients: 124
  }
};

const mockUser = {
  id: "u-mock-admin-99",
  name: "مدير العيادات والحجوزات",
  email: "booking@maxp.online",
  role: "SUPER_ADMIN",
  companyId: "c-mock-99-comp",
  company: { id: "c-mock-99-comp", name: "مركز ماكس للخدمات الطبية" },
  companies: [{ id: "c-mock-99-comp", name: "مركز ماكس للخدمات الطبية", role: "SUPER_ADMIN", logo: "/logo.png" }],
  currentCompany: { 
    id: "c-mock-99-comp", 
    name: "مركز ماكس للخدمات الطبية", 
    role: "SUPER_ADMIN", 
    logo: "/logo.png",
    activeApps: ['booking', 'store', 'invoices'],
    installedApps: ['booking', 'store', 'invoices']
  },
  permissions: ["*"]
};

async function run() {
  console.log(`Starting Batch 99 capture in mode: ${mode}...`);
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
        id: "u-mock-admin-99",
        name: "مدير العيادات والحجوزات",
        email: "booking@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "c-mock-99-comp",
        company: { id: "c-mock-99-comp", name: "مركز ماكس للخدمات الطبية" },
        companies: [{ id: "c-mock-99-comp", name: "مركز ماكس للخدمات الطبية", role: "SUPER_ADMIN", logo: "/logo.png" }],
        currentCompany: { 
          id: "c-mock-99-comp", 
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
      localStorage.setItem("activeCompanyId", "c-mock-99-comp");
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

    if (url.includes('/invoices')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockInvoices })
      });
    }

    if (url.includes('/reports/summary')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockReportsSummary })
      });
    }

    if (url.includes('/appointments/timeline')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockTimelineData })
      });
    }

    if (url.includes('/appointments')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockAppointments,
          total: mockAppointments.length
        })
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

  console.log(`Finished Batch 99 capture with ${fatalErrors} fatal error(s).`);
  process.exit(fatalErrors > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
