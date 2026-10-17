const { getSharedPrismaClient } = require('./sharedDatabase');
const { resolveAiKey, BASE_URL_DEFAULTS, MODEL_DEFAULTS, callChatCompletion } = require('./radiologyAiDraftService');

// ─────────────────────────────────────────────────────────────────────────────
// Academy AI agents bridge — agent-first, inline-prompt fallback
//   COACH  → apps/backend/agents/course-coach-agent/   (role COURSE_COACH)
//   GRADER → apps/backend/agents/academy-grader-agent/ (role ACADEMY_GRADER)
// The agent path is preferred (guardrails + tools + its own model policy, e.g. deepseek-flash).
// If the ai-service, the template, or the spawn is unavailable we silently fall back to the
// inline prompt path below, so the coach/grader can never break because of the bridge.
// Kill switch without a deploy: ACADEMY_AGENT_BRIDGE=0
// ─────────────────────────────────────────────────────────────────────────────
const ACADEMY_AGENT_TEMPLATES = {
  COACH: { slug: 'course-coach-agent', role: 'COURSE_COACH', name: 'كوتش الأكاديمية' },
  GRADER: { slug: 'academy-grader-agent', role: 'ACADEMY_GRADER', name: 'مصحح تمارين الأكاديمية' },
};
const AGENT_BRIDGE_DOWN_TTL_MS = 5 * 60 * 1000;
const academyAgentCache = new Map();     // `${companyId}:${slug}` -> agentId
const academyAgentDownUntil = new Map(); // `${companyId}:${slug}` -> retry-after timestamp

function agentBridgeEnabled() {
  const v = String(process.env.ACADEMY_AGENT_BRIDGE ?? '1').toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(v);
}

// The ai-service client has no per-call timeout (defaults to AI_RESPONSE_TIMEOUT, 10 min),
// so every bridge call is raced against a short deadline and degrades to the inline path.
function withAgentTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function resolveAcademyAgentId(companyId, kind) {
  const tpl = ACADEMY_AGENT_TEMPLATES[kind];
  if (!companyId || !tpl || !agentBridgeEnabled()) return null;
  const cacheKey = `${companyId}:${tpl.slug}`;
  if (academyAgentCache.has(cacheKey)) return academyAgentCache.get(cacheKey);
  if ((academyAgentDownUntil.get(cacheKey) || 0) > Date.now()) return null;
  try {
    const client = require('./aiServiceAdminClient');
    const agents = await withAgentTimeout(client.listAgents(companyId), 10000);
    let found = Array.isArray(agents)
      ? agents.find((a) => (a.template_slug || a.templateSlug || a.slug) === tpl.slug || a.role === tpl.role)
      : null;
    if (!found) {
      found = await withAgentTimeout(
        client.spawnAgent({ companyId, template_slug: tpl.slug, role: tpl.role, name: tpl.name }),
        15000
      );
    }
    const id = found?.id || found?.agent_id || found?.agent?.id || null;
    if (id) {
      academyAgentCache.set(cacheKey, id);
      return id;
    }
    academyAgentDownUntil.set(cacheKey, Date.now() + AGENT_BRIDGE_DOWN_TTL_MS);
    return null;
  } catch (e) {
    console.warn('[academy] agent bridge resolve failed:', tpl.slug, e.message);
    academyAgentDownUntil.set(cacheKey, Date.now() + AGENT_BRIDGE_DOWN_TTL_MS);
    return null;
  }
}

async function askAcademyAgent({ companyId, kind, message, threadId, timeoutMs, customerId }) {
  try {
    const agentId = await resolveAcademyAgentId(companyId, kind);
    if (!agentId) return null;
    const client = require('./aiServiceAdminClient');
    const res = await withAgentTimeout(
      client.chatWithAgent({ companyId, agentId, customerId: customerId || undefined, message, threadId }),
      timeoutMs || 45000
    );
    if (res && res.status === 'ok' && typeof res.reply === 'string' && res.reply.trim()) {
      return res.reply.trim();
    }
    return null;
  } catch (e) {
    console.warn('[academy] agent chat failed:', kind, e.message);
    return null;
  }
}

// Shared by the agent path and the inline path — one parser, one contract.
function parseGraderVerdict(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let parsed = null;
  try {
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleaned);
  } catch (pe) {
    console.error('Failed to parse AI grading JSON:', pe.message);
    return null;
  }
  if (!parsed || !['ACCEPTED', 'REJECTED', 'NEEDS_MORE'].includes(parsed.verdict)) return null;
  return {
    verdict: parsed.verdict,
    missing: Array.isArray(parsed.missing) ? parsed.missing : [],
    coachLine: parsed.coachLine || 'تم تقييم التمرين بواسطة المصحح الذكي.',
    nextStep: parsed.nextStep || 'واصل التقدم في مسار الكورس.',
  };
}


class AcademyService {
  constructor() {
    this.prisma = null;
  }

  getDb() {
    if (!this.prisma) {
      this.prisma = getSharedPrismaClient();
    }
    return this.prisma;
  }

  // -------------------------------------------------------------
  // Course Management (Company Admin / Instructor)
  // -------------------------------------------------------------

  async createCourse({
    companyId,
    title,
    slug,
    description,
    price = 0,
    thumbnailUrl,
    freePreviewLessons = 2,
    storeProductId,
    visibility = 'PUBLIC',
    allowedTags = [],
    enableWatermark = true,
    isGlobal = false,
  }) {
    const db = this.getDb();
    if (!companyId) throw new Error('companyId is required');
    if (!title || !title.trim()) throw new Error('title is required');

    const course = await db.academyCourse.create({
      data: {
        companyId,
        title: title.trim(),
        slug: slug ? slug.trim() : null,
        description: description ? description.trim() : null,
        price: Number(price) || 0,
        thumbnailUrl: thumbnailUrl || null,
        freePreviewLessons: Number(freePreviewLessons) >= 0 ? Number(freePreviewLessons) : 2,
        storeProductId: storeProductId || null,
        visibility: ['PUBLIC', 'UNLISTED', 'INVITE_ONLY', 'TAG_GATED'].includes(visibility) ? visibility : 'PUBLIC',
        allowedTags: Array.isArray(allowedTags) ? allowedTags : [],
        enableWatermark: Boolean(enableWatermark),
        isGlobal: Boolean(isGlobal),
        isPublished: false,
      },
    });

    return course;
  }

