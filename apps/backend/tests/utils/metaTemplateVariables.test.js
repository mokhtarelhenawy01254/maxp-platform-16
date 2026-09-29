/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §5.2 — variable binding) — regression tests:
 * mapVariablesByOrder/buildMetaBodyParams must bind Meta template variables by the
 * order they appear in the local template (not a hardcoded META_VARIABLE_ORDER),
 * otherwise customers receive messages with swapped variables (order number as name).
 */
const {
  mapVariablesByOrder,
  extractLocalVariableOrder,
  buildMetaBodyParams,
  countMetaPlaceholders,
  pickOrderForExpectedCount,
  normalizeVariableNames,
} = require('../../utils/metaTemplateVariables');

describe('mapVariablesByOrder', () => {
  test('يربط متغيرات بنفس ترتيب ظهورها في القالب المحلي', () => {
    const localContent = 'مرحبا {{customerName}}، طلبك {{orderNumber}} المجموع {{total}}';
    const metaBodyText = 'مرحبا {{1}}، طلبك {{2}} المجموع {{3}}';
    const result = mapVariablesByOrder(localContent, metaBodyText);
    expect(result).toEqual([
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'total' },
    ]);
  });

  test('يتجاهل المتغيرات المكررة في القالب المحلي', () => {
    const localContent = '{{customerName}} طلب {{orderNumber}} و{{customerName}} تاني';
    const metaBodyText = '{{1}} طلب {{2}} و{{1}} تاني';
    const result = mapVariablesByOrder(localContent, metaBodyText);
    expect(result).toEqual([
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
    ]);
  });

  test('يرجع مصفوفة فارغة لو مفيش متغيرات في القالب المحلي', () => {
    const result = mapVariablesByOrder('نص ثابت بدون متغيرات', '{{1}}');
    expect(result).toEqual([]);
  });

  test('يرجع مصفوفة فارغة لو مفيش نص محلي', () => {
    expect(mapVariablesByOrder(null, '{{1}}')).toEqual([]);
    expect(mapVariablesByOrder('', '{{1}}')).toEqual([]);
  });

  test('يقتطع لو القالب المحلي فيه متغيرات أكتر من ميتا', () => {
    const localContent = '{{a}} {{b}} {{c}} {{d}}';
    const metaBodyText = '{{1}} {{2}}';
    const result = mapVariablesByOrder(localContent, metaBodyText);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('a');
    expect(result[1].name).toBe('b');
  });
});

describe('extractLocalVariableOrder', () => {
  test('يستخرج المتغيرات بالترتيب مع إزالة التكرار', () => {
    expect(extractLocalVariableOrder('{{x}} و{{y}} و{{x}}')).toEqual(['x', 'y']);
  });

  test('يرجع مصفوفة فارغة لو مفيش متغيرات', () => {
    expect(extractLocalVariableOrder('نص ثابت')).toEqual([]);
    expect(extractLocalVariableOrder(null)).toEqual([]);
  });
});

