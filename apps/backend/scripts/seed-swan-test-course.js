#!/usr/bin/env node

/**
 * seed-swan-test-course.js
 *
 * Seeds a published test course and demo student for Swan (swan.maxp.online)
 * for testing tenant-subdomain academy portal isolation:
 * - Swan course is NOT global (isGlobal = false, companyId = swan.id)
 * - Demo student (01000000088 / code: 123456) with active enrollment
 * - Completely idempotent
 */

const { getSharedPrismaClientAsync, closeSharedDatabase } = require('../services/sharedDatabase');

async function main() {
  console.log('🌱 [seed-swan-course] Starting idempotent seed for Swan tenant academy...');
  const prisma = await getSharedPrismaClientAsync();

  // 1. Locate Swan company
  const swan = await prisma.company.findFirst({
    where: { slug: 'swan' },
    select: { id: true, name: true, slug: true },
  });

  if (!swan) {
    console.error('❌ [seed-swan-course] Company "swan" not found in database. Skipping.');
    await closeSharedDatabase();
    return;
  }

  console.log(`🏢 [seed-swan-course] Located company: ${swan.name} (id: ${swan.id}, slug: ${swan.slug})`);

  // 2. Upsert Swan Published Test Course
  let course = await prisma.academyCourse.findFirst({
    where: {
      slug: 'swan-demo-course',
      companyId: swan.id,
    },
    include: {
      modules: {
        include: { lessons: true },
      },
    },
  });

  const courseData = {
    companyId: swan.id,
    title: 'دورة تسويق وإدارة متجر سوان — تجريبية',
    slug: 'swan-demo-course',
    description: 'دورة تدريبية مصغّرة منشورة خصيصاً لاختبار بوابة الطالب متعددة الشركات على سب دومين سوان (swan.maxp.online/portal). تتضمن معاينة مجانية ودروس مقفلة للمشتركين فقط.',
    price: 150,
    isPublished: true,
    isGlobal: false, // 🔒 CRITICAL: Scoped only to Swan
    freePreviewLessons: 1,
    visibility: 'PUBLIC',
    subscriptionDays: 365,
  };

  if (!course) {
    course = await prisma.academyCourse.create({
      data: courseData,
      include: {
        modules: {
          include: { lessons: true },
        },
      },
    });
    console.log(`✅ [seed-swan-course] Created Swan course: ${course.id}`);
  } else {
    course = await prisma.academyCourse.update({
      where: { id: course.id },
      data: courseData,
      include: {
        modules: {
          include: { lessons: true },
        },
      },
    });
    console.log(`🔄 [seed-swan-course] Updated existing Swan course: ${course.id}`);
  }

  // 3. Upsert Module
  let moduleItem = course.modules?.[0];
  if (!moduleItem) {
    moduleItem = await prisma.academyModule.create({
      data: {
        companyId: swan.id,
        courseId: course.id,
        title: 'الوحدة الأولى: البداية مع نظام متجر سوان',
        description: 'خطوات ضبط المتجر وتفعيل الإعلانات من الصفر',
        sortOrder: 1,
      },
    });
    console.log(`✅ [seed-swan-course] Created module: ${moduleItem.id}`);
  }

  // 4. Upsert Lessons: Lesson 1 (Free Preview), Lesson 2 (Locked/Requires Enrollment)
  const existingLessons = await prisma.academyLesson.findMany({
    where: { moduleId: moduleItem.id },
    orderBy: { sortOrder: 'asc' },
  });

  let lesson1 = existingLessons.find((l) => l.sortOrder === 1);
  if (!lesson1) {
    lesson1 = await prisma.academyLesson.create({
      data: {
        companyId: swan.id,
        courseId: course.id,
        moduleId: moduleItem.id,
        title: 'الدرس الأول: مقدمة دورة سوان (معاينة مجانية)',
        sortOrder: 1,
        durationMin: 8,
        isFreePreview: true,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        scriptText: 'مرحباً بك في دورة متجر سوان. هذا الدرس متاح مجاناً لجميع زوار البوابة للمعاينة قبل الاشتراك.',
      },
    });
    console.log(`✅ [seed-swan-course] Created lesson 1 (free preview): ${lesson1.id}`);
  }

  let lesson2 = existingLessons.find((l) => l.sortOrder === 2);
  if (!lesson2) {
    lesson2 = await prisma.academyLesson.create({
      data: {
        companyId: swan.id,
        courseId: course.id,
        moduleId: moduleItem.id,
        title: 'الدرس الثاني: إعدادات المنتجات وقنوات البيع',
        sortOrder: 2,
        durationMin: 15,
        isFreePreview: false,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        scriptText: 'في هذا الدرس سنتعلم ضبط إعدادات المنتجات وربط كتالوج سوان. هذا الدرس مقفل ويتطلب اشتراكاً مسجلاً.',
      },
    });
    console.log(`✅ [seed-swan-course] Created lesson 2 (locked): ${lesson2.id}`);
  }

  // 5. Upsert Demo Customer & Active Enrollment for 01000000088
  const demoPhone = '01000000088';
  let customer = await prisma.customer.findFirst({
    where: { companyId: swan.id, phone: demoPhone },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyId: swan.id,
        phone: demoPhone,
        firstName: 'طالب',
        lastName: 'تجريبي سوان',
        email: 'student.swan.demo@maxp.online',
        status: 'ACTIVE',
      },
    });
    console.log(`✅ [seed-swan-course] Created demo customer: ${customer.id}`);
  }

  // Active Enrollment for 01000000088 in Swan course
  let enrollment = await prisma.academyEnrollment.findFirst({
    where: {
      courseId: course.id,
      studentPhone: demoPhone,
    },
  });

  if (!enrollment) {
    enrollment = await prisma.academyEnrollment.create({
      data: {
        companyId: swan.id,
        courseId: course.id,
        customerId: customer.id,
        studentPhone: demoPhone,
        studentName: 'طالب تجريبي سوان',
        studentEmail: 'student.swan.demo@maxp.online',
        status: 'ACTIVE',
        subscriptionDays: 365,
      },
    });
    console.log(`✅ [seed-swan-course] Enrolled demo student in Swan course: enrollmentId=${enrollment.id}`);
  } else {
    enrollment = await prisma.academyEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'ACTIVE' },
    });
    console.log(`🔄 [seed-swan-course] Refreshed active enrollment: enrollmentId=${enrollment.id}`);
  }

  console.log('🎉 [seed-swan-course] Seeding completed successfully!');
  console.log({
    swanCompanyId: swan.id,
    courseId: course.id,
    courseTitle: course.title,
    coursePrice: course.price,
    demoStudentPhone: demoPhone,
    demoStudentOtp: '123456',
    enrollmentId: enrollment.id,
  });

  await closeSharedDatabase();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error('❌ [seed-swan-course] Error seeding:', err);
    try {
      const { closeSharedDatabase } = require('../services/sharedDatabase');
      await closeSharedDatabase();
    } catch (_) {}
    process.exit(1);
  });
}

module.exports = { main };
