/**
 * ╪º╪«╪¬╪¿╪º╪▒╪º╪¬ buildMetaTemplatePayload ΓÇö ┘å┘ü╪│ ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ┘ä╪╡┘è╪║╪⌐ ┘à┘è╪¬╪º
 * ╪º┘ä┘à╪│╪¬╪«╪»┘à ┘ü┘è publishTemplateToMeta ┘ê resubmitMetaTemplate.
 */
const { buildMetaTemplatePayload } = require('../../utils/metaTemplatePayload');

describe('buildMetaTemplatePayload', () => {
  test('┘è╪¡┘ê┘ä ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪│┘à╪º╪⌐ ┘ä╪ú╪▒┘é╪º┘à ┘à┘ê╪╢╪╣┘è╪⌐ ╪¡╪│╪¿ ╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪╕┘ç┘ê╪▒', () => {
    const out = buildMetaTemplatePayload({
      content: '┘à╪▒╪¡╪¿╪º {{customerName}}╪î ╪╖┘ä╪¿┘â {{orderNumber}}',
      category: 'ORDER',
      hasButtons: false,
      buttons: null
    });
    expect(out.bodyText).toBe('┘à╪▒╪¡╪¿╪º {{1}}╪î ╪╖┘ä╪¿┘â {{2}}╪î');
    expect(out.variableCount).toBe(2);
    expect(out.variableOrder).toBe(JSON.stringify([
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]));
  });

  test('┘è┘ê╪¡╪» ╪º┘ä╪ú┘é┘ê╪º╪│ ╪º┘ä┘à┘ü╪▒╪»╪⌐ ╪Ñ┘ä┘ë ╪╡┘è╪║╪⌐ ┘à╪▓╪»┘ê╪¼╪⌐', () => {
    const out = buildMetaTemplatePayload({ content: '┘â┘ê╪» {orderNumber} ╪¼╪º┘ç╪▓', category: 'ORDER', hasButtons: false, buttons: null });
    expect(out.bodyText).toBe('┘â┘ê╪» {{1}} ╪¼╪º┘ç╪▓');
  });

  test('┘è╪╢┘è┘ü ╪¬╪▒╪¡┘è╪¿ ┘é╪¿┘ä ╪º┘ä┘à╪¬╪║┘è╪▒ ┘ü┘è ╪¿╪»╪º┘è╪⌐ ╪º┘ä┘å╪╡ ┘ê┘ü╪º╪╡┘ä╪⌐ ╪¿╪╣╪»┘ç ┘ü┘è ╪º┘ä┘å┘ç╪º┘è╪⌐', () => {
    const out = buildMetaTemplatePayload({ content: '{{customerName}}╪î ╪º╪│╪¬┘ä┘à╪¬ ╪╖┘ä╪¿┘â {{total}}', category: 'ORDER', hasButtons: false, buttons: null });
    expect(out.bodyText).toBe('╪ú┘ç┘ä╪º┘ï {{1}}╪î ╪º╪│╪¬┘ä┘à╪¬ ╪╖┘ä╪¿┘â {{2}}╪î');
    expect(out.metaPadding).toContain('╪ú┘ç┘ä╪º┘ï');
    expect(out.metaPadding).toContain('╪î');
  });

  test('┘è╪¿┘å┘è ╪ú╪▓╪▒╪º╪▒ QUICK_REPLY ┘ä┘ê ┘ü┘è ╪ú╪▓╪▒╪º╪▒', () => {
    const out = buildMetaTemplatePayload({
      content: '╪¬╪ú┘â┘è╪» ╪╖┘ä╪¿┘â',
      category: 'ORDER',
      hasButtons: true,
      buttons: JSON.stringify([
        { id: 'confirm', text: '╪¬╪ú┘â┘è╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒', action: 'CONFIRMED' },
        { id: 'cancel', text: '╪Ñ┘ä╪║╪º╪í ╪º┘ä╪ú┘ê╪▒╪»╪▒', action: 'CANCELLED' }
      ])
    });
    expect(out.buttonsComponent).toEqual({
      type: 'BUTTONS',
      buttons: [
        { type: 'QUICK_REPLY', text: '╪¬╪ú┘â┘è╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒' },
        { type: 'QUICK_REPLY', text: '╪Ñ┘ä╪║╪º╪í ╪º┘ä╪ú┘ê╪▒╪»╪▒' }
      ]
    });
  });

  test('┘è╪¡╪»╪» ╪º┘ä┘ü╪ª╪⌐ UTILITY ╪º┘ü╪¬╪▒╪º╪╢┘è╪º┘ï', () => {
    const out = buildMetaTemplatePayload({ content: '┘å╪╡', category: null, hasButtons: false, buttons: null });
    expect(out.metaCategory).toBe('UTILITY');
  });

  test('≡ƒö┤ regression: ┘è┘ü╪▒╪╢ UTILITY ╪╣┘ä┘ë ┘é╪º┘ä╪¿ ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿ ╪¡╪¬┘ë ┘ä┘ê category = MARKETING', () => {
    const out = buildMetaTemplatePayload({
      content: '╪¬┘à ╪¬┘ê╪╡┘è┘ä ╪╖┘ä╪¿┘â {{orderNumber}}',
      category: 'MARKETING',
      eventType: 'delivered',
      hasButtons: false,
      buttons: null
    });
    expect(out.metaCategory).toBe('UTILITY');
  });

  test('≡ƒö┤ regression: ┘è┘ü╪▒╪╢ UTILITY ╪╣┘ä┘ë ┘é╪º┘ä╪¿ ORDER_DELIVERED ╪¡╪¬┘ë ┘ä┘ê category = MARKETING', () => {
    const out = buildMetaTemplatePayload({
      content: '╪¬┘à ╪¬┘ê╪╡┘è┘ä ╪╖┘ä╪¿┘â {{orderNumber}}',
      category: 'MARKETING',
      eventType: 'ORDER_DELIVERED',
      hasButtons: false,
      buttons: null
    });
    expect(out.metaCategory).toBe('UTILITY');
  });

  test('┘è╪¿┘é┘è MARKETING ┘ä┘ä┘é╪º┘ä╪¿ ╪º┘ä╪¬╪│┘ê┘è┘é┘è ╪║┘è╪▒ ╪º┘ä┘à╪▒╪¬╪¿╪╖ ╪¿╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿', () => {
    const out = buildMetaTemplatePayload({
      content: '╪«╪╡┘à 50% ╪¿┘à┘å╪º╪│╪¿╪⌐ ╪º┘ä╪╣┘è╪»',
      category: 'MARKETING',
      eventType: 'NEWSLETTER_SUBSCRIBED',
      hasButtons: false,
      buttons: null
    });
    expect(out.metaCategory).toBe('MARKETING');
  });

  test('┘è╪¿┘é┘è AUTHENTICATION ┘ä┘é╪º┘ä╪¿ OTP', () => {
    const out = buildMetaTemplatePayload({
      content: '┘â┘ê╪» ╪º┘ä╪¬╪¡┘é┘é {{otpCode}}',
      category: 'AUTHENTICATION',
      eventType: 'OTP',
      hasButtons: false,
      buttons: null
    });
    expect(out.metaCategory).toBe('AUTHENTICATION');
  });

  test('┘è╪¬╪╣╪º┘à┘ä ┘à╪╣ content ┘ü╪º╪▒╪║', () => {
    const out = buildMetaTemplatePayload({ content: '', category: 'ORDER', hasButtons: false, buttons: null });
    expect(out.bodyText).toBe('');
    expect(out.variableCount).toBe(0);
    expect(out.variableOrder).toBeNull();
    expect(out.buttonsComponent).toBeNull();
    expect(out.headerComponent).toBeNull();
  });

  test('┘è╪¿┘å┘è headerComponent ┘ä┘ê╪│╪º╪ª╪╖ (IMAGE) ┘à┘å headerFormat + headerMediaHandle', () => {
    const out = buildMetaTemplatePayload({
      content: '╪▒╪│╪º┘ä╪⌐ ╪¿┘ç╪º ╪╡┘ê╪▒╪⌐',
      category: 'ORDER',
      hasButtons: false,
      buttons: null,
      headerFormat: 'IMAGE',
      headerMediaHandle: 'meta-handle-123'
    });
    expect(out.headerComponent).toEqual({
      type: 'HEADER',
      format: 'IMAGE',
      example: { header_handle: ['meta-handle-123'] }
    });
  });

  test('┘ä╪º ┘è╪¿┘å┘è headerComponent ┘ä┘ç┘è╪»╪▒ TEXT ╪ú┘ê ╪¿┘ä╪º handle', () => {
    const textHeader = buildMetaTemplatePayload({ content: '┘å╪╡', category: 'ORDER', hasButtons: false, buttons: null, headerFormat: 'TEXT' });
    expect(textHeader.headerComponent).toBeNull();

    const noHandle = buildMetaTemplatePayload({ content: '┘å╪╡', category: 'ORDER', hasButtons: false, buttons: null, headerFormat: 'IMAGE' });
    expect(noHandle.headerComponent).toBeNull();
  });
});
