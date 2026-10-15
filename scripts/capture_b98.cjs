const { chromium } = require('playwright');
const path = require('path');

const mode = process.argv[2] || 'before';
const ARTIFACTS_DIR = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

const pagesToTest = [
  {
    name: 'adm_academy_catalog',
    path: '/academy/catalog',
  },
  {
    name: 'adm_academy_courses',
    path: '/academy/courses',
  },
  {
    name: 'adm_academy_course_editor',
    path: '/academy/courses/c-mock-98',
  },
  {
    name: 'adm_academy_students',
    path: '/academy/students',
  },
  {
    name: 'adm_academy_lesson_viewer',
    path: '/academy/catalog/c-mock-98/lessons/l-mock-1',
  },
];

const mockCourse = {
  id: 'c-mock-98',
  title: 'دبلومة الميديا باير المحترف والذكاء الاصطناعي',
  description: 'الدبلومة الاحترافية الشاملة في إطلاق وتحسين الحملات الإعلانية وصناعة المحتوى التوليدي بمقاييس عالمية.',
  price: 2500,
  isPublished: true,
  freePreviewLessons: 2,
  visibility: 'PUBLIC',
  allowedTags: ['vip', 'media_buyer'],
  enableWatermark: true,
  isGlobal: false,
  storeProductId: 'prod-98-course',
  _count: { enrollments: 42, modules: 3 },
  modules: [
    {
      id: 'mod-1',
      title: 'الوحدة 1: الأساسيات وهيكلة الحسابات الإعلانية',
      description: 'إعداد الحساب الإعلاني، البيكسل، وأفضل ممارسات تتبع التحويلات المتقدمة',
      sortOrder: 1,
      lessons: [
        {
          id: 'l-mock-1',
          title: '1. مقدمة في خوارزميات المنصات الإعلانية',
          durationMin: 18,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          scriptText: 'في هذا الدرس سنتعرف على كيفية عمل المزاد الإعلاني ونظام التعلم التلقائي (Smart Bidding). يجب التركيز على تجميع إشارات التحويل الأولية وتفادي التعديل العشوائي.',
          exerciseText: 'قم بتسجيل الدخول لمدير الإعلانات ومطابقة إعدادات البيكسل مع المتجر.',
          isFreePreview: true,
          isUnlocked: true,
          isCompleted: true,
          quiz: {
            id: 'quiz-1',
            title: 'اختبار سريع: خوارزميات المزاد',
            passScorePercent: 75,
            questions: [
              {
                q: 'ما هو العنصر الأكثر تأثيراً في خفض تكلفة النقرة الفعالة (eCPM)؟',
                options: ['جودة الإعلان وتفاعل الجمهور معه', 'رفع الميزانية اليومية 10 أضعاف فجأة', 'تغيير الاستهداف كل ساعتين', 'حذف الإعلان وإعادة رفعه'],
                correctIndex: 0,
                explanation: 'جودة الإعلان وتفاعله تزيد من النتيجة التقديرية للإعلان مما يمنحه أفضلية في المزاد.'
              }
            ]
          }
        },
        {
          id: 'l-mock-2',
          title: '2. هيكلة الحملات الإعلانية المتقاطعة CBO vs ABO',
          durationMin: 24,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          scriptText: 'مقارنة استراتيجيات ميزانية الحملة مقابل ميزانية المجموعة الإعلانية ومعايير الاختيار الدقيقة.',
          exerciseText: 'صمم مسودة حملة باختبار 3 مجموعات إعلانية.',
          isFreePreview: true,
          isUnlocked: true,
          isCompleted: false
        }
      ]
    },
    {
      id: 'mod-2',
      title: 'الوحدة 2: صناعة الزوايا الإعلانية وسيكولوجية العرض',
      description: 'كتابة الهوك القاتل، إعلانات UGC، وتقنيات الإقناع النفسي',
      sortOrder: 2,
      lessons: [
        {
          id: 'l-mock-3',
          title: '3. صياغة العرض المغري (Grand Slam Offer)',
          durationMin: 32,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          scriptText: 'كيف تبني عرضاً لا يقاوم يقلل حساسية السعر ويضاعف معدل التحويل.',
          exerciseText: 'اكتب 3 صيغ مختلفة لعرضك الأساسي مع تحديد الضمان.',
          isFreePreview: false,
          isUnlocked: true,
          isCompleted: false
        }
      ]
    }
  ]
};

