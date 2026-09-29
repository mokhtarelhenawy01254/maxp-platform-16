/**
 * Helper for WhatsApp Meta template variable binding.
 * - mapVariablesByOrder: extracts {position, name}[] from local {{name}} placeholders.
 * - buildMetaBodyParams: builds bodyParams from the template variables order.
 */

function mapVariablesByOrder(localContent, metaBodyText) {
  if (!localContent) return [];
  const localMatches = (localContent.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || []);
  const seen = new Set();
  const localOrder = [];
  for (const m of localMatches) {
    const name = m.replace(/\{\{|}\}/g, '').trim();
    if (!seen.has(name)) { seen.add(name); localOrder.push(name); }
  }
  const metaCount = ((metaBodyText || '').match(/\{\{\s*\d+\s*\}\}/g) || []).length;
  const count = Math.min(localOrder.length, metaCount);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({ position: i + 1, name: localOrder[i] });
  }
  return result;
}

function extractLocalVariableOrder(content) {
  if (!content) return [];
  const seen = new Set();
  const order = [];
  const matches = (content.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || []);
  for (const m of matches) {
    const name = m.replace(/\{\{|}\}/g, '').trim();
    if (!seen.has(name)) { seen.add(name); order.push(name); }
  }
  return order;
}

/**
 * Builds bodyParams from the template variables order ({position, name}[]).
 * If a variable value is missing, falls back to a sensible default so Meta
 * does not reject with (#131008) Required parameter is missing.
 */
function buildMetaBodyParams(variablesOrder, localContent, values = {}) {
  let orderedVars = variablesOrder;
  if (!orderedVars || orderedVars.length === 0) {
    const localNames = extractLocalVariableOrder(localContent);
    orderedVars = localNames.map((name, idx) => ({ position: idx + 1, name }));
  }

  // Some DB rows store variables as plain strings ["orderNumber","total"] instead of
  // [{position,name}] — normalize both shapes here.
  orderedVars = orderedVars.map((v, idx) =>
    typeof v === 'string' ? { position: idx + 1, name: v } : v
  );

  // PRODUCTION-FIX (2026-08-27, #131008): a variable missing from values used to be
  // sent as '' and Meta rejected with "Required parameter is missing". Provide a
  // sensible default per variable name so the message still sends.
  const fallbackFor = (name) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('date') || n.includes('time')) return 'قريباً';
    if (n.includes('point') || n.includes('balance') || n.includes('amount') || n.includes('cash') || n.includes('price') || n.includes('total') || n.includes('subtotal') || n.includes('discount') || n.includes('fee') || n.includes('salary')) return '0';
    if (n.includes('tier') || n.includes('level') || n.includes('rank')) return 'العضوية';
    if (n.includes('name')) return 'عميلنا العزيز';
    if (n.includes('count') || n.includes('number') || n.includes('qty')) return '1';
    if (n.includes('link') || n.includes('url')) return '—';
    return '—';
  };

  return orderedVars.map(v => {
    const raw = values[v.name];
    const text = (raw !== undefined && raw !== null && String(raw).trim() !== '') ? String(raw) : fallbackFor(v.name);
    return { type: 'text', text: text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() };
  });
}

/**
 * Counts the BODY parameters an approved Meta template expects: the highest
 * {{n}} placeholder index in its BODY text (Meta numbers them 1..N, and the same
 * index may legitimately appear twice).
 */
function countMetaPlaceholders(bodyText) {
  if (!bodyText) return 0;
  const matches = String(bodyText).match(/\{\{\s*\d+\s*\}\}/g) || [];
  let max = 0;
  for (const m of matches) {
    const n = parseInt(m.replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/**
 * 🚨 PRODUCTION-FIX (2026-09-29 — Meta #132000 template_param_count_mismatch):
 * The stored `variables` array drifts from the APPROVED Meta template (a variable
 * removed in the UI, or the template re-created with one placeholder more). Meta
 * then rejects EVERY send with "number of localizable_params (4) does not match
 * the expected number of params (5)" and the customer silently gets no
 * notification at all.
 *
 * When the expected count is known, the parameter order must come from a source
 * that is semantically aligned with Meta's placeholders — picking the FIRST
 * source whose variable count matches exactly. Sources are tried in priority
 * order (stored variables → local template content → seeded Meta blueprint).
 *
 * Appending a missing variable at the END is deliberately NOT done: with
 * [customerName, orderItems, total, currency] + a padded `orderNumber` the
 * message would send but every placeholder would shift one slot (order number
 * shown as the items list) — a scrambled confirmation is worse than a loud
 * failure.
 *
 * @returns {{order: Array<{position:number,name:string}>, source: string}|null}
 */
function pickOrderForExpectedCount(expectedCount, sources = []) {
  const expected = Number(expectedCount) || 0;
  if (expected <= 0) return null;

  for (const src of sources) {
    const raw = Array.isArray(src) ? src : src?.names;
    const label = Array.isArray(src) ? 'unspecified' : (src?.label || 'unspecified');
    const names = normalizeVariableNames(raw);
    if (names.length === expected) {
      return {
        order: names.map((name, idx) => ({ position: idx + 1, name })),
        source: label,
      };
    }
  }
  return null;
}

/**
 * Normalizes a variables array to a de-duplicated list of names, accepting both
 * shapes stored in the DB (`["orderNumber"]` and `[{position,name}]`).
 */
function normalizeVariableNames(variablesOrder) {
  if (!Array.isArray(variablesOrder)) return [];
  const seen = new Set();
  const names = [];
  for (const v of variablesOrder) {
    const name = typeof v === 'string' ? v : v?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

module.exports = {
  mapVariablesByOrder,
  extractLocalVariableOrder,
  buildMetaBodyParams,
  countMetaPlaceholders,
  pickOrderForExpectedCount,
  normalizeVariableNames,
};
