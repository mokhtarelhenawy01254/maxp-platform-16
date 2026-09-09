const { getSharedPrismaClient } = require('./sharedDatabase');
const { resolveAiKey, BASE_URL_DEFAULTS, MODEL_DEFAULTS } = require('./radiologyAiDraftService');

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

  async createCourse({ companyId, title, slug, description, price = 0, thumbnailUrl, freePreviewLessons = 2, storeProductId }) {
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

  async getPublishedCatalog(companyId) {
    const db = this.getDb();
    const courses = await db.academyCourse.findMany({
      where: { companyId, isPublished: true },
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

    return courses;
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
  }) {
    const db = this.getDb();
    const course = await db.academyCourse.findFirst({
      where: { id: courseId, companyId },
    });
    if (!course) throw new Error('Course not found');

    // Find existing enrollment
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
      return existing;
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

    return this.enrollStudent({
      companyId,
      courseId: course.id,
      customerId,
      orderId,
      studentName: customerName,
      studentPhone: customerPhone,
      studentEmail: customerEmail,
    });
  }

  async getCourseOutlineWithProgress({ courseId, companyId, studentUserId, customerId, studentPhone }) {
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

    // Check enrollment
    const enrollment = await db.academyEnrollment.findFirst({
      where: {
        courseId,
        companyId,
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

  async askCoachOnLesson({ lessonId, companyId, userMessage }) {
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

    const courseTitle = lesson.module.course.title;
    const lessonTitle = lesson.title;
    const scriptText = lesson.scriptText || 'لم يتوفر سكريبت نصي مفصل لهذا الدرس بعد.';
    const exerciseText = lesson.exerciseText || 'لا يوجد تمرين محدد لهذا الدرس.';

    const systemPrompt = `أنت "كوتش أكاديمية ماكس بي الذكي" (MaxP Course Coach).
أنت مرشد تعليمي ودود ومحترف، متخصص في شرح دورة: "${courseTitle}"، وتحديداً درس: "${lessonTitle}".

القانون الصارم:
1. إجابتك يجب أن تكون مستندة ومبنية حصراً على سكريبت ومعلومات هذا الدرس أدناه.
2. ممنوع تأليف أي استراتيجيات أو مصطلحات تخالف ما ورد في سكريبت الدرس.
3. إذا سأل الطالب سؤالاً خارج سياق الدرس، وضح له بأدب:
"هذا السؤال خارج نطاق هذا الدرس الحالي (${lessonTitle}). تركيزنا هنا هو [اذكر موضوع الدرس]، وأنا جاهز لأي استفسار يخص محتوى الدرس أو تطبيقه العملي!"
4. في نهاية إجابتك، شجع الطالب دائماً على تطبيق التمرين أو إتمام الدرس.

محتوى وسكريبت الدرس الحالي:
"""
${scriptText}
"""

التمرين العملي للدرس:
"""
${exerciseText}
"""`;

    // Call AI using existing key resolver or direct fallback
    let aiConfig = null;
    try {
      aiConfig = await resolveAiKey(db, companyId || lesson.companyId);
    } catch (e) {
      // ignore
    }

    const effectiveKey = aiConfig?.apiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    const effectiveBase = aiConfig?.baseUrl || (process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');
    const effectiveModel = aiConfig?.model || (process.env.OPENROUTER_API_KEY ? 'openai/gpt-4o-mini' : 'gpt-4o-mini');

    if (!effectiveKey) {
      // Return helpful fallback if no AI key configured in environment
      return {
        reply: `مرحباً بك في درس "${lessonTitle}".\n\nنصيحة الكوتش: ركّز على تطبيق خطوات الدرس بدقة وحل التمرين المطلوب: (${exerciseText}).\n\n(ملاحظة: يمكنك إعداد مفتاح الذكاء الاصطناعي في لوحة التحكم لتفعيل المحادثات المتقدمة).`,
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch(`${effectiveBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveKey}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('AI Coach API error:', errText);
        throw new Error('فشل استدعاء خدمة الكوتش الذكي');
      }

      const json = await resp.json();
      const reply = json.choices?.[0]?.message?.content?.trim() || 'عذراً، لم أستطع صياغة رد حالياً. حاول مرة أخرى.';
      return { reply };
    } catch (err) {
      console.error('AI Coach Error:', err);
      return {
        reply: `إجابة مبنية على الدرس "${lessonTitle}":\n\nيرجى مراجعة محتوى الدرس والتمرين العملي المطلوب والالتزام بالخطوات المذكورة في الفيديو والسكريبت.`,
      };
    }
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
      return {
        id: en.id,
        studentName: en.studentName,
        studentPhone: en.studentPhone,
        studentEmail: en.studentEmail,
        status: en.status,
        enrolledAt: en.enrolledAt,
        completedAt: en.completedAt,
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