async function run() {
  console.log(`Starting Batch 98 capture in mode: ${mode}...`);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
  });

  const page = await context.newPage();

  let fatalErrors = 0;
  page.on('console', msg => {
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

  page.on('pageerror', err => {
    const text = err.message || '';
    if (text.includes("ResilientLazy") || text.includes("dynamically imported module")) {
      return;
    }
    console.error(`[Browser Page ERROR]: ${text}`);
    fatalErrors++;
  });

  await page.addInitScript(() => {
    try {
      const mockUser = {
        id: "u-mock-admin-98",
        name: "مدير الأكاديمية والتدريب",
        email: "academy@maxp.online",
        role: "SUPER_ADMIN",
        companyId: "c-mock-98-comp",
        companies: [{ id: "c-mock-98-comp", name: "أكاديمية التجارة الحديثة", role: "SUPER_ADMIN", logo: "/logo.png" }],
        currentCompany: { 
          id: "c-mock-98-comp", 
          name: "أكاديمية التجارة الحديثة", 
          role: "SUPER_ADMIN", 
          logo: "/logo.png",
          activeApps: ['store', 'shipping', 'marketing', 'academy'],
          installedApps: ['store', 'shipping', 'marketing', 'academy']
        },
        permissions: ["*"]
      };
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
      localStorage.setItem("token", mockJwt);
      localStorage.setItem("accessToken", mockJwt);
      localStorage.setItem("user", JSON.stringify(mockUser));
      sessionStorage.setItem("token", mockJwt);
      sessionStorage.setItem("user", JSON.stringify(mockUser));
      localStorage.setItem("activeCompanyId", "c-mock-98-comp");
    } catch (e) {
      console.error("Failed to inject mock auth:", e);
    }
  });

  // Intercept Academy API calls
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    
    // Store products
    if (url.includes('/academy/store-products')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'prod-98-course', name: 'باقة احتراف الميديا باينج', price: 2500, sku: 'ACAD-MB-01' },
          { id: 'prod-98-vip', name: 'اشتراك الـ VIP الاستشاري', price: 4900, sku: 'ACAD-VIP-01' }
        ])
      });
    }

    // Courses list
    if (url.includes('/academy/courses') && !url.includes('c-mock-98') && route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockCourse])
      });
    }

    // Single course details
    if (url.includes('/academy/courses/c-mock-98') && !url.includes('/outline') && !url.includes('/students') && !url.includes('/submissions')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCourse)
      });
    }

    // Outline
    if (url.includes('/outline')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          course: mockCourse,
          ...mockCourse,
          isEnrolled: true,
          progress: { completedLessons: 1, totalLessons: 3, percentage: 33 },
          studentInfo: { name: 'عمر خالد', phone: '01012345678', email: 'omar@example.com' }
        })
      });
    }

    // Single Lesson content
    if (url.includes('/academy/lessons/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lesson: mockCourse.modules[0].lessons[0],
          quiz: mockCourse.modules[0].lessons[0].quiz,
          enableWatermark: true,
          studentInfo: { name: 'عمر خالد', phone: '01012345678', email: 'omar@example.com' }
        })
      });
    }

    // My Enrollments
    if (url.includes('/academy/my-enrollments')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'enr-1',
            courseId: 'c-mock-98',
            progressPercent: 33,
            completedLessonsCount: 1,
            status: 'ACTIVE',
            enrolledAt: '2026-10-01T10:00:00Z',
            course: mockCourse
          }
        ])
      });
    }

    // Students progress
    if (url.includes('/students-progress') || url.includes('/academy/courses/c-mock-98/students')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'st-1',
            studentName: 'محمود عبد السلام',
            studentPhone: '01011223344',
            studentEmail: 'mahmoud@gmail.com',
            progressPercent: 85,
            completedLessonsCount: 12,
            totalLessonsCount: 14,
            hasCertificate: true,
            certificateNumber: 'CERT-2026-0042',
            status: 'ACTIVE',
            enrolledAt: '2026-09-15T12:00:00Z',
            expiresAt: '2027-09-15T12:00:00Z',
            isExpired: false
          },
          {
            id: 'st-2',
            studentName: 'سارة إبراهيم الشناوي',
            studentPhone: '01122334455',
            studentEmail: 'sara@agency.com',
            progressPercent: 33,
            completedLessonsCount: 4,
            totalLessonsCount: 14,
            hasCertificate: false,
            status: 'ACTIVE',
            enrolledAt: '2026-10-02T09:30:00Z',
            expiresAt: '2027-10-02T09:30:00Z',
            isExpired: false
          }
        ])
      });
    }

    // Exercise Submissions
    if (url.includes('/submissions')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'sub-1',
            lessonId: 'l-mock-1',
            studentName: 'محمود عبد السلام',
            studentPhone: '01011223344',
            submissionText: 'تم ربط البيكسل مع حدث Purchase واختبار الدفع بنجاح عبر أداة Facebook Pixel Helper.',
            submissionUrl: 'https://example.com/proof.png',
            status: 'PENDING',
            submittedAt: '2026-10-14T14:20:00Z',
            lesson: { title: '1. مقدمة في خوارزميات المنصات الإعلانية' }
          }
        ])
      });
    }

    // Fallback for other academy calls
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Mocked API response' })
    });
  });

  for (const p of pagesToTest) {
    const fullUrl = `http://127.0.0.1:5173${p.path}`;
    console.log(`Navigating to ${p.name} (${fullUrl})...`);

    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const shotPath = path.join(ARTIFACTS_DIR, `${p.name}_${mode}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      console.log(`Captured: ${shotPath}`);
    } catch (err) {
      console.error(`Failed to capture ${p.name}:`, err.message);
      fatalErrors++;
    }
  }

  await browser.close();
  console.log(`Finished Batch 98 capture in mode: ${mode}. Total fatal errors: ${fatalErrors}`);
  process.exit(fatalErrors > 0 ? 1 : 0);
}

run();
