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

async function askAcademyAgent({ companyId, kind, message, threadId, timeoutMs }) {
  try {
    const agentId = await resolveAcademyAgentId(companyId, kind);
    if (!agentId) return null;
    const client = require('./aiServiceAdminClient');
    const res = await withAgentTimeout(
      client.chatWithAgent({ companyId, agentId, message, threadId }),
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
    return db.academyCourse.findMany({
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
    // - TAG_GATED: visible if student has any matching tag
    // - UNLISTED / INVITE_ONLY: hidden from general catalog
    const filtered = courses.filter((course) => {
      if (enrolledCourseIds.has(course.id)) return true;

      const vis = course.visibility || 'PUBLIC';
      if (vis === 'PUBLIC') return true;
      if (vis === 'TAG_GATED') {
        if (!Array.isArray(course.allowedTags) || course.allowedTags.length === 0) return true;
        return course.allowedTags.some((tag) => customerTags.includes(tag));
      }
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

      return {
        enrollmentId: enr.id,
        status: enr.status,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt,
        progressPercent,
        completedCount,
        totalLessons,
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

    // ─── فحص التسجيل المكرر ───────────────────────────────────────────────
    const existing = await db.academyEnrollment.findFirst({
      where: {
        courseId,
        companyId,
        OR: [
          ...(studentUserId ? [{ studentUserId }] : []),
          ...(customerId ? [{ customerId }] : []),
          ...(studentPhone ? [{ studentPhone }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.status !== 'ACTIVE') {
        return db.academyEnrollment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE' },
        });
      }
      return existing; // مسجّل بالفعل — لا نعمل تسجيل مكرر
    }

    // ─── حساب تاريخ انتهاء الاشتراك ──────────────────────────────────────
    const subDays = course.subscriptionDays ? Number(course.subscriptionDays) : null;
    let expiresAt = null;
    if (subDays && subDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + subDays);
    }

    const enrollment = await db.academyEnrollment.create({
      data: {
        companyId,
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

    return enrollment;
  }

  async autoEnrollFromPaidOrder({ companyId, customerId, storeProductId, orderId, customerName, customerPhone, customerEmail }) {
    if (!storeProductId) return null;
    const db = this.getDb();
    const course = await db.academyCourse.findFirst({
      where: { companyId, storeProductId },
    });
    if (!course) return null;

    // ─── منع التسجيل المكرر لنفس الطلب ──────────────────────────────────
    const alreadyEnrolled = await db.academyEnrollment.findFirst({
      where: {
        courseId: course.id,
        companyId,
        orderId,
      },
    });
    if (alreadyEnrolled) {
      console.log(`[academy] skip duplicate auto-enroll: orderId=${orderId}, courseId=${course.id}`);
      return alreadyEnrolled;
    }

    const enrollment = await this.enrollStudent({
      companyId,
      courseId: course.id,
      customerId,
      orderId,
      studentName: customerName,
      studentPhone: customerPhone,
      studentEmail: customerEmail,
      byAdmin: false, // بعد دفع — orderId موجود يتجاوز الحارس
    });

    // ─── إشعار الطالب بعد التسجيل التلقائي ──────────────────────────────
    try {
      const notificationService = require('./notificationService');
      if (notificationService?.createNotification) {
        await notificationService.createNotification({
          companyId,
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

    return enrollment;
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
    const course = await db.academyCourse.findFirst({
      where: {
        id: courseId,
        OR: [
          { companyId },
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
    if (!course) throw new Error('Course not found');

    // Check enrollment (for global courses, enrollment companyId may differ)
    const enrollment = await db.academyEnrollment.findFirst({
      where: {
        courseId,
        ...(course.isGlobal ? {} : { companyId }),
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

    const modulesWithLockStatus = course.modules.map((m) => {
      const lessons = m.lessons.map((lesson, idx) => {
        const p = progressMap.get(lesson.id);
        const isDone = p?.status === 'DONE';
        const isFree = lesson.isFreePreview;

        // An enrolled student can access if previous was done, or it's free preview
        const isUnlocked = isFree || (isEnrolled && previousLessonDone);

        // Update previousLessonDone for the next sequential lesson
        previousLessonDone = isDone;

        return {
          id: lesson.id,
          title: lesson.title,
          sortOrder: lesson.sortOrder,
          durationMin: lesson.durationMin,
          isFreePreview: lesson.isFreePreview,
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
      where: { id: lessonId, ...(companyId ? { companyId } : {}) },
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
    const course = lesson.module.course;

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

    // If not free preview and not enrolled => reject
    if (!lesson.isFreePreview && !isEnrolled) {
      throw new Error('هذا الدرس يتطلب الاشتراك في الكورس أولاً');
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

  async completeLessonManual({ lessonId, enrollmentId, companyId }) {
    const db = this.getDb();
    const enrollment = await db.academyEnrollment.findFirst({
      where: { id: enrollmentId, ...(companyId ? { companyId } : {}) },
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
    if (!enrollment) throw new Error('Enrollment not found');

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

  async submitLessonQuiz({ lessonId, enrollmentId, companyId, answers = [] }) {
    const db = this.getDb();
    const lesson = await db.academyLesson.findFirst({
      where: { id: lessonId },
      include: { quiz: true },
    });
    if (!lesson || !lesson.quiz) throw new Error('Quiz not found for this lesson');

    const quiz = lesson.quiz;
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    if (questions.length === 0) {
      return this.completeLessonManual({ lessonId, enrollmentId, companyId });
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
          enrollmentId,
          lessonId,
        },
      },
      create: {
        enrollmentId,
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
      await this.checkAndIssueCertificate(enrollmentId);
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

  async askCoachOnLesson({ lessonId, companyId, userMessage, quizContext }) {
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

    const courseTitle = lesson.module?.course?.title || '';
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

  async gradeSubmission({ lessonId, submission, companyId }) {
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
        enrollmentId: enrollmentId || null,
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
    if (gradeResult.verdict === 'ACCEPTED' && enrollmentId) {
      progress = await db.academyProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId,
            lessonId,
          },
        },
        create: {
          enrollmentId,
          lessonId,
          status: 'DONE',
          completedAt: new Date(),
        },
        update: {
          status: 'DONE',
          completedAt: new Date(),
        },
      });

      await this.checkAndIssueCertificate(enrollmentId);
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
