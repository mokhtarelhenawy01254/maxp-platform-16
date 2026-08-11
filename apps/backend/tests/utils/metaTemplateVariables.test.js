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

  test('يرجّع نص فاضي للمتغير الناقص', () => {
    const variablesOrder = [{ position: 1, name: 'customerName' }, { position: 2, name: 'missing' }];
    const values = { customerName: 'منى' };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result[1]).toEqual({ type: 'text', text: '' });
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
    expect(result).toEqual([{ type: 'text', text: '' }, { type: 'text', text: '' }]);
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
});