  async updateCourse(courseId, companyId, data) {
    const db = this.getDb();
    const existing = await db.academyCourse.findFirst({
      where: { id: courseId, companyId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!existing) throw new Error('Course not found');

    // Rule: if publishing, enforce that every lesson has scriptText!
    if (data.isPublished === true) {
      const allLessons = existing.modules.flatMap((m) => m.lessons);
      if (allLessons.length === 0) {
        throw new Error('لا يمكن نشر الكورس بدون إضافة أي دروس أولاً');
      }
      const missingScript = allLessons.find((l) => !l.scriptText || !l.scriptText.trim());
      if (missingScript) {
        throw new Error(`لا يمكن نشر الكورس لأن الدرس "${missingScript.title}" لا يحتوي على سكريبت نصي (scriptText). السكريبت إجباري للذكاء الاصطناعي.`);
      }
    }

    const updated = await db.academyCourse.update({
      where: { id: courseId },
      data: {
        title: data.title !== undefined ? data.title.trim() : undefined,
        slug: data.slug !== undefined ? data.slug?.trim() : undefined,
        description: data.description !== undefined ? data.description?.trim() : undefined,
        price: data.price !== undefined ? Number(data.price) : undefined,
        thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl : undefined,
        isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : undefined,
        freePreviewLessons: data.freePreviewLessons !== undefined ? Number(data.freePreviewLessons) : undefined,
        storeProductId: data.storeProductId !== undefined ? data.storeProductId : undefined,
        visibility: data.visibility !== undefined ? (['PUBLIC', 'UNLISTED', 'INVITE_ONLY', 'TAG_GATED'].includes(data.visibility) ? data.visibility : 'PUBLIC') : undefined,
        allowedTags: data.allowedTags !== undefined ? (Array.isArray(data.allowedTags) ? data.allowedTags : []) : undefined,
        enableWatermark: data.enableWatermark !== undefined ? Boolean(data.enableWatermark) : undefined,
        isGlobal: data.isGlobal !== undefined ? Boolean(data.isGlobal) : undefined,
      },
    });

    return updated;
  }

  async deleteCourse(courseId, companyId) {
    const db = this.getDb();
    const course = await db.academyCourse.findFirst({
      where: { id: courseId, companyId },
    });
    if (!course) throw new Error('Course not found');

    await db.academyCourse.delete({
      where: { id: courseId },
    });
    return { success: true };
  }

  async getCourses(companyId) {
    const db = this.getDb();
    const courses = await db.academyCourse.findMany({
      where: { companyId },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                sortOrder: true,
                durationMin: true,
                isFreePreview: true,
                videoUrl: true,
                createdAt: true,
                quiz: { select: { id: true } },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const storeProductIds = courses.map((c) => c.storeProductId).filter(Boolean);
    if (storeProductIds.length > 0) {
      try {
        const products = await db.product.findMany({
          where: { id: { in: storeProductIds } },
          select: { id: true, name: true, price: true, mainImage: true, sku: true },
        });
        const prodMap = new Map(products.map((p) => [p.id, p]));
        return courses.map((c) => ({
          ...c,
          storeProduct: c.storeProductId ? prodMap.get(c.storeProductId) || null : null,
        }));
      } catch (_) {
        return courses;
      }
    }

    return courses;
  }

  async getCourseDetails(courseId, companyId) {
    const db = this.getDb();
    const course = await db.academyCourse.findFirst({
      where: { id: courseId, companyId },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: {
                quiz: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });
    if (!course) throw new Error('Course not found');
    return course;
  }

  // -------------------------------------------------------------
  // Modules & Lessons Management
  // -------------------------------------------------------------

  async addModule({ companyId, courseId, title, description, sortOrder = 0 }) {
    const db = this.getDb();
    const course = await db.academyCourse.findFirst({
      where: { id: courseId, companyId },
    });
    if (!course) throw new Error('Course not found');

    return db.academyModule.create({
      data: {
        companyId,
        courseId,
        title: title.trim(),
        description: description ? description.trim() : null,
        sortOrder: Number(sortOrder) || 0,
      },
    });
  }

  async updateModule(moduleId, companyId, data) {
    const db = this.getDb();
    const moduleItem = await db.academyModule.findFirst({
      where: { id: moduleId, companyId },
    });
    if (!moduleItem) throw new Error('Module not found');

    return db.academyModule.update({
      where: { id: moduleId },
      data: {
        title: data.title !== undefined ? data.title.trim() : undefined,
        description: data.description !== undefined ? data.description?.trim() : undefined,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
      },
    });
  }

  async deleteModule(moduleId, companyId) {
    const db = this.getDb();
    const moduleItem = await db.academyModule.findFirst({
      where: { id: moduleId, companyId },
    });
    if (!moduleItem) throw new Error('Module not found');

    await db.academyModule.delete({ where: { id: moduleId } });
    return { success: true };
  }

  async addLesson({
    companyId,
    courseId,
    moduleId,
    title,
    sortOrder = 0,
    videoUrl,
    scriptText,
    exerciseText,
    durationMin = 10,
    isFreePreview = false,
  }) {
    const db = this.getDb();
    const moduleItem = await db.academyModule.findFirst({
      where: { id: moduleId, companyId },
    });
    if (!moduleItem) throw new Error('Module not found');

    return db.academyLesson.create({
      data: {
        companyId,
        courseId: courseId || moduleItem.courseId,
        moduleId,
        title: title.trim(),
        sortOrder: Number(sortOrder) || 0,
        videoUrl: videoUrl ? videoUrl.trim() : null,
        scriptText: scriptText ? scriptText.trim() : null,
        exerciseText: exerciseText ? exerciseText.trim() : null,
        durationMin: Number(durationMin) || 10,
        isFreePreview: Boolean(isFreePreview),
      },
    });
  }

  async updateLesson(lessonId, companyId, data) {
    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId, companyId },
    });
    if (!lesson) throw new Error('Lesson not found');

    return db.academyLesson.update({
      where: { id: lessonId },
      data: {
        title: data.title !== undefined ? data.title.trim() : undefined,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
        videoUrl: data.videoUrl !== undefined ? data.videoUrl?.trim() : undefined,
        scriptText: data.scriptText !== undefined ? data.scriptText?.trim() : undefined,
        exerciseText: data.exerciseText !== undefined ? data.exerciseText?.trim() : undefined,
        durationMin: data.durationMin !== undefined ? Number(data.durationMin) : undefined,
        isFreePreview: data.isFreePreview !== undefined ? Boolean(data.isFreePreview) : undefined,
      },
    });
  }

  async deleteLesson(lessonId, companyId) {
    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId, companyId },
    });
    if (!lesson) throw new Error('Lesson not found');