describe('buildMetaBodyParams', () => {
  test('يبني params بالترتيب الصحيح من variables JSON', () => {
    const variablesOrder = [{ position: 1, name: 'customerName' }, { position: 2, name: 'orderNumber' }];
    const values = { customerName: 'منى', orderNumber: 'ORD-123' };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result).toEqual([
      { type: 'text', text: 'منى' },
      { type: 'text', text: 'ORD-123' },
    ]);
  });

  test('يستخدم fallback من النص لو JSON فاضي', () => {
    const content = 'مرحبا {{customerName}} رقم {{orderNumber}}';
    const values = { customerName: 'منى', orderNumber: 'ORD-123' };
    const result = buildMetaBodyParams(null, content, values);
    expect(result).toEqual([
      { type: 'text', text: 'منى' },
      { type: 'text', text: 'ORD-123' },
    ]);
  });

  test('يرجّع نص بديل للمتغير الناقص (مش سلسلة فاضية)', () => {
    // القيم الناقصة بتاخد fallback بدل '' — '' كانت بتترفض من Meta بـ 131008.
    const variablesOrder = [{ position: 1, name: 'customerName' }, { position: 2, name: 'missing' }];
    const values = { customerName: 'منى' };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result[1]).toEqual({ type: 'text', text: '—' });
  });

  test('🚨 131008: عدد params دايمًا يساوي متغيرات القالب حتى لو القيم فاضية (لا حذف للـ params)', () => {
    // أوردر من غير منتجات → orderItems فاضي — بس لازم نبعث param لكل متغير في القالب
    // وإلا Meta بترفض بـ 131008 "Required parameter is missing".
    const variablesOrder = [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' },
      { position: 4, name: 'total' },
    ];
    const values = { customerName: 'عميلنا العزيز', orderNumber: 'ORD-9', orderItems: 'لا يوجد', total: '0' };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result).toHaveLength(4);
    expect(result[2]).toEqual({ type: 'text', text: 'لا يوجد' });
    expect(result[3]).toEqual({ type: 'text', text: '0' });
  });

  test('🚨 131008: أوردر بدون أي variables قيم → لكل متغير param (وليس حذفه)', () => {
    const variablesOrder = [{ position: 1, name: 'a' }, { position: 2, name: 'b' }];
    const result = buildMetaBodyParams(variablesOrder, null, {});
    expect(result).toHaveLength(2);
    expect(result).toEqual([{ type: 'text', text: '—' }, { type: 'text', text: '—' }]);
  });

  test('يرجّع مصفوفة فارغة لو مفيش ترتيب ولا نص', () => {
    expect(buildMetaBodyParams(null, null, {})).toEqual([]);
  });

  test('يزيل الأسطر الجديدة من قيم المتغيرات (Meta ترفض newline في body params)', () => {
    const variablesOrder = [{ position: 1, name: 'customerName' }, { position: 2, name: 'orderItems' }];
    const values = {
      customerName: 'منى',
      orderItems: '\n📋 تفاصيل الطلب:\n1. swan edge | اللون: أبيض كامل | المقاس: 37 | الكمية: 1\n',
    };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result[1]).toEqual({ type: 'text', text: '📋 تفاصيل الطلب: 1. swan edge | اللون: أبيض كامل | المقاس: 37 | الكمية: 1' });
    // لا يوجد أي \n في القيم
    result.forEach(p => expect(p.text).not.toContain('\n'));
  });

  test('يضغط المسافات المتكررة بعد إزالة الأسطر الجديدة', () => {
    const variablesOrder = [{ position: 1, name: 'body' }];
    const result = buildMetaBodyParams(variablesOrder, null, { body: 'سطر  اول\n\n  سطر تاني  ' });
    expect(result[0].text).toBe('سطر اول سطر تاني');
  });

  test('🚨 131008: يقبل variables كنصوص عادية ["a","b"] ويحولها لـ{position,name}', () => {
    // صفوف قوالب في الداتابيز مخزنة الصيغة النصية — كانت ترسل باراميترات فاضية
    const variablesOrder = ['orderNumber', 'total'];
    const values = { orderNumber: 'ORD-77', total: '540' };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result).toEqual([
      { type: 'text', text: 'ORD-77' },
      { type: 'text', text: '540' },
    ]);
  });
});

/**
 * 🚨 PRODUCTION-FIX (2026-09-29 — Meta #132000 template_param_count_mismatch):
 * Swan's approved ORDER_CREATED template expects 5 body params while the stored
 * row declared 4 (orderNumber dropped), so EVERY order notification was rejected
 * by Meta and the customer got nothing. These tests lock the reconciliation:
 * the parameter order must come from a source whose variable count matches the
 * approved template exactly, and a mismatch must never be "fixed" by appending
 * the missing variable at the end (that would shift every placeholder).
 */
