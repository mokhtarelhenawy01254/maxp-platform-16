/**
 * اختبارات buildMetaTemplatePayload — نفس تحويل القالب المحلي لصيغة ميتا
 * المستخدم في publishTemplateToMeta و resubmitMetaTemplate.
 */
const { buildMetaTemplatePayload } = require('../../utils/metaTemplatePayload');

describe('buildMetaTemplatePayload', () => {
  test('يحول المتغيرات المسماة لأرقام موضعية حسب ترتيب الظهور', () => {
    const out = buildMetaTemplatePayload({
      content: 'مرحبا {{customerName}}، طلبك {{orderNumber}}',
      category: 'ORDER',
      hasButtons: false,
      buttons: null
    });
    expect(out.bodyText).toBe('مرحبا {{1}}، طلبك {{2}}،');
    expect(out.variableCount).toBe(2);
    expect(out.variableOrder).toBe(JSON.stringify([
      { position: 1, name: 'customerName' },
      { position: 2, name: 'orderNumber' }
    ]));
  });

  test('يوحد الأقواس المفردة إلى صيغة مزدوجة', () => {
    const out = buildMetaTemplatePayload({ content: 'كود {orderNumber} جاهز', category: 'ORDER', hasButtons: false, buttons: null });
    expect(out.bodyText).toBe('كود {{1}} جاهز');
  });

  test('يضيف ترحيب قبل المتغير في بداية النص وفاصلة بعده في النهاية', () => {
    const out = buildMetaTemplatePayload({ content: '{{customerName}}، استلمت طلبك {{total}}', category: 'ORDER', hasButtons: false, buttons: null });
    expect(out.bodyText).toBe('أهلاً {{1}}، استلمت طلبك {{2}}،');
    expect(out.metaPadding).toContain('أهلاً');
    expect(out.metaPadding).toContain('،');
  });

  test('يبني أزرار QUICK_REPLY لو في أزرار', () => {
    const out = buildMetaTemplatePayload({
      content: 'تأكيد طلبك',
      category: 'ORDER',
      hasButtons: true,
      buttons: JSON.stringify([
        { id: 'confirm', text: 'تأكيد الأوردر', action: 'CONFIRMED' },
        { id: 'cancel', text: 'إلغاء الأوردر', action: 'CANCELLED' }
      ])
    });
    expect(out.buttonsComponent).toEqual({
      type: 'BUTTONS',
      buttons: [
        { type: 'QUICK_REPLY', text: 'تأكيد الأوردر' },
        { type: 'QUICK_REPLY', text: 'إلغاء الأوردر' }
      ]
    });
  });

  test('يحدد الفئة UTILITY افتراضياً', () => {
    const out = buildMetaTemplatePayload({ content: 'نص', category: null, hasButtons: false, buttons: null });
    expect(out.metaCategory).toBe('UTILITY');
  });

  test('يتعامل مع content فارغ', () => {
    const out = buildMetaTemplatePayload({ content: '', category: 'ORDER', hasButtons: false, buttons: null });
    expect(out.bodyText).toBe('');
    expect(out.variableCount).toBe(0);
    expect(out.variableOrder).toBeNull();
    expect(out.buttonsComponent).toBeNull();
  });
});
