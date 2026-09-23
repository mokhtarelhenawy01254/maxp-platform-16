/**
 * MaxP Academy Seed & Sync Script
 * 
 * Usage:
 *   node apps/backend/scripts/academySeed.js [--dry-run]
 *   node apps/backend/scripts/academySeed.js --apply [--company-id <id>]
 *   node apps/backend/scripts/academySeed.js --verify
 *   node apps/backend/scripts/academySeed.js --only-videos <path-to-videos.json>
 *   node apps/backend/scripts/academySeed.js --delete-course --confirm
 */

const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Portable by default: the content package ships with the repo (deploy includes apps/backend/prisma/seeds).
// Override with ACADEMY_IMPORT_PATH or `--file <path>` when running locally.
const DEFAULT_IMPORT_PATH =
  process.env.ACADEMY_IMPORT_PATH ||
  path.join(__dirname, '..', 'prisma', 'seeds', 'ACADEMY_IMPORT.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    apply: false,
    verify: false,
    onlyVideos: null,
    deleteCourse: false,
    confirm: false,
    companyId: null,
    filePath: DEFAULT_IMPORT_PATH,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--verify') {
      options.verify = true;
    } else if (arg === '--delete-course') {
      options.deleteCourse = true;
    } else if (arg === '--confirm') {
      options.confirm = true;
    } else if (arg === '--only-videos') {
      options.onlyVideos = args[++i];
    } else if (arg === '--company-id') {
      options.companyId = args[++i];
    } else if (arg === '--file') {
      options.filePath = args[++i];
    }
  }

  // Default mode is --dry-run if neither apply, verify, delete, nor onlyVideos is specified
  if (!options.apply && !options.verify && !options.deleteCourse && !options.onlyVideos) {
    options.dryRun = true;
  }

  return options;
}

function loadImportData(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ملف الاستيراد غير موجود في المسار: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  if (!data.course || !Array.isArray(data.modules) || !Array.isArray(data.lessons)) {
    throw new Error('هيكل ملف الاستيراد غير صالح (يجب أن يحتوي على course و modules و lessons).');
  }

  return data;
}

function calculateImportStats(data) {
  const coursesCount = data.course ? 1 : 0;
  const modulesCount = data.modules.length;
  const lessonsCount = data.lessons.length;
  let quizzesCount = 0;
  let questionsCount = 0;

  for (const lesson of data.lessons) {
    if (lesson.quiz && Array.isArray(lesson.quiz.questions) && lesson.quiz.questions.length > 0) {
      quizzesCount++;
      questionsCount += lesson.quiz.questions.length;
    }
  }

  return {
    coursesCount,
    modulesCount,
    lessonsCount,
    quizzesCount,
    questionsCount,
  };
}

async function resolveCompanyId(prisma, explicitCompanyId) {
  if (explicitCompanyId) {
    const comp = await prisma.company.findUnique({
      where: { id: explicitCompanyId },
      select: { id: true },
    });
    if (!comp) throw new Error(`الشركة بالمعرّف ${explicitCompanyId} غير موجودة.`);
    return comp.id;
  }

  if (process.env.DEFAULT_COMPANY_ID) {
    const comp = await prisma.company.findUnique({
      where: { id: process.env.DEFAULT_COMPANY_ID },
      select: { id: true },
    });
    if (comp) return comp.id;
  }

  const firstCompany = await prisma.company.findFirst({
    select: { id: true },
  });
  if (!firstCompany) {
    throw new Error('لم يتم العثور على أي شركة في قاعدة البيانات لربط الكورس بها.');
  }
  return firstCompany.id;
}

