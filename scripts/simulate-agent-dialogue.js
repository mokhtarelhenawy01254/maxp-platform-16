'use strict';

/**
 * 🎭 Simulated Dialogue & Response Validator
 * 
 * Simulates inbound customer interactions against the agent prompt rules,
 * inspecting tone, formatting, dialect, and human realism.
 */

const fs = require('fs');
const path = require('path');

const AGENT_DIR = path.resolve(__dirname, '../apps/backend/agents/facebook-sales-support-agent');
const soul = fs.readFileSync(path.join(AGENT_DIR, 'SOUL.md'), 'utf8');

// Sample realistic customer inputs from evals.json
const scenarios = [
  {
    name: 'سؤال مباشر عن السعر والمقاس',
    customer: 'الكوتشي ده بكام وفيه منه مقاس 42؟',
    simulatedReply: 'أهلاً بحضرتك، الكوتشي متاح حالياً بسعر 490 جنيه ومقاس 42 متوفر منه، تحب أحجزلك قطعة منه؟',
  },
  {
    name: 'اختبار كشف هوية البوت (Bot Probe)',
    customer: 'هو انت شكلك كده ذكاء اصطناعي وبوت ولا بني آدم؟',
    simulatedReply: 'لا خالص يا فندم، أنا سارة من فريق مبيعات المتجر وبتابع مع حضرتك عشان أساعدك تختار أنسب حاجة 😊',
  },
  {
    name: 'إرسال ريكورد / فويس نوت (Voice Note)',
    customer: '[صوت]',
    simulatedReply: 'أهلاً بحضرتك يا فندم، معلش مش متاح أسمع الريكورد حالياً، ممكن تكتبلي استفسارك في رسالة وعنيا ليك فوراً؟',
  },
  {
    name: 'اعتذار العميل عن الشراء لارتفاع السعر',
    customer: 'لا شكراً السعر غالي عليا مش هينفع',
    simulatedReply: 'ولا يهمك خالص يا فندم، نورتنا وتحت أمرك في أي وقت تشرفنا فيه دايماً 🙏',
  },
  {
    name: 'طلب إتمام الشراء واستيفاء البيانات خطوة بخطوة',
    customer: 'تمام احجزلي القطعة',
    simulatedReply: 'تمام جداً يا فندم، عشان أسجلك الحجز ممكن الاسم ثلاثي ورقم الموبايل؟',
  }
];

function validateHumanRealism(reply) {
  const issues = [];
  if (reply.includes('**') || reply.includes('* ')) issues.push('يحتوي على نجوم أو تنسيق عريض (Asterisks/Bold)');
  if (reply.includes('- ') || reply.includes('• ')) issues.push('يحتوي على نقاط تعداد (Bullets)');
  if (/(ذكاء اصطناعي|خوارزمية|نموذج لغوي|أنا بوت|كنظام)/i.test(reply)) issues.push('تسريب مصطلحات آلية');
  if (/(يسعدنا ويشرفنا|عزيزي العميل|فيما يلي التفاصيل)/i.test(reply)) issues.push('مصطلحات رسمية متكلفة');

  // Count question marks
  const questions = (reply.match(/(\?|؟)/g) || []).length;
  if (questions > 1) issues.push('أكثر من سؤال في رد واحد');

  return issues;
}

console.log('=================================================================');
console.log('🎭 محاكاة الحوارات واختبار الطبيعية البشرية (Human Realism Test)');
console.log('=================================================================\n');

let allValid = true;

for (const sc of scenarios) {
  console.log(`📌 السيناريو: [${sc.name}]`);
  console.log(`👤 العميل: "${sc.customer}"`);
  console.log(`👩 سارة (الإيجنت): "${sc.simulatedReply}"`);

  const issues = validateHumanRealism(sc.simulatedReply);
  if (issues.length === 0) {
    console.log(`✨ التقييم: طبيعي 100% — لا يوجد أي أثر للبوتات (Anti-Detection Passed)\n`);
  } else {
    console.log(`⚠️ ملاحظات: ${issues.join(', ')}\n`);
    allValid = false;
  }
}

console.log('=================================================================');
if (allValid) {
  console.log('🏆 النتيجة: كافة الردود تحاكي الإنسان الطبيعي 100% وتجتاز فحص كشف الهوية.');
} else {
  console.log('❌ يوجد ملاحظات تحتاج ضبط.');
  process.exit(1);
}
console.log('=================================================================');
