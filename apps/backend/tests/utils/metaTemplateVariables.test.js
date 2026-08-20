/**
 * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º5.2 ΓÇö variable binding) ΓÇö regression tests:
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
  test('┘è╪▒╪¿╪╖ ┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿┘å┘ü╪│ ╪¬╪▒╪¬┘è╪¿ ╪╕┘ç┘ê╪▒┘ç╪º ┘ü┘è ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è', () => {
    const localContent = '┘à╪▒╪¡╪¿╪º {{customerName}}╪î ╪╖┘ä╪¿┘â {{orderNumber}} ╪º┘ä┘à╪¼┘à┘ê╪╣ {{total}}';
    const metaBodyText = '┘à╪▒╪¡╪¿╪º {{1}}╪î ╪╖┘ä╪¿┘â {{2}} ╪º┘ä┘à╪¼┘à┘ê╪╣ {{3}}';
    const result = mapVariablesByOrder(localContent, metaBodyText);
    expect(result).toEqual([
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'total' },
    ]);
  });

  test('┘è╪¬╪¼╪º┘ç┘ä ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à┘â╪▒╪▒╪⌐ ┘ü┘è ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è', () => {
    const localContent = '{{customerName}} ╪╖┘ä╪¿ {{orderNumber}} ┘ê{{customerName}} ╪¬╪º┘å┘è';
    const metaBodyText = '{{1}} ╪╖┘ä╪¿ {{2}} ┘ê{{1}} ╪¬╪º┘å┘è';
    const result = mapVariablesByOrder(localContent, metaBodyText);
    expect(result).toEqual([
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
    ]);
  });

  test('┘è╪▒╪¼╪╣ ┘à╪╡┘ü┘ê┘ü╪⌐ ┘ü╪º╪▒╪║╪⌐ ┘ä┘ê ┘à┘ü┘è╪┤ ┘à╪¬╪║┘è╪▒╪º╪¬ ┘ü┘è ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è', () => {
    const result = mapVariablesByOrder('┘å╪╡ ╪½╪º╪¿╪¬ ╪¿╪»┘ê┘å ┘à╪¬╪║┘è╪▒╪º╪¬', '{{1}}');
    expect(result).toEqual([]);
  });

  test('┘è╪▒╪¼╪╣ ┘à╪╡┘ü┘ê┘ü╪⌐ ┘ü╪º╪▒╪║╪⌐ ┘ä┘ê ┘à┘ü┘è╪┤ ┘å╪╡ ┘à╪¡┘ä┘è', () => {
    expect(mapVariablesByOrder(null, '{{1}}')).toEqual([]);
    expect(mapVariablesByOrder('', '{{1}}')).toEqual([]);
  });

  test('┘è┘é╪¬╪╖╪╣ ┘ä┘ê ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ┘ü┘è┘ç ┘à╪¬╪║┘è╪▒╪º╪¬ ╪ú┘â╪¬╪▒ ┘à┘å ┘à┘è╪¬╪º', () => {
    const localContent = '{{a}} {{b}} {{c}} {{d}}';
    const metaBodyText = '{{1}} {{2}}';
    const result = mapVariablesByOrder(localContent, metaBodyText);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('a');
    expect(result[1].name).toBe('b');
  });
});

describe('extractLocalVariableOrder', () => {
  test('┘è╪│╪¬╪«╪▒╪¼ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ ┘à╪╣ ╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä╪¬┘â╪▒╪º╪▒', () => {
    expect(extractLocalVariableOrder('{{x}} ┘ê{{y}} ┘ê{{x}}')).toEqual(['x', 'y']);
  });

  test('┘è╪▒╪¼╪╣ ┘à╪╡┘ü┘ê┘ü╪⌐ ┘ü╪º╪▒╪║╪⌐ ┘ä┘ê ┘à┘ü┘è╪┤ ┘à╪¬╪║┘è╪▒╪º╪¬', () => {
    expect(extractLocalVariableOrder('┘å╪╡ ╪½╪º╪¿╪¬')).toEqual([]);
    expect(extractLocalVariableOrder(null)).toEqual([]);
  });
});

describe('buildMetaBodyParams', () => {
  test('┘è╪¿┘å┘è params ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪╡╪¡┘è╪¡ ┘à┘å variables JSON', () => {
    const variablesOrder = [{ position: 1, name: 'customerName' }, { position: 2, name: 'orderNumber' }];
    const values = { customerName: '┘à┘å┘ë', orderNumber: 'ORD-123' };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result).toEqual([
      { type: 'text', text: '┘à┘å┘ë' },
      { type: 'text', text: 'ORD-123' },
    ]);
  });

  test('┘è╪│╪¬╪«╪»┘à fallback ┘à┘å ╪º┘ä┘å╪╡ ┘ä┘ê JSON ┘ü╪º╪╢┘è', () => {
    const content = '┘à╪▒╪¡╪¿╪º {{customerName}} ╪▒┘é┘à {{orderNumber}}';
    const values = { customerName: '┘à┘å┘ë', orderNumber: 'ORD-123' };
    const result = buildMetaBodyParams(null, content, values);
    expect(result).toEqual([
      { type: 'text', text: '┘à┘å┘ë' },
      { type: 'text', text: 'ORD-123' },
    ]);
  });

  test('┘è╪▒╪¼┘æ╪╣ ┘å╪╡ ┘ü╪º╪╢┘è ┘ä┘ä┘à╪¬╪║┘è╪▒ ╪º┘ä┘å╪º┘é╪╡', () => {
    const variablesOrder = [{ position: 1, name: 'customerName' }, { position: 2, name: 'missing' }];
    const values = { customerName: '┘à┘å┘ë' };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result[1]).toEqual({ type: 'text', text: '' });
  });

  test('≡ƒÜ¿ 131008: ╪╣╪»╪» params ╪»╪º┘è┘à┘ï╪º ┘è╪│╪º┘ê┘è ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘é╪º┘ä╪¿ ╪¡╪¬┘ë ┘ä┘ê ╪º┘ä┘é┘è┘à ┘ü╪º╪╢┘è╪⌐ (┘ä╪º ╪¡╪░┘ü ┘ä┘ä┘Ç params)', () => {
    // ╪ú┘ê╪▒╪»╪▒ ┘à┘å ╪║┘è╪▒ ┘à┘å╪¬╪¼╪º╪¬ ΓåÆ orderItems ┘ü╪º╪╢┘è ΓÇö ╪¿╪│ ┘ä╪º╪▓┘à ┘å╪¿╪╣╪½ param ┘ä┘â┘ä ┘à╪¬╪║┘è╪▒ ┘ü┘è ╪º┘ä┘é╪º┘ä╪¿
    // ┘ê╪Ñ┘ä╪º Meta ╪¿╪¬╪▒┘ü╪╢ ╪¿┘Ç 131008 "Required parameter is missing".
    const variablesOrder = [
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' },
      { position: 3, name: 'orderItems' },
      { position: 4, name: 'total' },
    ];
    const values = { customerName: '╪╣┘à┘è┘ä┘å╪º ╪º┘ä╪╣╪▓┘è╪▓', orderNumber: 'ORD-9', orderItems: '┘ä╪º ┘è┘ê╪¼╪»', total: '0' };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result).toHaveLength(4);
    expect(result[2]).toEqual({ type: 'text', text: '┘ä╪º ┘è┘ê╪¼╪»' });
    expect(result[3]).toEqual({ type: 'text', text: '0' });
  });

  test('≡ƒÜ¿ 131008: ╪ú┘ê╪▒╪»╪▒ ╪¿╪»┘ê┘å ╪ú┘è variables ┘é┘è┘à ΓåÆ ┘ä┘â┘ä ┘à╪¬╪║┘è╪▒ param (┘ê┘ä┘è╪│ ╪¡╪░┘ü┘ç)', () => {
    const variablesOrder = [{ position: 1, name: 'a' }, { position: 2, name: 'b' }];
    const result = buildMetaBodyParams(variablesOrder, null, {});
    expect(result).toHaveLength(2);
    expect(result).toEqual([{ type: 'text', text: '' }, { type: 'text', text: '' }]);
  });

  test('┘è╪▒╪¼┘æ╪╣ ┘à╪╡┘ü┘ê┘ü╪⌐ ┘ü╪º╪▒╪║╪⌐ ┘ä┘ê ┘à┘ü┘è╪┤ ╪¬╪▒╪¬┘è╪¿ ┘ê┘ä╪º ┘å╪╡', () => {
    expect(buildMetaBodyParams(null, null, {})).toEqual([]);
  });

  test('┘è╪▓┘è┘ä ╪º┘ä╪ú╪│╪╖╪▒ ╪º┘ä╪¼╪»┘è╪»╪⌐ ┘à┘å ┘é┘è┘à ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ (Meta ╪¬╪▒┘ü╪╢ newline ┘ü┘è body params)', () => {
    const variablesOrder = [{ position: 1, name: 'customerName' }, { position: 2, name: 'orderItems' }];
    const values = {
      customerName: '┘à┘å┘ë',
      orderItems: '\n≡ƒôï ╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä╪╖┘ä╪¿:\n1. swan edge | ╪º┘ä┘ä┘ê┘å: ╪ú╪¿┘è╪╢ ┘â╪º┘à┘ä | ╪º┘ä┘à┘é╪º╪│: 37 | ╪º┘ä┘â┘à┘è╪⌐: 1\n',
    };
    const result = buildMetaBodyParams(variablesOrder, null, values);
    expect(result[1]).toEqual({ type: 'text', text: '≡ƒôï ╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä╪╖┘ä╪¿: 1. swan edge | ╪º┘ä┘ä┘ê┘å: ╪ú╪¿┘è╪╢ ┘â╪º┘à┘ä | ╪º┘ä┘à┘é╪º╪│: 37 | ╪º┘ä┘â┘à┘è╪⌐: 1' });
    // ┘ä╪º ┘è┘ê╪¼╪» ╪ú┘è \n ┘ü┘è ╪º┘ä┘é┘è┘à
    result.forEach(p => expect(p.text).not.toContain('\n'));
  });

  test('┘è╪╢╪║╪╖ ╪º┘ä┘à╪│╪º┘ü╪º╪¬ ╪º┘ä┘à╪¬┘â╪▒╪▒╪⌐ ╪¿╪╣╪» ╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä╪ú╪│╪╖╪▒ ╪º┘ä╪¼╪»┘è╪»╪⌐', () => {
    const variablesOrder = [{ position: 1, name: 'body' }];
    const result = buildMetaBodyParams(variablesOrder, null, { body: '╪│╪╖╪▒  ╪º┘ê┘ä\n\n  ╪│╪╖╪▒ ╪¬╪º┘å┘è  ' });
    expect(result[0].text).toBe('╪│╪╖╪▒ ╪º┘ê┘ä ╪│╪╖╪▒ ╪¬╪º┘å┘è');
  });
});