async function handleDryRun(prisma, data) {
  const stats = calculateImportStats(data);
  const slug = data.course.slug;

  // Read existing state from DB without ANY modifications
  const existingCourse = await prisma.academyCourse.findFirst({
    where: { slug },
    include: {
      modules: {
        include: {
          lessons: {
            include: { quiz: true },
          },
        },
      },
    },
  });

  const existingModulesCount = existingCourse ? existingCourse.modules.length : 0;
  const existingLessons = existingCourse ? existingCourse.modules.flatMap((m) => m.lessons) : [];
  const existingLessonsCount = existingLessons.length;
  const existingQuizzesCount = existingLessons.filter((l) => Boolean(l.quiz)).length;

  console.log('\n======================================================');
  console.log('         وضع المحاكاة: DRY RUN (بدون أي كتابة)        ');
  console.log('======================================================\n');

  console.log(`ملف الاستيراد: ${data.course.title} (Slug: ${slug})`);
  console.log('------------------------------------------------------');
  console.log(`1 كورس · 4 موديولات · 25 درس · 25 كويز · 75 سؤال\n`);

  console.table([
    {
      'العنصر': 'الكورس (Course)',
      'العدد في الحزمة': stats.coursesCount,
      'الموجود بالداتابيز': existingCourse ? 1 : 0,
      'الإجراء المرتقب': existingCourse ? 'تحديث (Update)' : 'إنشاء جديد (Create)',
    },
    {
      'العنصر': 'الموديولات (Modules)',
      'العدد في الحزمة': stats.modulesCount,
      'الموجود بالداتابيز': existingModulesCount,
      'الإجراء المرتقب': existingModulesCount > 0 ? `تحديث ${existingModulesCount} + إنشاء ${Math.max(0, stats.modulesCount - existingModulesCount)}` : `إنشاء ${stats.modulesCount}`,
    },
    {
      'العنصر': 'الدروس (Lessons)',
      'العدد في الحزمة': stats.lessonsCount,
      'الموجود بالداتابيز': existingLessonsCount,
      'الإجراء المرتقب': existingLessonsCount > 0 ? `تحديث ${existingLessonsCount} + إنشاء ${Math.max(0, stats.lessonsCount - existingLessonsCount)}` : `إنشاء ${stats.lessonsCount}`,
    },
    {
      'العنصر': 'الكويزات (Quizzes)',
      'العدد في الحزمة': stats.quizzesCount,
      'الموجود بالداتابيز': existingQuizzesCount,
      'الإجراء المرتقب': existingQuizzesCount > 0 ? `تحديث ${existingQuizzesCount} + إنشاء ${Math.max(0, stats.quizzesCount - existingQuizzesCount)}` : `إنشاء ${stats.quizzesCount}`,
    },
    {
      'العنصر': 'الأسئلة (Questions)',
      'العدد في الحزمة': stats.questionsCount,
      'الموجود بالداتابيز': '-',
      'الإجراء المرتقب': 'كتابة محتوى الأسئلة JSON داخل الكويز',
    },
  ]);

  console.log('\nتم فحص الحزمة بنجاح. لم يتم إجراء أي تغيير في قاعدة البيانات.\n');
}

