/**
 * 🆕 PRODUCTION-FIX (broadcast template params) — regression tests:
 * The broadcast send must build exactly as many body params as the template's
 * {{N}} placeholders. The legacy code sent only firstName/lastName (max 2), which
 * Meta rejected for every template with >2 variables: (#132000) "Number of
 * parameters does not match the expected number of params".
 */
const {
  countTemplateParams,
  buildBroadcastBodyParams,
} = require('../../utils/broadcastTemplateParams');

describe('countTemplateParams', () => {
  test('يحسب عدد متغيرات قالب من 4 معاملات', () => {
    const body = 'أهلاً {{1}} طلبك {{2}} والطلب {{3}} والإجمالي {{4}}';
    expect(countTemplateParams(body)).toBe(4);
  });

  test('يرجع 0 لقالب بلا متغيرات', () => {
    expect(countTemplateParams('نص ثابت بدون متغيرات')).toBe(0);
  });

  test('يرجع 0 لو النص فارغ أو null', () => {
    expect(countTemplateParams('')).toBe(0);
    expect(countTemplateParams(null)).toBe(0);
    expect(countTemplateParams(undefined)).toBe(0);
  });

  test('يحسب أقصى فهرس حتى لو المتغيرات بترتيب غير متسلسل', () => {
    expect(countTemplateParams('المبلغ {{3}}{{3}} والاسم {{1}}')).toBe(3);
  });
});

describe('buildBroadcastBodyParams', () => {
  const customer = {
    firstName: 'محمد',
    lastName: 'أحمد',
    phone: '201123087745',
  };

  test('يبني عدد معاملات مساوٍ لمتغيرات القالب (4) مع تعبئة بيانات العميل', () => {
    const body = 'أهلاً {{1}} طلبك {{2}} والطلب {{3}} والإجمالي {{4}}';
    const params = buildBroadcastBodyParams(body, customer);
    expect(params).toHaveLength(4);
    expect(params.map(p => p.text)).toEqual(['محمد', 'أحمد', '201123087745', 'محمد أحمد']);
  });

  test('يرجع مصفوفة فارغة لقالب بلا متغيرات', () => {
    expect(buildBroadcastBodyParams('نص ثابت', customer)).toEqual([]);
  });

  test('يعبئ المعاملات الناقصة بقيمة افتراضية عند غياب بيانات العميل', () => {
    const body = '{{1}} {{2}} {{3}}';
    const params = buildBroadcastBodyParams(body, {});
    expect(params).toHaveLength(3);
    expect(params.map(p => p.text)).toEqual(['عزيزي العميل', 'قيمة 2', 'قيمة 3']);
  });

  test('لا يرسل أسطر جديدة داخل قيم المعاملات (تجنب #132018)', () => {
    const body = '{{1}}';
    const params = buildBroadcastBodyParams(body, { firstName: 'محمد\nأحمد' });
    expect(params[0].text).toBe('محمد أحمد');
  });
});
