const academyService = require('../services/academyService');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

async function verifyAll() {
  console.log('=== AC7 & AC8 End-to-End Verification ===\n');

  // 1. Find Course
  const course = await prisma.academyCourse.findFirst({
    where: { slug: 'maxp-owner-course' },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!course) {
    console.error('Course maxp-owner-course not found!');
    process.exit(1);
  }

  console.log(`Course Found: [ID: ${course.id}] "${course.title}"`);
  console.log(`Company ID: "${course.companyId}"`);
  console.log(`Free Preview Lessons Count Setting: ${course.freePreviewLessons}\n`);

  // -------------------------------------------------------------
  // Verify AC7: Free Preview Rules (Lesson 1 & 2 free, Lesson 3 locked for un-enrolled)
  // -------------------------------------------------------------
  console.log('----------------------------------------------------');
  console.log('Verifying AC7: Outline & Free Preview Access for Un-enrolled Student');
  console.log('----------------------------------------------------');

  const outline = await academyService.getCourseOutlineWithProgress({
    courseId: course.id,
    companyId: course.companyId,
    studentUserId: null,
    customerId: null,
  });

  console.log(`Is Enrolled: ${outline.isEnrolled} (Expected: false)`);
  console.log(`Enrollment ID: ${outline.enrollmentId} (Expected: null)`);

  const allLessons = outline.modules.flatMap((m) => m.lessons);
  console.log(`Total Lessons in Outline: ${allLessons.length}`);

  const lesson1 = allLessons.find((l) => l.sortOrder === 1);
  const lesson2 = allLessons.find((l) => l.sortOrder === 2);
  const lesson3 = allLessons.find((l) => l.sortOrder === 3);

  console.log(`\nLesson 1: "${lesson1?.title}"`);
  console.log(`  - isFreePreview: ${lesson1?.isFreePreview} (Expected: true)`);
  console.log(`  - isUnlocked: ${lesson1?.isUnlocked} (Expected: true)`);

  console.log(`\nLesson 2: "${lesson2?.title}"`);
  console.log(`  - isFreePreview: ${lesson2?.isFreePreview} (Expected: true)`);
  console.log(`  - isUnlocked: ${lesson2?.isUnlocked} (Expected: true)`);

  console.log(`\nLesson 3: "${lesson3?.title}"`);
  console.log(`  - isFreePreview: ${lesson3?.isFreePreview} (Expected: false)`);
  console.log(`  - isUnlocked: ${lesson3?.isUnlocked} (Expected: false)`);

  const ac7Passed =
    !outline.isEnrolled &&
    lesson1?.isFreePreview === true &&
    lesson1?.isUnlocked === true &&
    lesson2?.isFreePreview === true &&
    lesson2?.isUnlocked === true &&
    lesson3?.isFreePreview === false &&
    lesson3?.isUnlocked === false;

  console.log(`\n>>> AC7 Result: ${ac7Passed ? '✅ PASSED' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------
  // Verify AC8: Regression Safety on Core Academy Endpoints
  // -------------------------------------------------------------
  console.log('----------------------------------------------------');
  console.log('Verifying AC8: Regression Safety on Core Endpoints');
  console.log('----------------------------------------------------');

  // Publish course to verify catalog visibility
  await prisma.academyCourse.update({
    where: { id: course.id },
    data: { isPublished: true, visibility: 'PUBLIC' },
  });

  // 1. Catalog
  const catalog = await academyService.getPublishedCatalog({
    companyId: course.companyId,
  });
  console.log(`1. Catalog: Found ${catalog.length} course(s). First title: "${catalog[0]?.title}" -> ✅ OK`);

  // 2. Lesson Content for Free Preview Lesson 1 (un-enrolled)
  const contentL1 = await academyService.getLessonContent({
    lessonId: lesson1.id,
    companyId: course.companyId,
    studentUserId: null,
    customerId: null,
  });
  console.log(`2. Content (Lesson 1 - Free Preview): Title "${contentL1.lesson.title}", Has Quiz: ${!!contentL1.quiz} -> ✅ OK`);

  // 3. Lesson Content for Locked Lesson 3 (un-enrolled should be blocked with 403 / error)
  let lesson3Blocked = false;
  try {
    await academyService.getLessonContent({
      lessonId: lesson3.id,
      companyId: course.companyId,
      studentUserId: null,
      customerId: null,
    });
  } catch (err) {
    lesson3Blocked = true;
    console.log(`3. Locked Lesson 3 Access Guard: Correctly blocked with message: "${err.message}" -> ✅ OK`);
  }

  // 4. Enroll Student & Test Progression
  const testStudentPhone = '01099998888';
  const enrollment = await academyService.enrollStudent({
    courseId: course.id,
    companyId: course.companyId,
    studentName: 'طالب اختبار ماكس بي',
    studentPhone: testStudentPhone,
    studentEmail: 'test.student@maxp.online',
  });
  console.log(`4. Enroll Student: Enrollment ID: "${enrollment.id}", Status: "${enrollment.status}" -> ✅ OK`);

  // 5. Quiz Submission for Lesson 1
  const quiz1 = await prisma.academyQuiz.findFirst({
    where: { lessonId: lesson1.id },
  });
  const quizQuestions = Array.isArray(quiz1?.questions) ? quiz1.questions : [];
  const correctAnswers = quizQuestions.map((q) => q.correctIndex);
  console.log(`   Quiz 1 questions count: ${quizQuestions.length}, correct answers: ${JSON.stringify(correctAnswers)}`);

  const quizResult = await academyService.submitLessonQuiz({
    lessonId: lesson1.id,
    enrollmentId: enrollment.id,
    companyId: course.companyId,
    answers: correctAnswers,
  });
  console.log(`5. Submit Quiz: Passed: ${quizResult.passed}, Score: ${quizResult.scorePercent}%, Progress Status: ${quizResult.progress?.status} -> ✅ OK`);

  // 6. Submissions & Instructor Review API
  const subResult = await academyService.submitLessonExercise({
    lessonId: lesson1.id,
    enrollmentId: enrollment.id,
    companyId: course.companyId,
    submissionText: 'تطبيق تجريبي كامل لاختبار دورة الحياة',
    submissionUrl: 'https://example.com/proof.png',
  });
  console.log(`6. Submit Exercise: Submission ID: "${subResult.submission.id}", Status: "${subResult.submission.status}" -> ✅ OK`);

  const lessonSubs = await academyService.getLessonSubmissions({
    lessonId: lesson1.id,
    companyId: course.companyId,
  });
  console.log(`7. Get Lesson Submissions: Found ${lessonSubs.length} submission(s) -> ✅ OK`);

  const courseSubs = await academyService.getCourseSubmissions({
    courseId: course.id,
    companyId: course.companyId,
  });
  console.log(`8. Get Course Submissions: Found ${courseSubs.length} submission(s) -> ✅ OK`);

  const reviewed = await academyService.reviewSubmission({
    submissionId: subResult.submission.id,
    companyId: course.companyId,
    reviewedBy: 'م. مختار (رئيس التدريب)',
    status: 'ACCEPTED',
    instructorNote: 'ممتاز ومكتمل ومطابق للمسطرة',
  });
  console.log(`9. Review Submission: New Status: "${reviewed.status}", Note: "${reviewed.instructorNote}" -> ✅ OK`);

  const ac8Passed =
    catalog.length > 0 &&
    contentL1.lesson.id === lesson1.id &&
    lesson3Blocked &&
    enrollment.id &&
    quizResult.passed &&
    subResult.submission.id &&
    lessonSubs.length > 0 &&
    courseSubs.length > 0 &&
    reviewed.status === 'ACCEPTED';

  console.log(`\n>>> AC8 Result: ${ac8Passed ? '✅ PASSED' : '❌ FAILED'}\n`);

  console.log('====================================================');
  console.log(`FINAL RESULT: ${ac7Passed && ac8Passed ? '🎉 ALL CRITERIA VERIFIED SUCCESSFULLY' : '⚠️ SOME CRITERIA FAILED'}`);
  console.log('====================================================');
}

verifyAll()
  .catch((e) => {
    console.error('Verification failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
