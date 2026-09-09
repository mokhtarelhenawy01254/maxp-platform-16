/**
 * Script to seed the initial flagship course: Performance Media Buyer (29 Lessons)
 * Usage: node scripts/seed_media_buyer_course.js [companyId]
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function seed() {
  const prisma = getSharedPrismaClient();

  // Find or get default company
  const targetCompanyId = process.argv[2] || process.env.DEFAULT_COMPANY_ID;
  let company = null;

  if (targetCompanyId) {
    company = await prisma.company.findUnique({ where: { id: targetCompanyId } });
  }

  if (!company) {
    company = await prisma.company.findFirst();
  }

  if (!company) {
    console.error('No company found in database to attach the course to.');
    process.exit(1);
  }

  console.log(`Seeding Performance Media Buyer course for company: ${company.name || company.id}`);

  // Check if course already exists
  let course = await prisma.academyCourse.findFirst({
    where: { companyId: company.id, slug: 'performance-media-buyer' },
  });

  if (!course) {
    course = await prisma.academyCourse.create({
      data: {
        companyId: company.id,
        title: 'دورة الميديا باير المحترف — Performance Media Buyer',
        slug: 'performance-media-buyer',
        description: 'دورة تطبيقية مكثفة من 29 درساً لنقلك من الصفر حتى إتقان إدارة وتوسيع الحملات الإعلانية على منصات ميتا وتيك توك وتحقيق أرباح حقيقية باستخدام أدوات ماكس بي.',
        price: 1499,
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
        isPublished: true,
        freePreviewLessons: 2,
      },
    });
    console.log(`Created course: ${course.id}`);
  } else {
    console.log(`Course already exists: ${course.id}`);
  }

  const modulesData = [
    {
      title: 'الوحدة 1: التأسيس وسيكولوجية العرض والربحية',
      description: 'فهم اقتصاديات التجارة، حساب الأرقام، وتصميم عروض تجذب العملاء وتحقق هوامش ربح حقيقية.',
      sortOrder: 1,
      lessons: [
        {
          title: '1. مقدمة في شراء الوسائط الرقمية ومفهوم الربحية الصافية',
          sortOrder: 1,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 12,
          isFreePreview: true,
          scriptText: `في هذا الدرس التأسيسي، نوضح المفهوم الحقيقي لـ Performance Marketing. الميديا باير ليس مجرد شخص يضغط أزرار في لوحة إعلانات فيسبوك، بل هو مهندس ربحية. الربحية تبدأ بحساب تكلفة البضاعة (COGS)، تكاليف الشحن والمرتجعات، وأخيراً تكلفة الاستحواذ على العميل (CAC). لا تنظر للـ ROAS بمعزل عن هامش الربح الصافي.`,
          exerciseText: 'احسب هامش ربح منتجك قبل خصم الإعلانات، وحدد نقطة التعادل (Break-even ROAS).',
        },
        {
          title: '2. سيكولوجية المستهلك وصياغة العرض الذي لا يقاوم (Grand Slam Offer)',
          sortOrder: 2,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 18,
          isFreePreview: true,
          scriptText: `الإعلان الممتاز لا يمكنه إنقاذ عرض سيء. في هذا الدرس، نتعلم معادلة القيمة: الحلم المرغوب × احتمالية التحقق مقسوماً على (الوقت المستغرق × الجهد والتضحية). كيف تصنع باقات (Bundles) ترفع من متوسط قيمة الطلب (AOV) وتجعل العميل يشعر بالغباء إذا رفض العرض.`,
          exerciseText: 'اكتب عرضاً ثلاثياً (باقة فردية، باقة ثنائية بخصم، باقة توفير عائلية) لمنتجك الأساسي.',
        },
        {
          title: '3. رياضيات الإعلانات: حساب CAC و LTV و Break-even ROAS',
          sortOrder: 3,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 15,
          isFreePreview: false,
          scriptText: `المعادلة الذهبية للميديا باير: إذا كان سعر البيع 500 جنيه وتكلفة المنتج والشحن 250 جنيه، فهامش ربحك الإجمالي 250 جنيه. هذا يعني أن نقطة التعادل ROAS هي 500 / 250 = 2.0x. أي ROAS أعلى من 2.0x يعني أنك رابح صافي. في هذا الدرس نطبق على شيت إكسيل ماكس بي لحساب كافة المتغيرات.`,
          exerciseText: 'أدخل تكاليف منتجاتك في شيت حساب الربحية واستخرج الحد الأقصى لتكلفة الأوردر المسموحة (Max CPA).',
        },
        {
          title: '4. تشريح صفحة الهبوط فائقة التحويل (High-Converting Landing Page)',
          sortOrder: 4,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 22,
          isFreePreview: false,
          scriptText: `صفحة الهبوط هي المكان الذي يتم فيه إغلاق الصفقة. 80% من الزوار يتصفحون من الموبايل. العناصر الأساسية: العنوان الخاطف، صورة أو فيديو يوضح استخدام المنتج، آراء عملاء حقيقيين (Social Proof)، نموذج طلب فوري بسيط بـ 3 حقول فقط (الاسم، الهاتف، العنوان)، وتأكيد الدفع عند الاستلام.`,
          exerciseText: 'افحص صفحة منتجك في متجر سوان وتأكد من أن نموذج الشراء يظهر في أول شاشة على الموبايل.',
        },
        {
          title: '5. ربط متجر سوان وتجهيز القنوات البيعية في ماكس بي',
          sortOrder: 5,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 16,
          isFreePreview: false,
          scriptText: `في هذا الدرس، نربط متجر سوان بحسابك الإعلاني. نجهز تصنيفات المنتجات، ونفعّل نظام السلات المتروكة، ونربط رقم الواتساب بالمتجر لإرسال رسائل التأكيد التلقائية. هذا الربط المباشر يوفر عليك ساعات عمل يومياً.`,
          exerciseText: 'قم بتفعيل إشعار الواتساب التلقائي فور إنشاء الطلب في متجرك.',
        },
        {
          title: '6. كويز الوحدة الأولى ومراجعة التأسيس الأكاديمي',
          sortOrder: 6,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 10,
          isFreePreview: false,
          scriptText: `مراجعة شاملة لكافة مبادئ الوحدة الأولى: حسابات الأرقام، صياغة العروض، وصفحات الهبوط. حل الاختبار القصير واجتياز نسبة 70% هو شرط الانتقال لوحدة التتبع التقني.`,
          exerciseText: 'أجب عن أسئلة الكويز الـ 3 وتأكد من فهمك لكل خطأ إن وجد.',
          quiz: {
            title: 'اختبار الوحدة الأولى: أساسيات الربحية والعرض',
            passScorePercent: 70,
            questions: [
              {
                id: 'q1_1',
                q: 'إذا كان سعر بيع المنتج 600 جنيه وهامش ربحك الإجمالي 300 جنيه، فما هو الـ Break-even ROAS؟',
                options: ['1.5x', '2.0x', '3.0x', '4.0x'],
                correctIndex: 1,
                explanation: 'Break-even ROAS = سعر البيع / هامش الربح = 600 / 300 = 2.0x.',
              },
              {
                id: 'q1_2',
                q: 'ما هو العنصر الأكثر حساسية في صفحة الهبوط على الموبايل؟',
                options: ['سرعة التحميل ونموذج الشراء البسيط', 'طول المقال النصي', 'كثرة الروابط الخارجية', 'الألوان الزاهية المعقدة'],
                correctIndex: 0,
                explanation: 'سرعة التحميل وبساطة نموذج الطلب هما العاملان الأكثر حساسية لرفع معدل التحويل.',
              },
              {
                id: 'q1_3',
                q: 'كيف يؤثر رفع متوسط قيمة الطلب (AOV) على ربحية الميديا باير؟',
                options: ['يقلل الأرباح', 'يسمح لك بدفع تكلفة استحواذ أعلى والمنافسة بقوة', 'لا يؤثر إطلاقاً', 'يزيد من تعقيد الإعلانات فقط'],
                correctIndex: 1,
                explanation: 'ارتفاع AOV يمنحك متسعاً لإنفاق ميزانية إعلانية أكبر مع الحفاظ على الربحية.',
              },
            ],
          },
        },
      ],
    },
    {
      title: 'الوحدة 2: البنية التقنية، التتبع، والـ CAPI',
      description: 'إعداد الـ Business Manager، تثبيت البيكسل، وربط Conversions API لحل مشاكل تتبع iOS 14+.',
      sortOrder: 2,
      lessons: [
        {
          title: '7. إعداد Meta Business Manager والحسابات الإعلانية باحتراف',
          sortOrder: 7,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 14,
          isFreePreview: false,
          scriptText: `هيكلة الـ Business Manager لحماية حسابك من الإغلاق (Bans). استخدام حسابات احتياطية، توثيق الدومين، ربط الصفحة وحساب الإنستجرام ووسائل الدفع. الأمان وتفعيل المصادقة الثنائية (2FA) للمدراء والموظفين.`,
          exerciseText: 'قم بتوثيق الدومين الخاص بمتجرك داخل الـ Business Manager.',
        },
        {
          title: '8. ربط Conversions API (CAPI) مع سيرفر ماكس بي',
          sortOrder: 8,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 20,
          isFreePreview: false,
          scriptText: `بعد تحديثات iOS وتطبيقات حظر الإعلانات، أصبح الاعتماد على بيكسل المتصفح وحده يفقدك 30% إلى 40% من بيانات التحويل. الحل هو إرسال أحداث الشراء مباشرة من سيرفر ماكس بي إلى خوادم ميتا (Server-Side Tracking) عبر CAPI Access Token مع إرسال Event Deduplication لتفادي تكرار الأوردرات.`,
          exerciseText: 'انسخ كود الـ CAPI Token من مدير الأحداث وضعه في إعدادات الربط في ماكس بي.',
        },
        {
          title: '9. تكوين أحداث الشراء ومعايير جودة مطابقة الأحداث (Event Match Quality)',
          sortOrder: 9,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 18,
          isFreePreview: false,
          scriptText: `كيف ترفع Event Match Quality (EMQ) إلى درجة 8/10 فما فوق؟ السر يكمن في تمرير بيانات العميل المشفّرة (Hashed Phone, Email, City, IP, User Agent) مع كل حدث Purchase أو AddToCart. هذا يمكّن خوارزمية فيسبوك من التعرف على المشتري بدقة وربطه بحسابه الإعلاني.`,
          exerciseText: 'افحص نقاط مطابقة حدث الشراء Purchase وتأكد من وصول جودة المطابقة لـ جيد أو ممتاز.',
        },
        {
          title: '10. التحقق من الدومين وتجهيز تتبع الجوال والأجهزة الذكية',
          sortOrder: 10,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 15,
          isFreePreview: false,
          scriptText: `في هذا الدرس، نختبر إرسال طلب تجريبي (Test Event) من متجرك ومراقبة استقباله الحقيقي لحظياً في نافذة الاختبار داخل Meta Events Manager للتأكد من تسجيل القيمة النقدية والعملة (EGP) بدقة.`,
          exerciseText: 'أطلق حدث اختبار وهمي وتأكد من ظهوره في شاشة الأحداث التجريبية بلون أخضر.',
        },
        {
          title: '11. اختبار الوحدة الثانية: التتبع والربط التقني',
          sortOrder: 11,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 10,
          isFreePreview: false,
          scriptText: `اختبار عملي يؤكد استيعابك لكيفية عمل البيكسل وخوادم الـ CAPI ودورها في تعزيز كفاءة الذكاء الاصطناعي الإعلاني.`,
          exerciseText: 'أجب عن أسئلة الكويز بتركيز.',
          quiz: {
            title: 'اختبار التتبع والـ CAPI',
            passScorePercent: 70,
            questions: [
              {
                id: 'q2_1',
                q: 'ما هي الفائدة الأساسية لربط Conversions API (CAPI) بجانب البيكسل العادي؟',
                options: ['تجاوز فقدان البيانات الناتج عن قيود المتصفحات وحظر الإعلانات', 'زيادة سعر النقرة', 'تغيير شكل الإعلان', 'تسريع المتجر تلقائياً'],
                correctIndex: 0,
                explanation: 'CAPI يرسل البيانات من السيرفر مباشرة فيتغلب على حواجب الكوكيز وموانع الإعلانات.',
              },
              {
                id: 'q2_2',
                q: 'ما هو دور Event Deduplication عند إرسال الأحداث من المتصفح والسيرفر معاً؟',
                options: ['منع احتساب نفس الطلب مرتين في الحساب الإعلاني', 'مضاعفة الميزانية', 'حذف الإعلانات القديمة', 'تأكيد الحجز فوراً'],
                correctIndex: 0,
                explanation: 'يقوم بمقارنة Event ID وحذف التكرار حتى تظل أرقام المبيعات دقيقة 100%.',
              },
            ],
          },
        },
      ],
    },
    {
      title: 'الوحدة 3: استراتيجيات واختبار وتوسيع الحملات (Scaling)',
      description: 'هياكل الحملات الإعلانية، تصميم الكرياتيف، منهجية الاختبار العلمي، والتوسع بالميزانيات.',
      sortOrder: 3,
      lessons: [
        {
          title: '12. مقارنة ABO مقابل CBO واستراتيجية هيكلة الحساب الإعلاني',
          sortOrder: 12,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 17,
          isFreePreview: false,
          scriptText: `متى نستخدم ميزانية المجموعات (ABO) ومتى ننتقل لميزانية الحملة (CBO / Advantage+ Campaign Budget)؟ القاعدة المعتمدة: استخدم ABO في مرحلة اختبار الزوايا الإعلانية والكرياتيف، وانقل الإعلانات الرابحة إلى CBO في مرحلة التوسيع المالي (Scaling).`,
          exerciseText: 'أنشئ حملة اختبار أولى بنظام ABO مخصصة لاختبار 3 كرياتيف مختلفين.',
        },
        {
          title: '13. صناعة الكرياتيف الخاطف (Hook + Story + Offer Framework)',
          sortOrder: 13,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 25,
          isFreePreview: false,
          scriptText: `الـ Hook في أول 3 ثوان هو 80% من نجاح الفيديو. زوايا الكرياتيف: زاوية حل المشكلة (Problem/Agitation)، زاوية التحول الإيجابي (Before & After)، وزاوية تجربة العميل (UGC / User Generated Content). في هذا الدرس نعرض نماذج إعلانية حققت مبيعات بالملايين في السوق المصري والعربي.`,
          exerciseText: 'اكتب 3 سيناريوهات سريعة لفيديوهات UGC مدتها 30 ثانية لمنتجك.',
        },
        {
          title: '14. الاستهداف الواسع (Broad Targeting) وخوارزمية Advantage+ الحالية',
          sortOrder: 14,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 16,
          isFreePreview: false,
          scriptText: `في الماضي كان الميديا باير يقضي ساعات في اختيار الاهتمامات (Interests). اليوم الذكاء الاصطناعي لميتا يفهم محتوى الفيديو والكابشن، وأصبح الاستهداف الواسع (Broad) مع تحديد السن والمنطقة الجغرافية هو الذي يحقق أرخص تكلفة شراء وأعلى استقرار مع الميزانيات الكبيرة.`,
          exerciseText: 'أطلق مجموعة إعلانية باستهداف واسع (Broad) وقارن سعر الأوردر باستهداف الاهتمامات.',
        },
        {
          title: '15. الجماهير المشابهة (Lookalike) وإعادة الاستهداف الذكي (Retargeting)',
          sortOrder: 15,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 19,
          isFreePreview: false,
          scriptText: `كيف تستفيد من قاعدة بيانات عملائك في ماكس بي؟ تصدير أرقام المشترين الفعليين وإنشاء Lookalike 1% و 2%. وإعادة استهداف زوار المتجر الذين وصلوا لمرحلة السلة ولم يتمموا الشراء برسالة عرض خاص أو كود خصم محدود المدة.`,
          exerciseText: 'أنشئ جمهور مخصص لزوار متجرك في آخر 30 يوماً.',
        },
        {
          title: '16. منهجية اختبار الكرياتيف العلمية (Dynamic Creative & Split Testing)',
          sortOrder: 16,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 21,
          isFreePreview: false,
          scriptText: `تجنب العشوائية في الاختبار: اختبر متغيراً واحداً في كل مرة. اختبر 3 هوكس (Hooks) مختلفة مع نفس محتوى الفيديو، أو اختبر 3 عناوين نصية مع نفس الكرياتيف. بعد 48 ساعة وصرف ما يعادل 2x إلى 3x من تكلفة الأوردر المستهدفة، حدد الفائز وأوقف الباقي فوراً.`,
          exerciseText: 'سجل نتائج اختبار 3 إعلانات مختلفة في جدول المقارنة وحدد الإعلان الفائز بناءً على CPA.',
        },
        {
          title: '17. أسرار التوسيع الرأسي والأفقي (Vertical vs Horizontal Scaling)',
          sortOrder: 17,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 24,
          isFreePreview: false,
          scriptText: `التوسيع الرأسي: زيادة الميزانية 20% كل 48 ساعة دون كسر مرحلة التعلم (Learning Phase). التوسيع الأفقي: تكرار الإعلان الرابح في حملات جديدة بجماهير مختلفة، أو فتح دول جديدة (مثلاً التوسع من مصر إلى السعودية أو الإمارات)، أو إطلاق نسخ كرياتيف جديدة لنفس الزاوية الرابحة.`,
          exerciseText: 'ضع خطة توسيع أسبوعية لميزانية إعلانك الفائز بمعدل زيادة 20% كل يومين.',
        },
        {
          title: '18. كويز الوحدة الثالثة: استراتيجيات الحملات والتحجيم',
          sortOrder: 18,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 10,
          isFreePreview: false,
          scriptText: `تقييم عملي لمهاراتك في إدارة الميزانيات وتوسيع الإعلانات الرابحة والتعامل مع الخوارزمية الحديثة.`,
          exerciseText: 'حل الكويز للوصول للمستوى التالي.',
          quiz: {
            title: 'اختبار استراتيجيات الإعلانات والتوسيع',
            passScorePercent: 70,
            questions: [
              {
                id: 'q3_1',
                q: 'ما هي النسبة الآمنة الموصى بها لزيادة الميزانية في التوسيع الرأسي لتجنب إعادة الإعلان لمرحلة التعلم؟',
                options: ['15% إلى 20% كل 24-48 ساعة', '100% فوراً', '300% كل يومين', 'لا تزد الميزانية أبداً'],
                correctIndex: 0,
                explanation: 'الزيادة بنسبة 20% تحافظ على استقرار خوارزمية المزايدة دون صدمة الحساب الإعلاني.',
              },
              {
                id: 'q3_2',
                q: 'ما هو العنصر الأهم في إعلان الفيديو لاختبار جذب انتباه المشاهد؟',
                options: ['أول 3 ثوان (The Hook)', 'الموسيقى في نهاية الفيديو', 'اسم الشركة في الوصف فقط', 'مدة الفيديو الطويلة'],
                correctIndex: 0,
                explanation: 'الـ Hook هو الفاصل بين تمرير المستخدم للشاشة أو بقائه لمشاهدة العرض.',
              },
            ],
          },
        },
      ],
    },
    {
      title: 'الوحدة 4: قراءة البيانات، التحليل، وتفادي هبوط الأداء',
      description: 'مصفوفة مؤشرات الأداء، استكشاف الأعطال التسويقية، وحل مشاكل هبوط المبيعات.',
      sortOrder: 4,
      lessons: [
        {
          title: '19. مصفوفة مقاييس الأداء: قراءة CPM و CTR و CPC و Conversion Rate',
          sortOrder: 19,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 18,
          isFreePreview: false,
          scriptText: `الأرقام تتحدث وتكشف مكان الخلل: إذا كان الـ CPM مرتفعاً، فالجمهور أو الصفحة عليها مشاكل تقييم. إذا كان الـ CTR ضعيفاً (< 1.5%)، فالكرياتيف والـ Hook مملين. إذا كان الـ CTR ممتاز والـ Conversion Rate على المتجر ضعيف (< 2%)، فالمشكلة في صفحة الهبوط، السعر، أو ثقة العميل في المنتج.`,
          exerciseText: 'افتح تقرير إعلاناتك واستخرج الـ Outbound CTR ونسبة التحويل على صفحة المنتج.',
        },
        {
          title: '20. تشخيص التسريب في القمع البيعي (Funnel Leak Diagnosis)',
          sortOrder: 20,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 20,
          isFreePreview: false,
          scriptText: `أين يهرب عميلك؟ حساب معدل التحويل بين المراحل: (Link Clicks ⬅ View Content ⬅ Add to Cart ⬅ Initiate Checkout ⬅ Purchase). تحديد المرحلة التي يحدث فيها أكبر تساقط للزوار والبدء في علاجها فوراً (تحسين سرعة الصفحة، إضافة زر شراء عائم، إلغاء الحقول غير الضرورية).`,
          exerciseText: 'ارسم قمع مبيعات متجرك واحسب نسبة الهبوط بين إضافة للسلة وإتمام الطلب.',
        },
        {
          title: '21. حل مشكلة إرهاق الإعلانات (Creative Fatigue) وتجديد الحيوية',
          sortOrder: 21,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 15,
          isFreePreview: false,
          scriptText: `عندما تلاحظ ارتفاع تكلفة الشراء فجأة بعد أيام من النجاح مع ثبات الميزانية، فالحساب يعاني من Creative Fatigue (الجمهور تشبع من رؤية نفس الفيديو). كيف تجدد الإعلان بذكاء: تغيير أول 3 ثوان، تغيير اللون أو الموسيقى، أو تصوير زاوية فتح الصندوق (Unboxing) لنفس المنتج.`,
          exerciseText: 'قم بتصميم نسختين جديدتين من الإعلان الفائز بتغيير الـ Hook الأول فقط.',
        },
        {
          title: '22. استرجاع السلات المتروكة ومضاعفة التأكيد عبر واتساب ماكس بي',
          sortOrder: 22,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 22,
          isFreePreview: false,
          scriptText: `في التجارة الإلكترونية بالشرق الأوسط، 60% إلى 70% من السلات تترك دون إتمام. في هذا الدرس، نربط مسار الأتمتة لاسترجاع السلة المتروكة عبر رسالة واتساب ذكية بعد ساعة تقدم خصماً 5% أو شحن مجاني. هذا المسار وحده يعيد 15% إلى 25% من المبيعات الضائعة بصافي ربح خالص!`,
          exerciseText: 'فعّل رسالة السلة المتروكة عبر واتساب في إعدادات متجرك.',
        },
        {
          title: '23. قواعد الأمان ومتى توقف الإعلان الخاسر (Kill Rules)',
          sortOrder: 23,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 14,
          isFreePreview: false,
          scriptText: `الانضباط العاطفي هو الفارق بين الميديا باير المبتدئ والمحترف. لا تترك إعلاناً يخسر أموالك على أمل أن يتحسن. قاعدة الإيقاف: إذا أنفق الإعلان ما يعادل 1.5x من تكلفة الأوردر المستهدفة دون تحقيق أي عملية بيع، أوقفه فوراً دون تردد.`,
          exerciseText: 'حدد رقم الـ Kill CPA الصارم لحملاتك والتزم به يومياً.',
        },
        {
          title: '24. كويز الوحدة الرابعة: تحليل البيانات والتشخيص',
          sortOrder: 24,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 10,
          isFreePreview: false,
          scriptText: `اختبار عملي لمهاراتك في قراءة لوحة المؤشرات واتخاذ قرارات التعديل أو الإيقاف.`,
          exerciseText: 'أجب عن أسئلة الكويز.',
          quiz: {
            title: 'اختبار تشخيص الأداء وإدارة المبيعات',
            passScorePercent: 70,
            questions: [
              {
                id: 'q4_1',
                q: 'إذا كان الإعلان يحقق نسبة نقر عالية جداً (CTR = 4%) لكن لا توجد أي مبيعات في المتجر، فأين يقع الخلل؟',
                options: ['في صفحة الهبوط أو السعر أو صعوبة نموذج الشراء', 'في تصميم الإعلان نفسه', 'في شعار فيسبوك', 'في بنك الدفع فقط'],
                correctIndex: 0,
                explanation: 'الـ CTR العالي يدل على جاذبية الإعلان، وغياب المبيعات يعني أن صفحة الهبوط تفشل في الإقناع.',
              },
            ],
          },
        },
      ],
    },
    {
      title: 'الوحدة 5: التطبيق الاحترافي، الوكالات، ومشروع التخرج (Capstone)',
      description: 'تنويع القنوات (تيك توك وجوجل)، بناء تقارير الوكالات، ومشروع إطلاق حملة متكاملة لنيل الشهادة.',
      sortOrder: 5,
      lessons: [
        {
          title: '25. إعلانات تيك توك وجوجل وتكامل المنصات المتعددة',
          sortOrder: 25,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 20,
          isFreePreview: false,
          scriptText: `لا تضع كل بيضك في سلة ميتا وحدها. إعلانات تيك توك تتفوق في المنتجات البصرية والشبابية والتسوق الاندفاعي (Impulse Buying)، بينما إعلانات جوجل وشبكة البحث تلتقط العميل الذي يبحث بنية شراء مؤكدة (High Intent). كيف تدير الميزانية بين القنوات الثلاث بانسجام.`,
          exerciseText: 'حدد القناة الإعلانية الثانوية الأنسب لمنتجك بجانب فيسبوك وإنستجرام.',
        },
        {
          title: '26. صناعة لوحة تقارير تفاعلية للعملاء وأصحاب الشركات (Reporting)',
          sortOrder: 26,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 16,
          isFreePreview: false,
          scriptText: `كيف تقدم نتائجك للعميل كشريك نجاح وليس كمجرد منفذ حملات؟ إعداد تقرير أسبوعي يركز على: العائد المالي، صافي الأرباح، نسبة تسليم الطلبات (Delivery Rate)، والتحسينات المقترحة للأسبوع التالي.`,
          exerciseText: 'جهّز قالب تقرير أسبوعي مختصر من صفحة واحدة لعرضه على فريقك.',
        },
        {
          title: '27. عقود الميديا باير ونماذج التسعير والتعاقد مع المتاجر (Pricing Models)',
          sortOrder: 27,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 18,
          isFreePreview: false,
          scriptText: `نماذج العمل: الراتب الثابت (Monthly Retainer)، نسبة من الإنفاق الإعلاني (% of Ad Spend)، أو الأقوى والأعلى ربحية: النسبة من صافي الأرباح المحققة (% of Revenue / Profit Share). كيف تكتب عقداً احترافياً يضمن حقوق الطرفين.`,
          exerciseText: 'اختر نموذج التسعير الأنسب لخدماتك وصغ شروط التعاقد الأساسية.',
        },
        {
          title: '28. مشروع التخرج العملي (Capstone Project): إطلاق حملة حقيقية',
          sortOrder: 28,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 30,
          isFreePreview: false,
          scriptText: `المشروع النهائي: تطبيق كل ما تعلمته في الدورة على منتج حقيقي في متجر سوان. المطلوب: تحديد زاوية العرض، كتابة سكريبت الكرياتيف، إعداد التتبع والـ CAPI، وإطلاق حملة الاختبار ومتابعتها لمدة 3 أيام مع تدوين المقاييس.`,
          exerciseText: 'قدم خطة حملتك النهائية مع لقطات شاشة لإعدادات البيكسل والحساب الإعلاني.',
        },
        {
          title: '29. مناقشة المشروع النهائي، نصائح المسيرة المهنية، واستلام الشهادة',
          sortOrder: 29,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMin: 15,
          isFreePreview: false,
          scriptText: `تهانينا بوصولك للدرس الأخير! في هذا الدرس نلخص أهم أسرار الاستمرارية في مهنة الـ Performance Media Buying، وكيف تظل مواكباً لتحديثات الذكاء الاصطناعي وخوارزميات الإعلانات. بمجرد الضغط على إتمام هذا الدرس، ستصدر شهادتك المعتمدة من أكاديمية ماكس بي تلقائياً برقم تحقق خاص!`,
          exerciseText: 'اضغط على زر إتمام الدورة واستعرض شهادتك المعتمدة وشاركها في ملفك المهني!',
          quiz: {
            title: 'الاختبار الشامل النهائي لاعتماد الشهادة',
            passScorePercent: 70,
            questions: [
              {
                id: 'q5_1',
                q: 'ما هو المقياس الأكثر أهمية لقياس نجاح متجرك في التجارة الإلكترونية ذات الدفع عند الاستلام؟',
                options: ['صافي الأرباح بعد احتساب تكلفة الشحن والمرتجعات ونسبة التسليم', 'عدد الإعجابات على الإعلان فقط', 'عدد النقرات الرخيصة بدون شراء', 'عدد الزوار فقط'],
                correctIndex: 0,
                explanation: 'الربحية الصافية ونسبة التسليم الفعلي هي المعيار الحقيقي لنجاح البيزنس.',
              },
              {
                id: 'q5_2',
                q: 'ما هي الخطوة الفورية بعد إكمال كافة دروس الدورة بنجاح؟',
                options: ['إصدار شهادة الإتمام والبدء في تطبيق المهارات على متجرك في ماكس بي', 'إيقاف كافة الإعلانات', 'حذف البيكسل', 'الانتظار دون تطبيق'],
                correctIndex: 0,
                explanation: 'الاستفادة الحقيقية تأتي من التطبيق العملي المستمر ومتابعة النمو.',
              },
            ],
          },
        },
      ],
    },
  ];

  for (const mData of modulesData) {
    let mod = await prisma.academyModule.findFirst({
      where: { courseId: course.id, title: mData.title },
    });

    if (!mod) {
      mod = await prisma.academyModule.create({
        data: {
          companyId: company.id,
          courseId: course.id,
          title: mData.title,
          description: mData.description,
          sortOrder: mData.sortOrder,
        },
      });
      console.log(`Created module: ${mod.title}`);
    }

    for (const lData of mData.lessons) {
      let lesson = await prisma.academyLesson.findFirst({
        where: { moduleId: mod.id, title: lData.title },
      });

      if (!lesson) {
        lesson = await prisma.academyLesson.create({
          data: {
            companyId: company.id,
            courseId: course.id,
            moduleId: mod.id,
            title: lData.title,
            sortOrder: lData.sortOrder,
            videoUrl: lData.videoUrl,
            durationMin: lData.durationMin,
            isFreePreview: Boolean(lData.isFreePreview),
            scriptText: lData.scriptText,
            exerciseText: lData.exerciseText,
          },
        });
        console.log(`  -> Created lesson: ${lesson.title}`);
      }

      if (lData.quiz) {
        await prisma.academyQuiz.upsert({
          where: { lessonId: lesson.id },
          create: {
            lessonId: lesson.id,
            title: lData.quiz.title,
            passScorePercent: lData.quiz.passScorePercent || 70,
            questions: lData.quiz.questions,
          },
          update: {
            title: lData.quiz.title,
            passScorePercent: lData.quiz.passScorePercent || 70,
            questions: lData.quiz.questions,
          },
        });
        console.log(`    [Quiz attached to lesson: ${lesson.title}]`);
      }
    }
  }

  console.log('Seeding completed successfully! Course has 29 lessons with scripts, exercises, and quizzes.');
}

seed()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
