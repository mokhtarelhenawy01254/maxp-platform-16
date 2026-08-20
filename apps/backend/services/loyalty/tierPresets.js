/**
 * 🏆 Loyalty Tier Presets (قوالب مستويات جاهزة)
 * حزم جاهزة لمستويات الولاء تختارها الشركة وتُعدّل بعدها براحتها:
 *  - classic5: برونز/فضة/ذهب/بلاتين/دايموند
 *  - stars10:  10 مستويات بأسلوب الألعاب (نجوم)
 *  - vip3:     مستويات VIP فاخرة
 *
 * كل مستوى: الاسم (عربي/إنجليزي) + اللون + الأيقونة + الحدود (نقاط) + المزايا.
 * تُنشأ عبر createTier الموجود (بتحقّق من تداخل الحدود تلقائياً).
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

const TIER_PRESETS = {
  classic5: {
    key: 'classic5',
    name: 'كلاسيك (5 مستويات)',
    nameAr: 'كلاسيك — 5 مستويات',
    description: 'برونز، فضة، ذهب، بلاتين، دايموند — الأسماء الأشهر عالمياً',
    calculationType: 'POINTS',
    tiers: [
      { name: 'Bronze', nameAr: 'برونز', color: '#CD7F32', icon: 'medal', minPoints: 0, maxPoints: 999, benefits: ['اشتراك في برنامج الولاء', 'كسب نقاط على كل طلب'] },
      { name: 'Silver', nameAr: 'فضة', color: '#C0C0C0', icon: 'medal', minPoints: 1000, maxPoints: 4999, benefits: ['كسب نقاط أسرع', 'خصم 5%'] },
      { name: 'Gold', nameAr: 'ذهب', color: '#D4AF37', icon: 'crown', minPoints: 5000, maxPoints: 14999, benefits: ['شحن مجاني', 'خصم 10%', 'أولوية في الخدمة'] },
      { name: 'Platinum', nameAr: 'بلاتين', color: '#E5E4E2', icon: 'trophy', minPoints: 15000, maxPoints: 39999, benefits: ['شحن مجاني', 'خصم 15%', 'هدايا في المناسبات', 'أولوية قصوى'] },
      { name: 'Diamond', nameAr: 'دايموند', color: '#B9F2FF', icon: 'gem', minPoints: 40000, benefits: ['شحن مجاني', 'خصم 20%', 'مدير حساب خاص', 'عروض حصرية', 'هدايا فاخرة'] }
    ]
  },
  stars10: {
    key: 'stars10',
    name: 'نجوم (10 مستويات)',
    nameAr: 'نجوم — 10 مستويات',
    description: '10 مستويات متدرجة بأسلوب الألعاب — تحفيز للوصول للمستوى الأعلى',
    calculationType: 'POINTS',
    tiers: [
      { name: 'Star 1', nameAr: 'نجمة 1', color: '#64748B', icon: 'award', minPoints: 0, maxPoints: 499, benefits: ['بداية الرحلة'] },
      { name: 'Star 2', nameAr: 'نجمة 2', color: '#718096', icon: 'award', minPoints: 500, maxPoints: 999, benefits: ['كسب نقاط مضاعف'] },
      { name: 'Star 3', nameAr: 'نجمة 3', color: '#5B6B8C', icon: 'award', minPoints: 1000, maxPoints: 1999, benefits: ['خصم 3%'] },
      { name: 'Star 4', nameAr: 'نجمة 4', color: '#4A5C8A', icon: 'award', minPoints: 2000, maxPoints: 3499, benefits: ['خصم 5%'] },
      { name: 'Star 5', nameAr: 'نجمة 5', color: '#3D5BAE', icon: 'award', minPoints: 3500, maxPoints: 4999, benefits: ['خصم 7%'] },
      { name: 'Star 6', nameAr: 'نجمة 6', color: '#3550C4', icon: 'award', minPoints: 5000, maxPoints: 7499, benefits: ['شحن مجاني', 'خصم 10%'] },
      { name: 'Star 7', nameAr: 'نجمة 7', color: '#2E46D6', icon: 'trophy', minPoints: 7500, maxPoints: 9999, benefits: ['شحن مجاني', 'خصم 12%'] },
      { name: 'Star 8', nameAr: 'نجمة 8', color: '#2840E0', icon: 'trophy', minPoints: 10000, maxPoints: 14999, benefits: ['شحن مجاني', 'خصم 15%', 'أولوية'] },
      { name: 'Star 9', nameAr: 'نجمة 9', color: '#273DEB', icon: 'gem', minPoints: 15000, maxPoints: 24999, benefits: ['شحن مجاني', 'خصم 18%', 'أولوية'] },
      { name: 'Star 10', nameAr: 'نجمة 10', color: '#1F35F2', icon: 'gem', minPoints: 25000, benefits: ['شحن مجاني', 'خصم 25%', 'أولوية قصوى', 'مدير حساب خاص'] }
    ]
  },
  vip3: {
    key: 'vip3',
    name: 'VIP (3 مستويات)',
    nameAr: 'VIP — 3 مستويات',
    description: 'VIP، VIP Gold، VIP Platinum — مميزات فاخرة',
    calculationType: 'POINTS',
    tiers: [
      { name: 'VIP', nameAr: 'VIP', color: '#B8860B', icon: 'crown', minPoints: 0, maxPoints: 4999, benefits: ['خصم 5%', 'كسب نقاط مضاعف'] },
      { name: 'VIP Gold', nameAr: 'VIP ذهبي', color: '#D4AF37', icon: 'crown', minPoints: 5000, maxPoints: 19999, benefits: ['شحن مجاني', 'خصم 12%', 'أولوية'] },
      { name: 'VIP Platinum', nameAr: 'VIP بلاتيني', color: '#E5E4E2', icon: 'gem', minPoints: 20000, benefits: ['شحن مجاني', 'خصم 20%', 'أولوية قصوى', 'مدير حساب خاص', 'عروض حصرية'] }
    ]
  }
};

/**
 * تطبيق قالب جاهز على برنامج ولاء — ينشئ كل المستويات دفعة واحدة.
 * @returns {Promise<{created, preset, programName}>}
 */
async function applyTierPreset(companyId, programId, presetKey) {
  const prisma = getSharedPrismaClient();
  const preset = TIER_PRESETS[presetKey];
  if (!preset) {
    const err = new Error('قالب مستويات غير معروف');
    err.statusCode = 400;
    throw err;
  }

  const program = await prisma.customerLoyaltyProgram.findFirst({
    where: { id: programId, companyId },
    select: { id: true, name: true, nameAr: true }
  });
  if (!program) {
    const err = new Error('برنامج الولاء غير موجود');
    err.statusCode = 404;
    throw err;
  }

  const customerLoyaltyService = require('../hr/customerLoyaltyService');

  let created = 0;
  const errors = [];
  for (const tier of preset.tiers) {
    try {
      await customerLoyaltyService.createTier(companyId, {
        programId,
        name: tier.name,
        nameAr: tier.nameAr,
        calculationType: preset.calculationType,
        minPoints: tier.minPoints,
        maxPoints: tier.maxPoints,
        color: tier.color,
        icon: tier.icon,
        benefits: tier.benefits || [],
        priority: created + 1
      });
      created++;
    } catch (e) {
      errors.push(`${tier.nameAr || tier.name}: ${e.message}`);
    }
  }

  return {
    created,
    errors,
    preset: { key: preset.key, name: preset.nameAr, description: preset.description },
    programName: program.nameAr || program.name
  };
}

module.exports = { TIER_PRESETS, applyTierPreset };