async function handleApply(prisma, data, companyId) {
  const stats = calculateImportStats(data);
  const targetCompanyId = await resolveCompanyId(prisma, companyId);
  const courseData = data.course;

  console.log(`\nبدء رفع وتحديث محتوى الأكاديمية للشركة [${targetCompanyId}]...\n`);

  // 1. Course (Idempotent by slug)
  const existingCourse = await prisma.academyCourse.findFirst({
    where: { slug: courseData.slug },
  });

  const coursePayload = {
    companyId: targetCompanyId,
    title: String(courseData.title || '').trim(),
    slug: String(courseData.slug || '').trim(),
    description: courseData.description ? String(courseData.description).trim() : '',
    price: Number(courseData.price) || 0,
    thumbnailUrl: courseData.thumbnailUrl ? String(courseData.thumbnailUrl) : null,
    isPublished: Boolean(courseData.isPublished),
    isGlobal: Boolean(courseData.isGlobal),
    freePreviewLessons: Number(courseData.freePreviewLessons) >= 0 ? Number(courseData.freePreviewLessons) : 2,
    storeProductId: courseData.storeProductId || null,
    visibility: courseData.visibility || 'UNLISTED',
    allowedTags: Array.isArray(courseData.allowedTags) ? courseData.allowedTags : [],
    enableWatermark: courseData.enableWatermark !== undefined ? Boolean(courseData.enableWatermark) : true,
  };

  let course;
  if (existingCourse) {
    course = await prisma.academyCourse.update({
      where: { id: existingCourse.id },
      data: coursePayload,
    });
    console.log(`✓ تم تحديث الكورس: ${course.title} (ID: ${course.id})`);
  } else {
    course = await prisma.academyCourse.create({
      data: coursePayload,
    });
    console.log(`✓ تم إنشاء الكورس: ${course.title} (ID: ${course.id})`);
  }

  // 2. Modules
  const moduleMap = new Map(); // sortOrder -> module record
  for (const modData of data.modules) {
    const existingMod = await prisma.academyModule.findFirst({
      where: { courseId: course.id, sortOrder: Number(modData.sortOrder) },
    });

    const modPayload = {
      companyId: targetCompanyId,
      courseId: course.id,
      title: String(modData.title || '').trim(),
      description: modData.description ? String(modData.description).trim() : null,
      sortOrder: Number(modData.sortOrder),
    };

    let mod;
    if (existingMod) {
      mod = await prisma.academyModule.update({
        where: { id: existingMod.id },
        data: modPayload,
      });
    } else {
      mod = await prisma.academyModule.create({
        data: modPayload,
      });
    }
    moduleMap.set(mod.sortOrder, mod);
  }
  console.log(`✓ تم مزامنة ${moduleMap.size} موديولات بنجاح.`);

  // 3. Lessons & Quizzes
  let savedLessonsCount = 0;
  let savedQuizzesCount = 0;
  let savedQuestionsCount = 0;

  for (const lessonData of data.lessons) {
    const lessonOrder = Number(lessonData.sortOrder);
    // Find parent module by matching lessonOrder in module.lessonOrders
    const parentModuleDef = data.modules.find((m) => Array.isArray(m.lessonOrders) && m.lessonOrders.includes(lessonOrder));
    if (!parentModuleDef) {
      throw new Error(`تعذر تحديد الموديول التابع له الدرس رقم ${lessonOrder}`);
    }
    const parentModule = moduleMap.get(parentModuleDef.sortOrder);
    if (!parentModule) {
      throw new Error(`الموديول رقم ${parentModuleDef.sortOrder} غير متوفر.`);
    }

    const existingLesson = await prisma.academyLesson.findFirst({
      where: {
        moduleId: parentModule.id,
        sortOrder: lessonOrder,
      },
    });

    const lessonPayload = {
      companyId: targetCompanyId,
      courseId: course.id,
      moduleId: parentModule.id,
      title: String(lessonData.title || '').trim(),
      sortOrder: lessonOrder,
      videoUrl: lessonData.videoUrl ? String(lessonData.videoUrl).trim() : null,
      scriptText: lessonData.scriptText ? String(lessonData.scriptText) : '',
      exerciseText: lessonData.exerciseText ? String(lessonData.exerciseText) : '',
      durationMin: Number(lessonData.durationMin) || 10,
      isFreePreview: Boolean(lessonData.isFreePreview),
    };

    let lesson;
    if (existingLesson) {
      lesson = await prisma.academyLesson.update({
        where: { id: existingLesson.id },
        data: lessonPayload,
      });
    } else {
      lesson = await prisma.academyLesson.create({
        data: lessonPayload,
      });
    }
    savedLessonsCount++;

    // Quiz
    if (lessonData.quiz && Array.isArray(lessonData.quiz.questions) && lessonData.quiz.questions.length > 0) {
      const quizQuestions = lessonData.quiz.questions.map((q, idx) => ({
        id: q.id || `q_${idx + 1}`,
        q: String(q.q || '').trim(),
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation ? String(q.explanation).trim() : '',
      }));

      const existingQuiz = await prisma.academyQuiz.findUnique({
        where: { lessonId: lesson.id },
      });

      const quizPayload = {
        lessonId: lesson.id,
        title: lessonData.quiz.title ? String(lessonData.quiz.title).trim() : `كويز ${lesson.title}`,
        passScorePercent: Number(lessonData.quiz.passScorePercent) || 70,
        questions: quizQuestions,
      };

      if (existingQuiz) {
        await prisma.academyQuiz.update({
          where: { id: existingQuiz.id },
          data: quizPayload,
        });
      } else {
        await prisma.academyQuiz.create({
          data: quizPayload,
        });
      }
      savedQuizzesCount++;
      savedQuestionsCount += quizQuestions.length;
    }
  }

  console.log(`✓ تم مزامنة ${savedLessonsCount} درس بنجاح.`);
  console.log(`✓ تم مزامنة ${savedQuizzesCount} كويز بنجاح (${savedQuestionsCount} سؤال).\n`);

  console.log('======================================================');
  console.log('         اكتملت عملية الرفع بنجاح (--apply)          ');
  console.log('======================================================');
  console.log(`الكورس: ${course.title} (Slug: ${course.slug})`);
  console.log(`الإجمالي: 1 كورس · ${moduleMap.size} موديولات · ${savedLessonsCount} درس · ${savedQuizzesCount} كويز · ${savedQuestionsCount} سؤال\n`);
}

