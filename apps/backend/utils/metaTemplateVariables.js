/**
 * ≡ƒåò PRODUCTION-FIX (notifications-fix-plan ┬º5.2 ΓÇö variable binding):
 * ┘å┘ê╪º╪⌐ ╪▒╪¿╪╖ ┘à╪¬╪║┘è╪▒╪º╪¬ ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º ΓÇö ╪»┘ê╪º┘ä ┘å┘é┘è╪⌐ ┘é╪º╪¿┘ä╪⌐ ┘ä┘ä╪º╪«╪¬╪¿╪º╪▒.
 * - mapVariablesByOrder: ┘è╪¿┘å┘è ╪¬╪▒╪¬┘è╪¿ ┘à╪¬╪║┘è╪▒╪º╪¬ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à┘å ╪¬╪▒╪¬┘è╪¿ ╪╕┘ç┘ê╪▒ {{name}}
 *   ┘ü┘è ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è (╪¿╪»┘ä ╪¬╪▒╪¬┘è╪¿ ┘ç╪º╪▒╪»┘â┘ê╪» META_VARIABLE_ORDER).
 * - buildMetaBodyParams: ┘è╪¿┘å┘è bodyParams ┘ä╪Ñ╪▒╪│╪º┘ä ┘à┘è╪¬╪º ┘à┘å variables ╪ú┘ê ┘à┘å ┘å╪╡ ╪º┘ä┘é╪º┘ä╪¿.
 */

/**
 * ┘è╪¿┘å┘è ╪¬╪▒╪¬┘è╪¿ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ┘ä┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¿┘à╪╖╪º╪¿┘é╪⌐ ╪¬╪▒╪¬┘è╪¿ ╪╕┘ç┘ê╪▒ {{name}} ┘ü┘è ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è
 * ┘à╪╣ {{1}}, {{2}} ┘ü┘è ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º.
 *
 * @param {string} localContent - ┘å╪╡ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è (┘ü┘è┘ç {{customerName}} ╪Ñ┘ä╪«)
 * @param {string} metaBodyText - ┘å╪╡ body ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º (┘ü┘è┘ç {{1}} {{2}})
 * @returns {{position, name}[]}
 */
function mapVariablesByOrder(localContent, metaBodyText) {
  if (!localContent) return [];
  // ╪º╪│╪¬╪«╪▒╪º╪¼ {{name}} ┘à┘å ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ (┘à╪╣ ╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä╪¬┘â╪▒╪º╪▒)
  const localMatches = (localContent.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || []);
  const seen = new Set();
  const localOrder = [];
  for (const m of localMatches) {
    const name = m.replace(/\{\{|\}\}/g, '').trim();
    if (!seen.has(name)) { seen.add(name); localOrder.push(name); }
  }
  // ╪╣╪»╪» placeholders ┘ü┘è ┘à┘è╪¬╪º
  const metaCount = ((metaBodyText || '').match(/\{\{\s*\d+\s*\}\}/g) || []).length;
  // ┘å╪ú╪«╪░ min(localOrder.length, metaCount) ┘ê┘å╪▒┘é┘à┘ç╪º ┘à┘å 1
  const count = Math.min(localOrder.length, metaCount);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({ position: i + 1, name: localOrder[i] });
  }
  return result;
}

/**
 * ┘è╪│╪¬╪«╪▒╪¼ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ {{name}} ┘à┘å ┘å╪╡ ┘é╪º┘ä╪¿ ┘à╪¡┘ä┘è ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ (┘à╪╣ ╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä╪¬┘â╪▒╪º╪▒).
 *
 * @param {string} content - ┘å╪╡ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è
 * @returns {string[]} ╪ú╪│┘à╪º╪í ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿
 */
function extractLocalVariableOrder(content) {
  if (!content) return [];
  const seen = new Set();
  const order = [];
  const matches = (content.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || []);
  for (const m of matches) {
    const name = m.replace(/\{\{|\}\}/g, '').trim();
    if (!seen.has(name)) { seen.add(name); order.push(name); }
  }
  return order;
}

/**
 * ┘è╪¿┘å┘è bodyParams ┘ä╪Ñ╪▒╪│╪º┘ä ┘à┘è╪¬╪º ┘à┘å ╪¬╪▒╪¬┘è╪¿ variables ({position, name}) ╪ú┘ê ΓÇö
 * ┘ä┘ê ╪║┘è╪▒ ┘à╪¬┘ê┘ü╪▒ ΓÇö ┘à┘å ┘å╪╡ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ╪¿┘å┘ü╪│ ┘à┘å╪╖┘é mapVariablesByOrder.
 * ╪º┘ä┘à╪¬╪║┘è╪▒ ╪º┘ä┘å╪º┘é╪╡ ┘ü┘è values ┘è┘Å╪│╪º╪¿ ┘å╪╡ ┘ü╪º╪╢┘è (┘à╪┤ undefined).
 *
 * @param {{position: number, name: string}[]|null} variablesOrder - ╪¬╪▒╪¬┘è╪¿ ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘é╪º┘ä╪¿ (JSON ┘à┘å DB)
 * @param {string|null} localContent - ┘å╪╡ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è (fallback)
 * @param {Object} values - ┘é┘è┘à ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬
 * @returns {{type: string, text: string}[]}
 */
function buildMetaBodyParams(variablesOrder, localContent, values = {}) {
  let orderedVars = variablesOrder;
  if (!orderedVars || orderedVars.length === 0) {
    const localNames = extractLocalVariableOrder(localContent);
    orderedVars = localNames.map((name, idx) => ({ position: idx + 1, name }));
  }

  // 🚨 PRODUCTION-FIX (132018-regression-2026-08-23):
  // ميتا ترفض معاملات الـ body اللي فيها أسطر جديدة (\n) بـ
  // "(#132018) There's an issue with the parameters in your template".
  // الإصلاح ده ضاع في استرجاع force-push يوم 2026-08-20 (commits 1a6039fd/fccb9da1)
  // وسبب فشل قوالب ORDER_CONFIRMED / ORDER_CREATED اللي فيها orderItems متعدد الأسطر.
  return orderedVars.map(v => {
    let text = values[v.name] !== undefined && values[v.name] !== null ? String(values[v.name]) : '';
    text = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    return { type: 'text', text };
  });
}

module.exports = {
  mapVariablesByOrder,
  extractLocalVariableOrder,
  buildMetaBodyParams,
};
