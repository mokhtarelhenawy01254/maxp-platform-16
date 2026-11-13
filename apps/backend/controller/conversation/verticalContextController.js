/**
 * verticalContextController.js
 * Modular endpoint providing vertical & app-aware customer context for /facebook-inbox
 */

const { getSharedPrismaClient, executeWithRetry } = require('../../services/sharedDatabase');
const { getPhoneVariants } = require('../../utils/phoneNormalization');

const VALID_VERTICALS = new Set(['education', 'dental', 'medical', 'services', 'agency', 'cafe', 'commerce']);

const resolveVertical = (specialtySlugOrObj, legacyActiveApps = []) => {
  let specialtySlug = '';
  let activeApps = [];
  let companyName = '';
  let companySlug = '';
  let specialtyName = '';
  let inboxVerticalProfile = null;

  if (specialtySlugOrObj && typeof specialtySlugOrObj === 'object' && !Array.isArray(specialtySlugOrObj)) {
    specialtySlug = specialtySlugOrObj.specialtySlug || '';
    activeApps = specialtySlugOrObj.activeApps || [];
    companyName = specialtySlugOrObj.companyName || '';
    companySlug = specialtySlugOrObj.companySlug || '';
    specialtyName = specialtySlugOrObj.specialtyName || '';
    inboxVerticalProfile = specialtySlugOrObj.inboxVerticalProfile || null;
  } else {
    specialtySlug = specialtySlugOrObj || '';
    activeApps = legacyActiveApps || [];
  }

  // Tier 1: Merchant explicit override from settings (Highest Priority)
  if (inboxVerticalProfile && VALID_VERTICALS.has(inboxVerticalProfile)) {
    return inboxVerticalProfile;
  }

  const textCues = [specialtySlug, companyName, companySlug, specialtyName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const apps = new Set((activeApps || []).map((a) => String(a || '').toLowerCase().trim()));

  // Tier 2: Database Official Business Specialty & Domain Keywords
  const isEducationSlug = /education|academy|school|course|learning|training|quran|student|tutor|أكاديمية|تعليم|تدريب|مدرسة|كورس|سنتر|حضونة|طلاب|تلميذ|قرآن/.test(textCues);
  const hasEducationApp = apps.has('academy-app') || apps.has('education-app') || apps.has('quran-app');
  if (isEducationSlug || hasEducationApp) return 'education';

  // Tier 2b: Dental
  if (/dental|أسنان/.test(textCues) || apps.has('dental-lab-app') || apps.has('dental-materials-pro') || apps.has('dental-lab')) {
    return 'dental';
  }

  // Tier 2c: Medical (CRITICAL: booking-app alone is NOT medical!)
  const isMedicalSlug = /medical|clinic|health|doctor|radiology|pharmacy|hospital|therapy|عيادة|طبي|مستشفى|دكتور|علاج|مختبر|أشعة|صيدلية/.test(textCues);
  const hasMedicalApp = apps.has('medical-system') || apps.has('lab-app') || apps.has('radiology-app') || apps.has('clinic-app');
  if (isMedicalSlug || hasMedicalApp) return 'medical';

  // Tier 2d: Services & Maintenance
  const isServiceSlug = /service|maintenance|contracting|factory|صيانة|خدمات|مقاولات|مصنع/.test(textCues);
  const hasServiceApp = apps.has('service-orders') || apps.has('services-app') || apps.has('services-pro') || apps.has('service-request-app');
  if (isServiceSlug || hasServiceApp) return 'services';

  // Tier 2e: Agency
  if (/agency|marketing|call_center|support|تسويق|دعاية|وكالة/.test(textCues) || apps.has('marketing-agency-pro')) {
    return 'agency';
  }

  // Tier 2f: Cafe & Restaurant
  if (/cafe|restaurant|coffee|food|bakery|مطعم|كافيه|قهوة|مقهى/.test(textCues) || apps.has('cafe-restaurant-pro')) {
    return 'cafe';
  }

  // Tier 3: Utility Apps Fallback (booking-app without domain driver maps to neutral services)
  if (apps.has('booking-app')) {
    return 'services';
  }

  return 'commerce';
};

const collectPhoneVariants = (customer) => {
  if (!customer) return [];
  const set = new Set();
  for (const raw of [customer.phone, customer.phoneNormalized]) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed) set.add(trimmed);
    for (const v of getPhoneVariants(trimmed)) if (v) set.add(v);
  }
  return Array.from(set);
};