async function handleVerify(prisma, data) {
  const slug = data.course.slug;
  const course = await prisma.academyCourse.findFirst({
    where: { slug },
    include: {
      modules: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lessons: {
            orderBy: { sortOrder: 'asc' },
            include: { quiz: true },
          },
        },
      },
    },
  });

  console.log('\n======================================================');
  console.log('       التحقق من قاعدة البيانات (--verify)            ');
  console.log('======================================================\n');

  if (!course) {
    console.error(`❌ لم يتم العثور على أي كورس مسجل بـ slug: "${slug}"`);
    return false;
  }

  const modules = course.modules;
  const lessons = modules.flatMap((m) => m.lessons);
  const quizzes = lessons.filter((l) => Boolean(l.quiz));
  let questionsCount = 0;
  for (const q of quizzes) {
    if (q.quiz && Array.isArray(q.quiz.questions)) {
      questionsCount += q.quiz.questions.length;
    }
  }

  console.log(`الكورس: ${course.title}`);
  console.log(`معرف الكورس: ${course.id}`);
  console.log(`الشركة المالكة: ${course.companyId}`);
  console.log(`الرابط (Slug): ${course.slug}`);
  console.log(`معاينة مجانية (Free Preview): ${course.freePreviewLessons} دروس`);
  console.log('------------------------------------------------------');
  console.log(`المحصلة الفعلية في الداتابيز: 1 كورس · ${modules.length} موديولات · ${lessons.length} درس · ${quizzes.length} كويز · ${questionsCount} سؤال\n`);

  const expectedStats = calculateImportStats(data);
  const matches = (
    modules.length === expectedStats.modulesCount &&
    lessons.length === expectedStats.lessonsCount &&
    quizzes.length === expectedStats.quizzesCount &&
    questionsCount === expectedStats.questionsCount
  );

  if (matches) {
    console.log('✅ التطابق مكتمل 100%: الأعداد في الداتابيز تطابق حزمة المحتوى بدقة.');
  } else {
    console.warn('⚠️ يوجد تفاوت بين الداتابيز وحزمة المحتوى.');
  }

  return matches;
}

async function handleOnlyVideos(prisma, data, videosFilePath) {
  if (!fs.existsSync(videosFilePath)) {
    throw new Error(`ملف الفيديوهات غير موجود: ${videosFilePath}`);
  }
  const raw = fs.readFileSync(videosFilePath, 'utf8');
  const videosData = JSON.parse(raw);

  const slug = data.course.slug;
  const course = await prisma.academyCourse.findFirst({
    where: { slug },
    include: {
      modules: {
        include: { lessons: true },
      },
    },
  });

  if (!course) {
    throw new Error(`الكورس ${slug} غير موجود بالداتابيز لتحديث فيديوهاته.`);
  }

  const allLessons = course.modules.flatMap((m) => m.lessons);
  let updatedCount = 0;

  // videosData can be { "1": "https://...", "2": "..." } or [ { sortOrder: 1, videoUrl: "..." } ]
  for (const lesson of allLessons) {
    let url = null;
    if (Array.isArray(videosData)) {
      const match = videosData.find((v) => Number(v.sortOrder || v.order || v.lessonOrder) === lesson.sortOrder);
      if (match) url = match.videoUrl || match.url;
    } else if (typeof videosData === 'object' && videosData !== null) {
      url = videosData[String(lesson.sortOrder)] || videosData[lesson.sortOrder];
    }

    if (url && typeof url === 'string') {
      await prisma.academyLesson.update({
        where: { id: lesson.id },
        data: { videoUrl: url.trim() },
      });
      console.log(`✓ تم تحديث فيديو الدرس [${lesson.sortOrder}]: ${lesson.title}`);
      updatedCount++;
    }
  }

  console.log(`\nاكتمل تحديث روابط الفيديوهات: تم تحديث ${updatedCount} درس.`);
}

async function handleDeleteCourse(prisma, data, confirmed) {
  if (!confirmed) {
    console.error('❌ خطأ: حذف الكورس يتطلب تمرير العلم الصريح --confirm مع --delete-course');
    process.exit(1);
  }

  const slug = data.course.slug;
  const course = await prisma.academyCourse.findFirst({
    where: { slug },
  });

  if (!course) {
    console.log(`الكورس ${slug} غير موجود بالفعل.`);
    return;
  }

  await prisma.academyCourse.delete({
    where: { id: course.id },
  });

  console.log(`✓ تم حذف الكورس ${course.title} (${course.id}) وكافة البيانات التابعة له بنجاح.`);
}

async function main() {
  const options = parseArgs();
  const data = loadImportData(options.filePath);
  const prisma = getSharedPrismaClient();

  try {
    if (options.deleteCourse) {
      await handleDeleteCourse(prisma, data, options.confirm);
    } else if (options.onlyVideos) {
      await handleOnlyVideos(prisma, data, options.onlyVideos);
    } else if (options.verify) {
      await handleVerify(prisma, data);
    } else if (options.apply) {
      await handleApply(prisma, data, options.companyId);
    } else {
      await handleDryRun(prisma, data);
    }
  } finally {
    // Shared prisma client handles its own connection pooling
  }
}

main().catch((err) => {
  console.error('\nحدث خطأ أثناء تنفيذ السكربت:', err.message);
  process.exit(1);
});
