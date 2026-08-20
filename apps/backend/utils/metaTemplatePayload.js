/**
 * ╪¿┘å╪º╪í payload ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º (components) ┘à┘å ┘é╪º┘ä╪¿ ┘à╪¡┘ä┘è ΓÇö ┘å┘ü╪│ ╪º┘ä╪¬╪¡┘ê┘è┘ä ╪º┘ä┘à╪│╪¬╪«╪»┘à ┘ü┘è
 * publishTemplateToMeta ┘ê resubmitMetaTemplate (┘à╪╡╪»╪▒ ┘ê╪º╪¡╪» ╪¡╪¬┘ë ┘ä╪º ┘è╪¡┘è╪» ╪ú╪¡╪»┘ç┘à╪º).
 */

const { isOrderCategory } = require('../services/whatsapp/notificationTypes');

function buildMetaTemplatePayload(localTemplate, company = null) {
  // ┘é┘ê╪º┘ä╪¿ ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿ (category ORDER/ORDERS ╪ú┘ê eventType ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿ ╪«╪º┘à ┘à╪½┘ä "delivered")
  // ┘ä╪º╪▓┘à ╪¬╪¬┘å╪┤╪▒ UTILITY ┘ü┘è ┘à┘è╪¬╪º ΓÇö ╪▒╪│╪º╪ª┘ä transactional ┘à╪┤ ╪¬╪│┘ê┘è┘é. ╪¡╪¬┘ë ┘ä┘ê ╪º╪¬╪¡┘ü╪╕
  // category = MARKETING ╪╣┘ä┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è╪î ┘à┘å┘à┘å╪╣╪┤ ╪Ñ┘å┘ç╪º ╪¬╪╖┘ä╪╣ MARKETING ┘ü┘è ┘à┘è╪¬╪º.
  const metaCategory = isOrderCategory(localTemplate.category, localTemplate.eventType)
    ? 'UTILITY'
    : localTemplate.category === 'MARKETING' ? 'MARKETING'
    : localTemplate.category === 'AUTHENTICATION' ? 'AUTHENTICATION'
    : 'UTILITY';

  // ╪¬╪¡┘ê┘è┘ä ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘é╪º┘ä╪¿ ┘ä╪╡┘è╪║╪⌐ ┘à┘è╪¬╪º ╪º┘ä┘à┘ê╪╢╪╣┘è╪⌐ {{1}}, {{2}}, {{3}} ...
  // ┘à┘è╪¬╪º ╪¬┘é╪¿┘ä ┘ü┘é╪╖ ╪ú╪▒┘é╪º┘à╪º┘ï ┘à╪¬╪│┘ä╪│┘ä╪⌐ ╪»╪º╪«┘ä ┘é┘ê╪│┘è┘å ┘à╪¼╪╣╪»┘è┘å╪î ┘ê╪¬╪▒┘ü╪╢ ╪º┘ä╪ú╪│┘à╪º╪í ({{customerName}})
  // ┘ê╪º┘ä╪ú┘é┘ê╪º╪│ ╪º┘ä╪½┘ä╪º╪½┘è╪⌐ ╪º┘ä┘å╪º╪¬╪¼╪⌐ ╪╣┘å ╪╣╪»┘à ╪¬╪╖╪¿┘è╪╣ ╪º┘ä╪ú┘é┘ê╪º╪│.
  const variableIndex = {};
  const convertedBody = (localTemplate.content || '')
    // ╪¬┘ê╪¡┘è╪» ╪º┘ä╪ú┘é┘ê╪º╪│ ╪º┘ä┘à┘ü╪▒╪»╪⌐ {var} ╪Ñ┘ä┘ë ╪╡┘è╪║╪⌐ {{var}} ╪»┘ê┘å ┘â╪│╪▒ ╪º┘ä╪ú┘é┘ê╪º╪│ ╪º┘ä┘à╪▓╪»┘ê╪¼╪⌐ ╪º┘ä┘à┘ê╪¼┘ê╪»╪⌐
    .replace(/(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, '{{$1}}')
    // ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪│┘à╪º╪⌐ ╪Ñ┘ä┘ë ╪ú╪▒┘é╪º┘à ┘à┘ê╪╢╪╣┘è╪⌐ ╪¡╪│╪¿ ╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪╕┘ç┘ê╪▒
    .replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, name) => {
      if (!(name in variableIndex)) variableIndex[name] = Object.keys(variableIndex).length + 1;
      return `{{${variableIndex[name]}}}`;
    });

  // ┘à┘è╪¬╪º ╪¬╪▒┘ü╪╢ ╪ú┘å ┘è╪¿╪»╪ú ╪º┘ä┘é╪º┘ä╪¿ ╪ú┘ê ┘è┘å╪¬┘ç┘è ╪¿┘à╪¬╪║┘è╪▒ (subcode 2388299)
  // ┘å╪╢┘è┘ü ┘å╪╡╪º┘ï ╪½╪º╪¿╪¬╪º┘ï ┘é╪¿┘ä/╪¿╪╣╪» ╪º┘ä┘à╪¬╪║┘è╪▒ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘à╪╣ ╪Ñ╪┤╪╣╪º╪▒ ╪º┘ä┘à╪│╪¬╪«╪»┘à
  const metaPaddingNotes = [];
  const bodyText = convertedBody
    // ╪Ñ╪░╪º ╪¿╪»╪ú ╪º┘ä┘å╪╡ ╪¿┘à╪¬╪║┘è╪▒ ┘å╪╢┘è┘ü ┘â┘ä┘à╪⌐ ╪¬╪▒╪¡┘è╪¿ ╪½╪º╪¿╪¬╪⌐ ┘é╪¿┘ä┘ç╪º
    .replace(/^(\s*)(\{\{\s*\d+\s*\}\})/, (m, ws, varToken) => {
      metaPaddingNotes.push('╪¬┘à╪¬ ╪Ñ╪╢╪º┘ü╪⌐ "╪ú┘ç┘ä╪º┘ï " ┘é╪¿┘ä ╪º┘ä┘à╪¬╪║┘è╪▒ ┘ü┘è ╪¿╪»╪º┘è╪⌐ ╪º┘ä┘å╪╡');
      return `${ws}╪ú┘ç┘ä╪º┘ï ${varToken}`;
    })
    // ╪Ñ╪░╪º ╪º┘å╪¬┘ç┘ë ╪º┘ä┘å╪╡ ╪¿┘à╪¬╪║┘è╪▒ ┘å╪╢┘è┘ü ┘ü╪º╪╡┘ä╪⌐ ╪╣╪▒╪¿┘è╪⌐ ╪¿╪╣╪»┘ç╪º
    .replace(/(\{\{\s*\d+\s*\}\})(\s*)$/, (m, varToken, ws) => {
      metaPaddingNotes.push('╪¬┘à╪¬ ╪Ñ╪╢╪º┘ü╪⌐ "╪î" ╪¿╪╣╪» ╪º┘ä┘à╪¬╪║┘è╪▒ ┘ü┘è ┘å┘ç╪º┘è╪⌐ ╪º┘ä┘å╪╡');
      return `${varToken}╪î${ws}`;
    });

  // ╪¬╪¼┘ç┘è╪▓ ╪º┘ä╪ú╪▓╪▒╪º╪▒ (╪Ñ┘å ┘ê╪¼╪»╪¬)
  let buttonsComponent = null;
  if (localTemplate.hasButtons && localTemplate.buttons) {
    try {
      const btns = typeof localTemplate.buttons === 'string'
        ? JSON.parse(localTemplate.buttons) : localTemplate.buttons;
      const metaButtons = [];
      for (const b of btns) {
        if (String(b.type || b.action || '').toUpperCase() === 'LINK') {
          // ≡ƒöù ╪▓╪▒ ╪▒╪º╪¿╪╖ ╪╡┘ü╪¡╪⌐ ╪º┘ä╪╣┘à┘è┘ä ΓÇö ╪º┘ä╪▒╪º╪¿╪╖ ╪¿┘è╪º╪«╪» token ┘ê phone ┘â┘à╪¬╪║┘è╪▒╪º╪¬ ({{1}}/{{2}})
          // ┘ê╪¿┘è╪¬┘à ╪¬╪╣╪¿╪ª╪¬┘ç┘à ┘ê┘é╪¬ ╪º┘ä╪Ñ╪▒╪│╪º┘ä. ┘à╪¡╪¬╪º╪¼ ╪º┘ä╪»┘ê┘à┘è┘å ┘è┘â┘ê┘å verified ┘ü┘è ┘à┘è╪¬╪º.
          if (company && company.id) {
            const baseDomain = process.env.MAIN_DOMAIN || 'maxp.online';
            const host = (company.customDomain && String(company.customDomain).trim())
              ? String(company.customDomain).trim().replace(/^https?:\/\//, '')
              : `${String(company.slug || company.id).trim()}${baseDomain.startsWith('.') ? '' : '.'}${baseDomain}`;
            metaButtons.push({
              type: 'URL',
              text: b.text || '╪╡┘ü╪¡╪¬┘è ╪╣┘ä┘ë ╪º┘ä┘à╪¬╪¼╪▒',
              url: `https://${host}/api/v1/public/customers/magic-login?token={{1}}&phone={{2}}`
            });
          }
        } else {
          metaButtons.push({ type: 'QUICK_REPLY', text: b.text });
        }
      }
      if (metaButtons.length > 0) {
        buttonsComponent = { type: 'BUTTONS', buttons: metaButtons };
      }
    } catch (e) { /* skip invalid buttons */ }
  }

  // ╪¬╪¼┘ç┘è╪▓ HEADER ┘ê╪│╪º╪ª╪╖ (IMAGE/VIDEO/DOCUMENT) ΓÇö ╪Ñ┘å ┘ê╪¼╪».
  // ┘à┘è╪¬╪º ╪¬╪¬╪╖┘ä╪¿ example.header_handle (┘à┘å Resumable Upload API) ╪╣┘å╪» ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º┘ä╪¿.
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
    metaPadding: metaPaddingNotes.length > 0 ? metaPaddingNotes.join('╪î ') : null,
    variableIndex,
    variableCount,
    variableOrder
  };
}

module.exports = { buildMetaTemplatePayload };
