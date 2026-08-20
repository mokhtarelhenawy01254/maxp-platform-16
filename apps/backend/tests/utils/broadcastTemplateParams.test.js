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
  hasOrderVariables,
  resolveBroadcastVariableValue,
  getTemplateHeaderFormat,
  buildBroadcastHeaderParams,
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

describe('buildBroadcastBodyParams — semantic binding via localVariables (🔴 regression: deliveredmsj72rwc)', () => {
  const deliveredBody = 'مساء الخير \n{{1}}\nشركة الشحن بلغت ان حضرتك استلمتي الاوردر الي رقمة \n{{2}}\nمبروك';
  const localVariables = [
    { position: 1, name: 'customerName' },
    { position: 2, name: 'orderNumber' },
  ];
  const customer = { firstName: 'Amany', lastName: 'Fahmy', phone: '201000000000' };

  test('يرسل رقم الطلب في خانة رقم الطلب بدل اللقب', () => {
    const order = { orderNumber: 'ORD-118418-674', total: '795', currency: 'EGP' };
    const params = buildBroadcastBodyParams(deliveredBody, customer, localVariables, order);
    expect(params.map(p => p.text)).toEqual(['Amany Fahmy', 'ORD-118418-674']);
  });

  test('لو مفيش طلب، متسيبش اسم العميل في خانة رقم الطلب', () => {
    const params = buildBroadcastBodyParams(deliveredBody, customer, localVariables, null);
    expect(params[0].text).toBe('Amany Fahmy');
    expect(params[1].text).not.toBe('Fahmy');
    expect(params[1].text).not.toBe('Amany');
  });

  test('يُحل متغيرات العميل بالاسم الصحيح', () => {
    expect(resolveBroadcastVariableValue('customerName', customer)).toBe('Amany Fahmy');
    expect(resolveBroadcastVariableValue('customerPhone', customer)).toBe('201000000000');
    expect(resolveBroadcastVariableValue('customerFirstName', customer)).toBe('Amany');
    expect(resolveBroadcastVariableValue('customerLastName', customer)).toBe('Fahmy');
  });

  test('يُحل متغيرات الطلب من كائن الطلب', () => {
    const order = { orderNumber: 'ORD-1', total: '500', subtotal: '400', shipping: '100', currency: 'EGP', status: 'DELIVERED' };
    expect(resolveBroadcastVariableValue('orderNumber', customer, order)).toBe('ORD-1');
    expect(resolveBroadcastVariableValue('total', customer, order)).toBe('500');
    expect(resolveBroadcastVariableValue('currency', customer, order)).toBe('EGP');
    expect(resolveBroadcastVariableValue('status', customer, order)).toBe('DELIVERED');
    expect(resolveBroadcastVariableValue('orderNumber', customer, null)).toBe('');
  });

  test('hasOrderVariables يكتشف قالباً فيه متغيرات طلب', () => {
    expect(hasOrderVariables(localVariables)).toBe(true);
    expect(hasOrderVariables([{ position: 1, name: 'customerName' }])).toBe(false);
    expect(hasOrderVariables(null)).toBe(false);
  });

  test('سلوك التوافق القديم: بدون localVariables يبني firstName/lastName/phone', () => {
    const body = '{{1}} {{2}}';
    const params = buildBroadcastBodyParams(body, customer);
    expect(params.map(p => p.text)).toEqual(['Amany', 'Fahmy']);
  });
});

describe('getTemplateHeaderFormat', () => {
  test('يستخرج format IMAGE من تعريف قالب هيدره وسائط', () => {
    const templateDef = {
      components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: 'أهلاً {{1}}' },
      ],
    };
    const result = getTemplateHeaderFormat(templateDef);
    expect(result).toEqual({ format: 'IMAGE', hasMedia: true });
  });

  test('يرجع null لقالب بدون HEADER', () => {
    expect(getTemplateHeaderFormat({ components: [{ type: 'BODY', text: 'نص' }] })).toBeNull();
  });

  test('يرجع hasMedia=false لهيدر TEXT', () => {
    const result = getTemplateHeaderFormat({ components: [{ type: 'HEADER', format: 'TEXT', text: 'سلام' }] });
    expect(result).toEqual({ format: 'TEXT', hasMedia: false });
  });

  test('يتحمل غياب components أو القالب null', () => {
    expect(getTemplateHeaderFormat(null)).toBeNull();
    expect(getTemplateHeaderFormat({})).toBeNull();
  });
});

describe('buildBroadcastHeaderParams', () => {
  test('يبني header component بمعامل صورة من media id', () => {
    const comp = buildBroadcastHeaderParams('123456', 'image');
    expect(comp).toEqual({
      type: 'header',
      parameters: [{ type: 'image', image: { id: '123456' } }],
    });
  });

  test('يبني header component بمعامل صورة من رابط HTTPS', () => {
    const comp = buildBroadcastHeaderParams('https://cdn.example.com/img.jpg', 'image');
    expect(comp).toEqual({
      type: 'header',
      parameters: [{ type: 'image', image: { link: 'https://cdn.example.com/img.jpg' } }],
    });
  });

  test('يدعم الفيديو والمستند ويحوّل format للـ parameter type', () => {
    expect(buildBroadcastHeaderParams('vid-1', 'VIDEO')).toEqual({
      type: 'header',
      parameters: [{ type: 'video', video: { id: 'vid-1' } }],
    });
    expect(buildBroadcastHeaderParams('doc-1', 'DOCUMENT')).toEqual({
      type: 'header',
      parameters: [{ type: 'document', document: { id: 'doc-1' } }],
    });
  });

  test('يرجع null لو الوسيط فارغ أو undefined', () => {
    expect(buildBroadcastHeaderParams(null, 'image')).toBeNull();
    expect(buildBroadcastHeaderParams('', 'image')).toBeNull();
    expect(buildBroadcastHeaderParams(undefined, 'image')).toBeNull();
  });
});