describe('countMetaPlaceholders', () => {
  test('يرجع أعلى رقم placeholder في نص القالب المعتمد', () => {
    expect(countMetaPlaceholders('أهلًا {{1}} طلبك {{2}} إجمالي {{3}}')).toBe(3);
  });

  test('يرجع 5 لو آخر placeholder هو {{5}} حتى لو {{4}} اتكرر', () => {
    expect(countMetaPlaceholders('{{1}} {{2}} {{3}} {{4}} {{4}} {{5}}')).toBe(5);
  });

  test('يرجع 0 لو مفيش placeholders أو مفيش نص', () => {
    expect(countMetaPlaceholders('نص ثابت بدون متغيرات')).toBe(0);
    expect(countMetaPlaceholders(null)).toBe(0);
    expect(countMetaPlaceholders('')).toBe(0);
  });
});

describe('normalizeVariableNames', () => {
  test('يقبل الصيغتين (نصوص + {position,name}) ويزيل التكرار', () => {
    expect(normalizeVariableNames(['a', 'b', 'a'])).toEqual(['a', 'b']);
    expect(normalizeVariableNames([{ position: 1, name: 'x' }, { position: 2, name: 'y' }]))
      .toEqual(['x', 'y']);
  });

  test('يرجع مصفوفة فارغة لأي مدخل غير صالح', () => {
    expect(normalizeVariableNames(null)).toEqual([]);
    expect(normalizeVariableNames(undefined)).toEqual([]);
    expect(normalizeVariableNames('customerName')).toEqual([]);
  });
});

describe('pickOrderForExpectedCount', () => {
  const swanStoredVariables = [
    { position: 1, name: 'customerName' },
    { position: 2, name: 'orderItems' },
    { position: 3, name: 'total' },
    { position: 4, name: 'currency' },
  ];
  const localContent = 'أهلًا {{customerName}} طلبك {{orderItems}} الإجمالي {{total}} {{currency}}';
  const blueprint = ['customerName', 'orderNumber', 'orderItems', 'total', 'currency'];

  test('🚨 132000: يتخطى ترتيب الـ DB الناقص وياخد البلوبرنت اللي عدده مطابق', () => {
    const pick = pickOrderForExpectedCount(5, [
      { label: 'db_variables', names: swanStoredVariables },
      { label: 'local_content', names: extractLocalVariableOrder(localContent) },
      { label: 'meta_blueprint', names: blueprint },
    ]);
    expect(pick).not.toBeNull();
    expect(pick.source).toBe('meta_blueprint');
    expect(pick.order.map((v) => v.name)).toEqual([
      'customerName', 'orderNumber', 'orderItems', 'total', 'currency',
    ]);
  });

  test('يفضّل ترتيب الـ DB لما يكون عدده مطابق للقالب المعتمد', () => {
    const pick = pickOrderForExpectedCount(5, [
      { label: 'db_variables', names: blueprint },
      { label: 'meta_blueprint', names: ['x', 'y', 'z', 'w', 'q'] },
    ]);
    expect(pick.source).toBe('db_variables');
    expect(pick.order[1]).toEqual({ position: 2, name: 'orderNumber' });
  });

  test('يرجّع null لو مفيش أي مصدر عدده مطابق (بدل ما نلزق المتغير في الآخر)', () => {
    const pick = pickOrderForExpectedCount(5, [
      { label: 'db_variables', names: swanStoredVariables },
      { label: 'local_content', names: extractLocalVariableOrder(localContent) },
    ]);
    expect(pick).toBeNull();
  });

  test('يرجّع null لو العدد المتوقع مجهول (0) — نرجع للسلوك القديم', () => {
    expect(pickOrderForExpectedCount(0, [{ label: 'db_variables', names: blueprint }])).toBeNull();
    expect(pickOrderForExpectedCount(null, [{ label: 'db_variables', names: blueprint }])).toBeNull();
  });
});