    await db.academyLesson.delete({ where: { id: lessonId } });
    return { success: true };
  }

  async saveLessonQuiz(lessonId, companyId, { title, passScorePercent = 70, questions }) {
    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId, companyId },
    });
    if (!lesson) throw new Error('Lesson not found');

    return db.academyQuiz.upsert({
      where: { lessonId },
      create: {
        lessonId,
        title: title || 'اختبار نهاية الدرس',
        passScorePercent: Number(passScorePercent) || 70,
        questions: questions || [],
      },
      update: {
        title: title || undefined,
        passScorePercent: Number(passScorePercent) || 70,
        questions: questions !== undefined ? questions : undefined,
      },
    });
  }

  // -------------------------------------------------------------
  // Student Portal & Sequential Progression
  // -------------------------------------------------------------

  async getPublishedCatalog(params) {
    const db = this.getDb();
    // Handle both legacy signature (companyId string) and new object params
    const companyId = typeof params === 'string' ? params : params?.companyId;
    const studentUserId = typeof params === 'object' ? params?.studentUserId : null;
    const customerId = typeof params === 'object' ? params?.customerId : null;
    const studentPhone = typeof params === 'object' ? params?.studentPhone : null;
    const customerTags = (typeof params === 'object' && Array.isArray(params?.customerTags)) ? params.customerTags : [];

    // 1. Fetch active enrollments if user identity is available
    let enrolledCourseIds = new Set();
    if (studentUserId || customerId || studentPhone) {
      const enrollments = await db.academyEnrollment.findMany({
        where: {
          status: { in: ['ACTIVE', 'COMPLETED'] },
          OR: [
            ...(studentUserId ? [{ studentUserId }] : []),
            ...(customerId ? [{ customerId }] : []),
            ...(studentPhone ? [{ studentPhone }] : []),
          ],
        },
        select: { courseId: true },
      });
      enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
    }

    // 2. Fetch published courses: company's own + global platform courses
    const courses = await db.academyCourse.findMany({
      where: {
        isPublished: true,
        OR: [
          { companyId },           // Company's own courses
          { isGlobal: true },      // MaxP platform-wide global courses
        ],
      },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                sortOrder: true,
                durationMin: true,
                isFreePreview: true,
                // scriptText and videoUrl are hidden in catalog
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Visibility filtering:
    // - Always show if already enrolled
    // - PUBLIC: visible to everyone
    // - UNLISTED: visible within the course's own company catalog or when includeUnlisted requested
    // - TAG_GATED: visible if student has any matching tag
    const includeUnlisted = Boolean(typeof params === 'object' && params?.includeUnlisted);
    const filtered = courses.filter((course) => {
      if (enrolledCourseIds.has(course.id)) return true;

      const vis = course.visibility || 'PUBLIC';
      if (vis === 'PUBLIC') return true;
      if (vis === 'UNLISTED') {
        // ضمن كتالوج شركة الكورس نفسه، أو عندما يُطلب صراحةً
        return course.companyId === companyId || includeUnlisted;
      }
      if (vis === 'TAG_GATED') {
        if (!Array.isArray(course.allowedTags) || course.allowedTags.length === 0) return true;
        return course.allowedTags.some((tag) => customerTags.includes(tag));
      }
      // INVITE_ONLY أو أي وضع آخر: غير ظاهر في الكتالوج العام
      return false;
    });

    return filtered.map((c) => ({
      ...c,
      isEnrolled: enrolledCourseIds.has(c.id),
      isGlobal: Boolean(c.isGlobal),
    }));
  }

  async getMyEnrolledCourses({ companyId, studentUserId, customerId, studentPhone }) {
    const db = this.getDb();
    if (!studentUserId && !customerId && !studentPhone) {
      return [];
    }

    const enrollments = await db.academyEnrollment.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        status: { in: ['ACTIVE', 'COMPLETED'] },
        OR: [
          ...(studentUserId ? [{ studentUserId }] : []),
          ...(customerId ? [{ customerId }] : []),
          ...(studentPhone ? [{ studentPhone }] : []),
        ],
      },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { sortOrder: 'asc' },
              include: {
                lessons: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    durationMin: true,
                    isFreePreview: true,
                  },
                },
              },
            },
          },
        },
        progress: true,
        certificate: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((enr) => {
      const allLessons = enr.course.modules.flatMap((m) => m.lessons);
      const totalLessons = allLessons.length;
      const completedCount = enr.progress.filter((p) => p.status === 'DONE').length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const doneLessonIds = new Set(enr.progress.filter((p) => p.status === 'DONE').map((p) => p.lessonId));
      // استكمال من حيث توقفت: أول درس لم يُكمل بعد (null لو الكورس خلص)
      const resumeLesson = allLessons.find((l) => !doneLessonIds.has(l.id)) || null;

      return {
        enrollmentId: enr.id,
        courseId: enr.courseId,
        status: enr.status,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt,
        expiresAt: enr.expiresAt,
        progressPercent,
        completedCount,
        totalLessons,
        resumeLessonId: resumeLesson?.id || null,
        certificate: enr.certificate,
        course: {
          id: enr.course.id,
          title: enr.course.title,
          slug: enr.course.slug,
          description: enr.course.description,
          thumbnailUrl: enr.course.thumbnailUrl,
          price: enr.course.price,
          visibility: enr.course.visibility,
          modulesCount: enr.course.modules.length,
          lessonsCount: totalLessons,
        },
      };
    });
  }

  async enrollStudent({
    companyId,
    courseId,
    studentCompanyId,
    studentUserId,
    customerId,
    orderId,
    studentName,
    studentPhone,
    studentEmail,
    subscriptionDays,
    byAdmin = false,
  }) {
    const db = this.getDb();
    const course = await db.academyCourse.findFirst({
      where: {
        id: courseId,
        OR: [
          { companyId },
          { isGlobal: true },
        ],
      },
    });
    if (!course) throw new Error('الكورس غير موجود');

    // ─── حارس منع التسجيل المجاني في الكورسات المدفوعة ──────────────────────
    // الاستثناء الوحيد: تسجيل بواسطة الأدمن (byAdmin=true) أو تسجيل تلقائي بعد دفع (orderId موجود)
    const isPaidCourse = Number(course.price) > 0;
    if (isPaidCourse && !byAdmin && !orderId) {
      throw new Error(
        'هذا الكورس مدفوع. يجب شراؤه من المتجر أولاً قبل التسجيل. سيتم تسجيلك تلقائياً بعد إتمام الدفع.'
      );
    }

    const targetCompanyId = companyId || course.companyId;
    if (!targetCompanyId) throw new Error('معرف الشركة مطلوب لإتمام التسجيل');

    // ─── حساب تاريخ انتهاء الاشتراك ──────────────────────────────────────
    const subDays = (subscriptionDays && Number(subscriptionDays) > 0)
      ? Number(subscriptionDays)
      : (course.subscriptionDays ? Number(course.subscriptionDays) : null);

    // ─── فحص التسجيل المكرر ───────────────────────────────────────────────
    const orConditions = [
      ...(studentUserId ? [{ studentUserId }] : []),
      ...(customerId ? [{ customerId }] : []),
      ...(studentPhone ? [{ studentPhone }] : []),
    ];

    let existing = null;
    if (orConditions.length > 0) {
      existing = await db.academyEnrollment.findFirst({
        where: {
          courseId,
          companyId: targetCompanyId,
          OR: orConditions,
        },
      });
    }

    if (existing) {
      const isExpired = existing.expiresAt ? new Date(existing.expiresAt) < new Date() : false;
      // إذا كان الاشتراك معطلاً أو منتهي الصلاحية، يُعاد تفعيله وتجديد مدته
      if (existing.status !== 'ACTIVE' || isExpired) {
        let renewedExpiresAt = null;
        if (subDays && subDays > 0) {
          renewedExpiresAt = new Date();
          renewedExpiresAt.setDate(renewedExpiresAt.getDate() + subDays);
        }
        return db.academyEnrollment.update({
          where: { id: existing.id },
          data: {
            status: 'ACTIVE',
            orderId: orderId || existing.orderId,
            expiresAt: renewedExpiresAt,
            subscriptionDays: subDays || existing.subscriptionDays,
          },
        });
      }
      return existing; // مسجّل بالفعل ونشط — لا نعمل تسجيل مكرر
    }

    let expiresAt = null;
    if (subDays && subDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + subDays);
    }

    const enrollment = await db.academyEnrollment.create({
      data: {
        companyId: targetCompanyId,
        courseId,
        studentCompanyId: studentCompanyId || null,
        studentUserId: studentUserId || null,
        customerId: customerId || null,
        orderId: orderId || null,
        studentName: studentName || 'طالب جديد',
        studentPhone: studentPhone || null,
        studentEmail: studentEmail || null,
        status: 'ACTIVE',
        subscriptionDays: subDays,
        expiresAt,
      },
    });

    // 🔔 إشعار الطالب عبر واتساب بتفعيل اشتراكه (غير حاجز — فشله لا يلغي التسجيل)
    //    يغطي كل مسارات التسجيل لأنها كلها تمر عبر هذه الدالة
    this.sendEnrollmentWelcome({ enrollment, course }).catch((e) => {
      console.warn('[academy] enrollment WhatsApp notify failed:', e?.message || e);
    });

    return enrollment;
  }

  // 🔎 إيجاد جلسة واتساب نشطة للشركة (Baileys في الذاكرة أو Meta Cloud في القاعدة) مع fallback للمنصة
  async _resolveActiveWhatsAppSession(companyId, db) {
    try {
      const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');

      if (typeof WhatsAppManager.getCompanySessions === 'function') {
        const memorySessions = (WhatsAppManager.getCompanySessions(companyId) || []).filter(
          (s) => s.status === 'connected' && s.sock
        );
        if (memorySessions.length > 0) {
          return { id: memorySessions[0].id || memorySessions[0].sessionId, provider: memorySessions[0].provider || 'BAILEYS' };
        }
      }

      if (db?.whatsAppSession) {
        const connectedSession = await db.whatsAppSession.findFirst({
          where: { companyId, status: 'CONNECTED' },
          orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }],
          select: { id: true, provider: true, status: true },
        });

        if (connectedSession?.id) {
          if (connectedSession.provider === 'META_CLOUD') return { id: connectedSession.id, provider: 'META_CLOUD' };
          if (typeof WhatsAppManager.getSession === 'function') {
            const mem = WhatsAppManager.getSession(connectedSession.id);
            if (mem && mem.status === 'connected') return { id: connectedSession.id, provider: 'BAILEYS' };
          }
        }

        const fallbackCompanyId = 'cmopgxu3a07i4jujj6f1oh32h';
        if (companyId !== fallbackCompanyId) {
          const fallbackDbSession = await db.whatsAppSession.findFirst({
            where: { companyId: fallbackCompanyId, status: 'CONNECTED' },
            orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }],
            select: { id: true, provider: true, status: true },
          });
          if (fallbackDbSession?.id) {
            if (fallbackDbSession.provider === 'META_CLOUD') return { id: fallbackDbSession.id, provider: 'META_CLOUD' };
            if (typeof WhatsAppManager.getSession === 'function') {
              const mem = WhatsAppManager.getSession(fallbackDbSession.id);
              if (mem && mem.status === 'connected') return { id: fallbackDbSession.id, provider: 'BAILEYS' };
            }
          }
        }
      }
    } catch (err) {
      console.warn('[academy] Error resolving WhatsApp session:', err.message);
    }
    return null;
  }

  async sendEnrollmentWelcome({ enrollment, course }) {
    try {
      if (!enrollment?.studentPhone) return;
      const db = this.getDb();
      const activeSession = await this._resolveActiveWhatsAppSession(enrollment.companyId || course.companyId, db);
      if (!activeSession) return;

      const WhatsAppMessageHandler = require('../services/whatsapp/WhatsAppMessageHandler');
      if (typeof WhatsAppMessageHandler.sendText !== 'function') return;

      // تجاهل حسابات الاختبار
      if (['01000000099', '01000000088'].includes(enrollment.studentPhone)) return;

      const portalBase = process.env.PORTAL_BASE_URL || 'https://maxp.online';
      const expiryLine = enrollment.expiresAt
        ? `\nمدة اشتراكك حتى: ${new Date(enrollment.expiresAt).toLocaleDateString('ar-EG')}`
        : '';
      const message =
        `أهلاً ${enrollment.studentName || 'بك'}\n` +
        `تم تفعيل اشتراكك في كورس: «${course?.title || ''}» على أكاديمية ماكس بي.\n` +
        `سجّل دخولك برقم موبايلك (${enrollment.studentPhone}) وابدأ من حيث توقفت:\n${portalBase}/portal/login` +
        expiryLine;

      await WhatsAppMessageHandler.sendText(activeSession.id, enrollment.studentPhone, message);
    } catch (e) {
      console.warn('[academy] sendEnrollmentWelcome error:', e?.message || e);
    }
  }

  async autoEnrollFromPaidOrder({ companyId, customerId, storeProductId, orderId, customerName, customerPhone, customerEmail }) {
    if (!storeProductId) return null;
    const db = this.getDb();
    const courses = await db.academyCourse.findMany({
      where: {
        storeProductId,
        OR: [
          ...(companyId ? [{ companyId }] : []),
          { isGlobal: true },
        ],
      },
    });
    if (!courses || courses.length === 0) return null;

    let lastEnrollment = null;
    for (const course of courses) {
      const targetCompanyId = course.companyId || companyId;
      // ─── منع التسجيل المكرر لنفس الطلب ──────────────────────────────────
      const alreadyEnrolled = await db.academyEnrollment.findFirst({
        where: {
          courseId: course.id,
          orderId,
        },
      });
      if (alreadyEnrolled) {
        console.log(`[academy] skip duplicate auto-enroll: orderId=${orderId}, courseId=${course.id}`);
        lastEnrollment = alreadyEnrolled;
        continue;
      }

      const enrollment = await this.enrollStudent({
        companyId: targetCompanyId,
        courseId: course.id,
        customerId,
        orderId,
        studentName: customerName,
        studentPhone: customerPhone,
        studentEmail: customerEmail,
        subscriptionDays: course.subscriptionDays,
        byAdmin: false, // بعد دفع — orderId موجود يتجاوز الحارس
      });

      lastEnrollment = enrollment;

      // ─── إشعار الطالب بعد التسجيل التلقائي ──────────────────────────────
      try {
        const notificationService = require('./notificationService');
        if (notificationService?.createNotification) {
          await notificationService.createNotification({
            companyId: targetCompanyId,
            title: `تم تسجيلك في كورس: ${course.title}`,
            body: `مبروك! تم تسجيلك تلقائياً في دورة "${course.title}" بعد إتمام الدفع. يمكنك الوصول للكورس من الأكاديمية الآن.`,
            type: 'ACADEMY_ENROLLMENT',
            recipientCustomerId: customerId || null,
            metadata: { courseId: course.id, enrollmentId: enrollment?.id },
          });
        }
      } catch (notifErr) {
        console.warn('[academy] auto-enroll notification skipped:', notifErr.message);
      }
    }

    return lastEnrollment;
  }

  /**
   * 🎓 معالجة التسجيل التلقائي الشامل لطلب مدفوع (Idempotent & Multi-course)
   * يفحص الطلب وبنوده، ويربط الطالب بجميع الكورسات المطابقة للمنتجات،
   * ويسجل إشعاراً وسجل تاريخ في الطلب ليراه التاجر في التفاصيل.
   */
  async processOrderAutoEnrollment({ orderId, orderNumber, companyId, changedBy = null, orderData = null }) {
    const db = this.getDb();
    let order = orderData;

    if (!order || !order.orderItems || order.orderItems.length === 0) {
      const targetOrderId = order?.id || orderId;
      const targetOrderNumber = order?.orderNumber || orderNumber;
      if (!targetOrderId && !targetOrderNumber) return { success: false, enrolled: 0, reason: 'No order identifier provided' };

      order = await db.order.findFirst({
        where: {
          OR: [
            ...(targetOrderId ? [{ id: targetOrderId }] : []),
            ...(targetOrderNumber ? [{ orderNumber: String(targetOrderNumber) }] : []),
          ],
          ...(companyId ? { companyId } : {}),
        },
        include: {
          customer: true,
          orderItems: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        order = await db.guestOrder.findFirst({
          where: {
            OR: [
              ...(targetOrderId ? [{ id: targetOrderId }] : []),
              ...(targetOrderNumber ? [{ orderNumber: String(targetOrderNumber) }] : []),
            ],
            ...(companyId ? { companyId } : {}),
          },
        }).catch(() => null);
      }
    }

    if (!order) return { success: false, enrolled: 0, reason: 'Order not found' };

    const resolvedCompanyId = companyId || order.companyId;
    let items = order.orderItems || [];
    if ((!items || items.length === 0) && order.items) {
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch (_) {
        items = [];
      }
    }
    if (!Array.isArray(items) || items.length === 0) return { success: true, enrolled: 0, reason: 'Order has no items' };

    const productIds = items.map((it) => it.productId || it.product?.id || it.id).filter(Boolean);
    if (productIds.length === 0) return { success: true, enrolled: 0, reason: 'No products in items' };

    const matchingCourses = await db.academyCourse.findMany({
      where: {
        storeProductId: { in: productIds },
        OR: [
          ...(resolvedCompanyId ? [{ companyId: resolvedCompanyId }] : []),
          { isGlobal: true },
        ],
      },
    });

    if (matchingCourses.length === 0) {
      return { success: true, enrolled: 0, reason: 'No courses linked to ordered products' };
    }

    const customerName = order.customerName || order.guestName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'طالب جديد';
    const customerPhone = order.customerPhone || order.guestPhone || order.customer?.phone || null;
    const customerEmail = order.customerEmail || order.guestEmail || order.customer?.email || null;
    const customerId = order.customerId || order.customer?.id || null;

    let studentUserId = null;
    if (customerPhone || customerEmail) {
      const matchedUser = await db.user.findFirst({
        where: {
          OR: [
            ...(customerPhone ? [{ phone: customerPhone }] : []),
            ...(customerEmail ? [{ email: customerEmail }] : []),
          ],
        },
        select: { id: true },
      }).catch(() => null);
      if (matchedUser) studentUserId = matchedUser.id;
    }

    const enrollments = [];

    for (const course of matchingCourses) {
      const targetCompanyId = course.companyId || resolvedCompanyId;
      const alreadyForOrder = await db.academyEnrollment.findFirst({
        where: {
          courseId: course.id,
          orderId: order.id,
        },
      });

      if (alreadyForOrder) {
        console.log(`[academy] Order ${order.orderNumber || order.id} already enrolled in course ${course.id}`);
        enrollments.push(alreadyForOrder);
        continue;
      }

      const enr = await this.enrollStudent({
        companyId: targetCompanyId,
        courseId: course.id,
        studentUserId,
        customerId,
        orderId: order.id,
        studentName: customerName,
        studentPhone: customerPhone,
        studentEmail: customerEmail,
        subscriptionDays: course.subscriptionDays,
        byAdmin: false,
      });

      if (enr) {
        enrollments.push(enr);

        try {
          const notificationService = require('./notificationService');
          if (notificationService?.createNotification) {
            await notificationService.createNotification({
              companyId: targetCompanyId,
              title: `تم تسجيلك في كورس: ${course.title}`,
              body: `مبروك! تم تسجيلك تلقائياً في دورة "${course.title}" بعد إتمام الدفع. يمكنك الوصول للكورس من الأكاديمية الآن.`,
              type: 'ACADEMY_ENROLLMENT',
              userId: studentUserId || null,
              recipientCustomerId: customerId || null,
              metadata: { courseId: course.id, enrollmentId: enr.id },
            });
          }
        } catch (notifErr) {
          console.warn('[academy] auto-enroll notification skipped:', notifErr.message);
        }
      }
    }

    // إضافة سجل في تاريخ الطلب ليظهر في تفاصيل الطلب بلوحة التحكم
    if (enrollments.length > 0 && order.id) {
      try {
        const isGuest = Boolean(order.guestPhone || order.guestName || (order.items && !order.orderItems));
        const titles = matchingCourses.map((c) => c.title).join('، ');
        await db.orderStatusHistory.create({
          data: {
            orderId: isGuest ? null : order.id,
            guestOrderId: isGuest ? order.id : null,
            status: order.status || 'CONFIRMED',
            oldStatus: order.status || 'CONFIRMED',
            reason: `🎓 تسجيل تلقائي في الأكاديمية: تم تسجيل الطالب (${customerName}) في دورة [${titles}] بنجاح`,
            changedBy: changedBy || 'SYSTEM',
            userName: 'MaxP Academy Auto-Enroll',
          },
        });
      } catch (histErr) {
        console.warn('[academy] order status history recording skipped:', histErr.message);
      }
    }

    return {
      success: true,
      enrolled: enrollments.length,
      courses: matchingCourses.map((c) => ({ id: c.id, title: c.title })),
      enrollments,
    };
  }

  /**
   * جلب منتجات المتجر النشطة للشركة لربطها بالكورسات
   */
  async getStoreProducts(companyId) {
    const db = this.getDb();
    if (!companyId) return [];
    try {
      const products = await db.product.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          price: true,
          comparePrice: true,
          mainImage: true,
          images: true,
          sku: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
      });

      return products.map((p) => {
        let image = p.mainImage || null;
        if (!image && p.images) {
          try {
            const parsed = JSON.parse(p.images);
            image = Array.isArray(parsed) ? parsed[0] : parsed;
          } catch (_) {
            image = typeof p.images === 'string' ? p.images : null;
          }
        }
        return {
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          image,
          sku: p.sku || '',
        };
      });
    } catch (e) {
      console.warn('[academy] getStoreProducts failed:', e.message);
      return [];
    }
  }

  // ─── الأدمن يوقف اشتراك طالب ───────────────────────────────────────────
  async suspendEnrollment({ enrollmentId, companyId }) {
    const db = this.getDb();
    const enrollment = await db.academyEnrollment.findFirst({
      where: { id: enrollmentId, companyId },
    });
    if (!enrollment) throw new Error('الاشتراك غير موجود');

    return db.academyEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'SUSPENDED' },
    });
  }

  // 🔒 إلغاء/استرداد الأوردر يوقف تسجيلات الكورسات المرتبطة به (idempotent)
  async suspendEnrollmentsForOrder({ orderId, reason }) {
    if (!orderId) return 0;
    const db = this.getDb();
    const result = await db.academyEnrollment.updateMany({
      where: { orderId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      data: { status: 'SUSPENDED' },
    });
    if (result.count > 0) {
      console.log(`[academy] suspended ${result.count} enrollment(s) for revoked order ${orderId} (${reason || 'cancelled/refunded'})`);
    }
    return result.count;
  }

  // ─── الأدمن يُعيد تفعيل اشتراك طالب ────────────────────────────────────
  async reactivateEnrollment({ enrollmentId, companyId }) {
    const db = this.getDb();
    const enrollment = await db.academyEnrollment.findFirst({
      where: { id: enrollmentId, companyId },
    });
    if (!enrollment) throw new Error('الاشتراك غير موجود');

    return db.academyEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'ACTIVE' },
    });
  }

  async getCourseOutlineWithProgress({ courseId, companyId, studentUserId, customerId, studentPhone }) {
    const db = this.getDb();
    let course = await db.academyCourse.findFirst({
      where: {
        id: courseId,
        OR: [
          ...(companyId ? [{ companyId }] : []),
          { isGlobal: true },
        ],
      },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: {
                quiz: {
                  select: { id: true, passScorePercent: true },
                },
              },
            },
          },
        },
      },
    });

    // Check enrollment (for global courses or cross-company enrollments, match by student identifier)
    let enrollment = null;
    if (studentUserId || customerId || studentPhone) {
      enrollment = await db.academyEnrollment.findFirst({
        where: {
          courseId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          OR: [
            ...(studentUserId ? [{ studentUserId }] : []),
            ...(customerId ? [{ customerId }] : []),
            ...(studentPhone ? [{ studentPhone }] : []),
          ],
        },
        include: {
          progress: true,
          certificate: true,
        },
      });

      // فحص انتهاء مدة الاشتراك
      if (enrollment && enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
        enrollment = null;
      }
    }

    // If course was not matched by current companyId, but student has active enrollment in this course, grant outline access
    if (!course && enrollment) {
      course = await db.academyCourse.findFirst({
        where: { id: courseId },
        include: {
          modules: {
            orderBy: { sortOrder: 'asc' },
            include: {
              lessons: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  quiz: {
                    select: { id: true, passScorePercent: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    if (!course) throw new Error('Course not found');

    // Auto-heal module and lesson companyId if drifted from course.companyId
    if (course.companyId) {
      const driftedModules = course.modules.some(m => m.companyId !== course.companyId);
      if (driftedModules) {
        db.academyModule.updateMany({
          where: { courseId: course.id, companyId: { not: course.companyId } },
          data: { companyId: course.companyId }
        }).catch(() => {});
        const moduleIds = course.modules.map(m => m.id);
        db.academyLesson.updateMany({
          where: { moduleId: { in: moduleIds }, companyId: { not: course.companyId } },
          data: { companyId: course.companyId }
        }).catch(() => {});
      }
    }

    const isEnrolled = Boolean(enrollment);
    const progressMap = new Map();
    if (enrollment) {
      for (const p of enrollment.progress) {
        progressMap.set(p.lessonId, p);
      }
    }

    // Flatten all lessons to determine sequential lock status
    const allLessons = course.modules.flatMap((m) => m.lessons);
    let previousLessonDone = true; // First lesson is unlocked
    let globalLessonIndex = 0;

    const modulesWithLockStatus = course.modules.map((m) => {
      const lessons = m.lessons.map((lesson) => {
        const p = progressMap.get(lesson.id);
        const isDone = p?.status === 'DONE';
        const isFree = Boolean(lesson.isFreePreview || (course.freePreviewLessons > 0 && globalLessonIndex < course.freePreviewLessons));
        globalLessonIndex++;

        // An enrolled student can access if previous was done, or it's free preview
        const isUnlocked = isFree || (isEnrolled && previousLessonDone);

        // Update previousLessonDone for the next sequential lesson
        previousLessonDone = isDone;

        return {
          id: lesson.id,
          title: lesson.title,
          sortOrder: lesson.sortOrder,
          durationMin: lesson.durationMin,
          isFreePreview: isFree,
          hasQuiz: Boolean(lesson.quiz),
          isUnlocked,
          progress: p || { status: 'NOT_STARTED', quizScore: null },
        };
      });

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        sortOrder: m.sortOrder,
        lessons,
      };
    });

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        thumbnailUrl: course.thumbnailUrl,
        freePreviewLessons: course.freePreviewLessons,
        storeProductId: course.storeProductId,
      },
      isEnrolled,
      enrollmentId: enrollment?.id || null,
      certificate: enrollment?.certificate || null,
      modules: modulesWithLockStatus,
    };
  }

  async getLessonContent({ lessonId, companyId, studentUserId, customerId, studentPhone }) {
    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
        quiz: true,
      },
    });

    if (!lesson) throw new Error('Lesson not found');
    const course = lesson.module?.course;
    if (!course) throw new Error('Course not found');

    // Auto-heal orphaned module/lesson companyId if course companyId differs
    if (course.companyId && lesson.companyId !== course.companyId) {
      db.academyLesson.update({
        where: { id: lesson.id },
        data: { companyId: course.companyId }
      }).catch(() => {});
    }

    // Check enrollment
    let enrollment = null;
    if (studentUserId || customerId || studentPhone) {
      enrollment = await db.academyEnrollment.findFirst({
        where: {
          courseId: course.id,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          OR: [
            ...(studentUserId ? [{ studentUserId }] : []),
            ...(customerId ? [{ customerId }] : []),
            ...(studentPhone ? [{ studentPhone }] : []),
          ],
        },
      });

      // ─── فحص انتهاء مدة الاشتراك ──────────────────────────────────────────
      if (enrollment && enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
        // الاشتراك منتهي — نتعامل معه كغير مسجّل (يرى المعاينة فقط)
        enrollment = null;
      }
    }

    const isEnrolled = Boolean(enrollment);

    // Calculate free preview status
    let isFreePreview = Boolean(lesson.isFreePreview);
    if (!isFreePreview && course.freePreviewLessons > 0) {
      let modules = course.modules;
      if (!modules) {
        const fullCourse = await db.academyCourse.findUnique({
          where: { id: course.id },
          include: {
            modules: {
              orderBy: { sortOrder: 'asc' },
              include: {
                lessons: {
                  orderBy: { sortOrder: 'asc' },
                  select: { id: true },
                },
              },
            },
          },
        });
        modules = fullCourse?.modules || [];
      }
      const allCourseLessons = modules.flatMap((m) => m.lessons || []);
      const lessonIdx = allCourseLessons.findIndex((l) => l.id === lesson.id);
      if (lessonIdx !== -1 && lessonIdx < course.freePreviewLessons) {
        isFreePreview = true;
      }
    }

    // If not free preview and not enrolled => reject
    if (!isFreePreview && !isEnrolled) {
      throw new Error('هذا الدرس يتطلب الاشتراك في الكورس أولاً');
    }

    // If free preview without enrollment, ensure course is accessible in current context
    if (isFreePreview && !isEnrolled && !course.isGlobal && companyId && course.companyId !== companyId) {
      if (companyId !== 'cmopgxu3a07i4jujj6f1oh32h' && course.companyId !== 'cmopgxu3a07i4jujj6f1oh32h') {
        throw new Error('هذا الدرس يتطلب الاشتراك في الكورس أولاً');
      }
    }

    // Get or create progress
    let progress = null;
    if (enrollment) {
      progress = await db.academyProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: enrollment.id,
            lessonId: lesson.id,
          },
        },
        create: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          status: 'IN_PROGRESS',
        },
        update: {
          status: undefined, // keep existing
        },
      });
    }

    // Prepare quiz questions (remove correct answers for student view)
    let sanitizedQuiz = null;
    if (lesson.quiz && lesson.quiz.questions) {
      const qList = Array.isArray(lesson.quiz.questions) ? lesson.quiz.questions : [];
      sanitizedQuiz = {
        id: lesson.quiz.id,
        title: lesson.quiz.title,
        passScorePercent: lesson.quiz.passScorePercent,
        questions: qList.map((q, idx) => ({
          id: q.id || `q_${idx}`,
          q: q.q,
          options: q.options || [],
        })),
      };
    }

    return {
      lesson: {
        id: lesson.id,
        courseId: course.id,
        courseTitle: course.title,
        moduleId: lesson.moduleId,
        moduleTitle: lesson.module.title,
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        scriptText: lesson.scriptText,
        exerciseText: lesson.exerciseText,
        durationMin: lesson.durationMin,
        isFreePreview: lesson.isFreePreview,
      },
      quiz: sanitizedQuiz,
      progress,
      isEnrolled,
      enableWatermark: course.enableWatermark ?? true,
      studentInfo: {
        name: enrollment?.studentName || 'طالب ماكس بي',
        phone: enrollment?.studentPhone || studentPhone || '',
        email: enrollment?.studentEmail || '',
        id: studentUserId || customerId || enrollment?.id || '',
      },
    };
  }

  // 🔒 فحص صلاحية الاشتراك للكتابة (ملكية + حالة + انتهاء مدة)
  // للطالب: الملكية = id + رقم هاتف التوكن (بلا فلتر شركة — تسجيلات تاريخية قد تحمل شركة مختلفة عن التوكن)
  async _getWritableEnrollment({ enrollmentId, companyId, studentPhone, include }) {
    const db = this.getDb();
    if (!enrollmentId) throw new Error('Enrollment not found');
    const enrollment = await db.academyEnrollment.findFirst({
      where: studentPhone
        ? { id: enrollmentId, studentPhone }
        : { id: enrollmentId, ...(companyId ? { companyId } : {}) },
      ...(include ? { include } : {}),
    });
    if (!enrollment) throw new Error('Enrollment not found');
    if (!['ACTIVE', 'COMPLETED'].includes(enrollment.status)) {
      throw new Error('هذا الاشتراك موقوف حالياً — تواصل مع الدعم لإعادة تفعيله');
    }
    if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
      throw new Error('انتهت مدة اشتراكك في هذا الكورس — جدّد الاشتراك للمتابعة');
    }
    return enrollment;
  }

  async completeLessonManual({ lessonId, enrollmentId, companyId, studentPhone }) {
    const db = this.getDb();
    const enrollment = await this._getWritableEnrollment({
      enrollmentId,
      companyId,
      studentPhone,
      include: {
        course: {
          include: {
            modules: {
              include: { lessons: true },
            },
          },
        },
      },
    });

    const progress = await db.academyProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        status: 'DONE',
        completedAt: new Date(),
      },
      update: {
        status: 'DONE',
        completedAt: new Date(),
      },
    });

    // Check if whole course is completed
    await this.checkAndIssueCertificate(enrollment.id);

    return progress;
  }

  async submitLessonQuiz({ lessonId, enrollmentId, companyId, studentPhone, answers = [] }) {
    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId },
      include: { quiz: true },
    });
    if (!lesson || !lesson.quiz) throw new Error('Quiz not found for this lesson');

    // 🔒 الاشتراك يُقرأ من قاعدة البيانات بملكية الطالب — مش من الجسم
    const enrollment = await this._getWritableEnrollment({ enrollmentId, companyId, studentPhone });
    const effectiveEnrollmentId = enrollment.id;

    const quiz = lesson.quiz;
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    if (questions.length === 0) {
      return this.completeLessonManual({ lessonId, enrollmentId: effectiveEnrollmentId, companyId, studentPhone });
    }

    let correctCount = 0;
    const feedback = questions.map((q, idx) => {
      const studentAnswer = answers[idx] !== undefined ? Number(answers[idx]) : -1;
      const isCorrect = studentAnswer === q.correctIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id || idx,
        isCorrect,
        explanation: q.explanation || null,
        correctIndex: isCorrect ? undefined : q.correctIndex, // reveal only if wrong
      };
    });

    const scorePercent = Math.round((correctCount / questions.length) * 100);
    const passed = scorePercent >= quiz.passScorePercent;

    const progress = await db.academyProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: effectiveEnrollmentId,
          lessonId,
        },
      },
      create: {
        enrollmentId: effectiveEnrollmentId,
        lessonId,
        status: passed ? 'DONE' : 'IN_PROGRESS',
        quizScore: scorePercent,
        attemptsCount: 1,
        completedAt: passed ? new Date() : null,
      },
      update: {
        status: passed ? 'DONE' : undefined,
        quizScore: scorePercent,
        attemptsCount: { increment: 1 },
        completedAt: passed ? new Date() : undefined,
      },
    });

    if (passed) {
      await this.checkAndIssueCertificate(effectiveEnrollmentId);
    }

    return {
      passed,
      scorePercent,
      passScorePercent: quiz.passScorePercent,
      correctCount,
      totalCount: questions.length,
      feedback,
      progress,
    };
  }

  async checkAndIssueCertificate(enrollmentId) {
    const db = this.getDb();
    const enrollment = await db.academyEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            modules: {
              include: { lessons: true },
            },
          },
        },
        progress: true,
        certificate: true,
      },
    });

    if (!enrollment || enrollment.certificate) return enrollment?.certificate;

    const allLessons = enrollment.course.modules.flatMap((m) => m.lessons);
    const completedMap = new Set(
      enrollment.progress.filter((p) => p.status === 'DONE').map((p) => p.lessonId)
    );

    const allDone = allLessons.length > 0 && allLessons.every((l) => completedMap.has(l.id));

    if (allDone) {
      const certNum = `MAXP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const cert = await db.academyCertificate.create({
        data: {
          enrollmentId: enrollment.id,
          certificateNumber: certNum,
          studentName: enrollment.studentName || 'Student',
          courseTitle: enrollment.course.title,
          pdfUrl: `/api/v1/academy/certificates/${enrollment.id}/view`,
        },
      });

      await db.academyEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return cert;
    }

    return null;
  }

  // -------------------------------------------------------------
  // AI Coach Grounded Q&A
  // -------------------------------------------------------------

  async askCoachOnLesson({ lessonId, companyId, studentPhone, userMessage, quizContext, userId }) {
    if (!userMessage || !userMessage.trim()) {
      throw new Error('Message is required');
    }

    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) throw new Error('Lesson not found');

    const course = lesson.module?.course;

    // 🔒 نفس بوابة قراءة المحتوى: طالب بلا اشتراك ساري أو معاينة مجانية = ممنوع
    if (studentPhone) {
      const enrollment = await db.academyEnrollment.findFirst({
        where: {
          courseId: course.id,
          studentPhone,
          status: { in: ['ACTIVE', 'COMPLETED'] },
        },
      });
      const enrollmentLive = enrollment && !(enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date());
      let isFreePreview = Boolean(lesson.isFreePreview);
      if (!isFreePreview && course.freePreviewLessons > 0) {
        const fullCourse = await db.academyCourse.findUnique({
          where: { id: course.id },
          include: {
            modules: {
              orderBy: { sortOrder: 'asc' },
              include: { lessons: { orderBy: { sortOrder: 'asc' }, select: { id: true } } },
            },
          },
        });
        const allCourseLessons = (fullCourse?.modules || []).flatMap((m) => m.lessons || []);
        const lessonIdx = allCourseLessons.findIndex((l) => l.id === lesson.id);
        if (lessonIdx !== -1 && lessonIdx < course.freePreviewLessons) isFreePreview = true;
      }
      if (!enrollmentLive && !isFreePreview) {
        throw new Error('هذا الدرس يتطلب الاشتراك في الكورس أولاً');
      }
    }

    const courseTitle = course?.title || '';
    const lessonTitle = lesson.title;
    const scriptText = lesson.scriptText || 'لم يتوفر سكريبت نصي مفصل لهذا الدرس بعد.';
    const exerciseText = lesson.exerciseText || 'لا يوجد تمرين محدد لهذا الدرس.';

    let quizContextBlock = '';
    if (quizContext) {
      quizContextBlock = `\nسياق كويز الطالب لهذا الدرس:
- نتيجة الطالب: ${quizContext.scorePercent !== undefined ? quizContext.scorePercent + '%' : 'غير محدد'}
- الأسئلة الخاطئة: ${Array.isArray(quizContext.wrongQuestions) && quizContext.wrongQuestions.length > 0 ? JSON.stringify(quizContext.wrongQuestions, null, 2) : 'لا يوجد أو لم يُختبر بعد'}
- توضيحات الأسئلة: ${quizContext.explanation || 'لا يوجد'}
- توقيت القسم في الدرس: ${quizContext.sectionTimestamp || 'غير محدد'}\n`;
    }

    const systemPrompt = `أنت "كوتش أكاديمية ماكس بي الذكي" (MaxP Course Coach).
أنت مرشد تعليمي ودود ومحترف، متخصص في شرح دورة: "${courseTitle}"، وتحديداً درس: "${lessonTitle}".

القانون الصارم:
1. إجابتك يجب أن تكون مستندة ومبنية حصراً على سكريبت ومعلومات هذا الدرس أدناه.
2. ممنوع تأليف أي استراتيجيات أو مصطلحات تخالف ما ورد في سكريبت الدرس.
3. إذا سأل الطالب سؤالاً خارج سياق الدرس (مثال: أسئلة الطبخ، البرمجة خارج الدرس، أو مواضيع عامة)، اعتذر له بأدب ووضح له:
"هذا السؤال خارج نطاق هذا الدرس الحالي (${lessonTitle}). تركيزنا هنا هو محتوى الدرس وتطبيقه العملي، وأنا جاهز لأي استفسار يخص سكريبت الدرس والتمرين المطلوب!"
4. ممنوع أي رقم غير الأرقام المكتوبة في السكريبت. وأي رقم يتقال لازم يتقال معاه مصدره (Spiegel / Baymard / أو إنه حساب على الشاشة).
5. في نهاية إجابتك، شجع الطالب دائماً على تطبيق التمرين أو إتمام الدرس.
${quizContextBlock}
محتوى وسكريبت الدرس الحالي:
"""
${scriptText}
"""

التمرين العملي للدرس:
"""
${exerciseText}
"""`;

    // Preferred path: the dedicated course-coach agent (guardrails + tools + its own model policy).
    // Falls back to the inline prompt below when the agent / ai-service is unavailable.
    const agentReply = await askAcademyAgent({
      companyId: companyId || lesson.companyId,
      kind: 'COACH',
      threadId: `academy-lesson-${lessonId}`,
      timeoutMs: 45000,
      customerId: userId,
      message: `[سياق الدرس]\nالكورس: ${courseTitle}\nالدرس: ${lessonTitle}\n\nسكريبت الدرس:\n"""\n${scriptText}\n"""\n\nالتمرين العملي:\n"""\n${exerciseText}\n"""\n${quizContextBlock}\n\n[سؤال الطالب]\n${userMessage}`,
    });
    if (agentReply) return { reply: agentReply, source: 'agent' };

    // Call AI using database-backed key resolution exclusively
    let aiConfig = null;
    try {
      aiConfig = await resolveAiKey(db, companyId || lesson.companyId);
    } catch (e) {
      // ignore
    }

    if (!aiConfig?.apiKey) {
      return {
        reply: `مرحباً بك في درس "${lessonTitle}".\n\nنصيحة الكوتش: ركّز على تطبيق خطوات الدرس بدقة وحل التمرين المطلوب: (${exerciseText}).\n\n(ملاحظة: يمكنك إعداد مفتاح الذكاء الاصطناعي في لوحة التحكم لتفعيل المحادثات المتقدمة).`,
      };
    }

    try {
      const completion = await callChatCompletion({
        baseUrl: aiConfig.baseUrl,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        system: systemPrompt,
        user: userMessage,
        timeoutMs: 30000,
      });

      return { reply: completion || 'عذراً، لم أستطع صياغة رد حالياً. حاول مرة أخرى.' };
    } catch (err) {
      console.error('AI Coach Error:', err);
      return {
        reply: `إجابة مبنية على الدرس "${lessonTitle}":\n\nيرجى مراجعة محتوى الدرس والتمرين العملي المطلوب والالتزام بالخطوات المذكورة في الفيديو والسكريبت.`,
      };
    }
  }

  // -------------------------------------------------------------
  // AI Grader & Exercise Submissions (M2 & M3)
  // -------------------------------------------------------------

  async gradeSubmission({ lessonId, submission, companyId, userId }) {
    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) throw new Error('الدرس غير موجود');

    const courseTitle = lesson.module?.course?.title || '';
    const lessonTitle = lesson.title;
    const exerciseText = lesson.exerciseText || '';
    const scriptText = lesson.scriptText || '';
    const studentText = submission?.submissionText || '';
    const studentUrl = submission?.submissionUrl || '';

    // Preferred path: the dedicated academy-grader agent (rubric-bound guardrails, JSON verdict).
    // Falls back to the inline prompt below when the agent / ai-service is unavailable.
    if (exerciseText && exerciseText.trim()) {
      const graderReply = await askAcademyAgent({
        companyId: companyId || lesson.companyId,
        kind: 'GRADER',
        threadId: `academy-grade-${lessonId}`,
        timeoutMs: 45000,
        customerId: userId,
        message: `[الدرس] ${lessonTitle} — ${courseTitle}\n\n[مسطرة التمرين (معايير القبول/الرفض)]\n"""\n${exerciseText}\n"""\n\n[تسليم الطالب]\nنص الإجابة / التطبيق:\n"""\n${studentText || 'لم يكتب نصاً'}\n"""\nرابط المرفق / الصورة: ${studentUrl || 'لا يوجد'}\n\nأعد JSON فقط بالحقول: verdict, missing, coachLine, nextStep.`,
      });
      const agentVerdict = parseGraderVerdict(graderReply);
      if (agentVerdict) return { ...agentVerdict, source: 'agent' };
    }

    let aiConfig = null;
    try {
      aiConfig = await resolveAiKey(db, companyId || lesson.companyId);
    } catch (e) {
      // ignore
    }

    if (!aiConfig?.apiKey) {
      return {
        verdict: 'PENDING',
        missing: [],
        coachLine: 'تم استلام تمرينك بنجاح. لا يتوفر مفتاح ذكاء اصطناعي حالياً، والتسليم قيد المراجعة اليدوية بواسطة المدرب.',
        nextStep: 'انتظر مراجعة المدرب البشري لاعتماد الدرس والانتقال للتالي.',
      };
    }

    const systemPrompt = `أنت "المصحح الذكي لأكاديمية ماكس بي" (MaxP Academy Grader).
مهمتك تقييم تسليم الطالب للتمرين العملي لدرس: "${lessonTitle}" من دورة: "${courseTitle}".

القانون الصارم جداً:
1. احكم على تسليم الطالب حصرياً بمعايير القبول/الرفض المكتوبة في نص التمرين أدناه، وممنوع تخترع معيار من عندك إطلاقاً.
2. إذا حقق الطالب كافة بنود ومطاليب مسطرة التمرين المكتوبة: الحكم يكون "ACCEPTED".
3. إذا كان التسليم ناقصاً بنوداً جوهرية من المسطرة المذكورة في نص التمرين: الحكم يكون "REJECTED".
4. إذا كان التسليم يحتاج تفاصيل توضيحية إضافية: الحكم يكون "NEEDS_MORE".
5. يجب أن تذكر في مصفوفة "missing" البنود الناقصة نصاً ومطابقة لمسطرة التمرين فقط دون اختراع.
6. الرد يجب أن يكون JSON صالحاً فقط (Valid JSON) بالصيغة التالية بدون أي كلام إضافي أو كتل برمجية:
{
  "verdict": "ACCEPTED" | "REJECTED" | "NEEDS_MORE",
  "missing": ["البند الناقص 1 من المسطرة", "البند الناقص 2 من المسطرة"],
  "coachLine": "ملاحظة توجيهية موجزة ومحفزة باللهجة المصرية المهنية تعكس سبب الحكم",
  "nextStep": "الخطوة العملية التالية المحددة للطالب"
}

نص وتفاصيل التمرين العملي ومسطرة التقييم:
"""
${exerciseText}
"""

سكريبت الدرس للمرجعية:
"""
${scriptText}
"""`;

    const userMessage = `تسليم الطالب:
نص الإجابة / التطبيق:
"""
${studentText || 'لم يكتب نصاً'}
"""

رابط المرفق / الصورة:
${studentUrl || 'لا يوجد رابط'}`;

    try {
      const completion = await callChatCompletion({
        baseUrl: aiConfig.baseUrl,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        system: systemPrompt,
        user: userMessage,
        timeoutMs: 30000,
      });

      const parsedVerdict = parseGraderVerdict(completion);
      if (parsedVerdict) return { ...parsedVerdict, source: 'inline' };

      return {
        verdict: 'PENDING',
        missing: [],
        coachLine: 'تم استلام التمرين وبانتظار المراجعة البشرية.',
        nextStep: 'انتظر مراجعة المدرب البشري.',
      };
    } catch (err) {
      console.error('AI Grader invocation error:', err.message);
      return {
        verdict: 'PENDING',
        missing: [],
        coachLine: 'تعذر الاتصال بالمصحح الذكي حالياً، والتمرين قيد المراجعة اليدوية بواسطة المدرب.',
        nextStep: 'انتظر مراجعة المدرب البشري.',
      };
    }
  }

  async submitLessonExercise({
    lessonId,
    enrollmentId,
    companyId,
    studentPhone,
    studentUserId,
    customerId,
    submissionText,
    submissionUrl,
  }) {
    if (!submissionText?.trim() && !submissionUrl?.trim()) {
      throw new Error('يجب إدخال نص التمرين أو رابط صورة للتسليم');
    }

    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) throw new Error('الدرس غير موجود');

    // 🔒 الطالب: التسليم يتطلب اشتراكاً مملوكاً له على كورس هذا الدرس
    let effectiveEnrollmentId = enrollmentId || null;
    if (studentPhone) {
      let enrollment = null;
      if (effectiveEnrollmentId) {
        enrollment = await this._getWritableEnrollment({
          enrollmentId: effectiveEnrollmentId,
          companyId,
          studentPhone,
        });
      } else {
        const candidate = await db.academyEnrollment.findFirst({
          where: {
            courseId: lesson.module?.course?.id,
            studentPhone,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
        });
        enrollment = candidate && !(candidate.expiresAt && new Date(candidate.expiresAt) < new Date())
          ? candidate
          : null;
      }
      if (!enrollment) {
        throw new Error('التطبيق العملي متاح للمشتركين في الكورس فقط');
      }
      effectiveEnrollmentId = enrollment.id;
    }

    // Run AI Grader
    const gradeResult = await this.gradeSubmission({
      lessonId,
      submission: { submissionText, submissionUrl },
      companyId: companyId || lesson.companyId,
    });

    const submission = await db.academySubmission.create({
      data: {
        companyId: companyId || lesson.companyId,
        lessonId,
        enrollmentId: effectiveEnrollmentId,
        studentUserId: studentUserId || null,
        customerId: customerId || null,
        submissionText: submissionText ? submissionText.trim() : null,
        submissionUrl: submissionUrl ? submissionUrl.trim() : null,
        status: gradeResult.verdict,
        aiVerdictJson: gradeResult,
        aiFeedback: gradeResult.coachLine || null,
      },
    });

    // If verdict is ACCEPTED and student is enrolled, mark progress as DONE
    let progress = null;
    if (gradeResult.verdict === 'ACCEPTED' && effectiveEnrollmentId) {
      progress = await db.academyProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: effectiveEnrollmentId,
            lessonId,
          },
        },
        create: {
          enrollmentId: effectiveEnrollmentId,
          lessonId,
          status: 'DONE',
          completedAt: new Date(),
        },
        update: {
          status: 'DONE',
          completedAt: new Date(),
        },
      });

      await this.checkAndIssueCertificate(effectiveEnrollmentId);
    }

    return {
      submission,
      aiVerdict: gradeResult,
      progress,
    };
  }

  async getLessonSubmissions({ lessonId, companyId, status }) {
    const db = this.getDb();
    const submissions = await db.academySubmission.findMany({
      where: {
        lessonId,
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with enrollment info if available
    const enrollmentIds = [...new Set(submissions.map((s) => s.enrollmentId).filter(Boolean))];
    const enrollments = enrollmentIds.length > 0
      ? await db.academyEnrollment.findMany({
          where: { id: { in: enrollmentIds } },
          select: { id: true, studentName: true, studentPhone: true, studentEmail: true },
        })
      : [];
    const enrMap = new Map(enrollments.map((e) => [e.id, e]));

    return submissions.map((sub) => {
      const enr = sub.enrollmentId ? enrMap.get(sub.enrollmentId) : null;
      return {
        ...sub,
        studentName: enr?.studentName || 'طالب',
        studentPhone: enr?.studentPhone || null,
        studentEmail: enr?.studentEmail || null,
      };
    });
  }

  async getCourseSubmissions({ courseId, companyId, status }) {
    const db = this.getDb();
    const lessons = await db.academyLesson.findMany({
      where: {
        module: {
          courseId,
        },
      },
      select: { id: true, title: true, sortOrder: true },
    });
    const lessonIds = lessons.map((l) => l.id);
    if (lessonIds.length === 0) return [];

    const submissions = await db.academySubmission.findMany({
      where: {
        lessonId: { in: lessonIds },
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const lessonMap = new Map(lessons.map((l) => [l.id, l]));
    const enrollmentIds = [...new Set(submissions.map((s) => s.enrollmentId).filter(Boolean))];
    const enrollments = enrollmentIds.length > 0
      ? await db.academyEnrollment.findMany({
          where: { id: { in: enrollmentIds } },
          select: { id: true, studentName: true, studentPhone: true, studentEmail: true },
        })
      : [];
    const enrMap = new Map(enrollments.map((e) => [e.id, e]));

    return submissions.map((sub) => {
      const enr = sub.enrollmentId ? enrMap.get(sub.enrollmentId) : null;
      const lsn = lessonMap.get(sub.lessonId);
      return {
        ...sub,
        lessonTitle: lsn?.title || 'درس',
        lessonSortOrder: lsn?.sortOrder || 0,
        studentName: enr?.studentName || 'طالب',
        studentPhone: enr?.studentPhone || null,
        studentEmail: enr?.studentEmail || null,
      };
    });
  }

  async reviewSubmission({ submissionId, companyId, reviewedBy, status, instructorNote }) {
    if (!['ACCEPTED', 'REJECTED', 'NEEDS_MORE', 'PENDING'].includes(status)) {
      throw new Error('حالة المراجعة غير صالحة');
    }

    const db = this.getDb();
    const existing = await db.academySubmission.findFirst({
      where: {
        id: submissionId,
        ...(companyId ? { companyId } : {}),
      },
    });

    if (!existing) throw new Error('التسليم غير موجود');

    const updated = await db.academySubmission.update({
      where: { id: submissionId },
      data: {
        status,
        reviewedBy: reviewedBy || 'مدرب ماكس بي',
        reviewedAt: new Date(),
        instructorNote: instructorNote !== undefined ? instructorNote : existing.instructorNote,
      },
    });

    // If accepted and enrollmentId present => mark progress DONE
    if (status === 'ACCEPTED' && updated.enrollmentId) {
      await db.academyProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: updated.enrollmentId,
            lessonId: updated.lessonId,
          },
        },
        create: {
          enrollmentId: updated.enrollmentId,
          lessonId: updated.lessonId,
          status: 'DONE',
          completedAt: new Date(),
        },
        update: {
          status: 'DONE',
          completedAt: new Date(),
        },
      });

      await this.checkAndIssueCertificate(updated.enrollmentId);
    }

    return updated;
  }

  // -------------------------------------------------------------
  // Analytics & Students Tracking
  // -------------------------------------------------------------

  async getStudentsProgress(courseId, companyId) {
    const db = this.getDb();
    const course = await db.academyCourse.findFirst({
      where: { id: courseId, companyId },
      include: {
        modules: {
          include: { lessons: true },
        },
      },
    });
    if (!course) throw new Error('Course not found');

    const totalLessons = course.modules.flatMap((m) => m.lessons).length;

    const enrollments = await db.academyEnrollment.findMany({
      where: { courseId, companyId },
      include: {
        progress: true,
        certificate: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((en) => {
      const completedCount = en.progress.filter((p) => p.status === 'DONE').length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isExpired = en.expiresAt ? new Date(en.expiresAt) < new Date() : false;
      return {
        id: en.id,
        studentName: en.studentName,
        studentPhone: en.studentPhone,
        studentEmail: en.studentEmail,
        status: en.status,
        orderId: en.orderId || null,
        enrolledAt: en.enrolledAt,
        completedAt: en.completedAt,
        expiresAt: en.expiresAt || null,
        subscriptionDays: en.subscriptionDays || null,
        isExpired,
        completedLessonsCount: completedCount,
        totalLessonsCount: totalLessons,
        progressPercent,
        hasCertificate: Boolean(en.certificate),
        certificateNumber: en.certificate?.certificateNumber || null,
      };
    });
  }
}

module.exports = new AcademyService();