async function fetchDentalSummary(prisma, companyId, phoneVariants) {
  const empty = { countLabel: 'حالات المعمل النشطة', valueLabel: 'إجمالي قيمة الحالات', primaryCount: 0, secondaryValue: 0, items: [] };
  if (!phoneVariants.length || !prisma.dentalLabCase?.findMany) return empty;
  try {
    const cases = await prisma.dentalLabCase.findMany({
      where: { companyId, isDeleted: false, patientPhone: { in: phoneVariants } },
      select: { id: true, caseNumber: true, patientName: true, status: true, total: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const closed = new Set(['DELIVERED', 'CLOSED', 'CANCELLED']);
    const activeCount = cases.filter((c) => !closed.has(String(c.status || '').toUpperCase())).length;
    const totalValue = cases.reduce((sum, c) => sum + (Number(c.total) || 0), 0);
    const items = cases.slice(0, 5).map((c) => ({
      id: c.id,
      type: 'dental_case',
      caseNumber: c.caseNumber || c.id,
      code: c.caseNumber || c.id,
      patientName: c.patientName || null,
      title: c.patientName || `حالة #${c.caseNumber || c.id}`,
      status: c.status,
      total: Number(c.total) || 0,
      amount: Number(c.total) || 0,
      createdAt: c.createdAt,
      date: c.createdAt,
      href: `/dental-lab/cases/${c.id}`,
    }));
    return { ...empty, primaryCount: activeCount, secondaryValue: totalValue, items };
  } catch (err) {
    console.warn('[VERTICAL-CONTEXT] dental query failed:', err.message);
    return empty;
  }
}

async function fetchMedicalSummary(prisma, companyId, customerId, phoneVariants) {
  const empty = { countLabel: 'المواعيد القادمة', valueLabel: 'إجمالي المواعيد', primaryCount: 0, secondaryValue: 0, items: [] };
  const orFilters = [];
  if (customerId) orFilters.push({ customerId });
  if (phoneVariants.length) orFilters.push({ customerPhone: { in: phoneVariants } });
  if (!orFilters.length || !prisma.appointment?.findMany) return empty;
  try {
    const appointments = await prisma.appointment.findMany({
      where: { companyId, OR: orFilters },
      select: { id: true, title: true, appointmentDate: true, startTime: true, status: true, createdAt: true },
      orderBy: { appointmentDate: 'desc' },
      take: 20,
    });
    const inactive = new Set(['cancelled', 'canceled', 'completed', 'missed', 'no_show']);
    const upcomingCount = appointments.filter((a) => !inactive.has(String(a.status || '').toLowerCase())).length;
    const items = appointments.slice(0, 5).map((a) => ({
      id: a.id,
      type: 'appointment',
      title: a.title || 'موعد',
      status: a.status,
      appointmentDate: a.appointmentDate,
      startTime: a.startTime,
      date: a.appointmentDate || a.createdAt,
      subtitle: a.startTime || undefined,
      createdAt: a.createdAt,
      href: '/appointments',
    }));
    return { ...empty, primaryCount: upcomingCount, secondaryValue: appointments.length, items };
  } catch (err) {
    console.warn('[VERTICAL-CONTEXT] medical query failed:', err.message);
    return empty;
  }
}

async function fetchServicesSummary(prisma, companyId, phoneVariants) {
  const empty = { countLabel: 'طلبات الخدمات', valueLabel: 'إجمالي القيمة', primaryCount: 0, secondaryValue: 0, items: [] };
  if (!phoneVariants.length || !prisma.serviceOrder?.findMany) return empty;
  try {
    const orders = await prisma.serviceOrder.findMany({
      where: { companyId, phone: { in: phoneVariants } },
      select: { id: true, status: true, description: true, createdAt: true, service: { select: { name: true, price: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const totalValue = orders.reduce((sum, o) => sum + (Number(o.service?.price) || 0), 0);
    const items = orders.slice(0, 5).map((o) => ({
      id: o.id,
      type: 'service_order',
      title: o.service?.name || 'طلب خدمة',
      status: o.status,
      amount: Number(o.service?.price) || 0,
      description: o.description || null,
      subtitle: o.description || undefined,
      service: o.service ? { name: o.service.name, price: Number(o.service.price) || 0 } : null,
      createdAt: o.createdAt,
      date: o.createdAt,
    }));
    return { ...empty, primaryCount: orders.length, secondaryValue: totalValue, items };
  } catch (err) {
    console.warn('[VERTICAL-CONTEXT] services query failed:', err.message);
    return empty;
  }
}

async function fetchAgencySummary(prisma, companyId, customer) {
  const empty = { countLabel: 'مهام العميل المفتوحة', valueLabel: 'إجمالي المهام', primaryCount: 0, secondaryValue: 0, items: [] };
  if (!prisma.task?.findMany) return empty;
  try {
    const fullName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim().toLowerCase();
    const customerPhone = String(customer?.phone || customer?.phoneNormalized || '').trim();
    const orFilters = [];
    if (fullName.length >= 2) {
      orFilters.push({ title: { contains: fullName, mode: 'insensitive' } });
      orFilters.push({ description: { contains: fullName, mode: 'insensitive' } });
    }
    if (customerPhone.length >= 6) {
      orFilters.push({ title: { contains: customerPhone } });
      orFilters.push({ description: { contains: customerPhone } });
    }
    if (!orFilters.length) return empty;

    const tasks = await prisma.task.findMany({
      where: { companyId, OR: orFilters },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const closed = new Set(['COMPLETED', 'DONE', 'CANCELLED']);
    const openCount = tasks.filter((t) => !closed.has(String(t.status || '').toUpperCase())).length;
    const items = tasks.slice(0, 5).map((t) => ({
      id: t.id,
      type: 'task',
      title: t.title,
      status: t.status,
      priority: t.priority,
      subtitle: t.priority ? `الأولوية: ${t.priority}` : undefined,
      date: t.dueDate || t.createdAt,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      href: '/tasks',
    }));
    return { ...empty, primaryCount: openCount, secondaryValue: tasks.length, items };
  } catch (err) {
    console.warn('[VERTICAL-CONTEXT] agency query failed:', err.message);
    return empty;
  }
}

async function fetchEducationSummary(prisma, companyId, customer, phoneVariants) {
  const empty = { countLabel: 'المواعيد والاشتراكات', valueLabel: 'إجمالي المدفوع', primaryCount: 0, secondaryValue: 0, items: [] };
  const items = [];
  let primaryCount = 0;
  let secondaryValue = 0;

  // 1. Fetch educational enrollments if available
  const studentOr = [];
  if (customer?.id) studentOr.push({ customerId: customer.id });
  if (phoneVariants.length) studentOr.push({ phone: { in: phoneVariants } });

  if (studentOr.length && prisma.educationEnrollment?.findMany) {
    try {
      const enrollments = await prisma.educationEnrollment.findMany({
        where: { companyId, student: { OR: studentOr } },
        select: {
          id: true, remainingHours: true, totalHours: true, amountPaid: true, paymentStatus: true, isActive: true, createdAt: true,
          student: { select: { firstName: true, lastName: true } },
          package: { select: { name: true, subject: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const activeCount = enrollments.filter((e) => e.isActive !== false).length;
      const totalPaid = enrollments.reduce((sum, e) => sum + (Number(e.amountPaid) || 0), 0);
      primaryCount += activeCount;
      secondaryValue += totalPaid;
      for (const e of enrollments.slice(0, 5)) {
        items.push({
          id: e.id,
          type: 'enrollment',
          title: e.package?.name || 'اشتراك تعليمي',
          status: e.paymentStatus || (e.isActive !== false ? 'ACTIVE' : 'INACTIVE'),
          amount: Number(e.amountPaid) || 0,
          amountPaid: Number(e.amountPaid) || 0,
          date: e.createdAt,
          createdAt: e.createdAt,
          subtitle: e.package?.subject?.name || (e.totalHours ? `${e.remainingHours ?? 0}/${e.totalHours} ساعة` : undefined),
        });
      }
    } catch (err) {
      console.warn('[VERTICAL-CONTEXT] educationEnrollment error:', err.message);
    }
  }

  // 2. Also fetch academy appointments (Demo Days, placement tests, coaching sessions)
  const aptOr = [];
  if (customer?.id) aptOr.push({ customerId: customer.id });
  if (phoneVariants.length) aptOr.push({ customerPhone: { in: phoneVariants } });

  if (aptOr.length && prisma.appointment?.findMany) {
    try {
      const appointments = await prisma.appointment.findMany({
        where: { companyId, OR: aptOr },
        select: { id: true, title: true, appointmentDate: true, startTime: true, status: true, createdAt: true },
        orderBy: { appointmentDate: 'desc' },
        take: 20,
      });
      const inactive = new Set(['cancelled', 'canceled', 'completed', 'missed', 'no_show']);
      const upcomingApts = appointments.filter((a) => !inactive.has(String(a.status || '').toLowerCase())).length;
      primaryCount += upcomingApts;
      for (const a of appointments.slice(0, 5)) {
        items.push({
          id: a.id,
          type: 'appointment',
          title: a.title || 'موعد / ديمو داي',
          status: a.status,
          appointmentDate: a.appointmentDate,
          startTime: a.startTime,
          date: a.appointmentDate || a.createdAt,
          subtitle: a.startTime ? `الساعة: ${a.startTime}` : undefined,
          createdAt: a.createdAt,
          href: '/appointments',
        });
      }
    } catch (err) {
      console.warn('[VERTICAL-CONTEXT] education appointment query failed:', err.message);
    }
  }

  if (items.length > 0) {
    return { ...empty, primaryCount, secondaryValue, items: items.slice(0, 5) };
  }

  return fetchAgencySummary(prisma, companyId, customer);
}

async function fetchCommerceSummary(prisma, companyId, conversationId, customerId, phoneVariants, vertical) {
  const empty = {
    countLabel: vertical === 'cafe' ? 'طلبات الكافيه' : 'الطلبات',
    valueLabel: 'إجمالي الإنفاق (LTV)',
    primaryCount: 0,
    secondaryValue: 0,
    items: [],
  };
  const orFilters = [];
  if (customerId) orFilters.push({ customerId });
  if (conversationId) orFilters.push({ conversationId });
  if (phoneVariants.length) orFilters.push({ customerPhone: { in: phoneVariants } });
  if (!orFilters.length || !prisma.order?.findMany) return empty;
  try {
    const orders = await prisma.order.findMany({
      where: { companyId, OR: orFilters },
      select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, currency: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const excluded = new Set(['CANCELLED', 'REFUNDED']);
    const ltv = orders.filter((o) => !excluded.has(String(o.status || '').toUpperCase())).reduce((s, o) => s + (Number(o.total) || 0), 0);
    return {
      ...empty,
      primaryCount: orders.length,
      secondaryValue: ltv,
      items: orders.slice(0, 5).map((o) => ({
        ...o,
        type: 'order',
        title: `طلب #${o.orderNumber || o.id}`,
        code: o.orderNumber || o.id,
        total: Number(o.total) || 0,
        amount: Number(o.total) || 0,
        date: o.createdAt,
        href: `/orders/${o.orderNumber || o.id}`,
      })),
    };
  } catch (err) {
    console.warn('[VERTICAL-CONTEXT] order query failed:', err.message);
    return empty;
  }
}

const getConversationVerticalContext = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const conversationId = req.params.id;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    if (!conversationId) return res.status(400).json({ success: false, message: 'معرف المحادثة مطلوب' });

    const prisma = getSharedPrismaClient();
    const conversation = await executeWithRetry(() => prisma.conversation.findFirst({
      where: { id: conversationId, companyId },
      select: {
        id: true, companyId: true, channel: true, customerId: true,
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, phoneNormalized: true, email: true } },
      },
    }));
    if (!conversation) return res.status(404).json({ success: false, message: 'المحادثة غير موجودة أو غير مصرح بالوصول' });

    const company = await executeWithRetry(() => prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        businessSpecialty: { select: { slug: true, nameAr: true, nameEn: true } },
        installedApps: { where: { status: { in: ['ACTIVE', 'TRIAL'] } }, select: { app: { select: { slug: true } } } },
      },
    }));

    let inboxVerticalProfile = null;
    if (company?.settings) {
      try {
        const parsed = typeof company.settings === 'string' ? JSON.parse(company.settings) : company.settings;
        if (parsed?.inboxVerticalProfile && parsed.inboxVerticalProfile !== 'auto') {
          inboxVerticalProfile = String(parsed.inboxVerticalProfile).toLowerCase().trim();
        }
      } catch (_) {}
    }

    const specialty = company?.businessSpecialty
      ? { slug: company.businessSpecialty.slug, nameAr: company.businessSpecialty.nameAr, nameEn: company.businessSpecialty.nameEn }
      : null;
    const activeApps = Array.isArray(company?.installedApps)
      ? company.installedApps.map((ia) => ia?.app?.slug).filter(Boolean)
      : [];

    const vertical = resolveVertical({
      specialtySlug: specialty?.slug,
      specialtyName: specialty?.nameAr || specialty?.nameEn,
      companyName: company?.name,
      companySlug: company?.slug,
      inboxVerticalProfile,
      activeApps,
    });
    const phoneVariants = collectPhoneVariants(conversation.customer);
    const customerId = conversation.customerId || conversation.customer?.id || null;

    const handlers = {
      dental: () => fetchDentalSummary(prisma, companyId, phoneVariants),
      medical: () => fetchMedicalSummary(prisma, companyId, customerId, phoneVariants),
      services: () => fetchServicesSummary(prisma, companyId, phoneVariants),
      education: () => fetchEducationSummary(prisma, companyId, conversation.customer, phoneVariants),
      agency: () => fetchAgencySummary(prisma, companyId, conversation.customer),
    };
    const summary = await (handlers[vertical]
      ? handlers[vertical]()
      : fetchCommerceSummary(prisma, companyId, conversation.id, customerId, phoneVariants, vertical));

    return res.json({ success: true, data: { specialty, activeApps, vertical, summary } });
  } catch (error) {
    console.error('❌ [VERTICAL-CONTEXT] Error:', error);
    return res.status(500).json({ success: false, message: 'فشل جلب سياق النشاط للمحادثة' });
  }
};

module.exports = { getConversationVerticalContext, resolveVertical };
