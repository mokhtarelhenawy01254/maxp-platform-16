/**
 * بناء payload قالب ميتا (components) من قالب محلي — نفس التحويل المستخدم في
 * publishTemplateToMeta و resubmitMetaTemplate (مصدر واحد حتى لا يحيد أحدهما).
 */

const { isOrderCategory } = require('../services/whatsapp/notificationTypes');

function buildMetaTemplatePayload(localTemplate) {
  // قوالب حالة الطلب (category ORDER/ORDERS أو eventType حالة طلب خام مثل "delivered")
  // لازم تتنشر UTILITY في ميتا — رسائل transactional مش تسويق. حتى لو اتحفظ
  // category = MARKETING على القالب المحلي، منمنعش إنها تطلع MARKETING في ميتا.
  const metaCategory = isOrderCategory(localTemplate.category, localTemplate.eventType)
    ? 'UTILITY'
    : localTemplate.category === 'MARKETING' ? 'MARKETING'
    : localTemplate.category === 'AUTHENTICATION' ? 'AUTHENTICATION'
    : 'UTILITY';

  // تحويل متغيرات القالب لصيغة ميتا الموضعية {{1}}, {{2}}, {{3}} ...
  // ميتا تقبل فقط أرقاماً متسلسلة داخل قوسين مجعدين، وترفض الأسماء ({{customerName}})
  // والأقواس الثلاثية الناتجة عن عدم تطبيع الأقواس.
  const variableIndex = {};
  const convertedBody = (localTemplate.content || '')
    // توحيد الأقواس المفردة {var} إلى صيغة {{var}} دون كسر الأقواس المزدوجة الموجودة
    .replace(/(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{$1}}')
    // تحويل المتغيرات المسماة إلى أرقام موضعية حسب ترتيب الظهور
    .replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, name) => {
      if (!(name in variableIndex)) variableIndex[name] = Object.keys(variableIndex).length + 1;
      return `{{${variableIndex[name]}}}`;
    });

  // ميتا ترفض أن يبدأ القالب أو ينتهي بمتغير (subcode 2388299)
  // نضيف نصاً ثابتاً قبل/بعد المتغير تلقائياً مع إشعار المستخدم
  const metaPaddingNotes = [];
  const bodyText = convertedBody
    // إذا بدأ النص بمتغير نضيف كلمة ترحيب ثابتة قبلها
    .replace(/^(\s*)(\{\{\s*\d+\s*\}\})/, (m, ws, varToken) => {
      metaPaddingNotes.push('تمت إضافة "أهلاً " قبل المتغير في بداية النص');
      return `${ws}أهلاً ${varToken}`;
    })
    // إذا انتهى النص بمتغير نضيف فاصلة عربية بعدها
    .replace(/(\{\{\s*\d+\s*\}\})(\s*)$/, (m, varToken, ws) => {
      metaPaddingNotes.push('تمت إضافة "،" بعد المتغير في نهاية النص');
      return `${varToken}،${ws}`;
    });

  // تجهيز الأزرار (إن وجدت)
  let buttonsComponent = null;
  if (localTemplate.hasButtons && localTemplate.buttons) {
    try {
      const btns = typeof localTemplate.buttons === 'string'
        ? JSON.parse(localTemplate.buttons) : localTemplate.buttons;
      const quickReplies = btns.map(b => ({ type: 'QUICK_REPLY', text: b.text }));
      if (quickReplies.length > 0) {
        buttonsComponent = { type: 'BUTTONS', buttons: quickReplies };
      }
    } catch (e) { /* skip invalid buttons */ }
  }

  // تجهيز HEADER وسائط (IMAGE/VIDEO/DOCUMENT) — إن وجد.
  // ميتا تتطلب example.header_handle (من Resumable Upload API) عند إنشاء القالب.
  let headerComponent = null;
  const headerFormat = localTemplate.headerFormat || null;
  const headerMediaHandle = localTemplate.headerMediaHandle || null;
  if (headerFormat && headerFormat !== 'TEXT' && headerMediaHandle) {
    headerComponent = {
      type: 'HEADER',
      format: headerFormat,
      example: { header_handle: [headerMediaHandle] }
    };
  }

  const variableCount = Object.keys(variableIndex).length;
  const variableOrder = variableCount > 0
    ? JSON.stringify(
        Object.entries(variableIndex)
          .sort((a, b) => a[1] - b[1])
          .map(([name, position]) => ({ position, name }))
      )
    : null;

  return {
    metaCategory,
    bodyText,
    buttonsComponent,
    headerComponent,
    metaPadding: metaPaddingNotes.length > 0 ? metaPaddingNotes.join('، ') : null,
    variableIndex,
    variableCount,
    variableOrder
  };
}

module.exports = { buildMetaTemplatePayload };
