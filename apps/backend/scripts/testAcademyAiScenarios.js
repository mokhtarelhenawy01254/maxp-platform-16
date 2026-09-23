const academyService = require('../services/academyService');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

async function runTests() {
  console.log('=== AC4 & AC5 Live AI Scenarios Verification ===\n');

  // Find Lesson 1 from DB
  const lesson = await prisma.academyLesson.findFirst({
    where: { sortOrder: 1 },
    include: {
      module: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!lesson) {
    console.error('Lesson 1 not found in database!');
    process.exit(1);
  }

  console.log(`Target Lesson: [ID: ${lesson.id}] "${lesson.title}"`);
  console.log(`Course: "${lesson.module?.course?.title}"`);
  console.log(`Company ID: "${lesson.companyId}"\n`);

  // ========================================================
  // AC4: AI Coach Scenarios
  // ========================================================
  console.log('----------------------------------------------------');
  console.log('Testing AC4: AI Coach Scenarios');
  console.log('----------------------------------------------------\n');

  // AC4 Scenario (a): Question directly from lesson 1 script
  console.log('>>> [AC4-a] Question from lesson script: "إيه هي الدواير التلاتة للعميل ومين اللي في الدايرة الصغيرة؟"');
  const chatResponseA = await academyService.askCoachOnLesson({
    lessonId: lesson.id,
    userMessage: 'إيه هي الدواير التلاتة للعميل المستهدف ومين هو العميل في الدايرة الصغيرة حسب الدرس؟',
    companyId: lesson.companyId,
  });
  console.log('AI Coach Reply (AC4-a):');
  console.log(chatResponseA.reply);
  console.log('\n----------------------------------------------------\n');

  // AC4 Scenario (b): Off-topic question
  console.log('>>> [AC4-b] Off-topic question: "إزاي أعمل كشري مصري في البيت؟"');
  const chatResponseB = await academyService.askCoachOnLesson({
    lessonId: lesson.id,
    userMessage: 'إزاي أعمل كشري مصري في البيت؟',
    companyId: lesson.companyId,
  });
  console.log('AI Coach Reply (AC4-b):');
  console.log(chatResponseB.reply);
  console.log('\n----------------------------------------------------\n');

  // AC4 Scenario (c): "الأرقام بتقول إيه؟"
  console.log('>>> [AC4-c] Numbers & Citations: "الأرقام والإحصائيات بتقول إيه في الدرس ومصادرها إيه؟"');
  const chatResponseC = await academyService.askCoachOnLesson({
    lessonId: lesson.id,
    userMessage: 'الأرقام والإحصائيات بتقول إيه في الدرس ومصادرها إيه؟',
    companyId: lesson.companyId,
  });
  console.log('AI Coach Reply (AC4-c):');
  console.log(chatResponseC.reply);
  console.log('\n----------------------------------------------------\n');

  // ========================================================
  // AC5: AI Grader Scenarios
  // ========================================================
  console.log('----------------------------------------------------');
  console.log('Testing AC5: AI Grader Scenarios');
  console.log('----------------------------------------------------\n');

  // AC5 Scenario (a): Incomplete submission
  console.log('>>> [AC5-a] Incomplete submission: "أنا رسمت الدواير بس لسه معملتش الباقي"');
  const gradeResultA = await academyService.gradeSubmission({
    lessonId: lesson.id,
    submission: {
      submissionText: 'أنا رسمت الدواير بس لسه معملتش البيرسونا ولا دخلت على المنصة عشان أعمل قايمة العملاء.',
      submissionUrl: '',
    },
    companyId: lesson.companyId,
  });
  console.log('AI Grader Result (AC5-a - Incomplete):', JSON.stringify(gradeResultA, null, 2));
  console.log('\n----------------------------------------------------\n');

  // AC5 Scenario (b): Complete submission matching Lesson 1 ruler perfectly
  console.log('>>> [AC5-b] Complete submission meeting all 4 criteria of Lesson 1 ruler');
  const completeSubmissionText = `
تسليم تطبيق تمرين الدرس 1 بالكامل:
1. صورة الورقة: رسمت الـ3 دواير (كبيرة: كل من يشتري ملابس في مصر، وسطى: الجيزة والقاهرة القادرين على الشحن، صغيرة: شباب فيصل 20-30 سنة المهتمين بالملابس الكاجوال). وتحتها الـPersona بالـ5 حقول:
   - السن والنوع: شاب 24 سنة خريج جديد.
   - المنطقة: فيصل، الجيزة.
   - الفلوس: ميزانيته 400-600 جنيه للقطعة.
   - المشكلة: محتاج لبس شيك للمقابلات والخروج بسعر معقول وتوصيل سريع.
   - بيقعد فين على النت: إنستجرام ومجموعات فيسبوك وواتساب.
2. قوائم العملاء: دخلت على العملاء ← قوائم العملاء، وأنشأت قائمة باسم "الدايرة الصغيرة"، وفتحت زرار الأعضاء وأضفت 3 عملاء حقيقيين بالمواصفات دي (اللقطة في الرابط).
3. مركز التقسيم: دخلت على العملاء ← مركز التقسيم، فتحت تاب الرئيسية مع اختيار فلتر "كل مستويات الولاء"، وسجلت رقم كارت VIP/عالي (5 عملاء) وأعضاء الولاء (12 عميل).
4. الطلبات غير المكتملة: دخلت على إدارة الطلبات ← الطلبات غير المكتملة، اخترت صف بعمود المصدر الإعلاني facebook ظاهر، وضغطت زرار واتساب وأرسلت النص بدون خصم: "أهلاً أحمد شفت إن طلبك ما اكتملش. تحب أكمله لك؟".
  `;
  const gradeResultB = await academyService.gradeSubmission({
    lessonId: lesson.id,
    submission: {
      submissionText: completeSubmissionText.trim(),
      submissionUrl: 'https://storage.maxp.online/academy/proofs/lesson-1-all-4-screenshots.png',
    },
    companyId: lesson.companyId,
  });
  console.log('AI Grader Result (AC5-b - Complete):', JSON.stringify(gradeResultB, null, 2));
  console.log('\n====================================================');
  console.log('All AC4 & AC5 scenarios completed successfully!');
}

runTests()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
