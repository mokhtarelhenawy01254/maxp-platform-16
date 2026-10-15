const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_booking_patient_detail',
    path: '/admin/booking/patients/p-1',
  },
  {
    name: 'adm_booking_doctor_detail',
    path: '/admin/booking/doctors/doc-1',
  },
  {
    name: 'adm_workflow_statuses',
    path: '/settings/order-workflow?tab=statuses',
  },
  {
    name: 'adm_workflow_approvals',
    path: '/settings/order-workflow?tab=approvals',
  },
  {
    name: 'adm_workflow_overrides',
    path: '/settings/order-workflow?tab=overrides',
  },
];

const mockPatient = {
  id: 'p-1',
  firstName: 'محمود',
  lastName: 'عبد السلام',
  phone: '01001234567',
  email: 'mahmoud.patient@example.com',
  gender: 'male',
  bloodType: 'A+',
  nationalId: '29508140102345',
  birthDate: '1995-08-14',
  address: 'القاهرة - مصر الجديدة - شارع الثورة',
  city: 'القاهرة',
  status: 'active',
  source: 'موقع الويب',
  maritalStatus: 'married',
  occupation: 'مهندس برمجيات',
  allergies: '["البنسلين", "الأسبرين"]',
  chronicDiseases: '["ضغط الدم"]',
  medications: '["كونكور 5 ملغ"]',
  notes: 'المريض يفضل المواعيد المسائية بعد الساعة 5 مساءً',
  appointments: [
    {
      id: 'apt-101',
      appointmentDate: '2026-10-15',
      startTime: '10:00',
      status: 'confirmed',
      serviceName: 'تنظيف وتبييض الأسنان بالليزر',
      branch: { id: 'br-1', name: 'الفرع الرئيسي' },
      doctor: { id: 'doc-1', title: 'د.', name: 'أحمد سامي' }
    }
  ],
  invoices: [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-001',
      total: 1500,
      discount: 100,
      net: 1400,
      amountPaid: 1400,
      remaining: 0,
      status: 'PAID',
      createdAt: '2026-10-15T10:00:00Z',
      payments: [
        { id: 'pay-1', amount: 1400, method: 'CASH', paidAt: '2026-10-15T10:15:00Z' }
      ]
    }
  ],
  financialSummary: {
    invoiceCount: 1,
    totalBilled: 1500,
    totalPaid: 1400,
    outstanding: 0,
    unpaidInvoices: 0
  }
};

const mockDoctor = {
  id: 'doc-1',
  title: 'دكتور استشاري',
  name: 'أحمد سامي',
  specialty: 'جراحة الفم والأسنان وتجميل الابتسامة',
  isActive: true,
  branchId: 'br-1',
  branchName: 'الفرع الرئيسي - مصر الجديدة',
  phone: '01099887766',
  email: 'dr.ahmed@maxp.online',
  consultationFee: 400,
  commissionRate: 40,
  bio: 'استشاري أول جراحة الأسنان وعضو الجمعية المصرية لتجميل الفم والأسنان خبرة أكثر من 15 عاماً',
  stats: {
    total: 342,
    today: 8,
    upcoming: 24,
    completed: 310
  },
  availabilities: [
    { id: 'av-1', dayOfWeek: 0, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    { id: 'av-2', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    { id: 'av-3', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    { id: 'av-4', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    { id: 'av-5', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDuration: 30 }
  ]
};

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

const mockApprovals = [
  {
    id: 'appr-1',
    orderId: 'ord-101',
    orderNumber: 'MP-2026-8812',
    requestedBy: 'عمرو خالد (خدمة العملاء)',
    requestedRole: 'AGENT',
    reason: 'إلغاء الطلب بناء على طلب العميل لعدم توافر المقاس',
    currentStatus: 'CONFIRMED',
    targetStatus: 'CANCELLED',
    createdAt: '2026-10-15T12:00:00Z',
    status: 'PENDING'
  }
];

async function run() {
  console.log(`Starting Batch 102 capture in mode: ${mode}...`);
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
              company: { id: 'comp-1', name: 'مركز الرعاية والعمليات', slug: 'care-center', activeApps: ['booking', 'order-workflow', 'store'], installedApps: ['booking', 'order-workflow', 'store'] }
            }
          })
        });
      }

      if (url.includes('/booking/patients/p-1') || url.includes('/patients/p-1')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockPatient })
        });
      }

      if (url.includes('/booking/doctors/doc-1') || url.includes('/doctors/doc-1')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockDoctor })
        });
      }

      if (url.includes('patient-documents')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] })
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
          body: JSON.stringify({ success: true, data: [] })
        });
      }

      if (url.includes('order-workflow/approvals') || url.includes('workflow/approvals')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockApprovals, total: 1 })
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

      await page.waitForTimeout(2000);

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
  console.log(`Finished Batch 102 capture with ${fatalErrors} fatal error(s).`);
  process.exit(fatalErrors > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
