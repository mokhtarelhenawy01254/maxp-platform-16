/**
 * ≡ƒåò PRODUCTION-FIX (broadcast template params) ΓÇö regression tests:
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
  test('┘è╪¡╪│╪¿ ╪╣╪»╪» ┘à╪¬╪║┘è╪▒╪º╪¬ ┘é╪º┘ä╪¿ ┘à┘å 4 ┘à╪╣╪º┘à┘ä╪º╪¬', () => {
    const body = '╪ú┘ç┘ä╪º┘ï {{1}} ╪╖┘ä╪¿┘â {{2}} ┘ê╪º┘ä╪╖┘ä╪¿ {{3}} ┘ê╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è {{4}}';
    expect(countTemplateParams(body)).toBe(4);
  });

  test('┘è╪▒╪¼╪╣ 0 ┘ä┘é╪º┘ä╪¿ ╪¿┘ä╪º ┘à╪¬╪║┘è╪▒╪º╪¬', () => {
    expect(countTemplateParams('┘å╪╡ ╪½╪º╪¿╪¬ ╪¿╪»┘ê┘å ┘à╪¬╪║┘è╪▒╪º╪¬')).toBe(0);
  });

  test('┘è╪▒╪¼╪╣ 0 ┘ä┘ê ╪º┘ä┘å╪╡ ┘ü╪º╪▒╪║ ╪ú┘ê null', () => {
    expect(countTemplateParams('')).toBe(0);
    expect(countTemplateParams(null)).toBe(0);
    expect(countTemplateParams(undefined)).toBe(0);
  });

  test('┘è╪¡╪│╪¿ ╪ú┘é╪╡┘ë ┘ü┘ç╪▒╪│ ╪¡╪¬┘ë ┘ä┘ê ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿╪¬╪▒╪¬┘è╪¿ ╪║┘è╪▒ ┘à╪¬╪│┘ä╪│┘ä', () => {
    expect(countTemplateParams('╪º┘ä┘à╪¿┘ä╪║ {{3}}{{3}} ┘ê╪º┘ä╪º╪│┘à {{1}}')).toBe(3);
  });
});

describe('buildBroadcastBodyParams', () => {
  const customer = {
    firstName: '┘à╪¡┘à╪»',
    lastName: '╪ú╪¡┘à╪»',
    phone: '201123087745',
  };

  test('┘è╪¿┘å┘è ╪╣╪»╪» ┘à╪╣╪º┘à┘ä╪º╪¬ ┘à╪│╪º┘ê┘ì ┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘é╪º┘ä╪¿ (4) ┘à╪╣ ╪¬╪╣╪¿╪ª╪⌐ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╣┘à┘è┘ä', () => {
    const body = '╪ú┘ç┘ä╪º┘ï {{1}} ╪╖┘ä╪¿┘â {{2}} ┘ê╪º┘ä╪╖┘ä╪¿ {{3}} ┘ê╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è {{4}}';
    const params = buildBroadcastBodyParams(body, customer);
    expect(params).toHaveLength(4);
    expect(params.map(p => p.text)).toEqual(['┘à╪¡┘à╪»', '╪ú╪¡┘à╪»', '201123087745', '┘à╪¡┘à╪» ╪ú╪¡┘à╪»']);
  });

  test('┘è╪▒╪¼╪╣ ┘à╪╡┘ü┘ê┘ü╪⌐ ┘ü╪º╪▒╪║╪⌐ ┘ä┘é╪º┘ä╪¿ ╪¿┘ä╪º ┘à╪¬╪║┘è╪▒╪º╪¬', () => {
    expect(buildBroadcastBodyParams('┘å╪╡ ╪½╪º╪¿╪¬', customer)).toEqual([]);
  });

  test('┘è╪╣╪¿╪ª ╪º┘ä┘à╪╣╪º┘à┘ä╪º╪¬ ╪º┘ä┘å╪º┘é╪╡╪⌐ ╪¿┘é┘è┘à╪⌐ ╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ╪╣┘å╪» ╪║┘è╪º╪¿ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╣┘à┘è┘ä', () => {
    const body = '{{1}} {{2}} {{3}}';
    const params = buildBroadcastBodyParams(body, {});
    expect(params).toHaveLength(3);
    expect(params.map(p => p.text)).toEqual(['╪╣╪▓┘è╪▓┘è ╪º┘ä╪╣┘à┘è┘ä', '┘é┘è┘à╪⌐ 2', '┘é┘è┘à╪⌐ 3']);
  });

  test('┘ä╪º ┘è╪▒╪│┘ä ╪ú╪│╪╖╪▒ ╪¼╪»┘è╪»╪⌐ ╪»╪º╪«┘ä ┘é┘è┘à ╪º┘ä┘à╪╣╪º┘à┘ä╪º╪¬ (╪¬╪¼┘å╪¿ #132018)', () => {
    const body = '{{1}}';
    const params = buildBroadcastBodyParams(body, { firstName: '┘à╪¡┘à╪»\n╪ú╪¡┘à╪»' });
    expect(params[0].text).toBe('┘à╪¡┘à╪» ╪ú╪¡┘à╪»');
  });
});

describe('buildBroadcastBodyParams ΓÇö semantic binding via localVariables (≡ƒö┤ regression: deliveredmsj72rwc)', () => {
  const deliveredBody = '┘à╪│╪º╪í ╪º┘ä╪«┘è╪▒ \n{{1}}\n╪┤╪▒┘â╪⌐ ╪º┘ä╪┤╪¡┘å ╪¿┘ä╪║╪¬ ╪º┘å ╪¡╪╢╪▒╪¬┘â ╪º╪│╪¬┘ä┘à╪¬┘è ╪º┘ä╪º┘ê╪▒╪»╪▒ ╪º┘ä┘è ╪▒┘é┘à╪⌐ \n{{2}}\n┘à╪¿╪▒┘ê┘â';
  const localVariables = [
    { position: 1, name: 'customerName' },
    { position: 2, name: 'orderNumber' },
  ];
  const customer = { firstName: 'Amany', lastName: 'Fahmy', phone: '201000000000' };

  test('┘è╪▒╪│┘ä ╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿ ┘ü┘è ╪«╪º┘å╪⌐ ╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿ ╪¿╪»┘ä ╪º┘ä┘ä┘é╪¿', () => {
    const order = { orderNumber: 'ORD-118418-674', total: '795', currency: 'EGP' };
    const params = buildBroadcastBodyParams(deliveredBody, customer, localVariables, order);
    expect(params.map(p => p.text)).toEqual(['Amany Fahmy', 'ORD-118418-674']);
  });

  test('┘ä┘ê ┘à┘ü┘è╪┤ ╪╖┘ä╪¿╪î ┘à╪¬╪│┘è╪¿╪┤ ╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä ┘ü┘è ╪«╪º┘å╪⌐ ╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿', () => {
    const params = buildBroadcastBodyParams(deliveredBody, customer, localVariables, null);
    expect(params[0].text).toBe('Amany Fahmy');
    expect(params[1].text).not.toBe('Fahmy');
    expect(params[1].text).not.toBe('Amany');
  });

  test('┘è┘Å╪¡┘ä ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä╪╣┘à┘è┘ä ╪¿╪º┘ä╪º╪│┘à ╪º┘ä╪╡╪¡┘è╪¡', () => {
    expect(resolveBroadcastVariableValue('customerName', customer)).toBe('Amany Fahmy');
    expect(resolveBroadcastVariableValue('customerPhone', customer)).toBe('201000000000');
    expect(resolveBroadcastVariableValue('customerFirstName', customer)).toBe('Amany');
    expect(resolveBroadcastVariableValue('customerLastName', customer)).toBe('Fahmy');
  });

  test('┘è┘Å╪¡┘ä ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä╪╖┘ä╪¿ ┘à┘å ┘â╪º╪ª┘å ╪º┘ä╪╖┘ä╪¿', () => {
    const order = { orderNumber: 'ORD-1', total: '500', subtotal: '400', shipping: '100', currency: 'EGP', status: 'DELIVERED' };
    expect(resolveBroadcastVariableValue('orderNumber', customer, order)).toBe('ORD-1');
    expect(resolveBroadcastVariableValue('total', customer, order)).toBe('500');
    expect(resolveBroadcastVariableValue('currency', customer, order)).toBe('EGP');
    expect(resolveBroadcastVariableValue('status', customer, order)).toBe('DELIVERED');
    expect(resolveBroadcastVariableValue('orderNumber', customer, null)).toBe('');
  });

  test('hasOrderVariables ┘è┘â╪¬╪┤┘ü ┘é╪º┘ä╪¿╪º┘ï ┘ü┘è┘ç ┘à╪¬╪║┘è╪▒╪º╪¬ ╪╖┘ä╪¿', () => {
    expect(hasOrderVariables(localVariables)).toBe(true);
    expect(hasOrderVariables([{ position: 1, name: 'customerName' }])).toBe(false);
    expect(hasOrderVariables(null)).toBe(false);
  });

  test('╪│┘ä┘ê┘â ╪º┘ä╪¬┘ê╪º┘ü┘é ╪º┘ä┘é╪»┘è┘à: ╪¿╪»┘ê┘å localVariables ┘è╪¿┘å┘è firstName/lastName/phone', () => {
    const body = '{{1}} {{2}}';
    const params = buildBroadcastBodyParams(body, customer);
    expect(params.map(p => p.text)).toEqual(['Amany', 'Fahmy']);
  });
});

describe('getTemplateHeaderFormat', () => {
  test('┘è╪│╪¬╪«╪▒╪¼ format IMAGE ┘à┘å ╪¬╪╣╪▒┘è┘ü ┘é╪º┘ä╪¿ ┘ç┘è╪»╪▒┘ç ┘ê╪│╪º╪ª╪╖', () => {
    const templateDef = {
      components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: '╪ú┘ç┘ä╪º┘ï {{1}}' },
      ],
    };
    const result = getTemplateHeaderFormat(templateDef);
    expect(result).toEqual({ format: 'IMAGE', hasMedia: true });
  });

  test('┘è╪▒╪¼╪╣ null ┘ä┘é╪º┘ä╪¿ ╪¿╪»┘ê┘å HEADER', () => {
    expect(getTemplateHeaderFormat({ components: [{ type: 'BODY', text: '┘å╪╡' }] })).toBeNull();
  });

  test('┘è╪▒╪¼╪╣ hasMedia=false ┘ä┘ç┘è╪»╪▒ TEXT', () => {
    const result = getTemplateHeaderFormat({ components: [{ type: 'HEADER', format: 'TEXT', text: '╪│┘ä╪º┘à' }] });
    expect(result).toEqual({ format: 'TEXT', hasMedia: false });
  });

  test('┘è╪¬╪¡┘à┘ä ╪║┘è╪º╪¿ components ╪ú┘ê ╪º┘ä┘é╪º┘ä╪¿ null', () => {
    expect(getTemplateHeaderFormat(null)).toBeNull();
    expect(getTemplateHeaderFormat({})).toBeNull();
  });
});

describe('buildBroadcastHeaderParams', () => {
  test('┘è╪¿┘å┘è header component ╪¿┘à╪╣╪º┘à┘ä ╪╡┘ê╪▒╪⌐ ┘à┘å media id', () => {
    const comp = buildBroadcastHeaderParams('123456', 'image');
    expect(comp).toEqual({
      type: 'header',
      parameters: [{ type: 'image', image: { id: '123456' } }],
    });
  });

  test('┘è╪¿┘å┘è header component ╪¿┘à╪╣╪º┘à┘ä ╪╡┘ê╪▒╪⌐ ┘à┘å ╪▒╪º╪¿╪╖ HTTPS', () => {
    const comp = buildBroadcastHeaderParams('https://cdn.example.com/img.jpg', 'image');
    expect(comp).toEqual({
      type: 'header',
      parameters: [{ type: 'image', image: { link: 'https://cdn.example.com/img.jpg' } }],
    });
  });

  test('┘è╪»╪╣┘à ╪º┘ä┘ü┘è╪»┘è┘ê ┘ê╪º┘ä┘à╪│╪¬┘å╪» ┘ê┘è╪¡┘ê┘æ┘ä format ┘ä┘ä┘Ç parameter type', () => {
    expect(buildBroadcastHeaderParams('vid-1', 'VIDEO')).toEqual({
      type: 'header',
      parameters: [{ type: 'video', video: { id: 'vid-1' } }],
    });
    expect(buildBroadcastHeaderParams('doc-1', 'DOCUMENT')).toEqual({
      type: 'header',
      parameters: [{ type: 'document', document: { id: 'doc-1' } }],
    });
  });

  test('┘è╪▒╪¼╪╣ null ┘ä┘ê ╪º┘ä┘ê╪│┘è╪╖ ┘ü╪º╪▒╪║ ╪ú┘ê undefined', () => {
    expect(buildBroadcastHeaderParams(null, 'image')).toBeNull();
    expect(buildBroadcastHeaderParams('', 'image')).toBeNull();
    expect(buildBroadcastHeaderParams(undefined, 'image')).toBeNull();
  });
});
