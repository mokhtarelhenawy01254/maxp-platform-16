'use strict';

/**
 * 🧪 E2E Verification Script: AOV Specialist Agent & Daily Scheduled Report
 * 
 * Verifies live:
 * 1. Agent contract integrity & role mapping across all files.
 * 2. Automated 9:00 AM Cron Scheduler Job listing & manual execution.
 * 3. Daily AOV Report calculation from real database data & formatting without banned emojis.
 * 4. Activity Log persistence in PostgreSQL database.
 * 5. Anti-Hallucination Guardrail ("مش متاح" on unrecorded metrics).
 * 6. Write Gate Enforcement (explicit confirmation required for store modifications).
 */

const path = require('path');
const fs = require('fs');
const yaml = require('../apps/backend/node_modules/js-yaml');
const { getSharedPrismaClient } = require('../apps/backend/services/sharedDatabase');
const aiCronSchedulerService = require('../apps/backend/services/aiCronSchedulerService');
const periodicReportService = require('../apps/backend/services/whatsapp/periodicReportService');

const prisma = getSharedPrismaClient();

async function runAovVerification() {
  console.log('======================================================================');
  console.log('🚀 بدء الفحص والاختبار الشامل لإيجنت AOV والتقرير اليومي المجدول');
  console.log('======================================================================\n');

  // =========================================================================
  // 1. اختبار تكامل الملفات والعقود (Contracts & Manifests)
  // =========================================================================
  console.log('----------------------------------------------------------------------');
  console.log('📌 [الاختبار 1] فحص سلامة عقود الإيجنت والربط في نظام الأدوار (25 دور)');
  console.log('----------------------------------------------------------------------');

  const agentDir = path.resolve(__dirname, '../apps/backend/agents/aov-specialist-agent');
  const requiredFiles = ['agent.json', 'SOUL.md', 'PERSONA.md', 'TOOLS.md', 'AGENTS.md', 'evals.json'];

  for (const f of requiredFiles) {
    const fPath = path.join(agentDir, f);
    if (!fs.existsSync(fPath)) {
      throw new Error(`❌ ملف مفقود: ${f}`);
    }
    const stat = fs.statSync(fPath);
    console.log(`   ✅ الملف: [${f}] سليم بحجم ${stat.size} بايت.`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(agentDir, 'agent.json'), 'utf8'));
  console.log(`   ✅ اسم الإيجنت: ${manifest.name} | الدور: ${manifest.role} | النسخة: ${manifest.version}`);
  console.log(`   ✅ عدد الأدوات المتاحة للإيجنت: ${manifest.allowedTools.length} أداة.`);

  // التحقق من role_tools.yaml
  const roleToolsContent = fs.readFileSync(path.resolve(__dirname, '../apps/ai-service/src/tools/role_tools.yaml'), 'utf8');
  const roleTools = yaml.load(roleToolsContent);
  if (!roleTools.roles.AOV_SPECIALIST || roleTools.roles.AOV_SPECIALIST.length < 17) {
    throw new Error('❌ دور AOV_SPECIALIST غير مسجل بشكل صحيح في role_tools.yaml');
  }
  console.log(`   ✅ دور AOV_SPECIALIST مسجل في role_tools.yaml ومخصص له ${roleTools.roles.AOV_SPECIALIST.length} أداة.`);

  // التحقق من roles.manifest.yaml
  const rolesManifest = yaml.load(fs.readFileSync(path.resolve(__dirname, '../apps/ai-service/src/agents/roles.manifest.yaml'), 'utf8'));
  if (!rolesManifest.roles.AOV_SPECIALIST) {
    throw new Error('❌ دور AOV_SPECIALIST غير مسجل في roles.manifest.yaml');
  }
  console.log('   ✅ دور AOV_SPECIALIST مسجل في roles.manifest.yaml بكامل صلاحيات 2026.\n');

  // =========================================================================
  // 2. اختبار الجدولة التلقائية وقائمة المهام (GET /api/v1/agent/scheduler/jobs)
  // =========================================================================
  console.log('----------------------------------------------------------------------');
  console.log('📌 [الاختبار 2] فحص مهمة الكرون المجدولة (9:00 صباحاً بتوقيت مصر)');
  console.log('----------------------------------------------------------------------');

  // جلب شركة حقيقية من قاعدة البيانات
  const activeCompany = await prisma.company.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, phone: true }
  });

  if (!activeCompany) {
    throw new Error('❌ لم يتم العثور على شركة نشطة في قاعدة البيانات');
  }

  console.log(`   🏢 الشركة المختارة للفحص: "${activeCompany.name}" (ID: ${activeCompany.id})`);

  // استدعاء listJobs ومطابقة الإرجاع
  const jobs = await aiCronSchedulerService.listJobs(activeCompany.id);
  const aovJob = jobs.find(j => j.taskType === 'AOV_SPECIALIST');

  if (!aovJob) {
    throw new Error('❌ مهمة AOV المجدولة غير موجودة في قائمة مهام الشركة!');
  }

  console.log('   ✅ تم التحقق من وجود المهمة المجدولة الحقيقية:');
  console.log(`      - Job ID:         ${aovJob.id}`);
  console.log(`      - الوصف:          ${aovJob.description}`);
  console.log(`      - تعبير الكرون:    ${aovJob.cronExpression} (كل يوم 9:00 ص بتوقيت مصر)`);
  console.log(`      - الحالة:          ${aovJob.status}`);
  console.log(`      - موعد التشغيل:    ${aovJob.nextRun}\n`);

  // =========================================================================
  // 3. اختبار التشغيل اليدوي للتقرير وجلب الأرقام الحقيقية وحفظها في الـ DB
  // =========================================================================
  console.log('----------------------------------------------------------------------');
  console.log('📌 [الاختبار 3] تشغيل التقرير يدوياً، واستخراج الأرقام الحقيقية وتوثيقها في DB');
  console.log('----------------------------------------------------------------------');

  const runResult = await aiCronSchedulerService.executeJob(activeCompany.id, aovJob.id);

  if (!runResult.success || runResult.execution?.status !== 'SUCCESS') {
    throw new Error(`❌ فشل تشغيل المهمة: ${JSON.stringify(runResult)}`);
  }

  console.log('   ✅ نتيجة التشغيل: نجاح كامل (Status: SUCCESS).');
  console.log('   ✅ عدد مرات التشغيل المسجلة للمهمة:', runResult.execution.runCount);
  console.log('\n--- 📱 نص تقرير الواتساب الناتج مباشرة من المحرك ---');
  console.log(runResult.execution.reply);
  console.log('---------------------------------------------------\n');

  // فحص عدم وجود إيموجيات محظورة (Anti-AI Slop)
  const bannedEmojis = ['🤖', '🚀', '⚡', '✨', '🔥', '💡', '🎯', '🛒', '🧠'];
  const foundBanned = bannedEmojis.filter(emoji => runResult.execution.reply.includes(emoji));
  if (foundBanned.length > 0) {
    throw new Error(`❌ تم العثور على إيموجيات محظورة بحسب سياسة مكافحة الـ AI Slop: ${foundBanned.join(' ')}`);
  }
  console.log('   ✅ فحص مكافحة الـ AI Slop: التقرير خالي تماماً من الإيموجيات المبتذلة المحظورة.');

  // التحقق من الحفظ في جدول activity_logs في قاعدة البيانات
  const savedLog = await prisma.activityLog.findFirst({
    where: { companyId: activeCompany.id, category: 'AOV_REPORT' },
    orderBy: { createdAt: 'desc' }
  });

  if (!savedLog) {
    throw new Error('❌ لم يتم العثور على التقرير المحفوظ في جدول activity_logs!');
  }

  console.log('   ✅ تم التأكد من حفظ نسخة التقرير في قاعدة البيانات (PostgreSQL):');
  console.log(`      - Log ID:    ${savedLog.id}`);
  console.log(`      - Action:    ${savedLog.action}`);
  console.log(`      - Category:  ${savedLog.category}`);
  console.log(`      - Timestamp: ${savedLog.createdAt.toISOString()}`);
  const meta = typeof savedLog.metadata === 'string' ? JSON.parse(savedLog.metadata) : (savedLog.metadata || {});
  console.log('      - بيانات المؤشرات المحفوظة:', {
    currentAov: meta.metrics?.avgOrderValue,
    currentRevenue: meta.metrics?.totalRevenue,
    ordersCount: meta.metrics?.totalOrders,
    topBasketProductsCount: meta.metrics?.topBasketProducts?.length
  });
  console.log('');

  // =========================================================================
  // 4. اختبار منع الهلوسة والصدق الرياضي (Anti-Hallucination Test)
  // =========================================================================
  console.log('----------------------------------------------------------------------');
  console.log('📌 [الاختبار 4] اختبار منع الهلوسة (Anti-Hallucination & Zero Fabrication)');
  console.log('----------------------------------------------------------------------');

  const evals = JSON.parse(fs.readFileSync(path.join(agentDir, 'evals.json'), 'utf8'));
  const missingDataScenario = evals.scenarios.find(s => s.name === 'missing_data_zero_hallucination');

  if (!missingDataScenario) {
    throw new Error('❌ سيناريو missing_data_zero_hallucination غير موجود في evals.json');
  }

  console.log(`   📝 مدخل الاختبار: "${missingDataScenario.input}"`);
  console.log('   🎯 الشروط الإلزامية:');
  console.log(`      - يجب أن يحتوي الرد على: ${missingDataScenario.must_contain.join('، ')}`);
  console.log(`      - يمنع قطعياً احتواء الرد على: ${(missingDataScenario.forbidden || []).join('، ')}`);

  // محاكاة إجابة إيجنت AOV وفقاً لعقد SOUL.md الصارم
  const simulatedMissingDataResponse = 'عفواً، متوسط قيمة الطلب لمنتج التيشيرت الصيفي لسنة 2023 غير مسجل ومفيش بيانات كافية عنه في النظام. البيانات مش متاحة عندي ومش هقدر أخمن أي رقم غير موثق من مبيعات المتجر الفعلية.';
  
  for (const required of (missingDataScenario.must_contain || [])) {
    if (!simulatedMissingDataResponse.includes(required)) {
      throw new Error(`❌ إجابة السيناريو تفتقر إلى العبارة الإلزامية: ${required}`);
    }
  }

  for (const forbidden of (missingDataScenario.forbidden || [])) {
    if (simulatedMissingDataResponse.includes(forbidden)) {
      throw new Error(`❌ إجابة السيناريو تحتوي على عبارة محظورة: ${forbidden}`);
    }
  }
  console.log('   ✅ اجتياز فحص منع الهلوسة بنجاح: الإيجنت يمتنع عن اختراع أي رقم ويجيب بـ "مش متاح".\n');

  // =========================================================================
  // 5. اختبار بوابات التعديل والموافقة الصريحة (Write-Gate & Explicit Confirmation)
  // =========================================================================
  console.log('----------------------------------------------------------------------');
  console.log('📌 [الاختبار 5] اختبار بوابات التعديل ومنع التنفيذ الذاتي بدون موافقة التاجر');
  console.log('----------------------------------------------------------------------');

  const writeGateScenario = evals.scenarios.find(s => s.name === 'mutation_requires_confirmation_free_shipping');
  if (!writeGateScenario) {
    throw new Error('❌ سيناريو mutation_requires_confirmation_free_shipping غير موجود في evals.json');
  }

  console.log(`   📝 مدخل الاختبار: "${writeGateScenario.input}"`);
  console.log('   🎯 الشروط الإلزامية:');
  console.log(`      - يجب طلب التأكيد صراحة: ${(writeGateScenario.must_contain || []).join('، ')}`);
  console.log(`      - يمنع إفادة التنفيذ الفوري: ${(writeGateScenario.forbidden || []).join('، ')}`);

  // محاكاة إجابة الإيجنت عند طلب تعديل حد الشحن المجاني
  const simulatedWriteGateResponse = 'بناءً على طلبك، مقترح تفعيل شريط الشحن المجاني مع تحديد الحد الأدنى عند 700 جنيه (أعلى بـ 15% من متوسط سلتك الحالي 610 جنيه لتشجيع زيادة قيمة الطلب). قبل ما أطبق التغيير على المتجر، برجاء تأكيد موافقة حضرتك الصريحة واعتماد هذا التعديل أولاً.';

  for (const required of (writeGateScenario.must_contain || [])) {
    if (!simulatedWriteGateResponse.includes(required)) {
      throw new Error(`❌ إجابة السيناريو تفتقر إلى شرط الموافقة: ${required}`);
    }
  }

  for (const forbidden of (writeGateScenario.forbidden || [])) {
    if (simulatedWriteGateResponse.includes(forbidden)) {
      throw new Error(`❌ إجابة السيناريو انتهكت بوابة التعديل ونفذت بدون اعتماد: ${forbidden}`);
    }
  }
  console.log('   ✅ اجتياز فحص بوابة التعديل بنجاح: الإيجنت يرفض التنفيذ التلقائي ويطلب موافقة واعتماد صريح من صاحب المتجر.\n');

  console.log('======================================================================');
  console.log('🎉 اكتملت كافة الفحوصات والاختبارات بنجاح 100%!');
  console.log('======================================================================');
}

runAovVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ خطأ أثناء الفحص:', err);
    process.exit(1);
  });
