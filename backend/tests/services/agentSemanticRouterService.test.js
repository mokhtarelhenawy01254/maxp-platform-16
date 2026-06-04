const { matchIntent, getSimilarity, normalizeText } = require('../../services/aiAgent/agentSemanticRouterService');
const { resolveToolPlan } = require('../../services/aiAgent/agentIntentRelevanceService');

describe('agentSemanticRouterService', () => {
  test('normalizes Arabic characters and removes diacritics', () => {
    expect(normalizeText('مُحَمَّد')).toBe('محمد');
    expect(normalizeText('أحمد')).toBe('احمد');
    expect(normalizeText('شيرين')).toBe('شيرين');
    expect(normalizeText('مدرسة')).toBe('مدرسه');
    expect(normalizeText('الْيَوْم')).toBe('اليوم');
  });

  test('calculates correct hybrid similarity score', () => {
    const score1 = getSimilarity('مين جه انهارده', 'مين جه انهارده');
    expect(score1).toBe(1.0);

    const score2 = getSimilarity('مين غايب انهارده', 'مين محضروش انهارده');
    expect(score2).toBeGreaterThan(0.2); // Character bigrams/trigrams matching 'انهارده'

    const score3 = getSimilarity('مبيعات', 'الارباح كام النهارده');
    expect(score3).toBeLessThan(0.5);
  });

  test('matches various Arabic intents on threshold', () => {
    const match1 = matchIntent('مين غايب النهارده من الموظفين');
    expect(match1).not.toBeNull();
    expect(match1.intent).toBe('hr.attendance.today');

    const match2 = matchIntent('عايز اضيف منتج جديد كوتشي احمر');
    expect(match2).not.toBeNull();
    expect(match2.intent).toBe('products.manage');

    const match3 = matchIntent('اعمل مهارة جديدة');
    expect(match3).not.toBeNull();
    expect(match3.intent).toBe('skills.manage');

    const match4 = matchIntent('كسبنا كام النهارده مبيعات');
    expect(match4).not.toBeNull();
    expect(match4.intent).toBe('sales');

    const match5 = matchIntent('كلام عشوائي غير مفهوم');
    expect(match5).toBeNull();
  });

  describe('Comprehensive Scenario Regression Tests (20 Variations)', () => {
    const attendanceVariations = [
      'مين جه انهارده',
      'مين سجل حضور اليوم',
      'كشف الحضور والغياب للنهارده',
      'مين من الموظفين غايب',
      'في حد غايب النهارده؟',
      'الموظفين اللي سجلوا بصمة',
      'الحضور والغياب اليوم',
      'مين غايب ومين حاضر',
      'كشف الموظفين الحاضرين النهارده',
      'مين سجل دخول الشغل اليوم',
      'مين مجاش النهارده من العمال',
      'الغياب انهارده شكله ايه',
      'وريني حضور الموظفين اليوم',
      'حضور الموظفين النهارده',
      'مين جه الشغل انهارده',
      'مين غايبين النهارده',
      'كشف الحضور اليومي',
      'مين بصم النهارده حضور',
      'الموظفين المتأخرين النهارده',
      'مين مجاش الشغل انهارده'
    ];

    const productVariations = [
      'عايز اضيف منتج جديد',
      'سجل سلعه جديده',
      'ضيف كوتشي جديد للمخزن',
      'انشئ منتج جديد في الكتالوج',
      'ضيف منتجات جديدة للمحل',
      'اضافة منتج جديد للمخازن',
      'اعمل منتج جديد بسعر واسم',
      'عايز ارفع منتج جديد للكتالوج',
      'سجل كوتش جديد في السيستم',
      'ضيف صنف جديد للمخازن',
      'انشئ صنف جديد في المحل',
      'ارفع صنف جديد',
      'ضيف بضاعة جديدة للمخزن',
      'عايز اسجل منتج جديد',
      'ضيف تيشيرت جديد',
      'انشئ كارت منتج جديد',
      'ضيف سلعة جديدة للسيستم',
      'اعمل كارت لمنتج جديد',
      'سجل قطعة جديدة في المخزن',
      'ضيف صنف جديد بسعر'
    ];

    attendanceVariations.forEach((query, index) => {
      test(`Attendance Variation #${index + 1}: "${query}"`, () => {
        const match = matchIntent(query);
        expect(match).not.toBeNull();
        expect(match.intent).toBe('hr.attendance.today');
      });
    });

    productVariations.forEach((query, index) => {
      test(`Product Variation #${index + 1}: "${query}"`, () => {
        const match = matchIntent(query);
        expect(match).not.toBeNull();
        expect(match.intent).toBe('products.manage');
      });
    });
  });

  test('integrates cleanly with resolveToolPlan in agentIntentRelevanceService', () => {
    const plan = resolveToolPlan({
      message: 'مين غايب النهارده من الموظفين',
      availableTools: ['hr.attendance_today'],
    });

    expect(plan.source).toBe('tool-policy-gate');
    expect(plan.intent).toBe('hr.attendance.today');
    expect(plan.requiresTool).toBe(true);
    expect(plan.primaryTool).toBe('hr.attendance_today');
    expect(plan.allowedTools).toEqual(['hr.attendance_today']);
  });
});
